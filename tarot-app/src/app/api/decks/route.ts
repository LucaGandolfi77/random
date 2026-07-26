import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const decks = await prisma.deck.findMany({ orderBy: { sortOrder: 'asc' } })

  const unlocks = await prisma.unlock.findMany({
    where: { userId: user.id, itemType: 'deck' },
  })
  const unlockedSlugs = new Set(unlocks.map(u => u.itemSlug))

  const result = decks.map(d => ({
    ...d,
    unlocked: d.isDefault || unlockedSlugs.has(d.slug),
  }))

  return NextResponse.json({ decks: result })
}
