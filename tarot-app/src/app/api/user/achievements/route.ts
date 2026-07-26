import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId: user.id },
    include: { achievement: true },
  })

  const achievements = userAchievements.map(ua => ({
    ...ua.achievement,
    earnedAt: ua.earnedAt,
  }))

  return NextResponse.json({ achievements })
}
