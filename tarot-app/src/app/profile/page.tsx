'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [readings, setReadings] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(setUser)
    fetch('/api/readings').then(r => r.json()).then(data => setReadings(data.readings || [])).catch(() => {})
    fetch('/api/user/achievements').then(r => r.json()).then(data => setAchievements(data.achievements || [])).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-cormorant)' }}>Profile</h1>

        <div className="bg-mystic-surface rounded-xl p-6 border border-mystic-gold/10 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-mystic-card border-2 border-mystic-gold/30 flex items-center justify-center text-3xl">
              🔮
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.name || 'Seeker'}</h2>
              <p className="text-mystic-muted text-sm capitalize">
                {user?.zodiacSign ? `${user.zodiacSign}` : 'Zodiac not set'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center bg-mystic-card rounded-xl p-4">
              <div className="text-2xl font-bold text-mystic-gold">✦{user?.coins ?? 0}</div>
              <div className="text-xs text-mystic-muted mt-1">Stardust</div>
            </div>
            <div className="text-center bg-mystic-card rounded-xl p-4">
              <div className="text-2xl font-bold text-mystic-gold">Lv.{user?.level ?? 1}</div>
              <div className="text-xs text-mystic-muted mt-1">Level</div>
            </div>
            <div className="text-center bg-mystic-card rounded-xl p-4">
              <div className="text-2xl font-bold text-mystic-gold">{readings.length}</div>
              <div className="text-xs text-mystic-muted mt-1">Readings</div>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>Achievements</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {achievements.map((a: any) => (
            <div key={a.id || a.slug} className="bg-mystic-surface rounded-xl p-4 border border-mystic-gold/10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <div className="font-semibold text-sm">{a.name}</div>
                  <div className="text-xs text-mystic-muted">{a.description}</div>
                </div>
              </div>
            </div>
          ))}
          {achievements.length === 0 && (
            <p className="text-mystic-muted text-sm">Complete readings and activities to earn achievements.</p>
          )}
        </div>
      </main>
    </div>
  )
}
