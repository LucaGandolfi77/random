'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'

interface Card {
  id: string
  name: string
  arcana: string
  suit: string | null
  rank: string | null
  uprightMeaning: string
  reversedMeaning: string
  keywords: string
  imagePath: string
  deck: { name: string; slug: string }
}

export default function CollectionPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cards')
      .then(r => r.json())
      .then(data => setCards(data.cards || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? cards : filter === 'major' ? cards.filter(c => c.arcana === 'major') : cards.filter(c => c.suit === filter)

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-cormorant)' }}>Card Collection</h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'major', 'wands', 'cups', 'swords', 'pentacles'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f ? 'bg-mystic-gold text-mystic-dark font-semibold' : 'bg-mystic-surface text-mystic-muted hover:text-mystic-text border border-mystic-gold/10'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-mystic-muted">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map(card => (
              <button
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className="bg-mystic-surface rounded-xl p-3 border border-mystic-gold/10 hover:border-mystic-gold/30 transition-colors text-left"
              >
                <div className="aspect-[2/3] bg-mystic-card rounded-lg mb-2 flex items-center justify-center border border-mystic-gold/10">
                  <div className="text-center p-1">
                    <div className="text-xl">🃏</div>
                    <div className="text-[10px] mt-1 font-semibold leading-tight">{card.name}</div>
                  </div>
                </div>
                <div className="text-[10px] text-mystic-muted">
                  {card.arcana === 'major' ? 'Major Arcana' : `${card.suit}`}
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedCard && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCard(null)}
          >
            <div
              className="bg-mystic-surface rounded-2xl p-6 max-w-lg w-full border border-mystic-gold/10 max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="w-24 h-36 bg-mystic-card rounded-lg flex items-center justify-center flex-shrink-0 border border-mystic-gold/20">
                  <div className="text-center">
                    <div className="text-2xl">🃏</div>
                    <div className="text-xs mt-1 font-semibold">{selectedCard.name}</div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-cormorant)' }}>{selectedCard.name}</h2>
                  <p className="text-xs text-mystic-muted mt-1">
                    {selectedCard.arcana === 'major' ? 'Major Arcana' : `${selectedCard.suit} · ${selectedCard.rank}`}
                  </p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {selectedCard.keywords.split(',').map((kw: string) => (
                      <span key={kw.trim()} className="text-[10px] px-1.5 py-0.5 bg-mystic-card rounded text-mystic-gold">
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-mystic-gold mb-1">Upright</h3>
                <p className="text-sm text-mystic-text">{selectedCard.uprightMeaning}</p>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-semibold text-mystic-gold mb-1">Reversed</h3>
                <p className="text-sm text-mystic-text">{selectedCard.reversedMeaning}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
