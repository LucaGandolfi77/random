import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { getTodaySeed, seededShuffle, mulberry32 } from '@/lib/rng'

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)
  const seed = getTodaySeed(user.id)

  const cards = await prisma.card.findMany({
    where: { deck: { isDefault: true } },
    orderBy: { sortOrder: 'asc' },
  })

  const shuffled = seededShuffle(cards, seed)
  const pick = shuffled[0]
  const rng = mulberry32(seed.length + 42)
  const reversed = rng() < 0.3

  const claimed = user.lastDailyCardAt?.toISOString().slice(0, 10) === today
  const dailyCoins = 3

  return NextResponse.json({
    card: {
      name: pick.name,
      uprightMeaning: pick.uprightMeaning,
      reversedMeaning: pick.reversedMeaning,
      keywords: pick.keywords,
      imagePath: pick.imagePath,
      reversed,
    },
    claimed,
    dailyCoins,
  })
}
