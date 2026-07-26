import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const readingCount = await prisma.reading.count({ where: { userId: user.id } })
  const unlockCount = await prisma.unlock.count({ where: { userId: user.id } })
  const achievementCount = await prisma.userAchievement.count({ where: { userId: user.id } })

  const mostReadSpread = await prisma.reading.groupBy({
    by: ['spreadId'],
    where: { userId: user.id },
    _count: true,
    orderBy: { _count: { spreadId: 'desc' } },
    take: 1,
  })

  let favoriteSpread = null
  if (mostReadSpread.length > 0) {
    const spread = await prisma.spread.findUnique({ where: { id: mostReadSpread[0].spreadId } })
    favoriteSpread = spread?.name || null
  }

  return NextResponse.json({
    readingCount,
    unlockCount,
    achievementCount,
    favoriteSpread,
  })
}
