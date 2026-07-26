'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { getMoonPhase } from '@/lib/fortune/moon'
import { getLifePathNumber } from '@/lib/fortune/numerology'
import { getCompatibility, ZODIAC_NAMES } from '@/lib/fortune/compatibility'
import { getHoroscope } from '@/data/horoscopes'
import { fortuneCookies, eightBallAnswers } from '@/data/fortunes'
import { ZODIAC_SIGNS } from '@/lib/auth'

export default function FortunePage() {
  const [user, setUser] = useState<any>(null)
  const [horoscopeSign, setHoroscopeSign] = useState('aries')
  const [horoscopeContent, setHoroscopeContent] = useState<Record<string, string>>({})
  const [cookieMsg, setCookieMsg] = useState('')
  const [eightBallQuestion, setEightBallQuestion] = useState('')
  const [eightBallAnswer, setEightBallAnswer] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [lifePath, setLifePath] = useState<{ number: number; meaning: string } | null>(null)
  const [compat1, setCompat1] = useState('aries')
  const [compat2, setCompat2] = useState('taurus')
  const [compatResult, setCompatResult] = useState('')
  const [luckyNumbers, setLuckyNumbers] = useState<number[]>([])
  const [moonPhase] = useState(() => getMoonPhase(new Date()))

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(setUser)
  }, [])

  function handleHoroscope() {
    const today = new Date().toISOString().slice(0, 10)
    setHoroscopeContent({
      love: getHoroscope(horoscopeSign, 'love', `${today}_love`),
      career: getHoroscope(horoscopeSign, 'career', `${today}_career`),
      health: getHoroscope(horoscopeSign, 'health', `${today}_health`),
    })
  }

  function handleCookie() {
    const idx = Math.floor(Math.random() * fortuneCookies.length)
    setCookieMsg(fortuneCookies[idx])
  }

  function handleEightBall() {
    if (!eightBallQuestion.trim()) return
    const idx = Math.floor(Math.random() * eightBallAnswers.length)
    setEightBallAnswer(eightBallAnswers[idx])
  }

  function handleNumerology() {
    if (!birthdate) return
    const result = getLifePathNumber(new Date(birthdate))
    setLifePath(result)
  }

  function handleCompatibility() {
    setCompatResult(getCompatibility(compat1, compat2))
  }

  function handleLuckyNumbers() {
    const nums: number[] = []
    const today = new Date()
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
    let rng = seed
    while (nums.length < 6) {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff
      const n = (rng % 49) + 1
      if (!nums.includes(n)) nums.push(n)
    }
    setLuckyNumbers(nums)
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-cormorant)' }}>Fortune Hub</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Moon Phase */}
          <div className="bg-mystic-surface rounded-xl p-5 border border-mystic-gold/10">
            <h2 className="font-bold text-lg mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>Moon Phase</h2>
            <div className="text-center">
              <div className="text-5xl mb-2">{moonPhase.emoji}</div>
              <div className="font-semibold">{moonPhase.phase}</div>
              <div className="text-sm text-mystic-muted">{moonPhase.illumination}% illuminated</div>
            </div>
          </div>

          {/* Horoscope */}
          <div className="bg-mystic-surface rounded-xl p-5 border border-mystic-gold/10 md:col-span-2">
            <h2 className="font-bold text-lg mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>Daily Horoscope</h2>
            <div className="flex items-center gap-3 mb-4">
              <select
                value={horoscopeSign}
                onChange={e => setHoroscopeSign(e.target.value)}
                className="px-3 py-1.5 bg-mystic-dark border border-mystic-gold/20 rounded-lg text-mystic-text text-sm"
              >
                {ZODIAC_SIGNS.map(s => (
                  <option key={s} value={s}>{ZODIAC_NAMES[s] || s}</option>
                ))}
              </select>
              <button
                onClick={handleHoroscope}
                className="px-4 py-1.5 bg-mystic-gold text-mystic-dark rounded-lg text-sm font-semibold hover:opacity-90"
              >
                Read
              </button>
            </div>
            {horoscopeContent.love && (
              <div className="space-y-3">
                <div><span className="text-mystic-gold font-semibold">❤️ Love:</span> <span className="text-sm">{horoscopeContent.love}</span></div>
                <div><span className="text-mystic-gold font-semibold">💼 Career:</span> <span className="text-sm">{horoscopeContent.career}</span></div>
                <div><span className="text-mystic-gold font-semibold">🌿 Health:</span> <span className="text-sm">{horoscopeContent.health}</span></div>
              </div>
            )}
          </div>

          {/* Fortune Cookie */}
          <div className="bg-mystic-surface rounded-xl p-5 border border-mystic-gold/10">
            <h2 className="font-bold text-lg mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>Fortune Cookie</h2>
            <div className="text-center">
              <button
                onClick={handleCookie}
                className="text-5xl mb-3 cursor-pointer hover:scale-110 transition-transform bg-transparent border-none"
              >
                🥠
              </button>
              {cookieMsg && (
                <p className="text-sm italic text-mystic-gold mt-2">&ldquo;{cookieMsg}&rdquo;</p>
              )}
            </div>
          </div>

          {/* Magic 8-Ball */}
          <div className="bg-mystic-surface rounded-xl p-5 border border-mystic-gold/10">
            <h2 className="font-bold text-lg mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>Magic 8-Ball</h2>
            <input
              value={eightBallQuestion}
              onChange={e => setEightBallQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEightBall()}
              placeholder="Ask a yes/no question..."
              className="w-full px-3 py-2 bg-mystic-dark border border-mystic-gold/20 rounded-lg text-mystic-text text-sm mb-2 focus:outline-none focus:border-mystic-gold"
            />
            <button
              onClick={handleEightBall}
              className="w-full py-1.5 bg-mystic-gold text-mystic-dark rounded-lg text-sm font-semibold hover:opacity-90"
            >
              Shake
            </button>
            {eightBallAnswer && (
              <div className="text-center mt-3">
                <div className="text-3xl mb-1">🔮</div>
                <p className="text-sm font-semibold text-mystic-gold">{eightBallAnswer}</p>
              </div>
            )}
          </div>

          {/* Lucky Numbers */}
          <div className="bg-mystic-surface rounded-xl p-5 border border-mystic-gold/10">
            <h2 className="font-bold text-lg mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>Lucky Numbers</h2>
            <button
              onClick={handleLuckyNumbers}
              className="w-full py-1.5 bg-mystic-gold text-mystic-dark rounded-lg text-sm font-semibold hover:opacity-90 mb-3"
            >
              Generate
            </button>
            {luckyNumbers.length > 0 && (
              <div className="flex gap-2 justify-center flex-wrap">
                {luckyNumbers.map(n => (
                  <span key={n} className="w-10 h-10 rounded-full bg-mystic-card border border-mystic-gold/30 flex items-center justify-center font-bold text-mystic-gold">
                    {n}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Numerology */}
          <div className="bg-mystic-surface rounded-xl p-5 border border-mystic-gold/10">
            <h2 className="font-bold text-lg mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>Life Path Number</h2>
            <input
              type="date"
              value={birthdate}
              onChange={e => setBirthdate(e.target.value)}
              className="w-full px-3 py-2 bg-mystic-dark border border-mystic-gold/20 rounded-lg text-mystic-text text-sm mb-2 focus:outline-none focus:border-mystic-gold"
              placeholder="Your birthdate"
            />
            <button
              onClick={handleNumerology}
              className="w-full py-1.5 bg-mystic-gold text-mystic-dark rounded-lg text-sm font-semibold hover:opacity-90"
            >
              Calculate
            </button>
            {lifePath && (
              <div className="mt-3 text-center">
                <div className="text-3xl font-bold text-mystic-gold">{lifePath.number}</div>
                <p className="text-sm text-mystic-muted mt-1">{lifePath.meaning}</p>
              </div>
            )}
          </div>

          {/* Compatibility */}
          <div className="bg-mystic-surface rounded-xl p-5 border border-mystic-gold/10">
            <h2 className="font-bold text-lg mb-3" style={{ fontFamily: 'var(--font-cormorant)' }}>Zodiac Compatibility</h2>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <select
                value={compat1}
                onChange={e => setCompat1(e.target.value)}
                className="px-2 py-1.5 bg-mystic-dark border border-mystic-gold/20 rounded-lg text-mystic-text text-sm"
              >
                {ZODIAC_SIGNS.map(s => (
                  <option key={s} value={s}>{ZODIAC_NAMES[s] || s}</option>
                ))}
              </select>
              <select
                value={compat2}
                onChange={e => setCompat2(e.target.value)}
                className="px-2 py-1.5 bg-mystic-dark border border-mystic-gold/20 rounded-lg text-mystic-text text-sm"
              >
                {ZODIAC_SIGNS.map(s => (
                  <option key={s} value={s}>{ZODIAC_NAMES[s] || s}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCompatibility}
              className="w-full py-1.5 bg-mystic-gold text-mystic-dark rounded-lg text-sm font-semibold hover:opacity-90"
            >
              Check Compatibility
            </button>
            {compatResult && (
              <p className="text-sm text-mystic-muted mt-2">{compatResult}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
