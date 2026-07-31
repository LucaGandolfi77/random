'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import CardPile from '@/components/CardPile'
import TarotCard from '@/components/TarotCard'

interface Deck {
  id: string
  slug: string
  name: string
  description: string
  themeJson: string
  unlocked: boolean
}

interface Spread {
  id: string
  slug: string
  name: string
  description: string
  positionsJson: string
  cardCount: number
  unlocked: boolean
}

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
}

type WizardStep = 'deck' | 'spread' | 'question' | 'draw' | 'reveal' | 'save'

export default function NewReadingPage() {
  const router = useRouter()
  const [step, setStep] = useState<WizardStep>('deck')
  const [decks, setDecks] = useState<Deck[]>([])
  const [spreads, setSpreads] = useState<Spread[]>([])
  const [allCards, setAllCards] = useState<Card[]>([])
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [selectedSpread, setSelectedSpread] = useState<Spread | null>(null)
  const [question, setQuestion] = useState('')
  const [drawnCards, setDrawnCards] = useState<{ card: Card; position: string; reversed: boolean }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/decks').then(r => r.json()),
      fetch('/api/spreads').then(r => r.json()),
      fetch('/api/cards').then(r => r.json()),
    ]).then(([decksData, spreadsData, cardsData]) => {
      setDecks(decksData.decks)
      setSpreads(spreadsData.spreads)
      setAllCards(cardsData.cards)
    })
  }, [])

  function handlePileComplete(drawn: { card: Card; reversed: boolean }[]) {
    if (!selectedSpread) return
    const positions = JSON.parse(selectedSpread.positionsJson) as { key: string; label: string }[]
    const withPositions = drawn.map((d, i) => ({
      ...d,
      position: positions[i]?.key || `pos_${i}`,
    }))
    setDrawnCards(withPositions)
    setStep('reveal')
  }

  async function handleSave() {
    if (!selectedDeck || !selectedSpread || drawnCards.length === 0) return
    setSaving(true)
    try {
      const cardsJson = JSON.stringify(
        drawnCards.map(d => ({ cardId: d.card.id, positionKey: d.position, reversed: d.reversed }))
      )

      const res = await fetch('/api/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadId: selectedSpread.id,
          deckId: selectedDeck.id,
          question: question || undefined,
          cardsJson,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        router.push(`/read/${data.reading.id}`)
      }
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  function getPositions(spread: Spread): { key: string; label: string }[] {
    try {
      return JSON.parse(spread.positionsJson)
    } catch {
      return []
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-cormorant)' }}>
          {step === 'deck' && 'Choose Your Deck'}
          {step === 'spread' && 'Choose a Spread'}
          {step === 'question' && 'Set Your Intention'}
          {step === 'draw' && 'Draw the Cards'}
          {step === 'reveal' && 'Your Reading'}
        </h1>

        {step === 'deck' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {decks.map(deck => (
              <button
                key={deck.id}
                onClick={() => {
                  setSelectedDeck(deck)
                  setStep('spread')
                }}
                disabled={!deck.unlocked}
                className={`text-left p-6 rounded-xl border transition-colors ${
                  !deck.unlocked
                    ? 'bg-mystic-surface/50 border-mystic-muted/20 opacity-60 cursor-not-allowed'
                    : 'bg-mystic-surface border-mystic-gold/10 hover:border-mystic-gold/30 cursor-pointer'
                }`}
              >
                <div className="w-full aspect-[2/3] rounded-lg mb-3 flex items-center justify-center" style={{
                  backgroundColor: deck.unlocked ? (JSON.parse(deck.themeJson).cardBack || '#4a2c6d') : '#333',
                }}>
                  <span className="text-2xl">{deck.unlocked ? '🃏' : '🔒'}</span>
                </div>
                <h3 className="font-bold">{deck.name}</h3>
                <p className="text-sm text-mystic-muted mt-1">{deck.description.slice(0, 80)}...</p>
              </button>
            ))}
          </div>
        )}

        {step === 'spread' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spreads.map(spread => (
              <button
                key={spread.id}
                onClick={() => {
                  setSelectedSpread(spread)
                  setStep('question')
                }}
                disabled={!spread.unlocked}
                className={`text-left p-6 rounded-xl border transition-colors ${
                  !spread.unlocked
                    ? 'bg-mystic-surface/50 border-mystic-muted/20 opacity-60 cursor-not-allowed'
                    : 'bg-mystic-surface border-mystic-gold/10 hover:border-mystic-gold/30 cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{spread.name}</h3>
                    <p className="text-sm text-mystic-muted mt-1">{spread.description}</p>
                    <span className="inline-block text-xs text-mystic-gold mt-2">{spread.cardCount} cards</span>
                  </div>
                  <span className="text-lg">{spread.unlocked ? '📜' : '🔒'}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 'question' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-mystic-surface rounded-xl p-8 border border-mystic-gold/10">
              <div className="text-center mb-6">
                <span className="text-4xl">🤔</span>
              </div>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="What would you like guidance on? (optional)"
                className="w-full h-32 px-4 py-3 bg-mystic-dark border border-mystic-gold/20 rounded-lg text-mystic-text focus:outline-none focus:border-mystic-gold resize-none"
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-mystic-muted">{question.length}/500</span>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep('spread')}
                  className="px-6 py-2 border border-mystic-gold/30 text-mystic-gold rounded-lg hover:bg-mystic-gold/10 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('draw')}
                  className="flex-1 py-2 bg-mystic-gold text-mystic-dark rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'draw' && (
          <div>
            <p className="text-mystic-muted mb-6 text-center">
              Focus on your question, then pick the cards from the pile.
            </p>
            <CardPile
              allCards={allCards}
              count={selectedSpread?.cardCount || 1}
              onComplete={handlePileComplete}
            />
          </div>
        )}

        {step === 'reveal' && (
          <div>
            <div className="bg-mystic-surface rounded-xl p-6 border border-mystic-gold/10 mb-6">
              {selectedSpread && (
                <div className="grid gap-4" style={{
                  gridTemplateColumns: `repeat(${Math.min(3, selectedSpread.cardCount)}, 1fr)`,
                }}>
                  {drawnCards.map((draw, i) => {
                    const positions = getPositions(selectedSpread)
                    const posLabel = positions[i]?.label || `Position ${i + 1}`
                    return (
                      <div key={i} className="bg-mystic-card rounded-lg p-4 border border-mystic-gold/10">
                        <div className="flex justify-center mb-3">
                          <TarotCard
                            name={draw.card.name}
                            arcana={draw.card.arcana}
                            suit={draw.card.suit}
                            rank={draw.card.rank}
                            reversed={draw.reversed}
                            faceUp
                          />
                        </div>
                        <div className="text-xs text-mystic-gold font-semibold mb-1">{posLabel}</div>
                        {draw.reversed && (
                          <div className="text-xs text-red-400 mb-1">Reversed</div>
                        )}
                        <div className="text-xs text-mystic-muted leading-relaxed">
                          {draw.reversed ? draw.card.reversedMeaning.slice(0, 120) : draw.card.uprightMeaning.slice(0, 120)}...
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {draw.card.keywords.split(',').slice(0, 3).map((kw: string) => (
                            <span key={kw.trim()} className="text-[10px] px-1.5 py-0.5 bg-mystic-dark rounded text-mystic-gold">
                              {kw.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setStep('draw')}
                className="px-6 py-2 border border-mystic-gold/30 text-mystic-gold rounded-lg hover:bg-mystic-gold/10 transition-colors"
              >
                Draw Again
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-2 bg-mystic-gold text-mystic-dark rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Saving...' : '✨ Save Reading'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
