'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface UserInfo {
  id: string
  name: string
  email: string
  coins: number
  xp: number
  level: number
  loginStreak: number
  zodiacSign: string | null
}

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/read/new', label: 'New Reading' },
    { href: '/history', label: 'History' },
    { href: '/fortune', label: 'Fortune' },
    { href: '/shop', label: 'Shop' },
    { href: '/collection', label: 'Cards' },
    { href: '/profile', label: 'Profile' },
  ]

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-mystic-surface border-b border-mystic-gold/10">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="text-xl font-bold" style={{ fontFamily: 'var(--font-cormorant)' }}>
          Arcana
        </Link>
        <div className="hidden md:flex items-center gap-4">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                pathname === link.href || pathname.startsWith(link.href + '/')
                  ? 'text-mystic-gold'
                  : 'text-mystic-muted hover:text-mystic-text'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <>
            <span className="text-mystic-gold text-sm font-semibold">✦ {user.coins}</span>
            <span className="text-mystic-muted text-sm">Lv.{user.level}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-mystic-muted hover:text-mystic-text transition-colors"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
