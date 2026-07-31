'use client'

import { motion } from 'framer-motion'

interface TarotCardProps {
  name: string
  arcana: string
  suit?: string | null | undefined
  rank?: string | null | undefined
  reversed?: boolean
  faceUp?: boolean
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
  delay?: number
}

const suitSymbols: Record<string, string> = {
  wands: '🪄',
  cups: '🏆',
  swords: '⚔️',
  pentacles: '🪙',
}

const majorSymbols: Record<string, string> = {
  '0': '🌿', 'I': '⚡', 'II': '🌙', 'III': '☀️', 'IV': '👑',
  'V': '🏛️', 'VI': '💕', 'VII': '🏎️', 'VIII': '⚖️', 'IX': '🔮',
  'X': '🎡', 'XI': '💪', 'XII': '🙃', 'XIII': '💀', 'XIV': '⚗️',
  'XV': '😈', 'XVI': '🗼', 'XVII': '⭐', 'XVIII': '🌙', 'XIX': '☀️',
  'XX': 'judgement', 'XXI': '🌍',
}

function getSymbol(arcana: string, suit: string | null | undefined, rank: string | null | undefined): string {
  if (arcana === 'major' && rank && majorSymbols[rank]) return majorSymbols[rank]
  if (suit && suitSymbols[suit]) return suitSymbols[suit]
  return '✦'
}

function getCardColor(arcana: string, suit: string | null | undefined): string {
  if (arcana === 'major') return '#d4a843'
  const colors: Record<string, string> = {
    wands: '#e8723a',
    cups: '#4a9ede',
    swords: '#9ba4b4',
    pentacles: '#5cad5c',
  }
  return suit ? colors[suit] || '#d4a843' : '#d4a843'
}

export default function TarotCard({
  name,
  arcana,
  suit,
  rank,
  reversed = false,
  faceUp = false,
  onClick,
  className = '',
  style,
  delay = 0,
}: TarotCardProps) {
  const symbol = getSymbol(arcana, suit, rank)
  const accentColor = getCardColor(arcana, suit)

  return (
    <motion.div
      className={`tarot-card ${faceUp ? 'is-flipped' : ''} ${onClick ? 'is-clickable' : ''} ${className}`}
      style={style}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      <div className="tarot-card-inner">
        {/* Back side */}
        <div className="tarot-card-face tarot-card-back">
          <div className="card-back-pattern">
            <div className="card-back-border">
              <div className="card-back-center">
                <span className="card-back-star">✦</span>
              </div>
            </div>
          </div>
        </div>

        {/* Front side */}
        <div
          className={`tarot-card-face tarot-card-front ${reversed ? 'is-reversed' : ''}`}
        >
          <div className="card-front-content" style={{ borderColor: accentColor + '40' }}>
            <div className="card-arcana-badge" style={{ backgroundColor: accentColor + '20', color: accentColor }}>
              {arcana === 'major' ? 'Major' : suit ? suit.charAt(0).toUpperCase() + suit.slice(1) : ''}
            </div>
            <div className="card-symbol" style={{ color: accentColor }}>
              {symbol}
            </div>
            <div className="card-name">{name}</div>
            {reversed && <div className="card-reversed-badge">Reversed</div>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
