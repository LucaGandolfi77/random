'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

interface UserInfo {
  name: string
  coins: number
  xp: number
  level: number
  loginStreak: number
  zodiacSign: string | null
}

interface DailyCard {
  name: string
  uprightMeaning: string
  reversedMeaning: string
  keywords: string
  imagePath: string
  reversed: boolean
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [dailyCard, setDailyCard] = useState<DailyCard | null>(null)
  const [dailyClaimed, setDailyClaimed] = useState(false)

  useEffect(() => {
    console.log('[DASHBOARD] Page mounted, fetching user data...')

    fetch('/api/auth/me')
      .then(r => {
        console.log('[DASHBOARD] /api/auth/me status:', r.status)
        if (!r.ok) {
          console.log('[DASHBOARD] /api/auth/me failed — not authenticated')
          return null
        }
        return r.json()
      })
      .then(data => {
        console.log('[DASHBOARD] User data:', data ? `${data.name} (${data.email})` : 'null')
        setUser(data)
      })
      .catch(err => console.error('[DASHBOARD] Error fetching /api/auth/me:', err))

    fetch('/api/daily/card')
      .then(r => {
        console.log('[DASHBOARD] /api/daily/card status:', r.status)
        return r.ok ? r.json() : null
      })
      .then(data => {
        if (data) {
          setDailyCard(data.card)
          setDailyClaimed(data.claimed)
        }
      })
      .catch(err => console.error('[DASHBOARD] Error fetching /api/daily/card:', err))
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-cormorant)' }}>
              Welcome, {user?.name || 'Seeker'}
            </h1>
            {user?.zodiacSign && (
              <p className="text-mystic-muted mt-1 capitalize">{user.zodiacSign}</p>
            )}
          </div>
          <div className="flex items-center gap-6 bg-mystic-surface rounded-xl px-6 py-3 border border-mystic-gold/10">
            <div className="text-center">
              <div className="text-mystic-gold font-bold text-lg">✦ {user?.coins ?? 0}</div>
              <div className="text-xs text-mystic-muted">Stardust</div>
            </div>
            <div className="text-center">
              <div className="text-mystic-text font-bold text-lg">Lv.{user?.level ?? 1}</div>
              <div className="text-xs text-mystic-muted">Level</div>
            </div>
            <div className="text-center">
              <div className="text-mystic-gold font-bold text-lg">{user?.loginStreak ?? 0}🔥</div>
              <div className="text-xs text-mystic-muted">Streak</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/read/new"
            className="bg-mystic-surface rounded-xl p-6 border border-mystic-gold/10 hover:border-mystic-gold/30 transition-colors"
          >
            <div className="text-3xl mb-2">🔮</div>
            <h2 className="font-bold text-lg" style={{ fontFamily: 'var(--font-cormorant)' }}>New Reading</h2>
            <p className="text-mystic-muted text-sm mt-1">Draw cards and discover insights</p>
          </Link>
          <Link
            href="/fortune"
            className="bg-mystic-surface rounded-xl p-6 border border-mystic-gold/10 hover:border-mystic-gold/30 transition-colors"
          >
            <div className="text-3xl mb-2">⭐</div>
            <h2 className="font-bold text-lg" style={{ fontFamily: 'var(--font-cormorant)' }}>Daily Fortune</h2>
            <p className="text-mystic-muted text-sm mt-1">Horoscope, moon phase, and more</p>
          </Link>
          <Link
            href="/history"
            className="bg-mystic-surface rounded-xl p-6 border border-mystic-gold/10 hover:border-mystic-gold/30 transition-colors"
          >
            <div className="text-3xl mb-2">📜</div>
            <h2 className="font-bold text-lg" style={{ fontFamily: 'var(--font-cormorant)' }}>Reading History</h2>
            <p className="text-mystic-muted text-sm mt-1">Review your past readings</p>
          </Link>
        </div>

        {dailyCard && (
          <div className="bg-mystic-surface rounded-xl p-6 border border-mystic-gold/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-cormorant)' }}>Card of the Day</h2>
              <span className="text-xs text-mystic-muted">
                {dailyClaimed ? '✓ Claimed' : '+3 Stardust available'}
              </span>
            </div>
            <div className="flex items-start gap-6">
              <div className="w-24 h-36 bg-mystic-card rounded-lg flex items-center justify-center text-center p-2 border border-mystic-gold/20 flex-shrink-0">
                <div>
                  <div className="text-2xl">🃏</div>
                  <div className="text-xs mt-1 leading-tight">{dailyCard.name}</div>
                  {dailyCard.reversed && (
                    <div className="text-xs text-red-400 mt-1">Reversed</div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{dailyCard.name}{dailyCard.reversed ? ' (Reversed)' : ''}</h3>
                <p className="text-sm text-mystic-muted mt-2">
                  {dailyCard.reversed ? dailyCard.reversedMeaning : dailyCard.uprightMeaning}
                </p>
                <div className="flex gap-2 mt-3">
                  {dailyCard.keywords.split(',').map((kw: string) => (
                    <span key={kw.trim()} className="text-xs px-2 py-1 bg-mystic-card rounded-full text-mystic-gold">
                      {kw.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
