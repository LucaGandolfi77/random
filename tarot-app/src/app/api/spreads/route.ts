import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const spreads = await prisma.spread.findMany({ orderBy: { sortOrder: 'asc' } })

  const unlocks = await prisma.unlock.findMany({
    where: { userId: user.id, itemType: 'spread' },
  })
  const unlockedSlugs = new Set(unlocks.map(u => u.itemSlug))

  const result = spreads.map(s => ({
    ...s,
    unlocked: s.isDefault || unlockedSlugs.has(s.slug),
  }))

  return NextResponse.json({ spreads: result })
}
