'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'

interface UnlockItem {
  id?: string
  itemType: string
  itemSlug: string
  name: string
  description: string
  cost: number
  owned: boolean
}

const ITEM_TYPES = [
  { type: 'deck', label: 'Decks', items: [
    { slug: 'marseille', name: 'Marseille Deck', description: 'A classic 18th-century Marseille-style deck with warm golden tones.', cost: 500 },
    { slug: 'shadow', name: 'Shadow Deck', description: 'A dark esoteric deck with deep violet and silver accents.', cost: 800 },
  ]},
  { type: 'spread', label: 'Spreads', items: [
    { slug: 'yes-no', name: 'Yes / No Spread', description: 'Quick yes or no answers with focused card energy.', cost: 150 },
    { slug: 'love', name: 'Love Spread', description: 'Five-card exploration of your romantic situation.', cost: 250 },
    { slug: 'horseshoe', name: 'Horseshoe Spread', description: 'Seven-card arc covering key influences around any question.', cost: 250 },
    { slug: 'celtic-cross', name: 'Celtic Cross Spread', description: 'The comprehensive ten-card classic for deep insight.', cost: 300 },
  ]},
  { type: 'feature', label: 'Features', items: [
    { slug: 'runes', name: 'Rune Casting', description: 'Draw from the ancient Elder Futhark runes for guidance.', cost: 800 },
    { slug: 'biorhythm', name: 'Biorhythm Charts', description: 'Track your physical, emotional, and intellectual cycles.', cost: 300 },
  ]},
]

export default function ShopPage() {
  const [user, setUser] = useState<any>(null)
  const [unlocks, setUnlocks] = useState<string[]>([])
  const [coins, setCoins] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(u => {
      setUser(u)
      setCoins(u?.coins || 0)
    })
    fetch('/api/shop/unlock').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.unlocks) setUnlocks(data.unlocks.map((u: any) => `${u.itemType}:${u.itemSlug}`))
    })
  }, [])

  async function handleUnlock(itemType: string, itemSlug: string, cost: number) {
    setError('')
    if (coins < cost) {
      setError(`Not enough Stardust! You need ${cost - coins} more.`)
      return
    }

    const res = await fetch('/api/shop/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, itemSlug }),
    })

    const data = await res.json()
    if (res.ok) {
      setCoins(data.coins)
      setUnlocks(prev => [...prev, `${itemType}:${itemSlug}`])
    } else {
      setError(data.error || 'Failed to unlock')
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-cormorant)' }}>Shop</h1>
          <div className="bg-mystic-surface rounded-xl px-5 py-2 border border-mystic-gold/10">
            <span className="text-mystic-gold font-bold">✦ {coins}</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-400/10 text-red-400 rounded-lg text-sm">{error}</div>
        )}

        {ITEM_TYPES.map(category => (
          <div key={category.type} className="mb-10">
            <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>{category.label}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {category.items.map(item => {
                const owned = unlocks.includes(`${category.type}:${item.slug}`)
                return (
                  <div key={item.slug} className={`bg-mystic-surface rounded-xl p-5 border ${owned ? 'border-mystic-gold/30' : 'border-mystic-gold/10'}`}>
                    <div className="text-3xl mb-2">{owned ? '✨' : '🔒'}</div>
                    <h3 className="font-bold text-sm">{item.name}</h3>
                    <p className="text-xs text-mystic-muted mt-1">{item.description}</p>
                    <div className="mt-4">
                      {owned ? (
                        <span className="text-mystic-gold text-sm font-semibold">✓ Owned</span>
                      ) : (
                        <button
                          onClick={() => handleUnlock(category.type, item.slug, item.cost)}
                          disabled={coins < item.cost}
                          className="w-full py-1.5 bg-mystic-gold text-mystic-dark rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✦ {item.cost}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
