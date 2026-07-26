'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          birthdate: birthdate || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      window.location.href = '/dashboard'
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-mystic-surface rounded-2xl p-8 border border-mystic-gold/10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-cormorant)' }}>Create Your Account</h1>
          <p className="text-mystic-muted mt-2">Begin your journey into the mystical</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-mystic-muted mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-mystic-dark border border-mystic-gold/20 rounded-lg text-mystic-text focus:outline-none focus:border-mystic-gold"
              placeholder="Your name"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-mystic-muted mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-mystic-dark border border-mystic-gold/20 rounded-lg text-mystic-text focus:outline-none focus:border-mystic-gold"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-mystic-muted mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-mystic-dark border border-mystic-gold/20 rounded-lg text-mystic-text focus:outline-none focus:border-mystic-gold"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm text-mystic-muted mb-1">Birthdate (optional)</label>
            <input
              type="date"
              value={birthdate}
              onChange={e => setBirthdate(e.target.value)}
              className="w-full px-4 py-2.5 bg-mystic-dark border border-mystic-gold/20 rounded-lg text-mystic-text focus:outline-none focus:border-mystic-gold"
            />
            <p className="text-xs text-mystic-muted mt-1">Used for your zodiac sign and numerology</p>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-mystic-gold text-mystic-dark rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-mystic-muted text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-mystic-gold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
