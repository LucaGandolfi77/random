'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [debugLog, setDebugLog] = useState<string[]>([])

  function log(msg: string) {
    console.log('[LOGIN PAGE]', msg)
    setDebugLog(prev => [...prev, msg])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setDebugLog([])
    log('Submit button pressed')
    log(`Email: ${email}`)
    log(`Password length: ${password.length}`)

    try {
      log('Sending fetch to /api/auth/login...')
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      log(`Response status: ${res.status}`)
      log(`Response ok: ${res.ok}`)

      const data = await res.json()
      log(`Response data: ${JSON.stringify(data)}`)

      if (!res.ok) {
        const errMsg = data.error || 'Login failed'
        log(`Login failed: ${errMsg}`)
        setError(errMsg)
        return
      }

      log('Login successful! Token cookie should be set.')
      log('Redirecting to /dashboard via window.location.href...')

      // Small delay to ensure cookie is stored
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 200)
    } catch (err) {
      log(`Network error: ${(err as Error).message}`)
      setError('Network error: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-mystic-surface rounded-2xl p-8 border border-mystic-gold/10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-cormorant)' }}>Welcome Back</h1>
          <p className="text-mystic-muted mt-2">Sign in to your Arcana account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-mystic-muted mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-mystic-dark border border-mystic-gold/20 rounded-lg text-mystic-text focus:outline-none focus:border-mystic-gold"
              placeholder="test@arcana.app"
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
              placeholder="test123"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg">{error}</div>
          )}

          {/* Debug log visible on screen */}
          {debugLog.length > 0 && (
            <div className="text-xs text-mystic-muted bg-mystic-dark rounded-lg p-3 max-h-40 overflow-y-auto border border-mystic-gold/10 font-mono">
              {debugLog.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-mystic-gold text-mystic-dark rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-mystic-muted bg-mystic-dark rounded-lg p-2 border border-mystic-gold/10">
          Test account: <span className="text-mystic-gold font-mono">test@arcana.app</span> / <span className="text-mystic-gold font-mono">test123</span>
        </div>

        <p className="text-center text-mystic-muted text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-mystic-gold hover:underline">Register</Link>
        </p>
      </div>
    </div>
  )
}