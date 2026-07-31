'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

interface CardPileProps {
  allCards: Card[]
  count: number
  onComplete: (drawn: { card: Card; reversed: boolean }[]) => void
}

interface PileCard {
  card: Card
  rotation: number
  offsetX: number
  offsetY: number
  zIndex: number
}

function generatePile(cards: Card[], count: number): PileCard[] {
  const shuffled = [...cards]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const pileSize = Math.min(cards.length, Math.max(count * 4, 22))
  const selected = shuffled.slice(0, pileSize)

  return selected.map((card, i) => ({
    card,
    rotation: (Math.random() - 0.5) * 50,
    offsetX: (Math.random() - 0.5) * 280,
    offsetY: (Math.random() - 0.5) * 160,
    zIndex: i,
  }))
}

export default function CardPile({ allCards, count, onComplete }: CardPileProps) {
  const [pile, setPile] = useState<PileCard[]>(() => generatePile(allCards, count))
  const [drawn, setDrawn] = useState<{ card: Card; reversed: boolean }[]>([])
  const [pickedIndex, setPickedIndex] = useState<number | null>(null)
  const [revealing, setRevealing] = useState(false)

  const remaining = count - drawn.length

  const handlePick = useCallback((pileIndex: number) => {
    if (revealing || drawn.length >= count) return

    setPickedIndex(pileIndex)
    setRevealing(true)

    const pickedCard = pile[pileIndex]
    const isReversed = Math.random() < 0.3

    setTimeout(() => {
      const newDrawn = [...drawn, { card: pickedCard.card, reversed: isReversed }]
      setDrawn(newDrawn)
      setPile(prev => prev.filter((_, i) => i !== pileIndex))
      setPickedIndex(null)
      setRevealing(false)

      if (newDrawn.length === count) {
        setTimeout(() => onComplete(newDrawn), 600)
      }
    }, 800)
  }, [revealing, drawn, count, pile, onComplete])

  const drawnPositions = useMemo(() => {
    return drawn.map((_, i) => ({
      x: (i - (drawn.length - 1) / 2) * 90,
    }))
  }, [drawn])

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Drawn cards area */}
      <div className="relative w-full max-w-xl h-52 flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          {drawn.map((d, i) => (
            <motion.div
              key={d.card.id}
              layout
              initial={{ y: 200, opacity: 0, scale: 0.5, rotate: 0 }}
              animate={{
                y: 0,
                opacity: 1,
                scale: 1,
                rotate: 0,
                x: drawnPositions[i]?.x ?? 0,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute"
            >
              <div className={`tarot-card is-flipped ${d.reversed ? 'is-reversed' : ''}`} style={{ width: 70, height: 105 }}>
                <div className="tarot-card-inner">
                  <div className="tarot-card-face tarot-card-front">
                    <div className="card-front-content" style={{ padding: '4px', fontSize: '9px' }}>
                      <div className="card-symbol" style={{ fontSize: '16px' }}>✦</div>
                      <div className="card-name" style={{ fontSize: '8px', lineHeight: 1.2 }}>{d.card.name}</div>
                      {d.reversed && <div className="card-reversed-badge" style={{ fontSize: '7px' }}>Reversed</div>}
                    </div>
                  </div>
                  <div className="tarot-card-face tarot-card-back">
                    <div className="card-back-pattern">
                      <div className="card-back-border">
                        <div className="card-back-center">
                          <span className="card-back-star">✦</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {drawn.length === 0 && (
          <p className="text-mystic-muted text-sm">Your drawn cards will appear here</p>
        )}
      </div>

      {/* Counter */}
      <div className="text-center">
        <span className="text-mystic-gold font-semibold">{drawn.length}</span>
        <span className="text-mystic-muted"> / {count} cards drawn</span>
        {remaining > 0 && (
          <p className="text-mystic-muted text-xs mt-1">
            Click a card from the pile to draw it
          </p>
        )}
      </div>

      {/* Scattered pile */}
      <div className="relative" style={{ width: 360, height: 260 }}>
        <AnimatePresence>
          {pile.map((pileCard, i) => {
            const isPicking = pickedIndex === i
            return (
              <motion.div
                key={pileCard.card.id}
                layout
                initial={{
                  opacity: 0,
                  scale: 0.6,
                  rotate: pileCard.rotation,
                  x: pileCard.offsetX,
                  y: pileCard.offsetY,
                }}
                animate={
                  isPicking
                    ? {
                        opacity: 0,
                        scale: 1.4,
                        y: -180,
                        rotate: 0,
                        transition: { duration: 0.6, ease: 'easeOut' },
                      }
                    : {
                        opacity: 1,
                        scale: 1,
                        rotate: pileCard.rotation,
                        x: pileCard.offsetX,
                        y: pileCard.offsetY,
                      }
                }
                exit={{
                  opacity: 0,
                  scale: 0.5,
                  transition: { duration: 0.2 },
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                style={{ zIndex: pileCard.zIndex, position: 'absolute', left: '50%', top: '50%', marginLeft: -45, marginTop: -67.5 }}
                className="tarot-card is-clickable"
                onClick={() => handlePick(i)}
                whileHover={{
                  scale: 1.15,
                  rotate: 0,
                  y: pileCard.offsetY - 20,
                  zIndex: 999,
                  transition: { duration: 0.2 },
                }}
              >
                <div className="tarot-card-inner" style={{ width: 90, height: 135 }}>
                  <div className="tarot-card-face tarot-card-back">
                    <div className="card-back-pattern">
                      <div className="card-back-border">
                        <div className="card-back-center">
                          <span className="card-back-star">✦</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {pile.length === 0 && drawn.length < count && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-mystic-muted text-sm">All cards have been drawn</p>
          </div>
        )}
      </div>
    </div>
  )
}
