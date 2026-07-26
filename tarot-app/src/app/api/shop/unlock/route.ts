import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

const ITEM_COSTS: Record<string, Record<string, number>> = {
  deck: {
    marseille: 500,
    shadow: 800,
  },
  spread: {
    'yes-no': 150,
    'love': 250,
    'horseshoe': 250,
    'celtic-cross': 300,
  },
  feature: {
    runes: 800,
    biorhythm: 300,
  },
}

export async function POST(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { itemType, itemSlug } = await request.json()

    if (!itemType || !itemSlug) {
      return NextResponse.json({ error: 'itemType and itemSlug required' }, { status: 400 })
    }

    const cost = ITEM_COSTS[itemType]?.[itemSlug]
    if (!cost) {
      return NextResponse.json({ error: 'Invalid item' }, { status: 400 })
    }

    const existing = await prisma.unlock.findUnique({
      where: { userId_itemType_itemSlug: { userId: user.id, itemType, itemSlug } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Already unlocked' }, { status: 409 })
    }

    if (user.coins < cost) {
      return NextResponse.json({ error: 'Not enough Stardust' }, { status: 400 })
    }

    const [, updatedUser] = await prisma.$transaction([
      prisma.unlock.create({
        data: { userId: user.id, itemType, itemSlug },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { coins: { decrement: cost } },
      }),
    ])

    const unlockAchievement = await prisma.achievement.findUnique({
      where: { slug: 'first-unlock' },
    })
    if (unlockAchievement) {
      const existing = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: { userId: user.id, achievementId: unlockAchievement.id },
        },
      }).catch(() => null)
      if (!existing) {
        await prisma.userAchievement.create({
          data: { userId: user.id, achievementId: unlockAchievement.id },
        }).catch(() => {})
      }
    }

    return NextResponse.json({
      coins: updatedUser.coins,
      itemType,
      itemSlug,
    })
  } catch (error) {
    console.error('Unlock error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const unlocks = await prisma.unlock.findMany({
    where: { userId: user.id },
  })

  return NextResponse.json({ unlocks })
}
