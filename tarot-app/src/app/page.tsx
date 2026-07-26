import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-2xl">
        <div className="mb-4">
          <span className="text-6xl">🔮</span>
        </div>
        <h1
          className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Arcana
        </h1>
        <p className="text-xl md:text-2xl text-mystic-muted mb-10">
          Tarot readings, horoscopes, and divination tools — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3 bg-mystic-gold text-mystic-dark rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 border border-mystic-gold text-mystic-gold rounded-lg font-semibold text-lg hover:bg-mystic-gold/10 transition-colors"
          >
            Sign In
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 text-left">
          <div className="bg-mystic-surface p-6 rounded-xl border border-mystic-gold/10">
            <h3 className="font-bold text-lg mb-2" style={{ fontFamily: "var(--font-cormorant)" }}>Card Readings</h3>
            <p className="text-mystic-muted text-sm">Full 78-card deck with multiple spreads and detailed interpretations.</p>
          </div>
          <div className="bg-mystic-surface p-6 rounded-xl border border-mystic-gold/10">
            <h3 className="font-bold text-lg mb-2" style={{ fontFamily: "var(--font-cormorant)" }}>Daily Fortune</h3>
            <p className="text-mystic-muted text-sm">Horoscopes, moon phases, lucky numbers, and more divination tools.</p>
          </div>
          <div className="bg-mystic-surface p-6 rounded-xl border border-mystic-gold/10">
            <h3 className="font-bold text-lg mb-2" style={{ fontFamily: "var(--font-cormorant)" }}>Earn & Unlock</h3>
            <p className="text-mystic-muted text-sm">Earn Stardust with each reading, unlock new decks and spreads.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
