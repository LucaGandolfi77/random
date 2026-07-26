'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

interface ReadingDetail {
  id: string
  question: string | null
  cardsJson: string
  createdAt: string
  spread: { name: string; slug: string; positionsJson: string; cardCount: number }
  deck: { name: string; slug: string; themeJson: string }
}

interface DrawData {
  cardId: string
  positionKey: string
  reversed: boolean
}

interface CardDetail {
  id: string
  name: string
  uprightMeaning: string
  reversedMeaning: string
  keywords: string
  imagePath: string
}

export default function ReadingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [reading, setReading] = useState<ReadingDetail | null>(null)
  const [cards, setCards] = useState<CardDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = typeof params.id === 'string' ? params.id : ''
    if (!id) return

    Promise.all([
      fetch(`/api/readings/${id}`).then(r => r.json()),
      fetch('/api/cards').then(r => r.json()),
    ]).then(([readingData, cardsData]) => {
      setReading(readingData.reading)
      setCards(cardsData.cards)
    }).catch(() => {})
    .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-mystic-muted">Loading...</p>
        </main>
      </div>
    )
  }

  if (!reading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-mystic-muted">Reading not found.</p>
        </main>
      </div>
    )
  }

  let draws: DrawData[] = []
  try { draws = JSON.parse(reading.cardsJson) } catch { /* ignore */ }

  let positions: { key: string; label: string; x: number; y: number }[] = []
  try { positions = JSON.parse(reading.spread.positionsJson) } catch { /* ignore */ }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-cormorant)' }}>{reading.spread.name}</h1>
            <p className="text-mystic-muted text-sm mt-1">
              {reading.deck.name} · {new Date(reading.createdAt).toLocaleDateString()}
            </p>
            {reading.question && (
              <p className="text-mystic-gold italic mt-2">&ldquo;{reading.question}&rdquo;</p>
            )}
          </div>
        </div>

        <div className="grid gap-4" style={{
          gridTemplateColumns: `repeat(${Math.min(3, draws.length)}, 1fr)`,
        }}>
          {draws.map((draw, i) => {
            const card = cards.find(c => c.id === draw.cardId)
            if (!card) return null
            const pos = positions[i]
            return (
              <div key={i} className="bg-mystic-surface rounded-xl p-4 border border-mystic-gold/10">
                <div className="aspect-[2/3] bg-mystic-dark rounded-lg mb-2 flex items-center justify-center border border-mystic-gold/20">
                  <div className="text-center p-2">
                    <div className="text-2xl">🃏</div>
                    <div className="text-xs mt-1 font-semibold">{card.name}</div>
                  </div>
                </div>
                <div className="text-xs text-mystic-gold font-semibold mb-1">{pos?.label || draw.positionKey}</div>
                {draw.reversed && <div className="text-xs text-red-400 mb-1">Reversed</div>}
                <div className="text-sm text-mystic-text leading-relaxed mt-1">
                  {draw.reversed ? card.reversedMeaning : card.uprightMeaning}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {card.keywords.split(',').map((kw: string) => (
                    <span key={kw.trim()} className="text-xs px-1.5 py-0.5 bg-mystic-card rounded text-mystic-gold">
                      {kw.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
