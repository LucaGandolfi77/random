'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

interface ReadingSummary {
  id: string
  spread: { name: string; slug: string; cardCount: number }
  question: string | null
  createdAt: string
}

export default function HistoryPage() {
  const router = useRouter()
  const [readings, setReadings] = useState<ReadingSummary[]>([])
  const [loading, setLoading] = useState(true)

  function loadReadings() {
    setLoading(true)
    fetch('/api/readings')
      .then(r => r.json())
      .then(data => {
        setReadings(data.readings || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadReadings() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this reading?')) return
    await fetch(`/api/readings/${id}`, { method: 'DELETE' })
    setReadings(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-cormorant)' }}>
          Reading History
        </h1>

        {loading ? (
          <p className="text-mystic-muted">Loading...</p>
        ) : readings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📜</div>
            <p className="text-mystic-muted">No readings yet.</p>
            <Link
              href="/read/new"
              className="inline-block mt-4 px-6 py-2 bg-mystic-gold text-mystic-dark rounded-lg font-semibold hover:opacity-90"
            >
              Your First Reading
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {readings.map(r => (
              <div
                key={r.id}
                className="bg-mystic-surface rounded-xl p-5 border border-mystic-gold/10 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <Link href={`/read/${r.id}`} className="hover:text-mystic-gold transition-colors">
                    <h3 className="font-bold text-lg">{r.spread.name}</h3>
                  </Link>
                  {r.question && (
                    <p className="text-sm text-mystic-muted mt-1 truncate">&ldquo;{r.question}&rdquo;</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-mystic-muted">
                    <span>{r.spread.cardCount} cards</span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/read/${r.id}`}
                    className="text-sm text-mystic-gold hover:underline"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
