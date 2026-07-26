import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { getReadingReward, computeLevel } from '@/lib/coins'

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = 20

  const readings = await prisma.reading.findMany({
    where: { userId: user.id },
    include: {
      spread: { select: { name: true, slug: true, cardCount: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = readings.length > limit
  const items = hasMore ? readings.slice(0, limit) : readings
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({ readings: items, nextCursor })
}

export async function POST(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { spreadId, deckId, question, cardsJson } = await request.json()

    if (!spreadId || !deckId || !cardsJson) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const spread = await prisma.spread.findUnique({ where: { id: spreadId } })
    if (!spread) {
      return NextResponse.json({ error: 'Spread not found' }, { status: 404 })
    }

    const deck = await prisma.deck.findUnique({ where: { id: deckId } })
    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    const cards = JSON.parse(cardsJson)
    if (!Array.isArray(cards) || cards.length !== spread.cardCount) {
      return NextResponse.json({ error: 'Invalid cards data' }, { status: 400 })
    }

    const reward = getReadingReward(spread.cardCount)

    const reading = await prisma.reading.create({
      data: {
        userId: user.id,
        spreadId,
        deckId,
        question: question || null,
        cardsJson,
      },
    })

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        coins: { increment: reward.coins },
        xp: { increment: reward.xp },
        level: computeLevel(user.xp + reward.xp),
      },
    })

    const newAchievements: string[] = []
    const readingCount = await prisma.reading.count({ where: { userId: user.id } })

    const achievementChecks = [
      { slug: 'first-reading', required: 1 },
      { slug: 'ten-readings', required: 10 },
      { slug: 'fifty-readings', required: 50 },
    ]

    for (const check of achievementChecks) {
      if (readingCount >= check.required) {
        const existing = await prisma.userAchievement.findUnique({
          where: { userId_achievementId: { userId: user.id, achievementId: '' } },
        })

        const achievement = await prisma.achievement.findUnique({
          where: { slug: check.slug },
        })

        if (achievement && !existing) {
          try {
            await prisma.userAchievement.create({
              data: { userId: user.id, achievementId: achievement.id },
            })
            await prisma.user.update({
              where: { id: user.id },
              data: {
                coins: { increment: achievement.coinsReward },
                xp: { increment: achievement.xpReward },
              },
            })
            newAchievements.push(achievement.name)
          } catch {
            // Already exists, ignore
          }
        }
      }
    }

    if (spread.slug === 'celtic-cross') {
      const achievement = await prisma.achievement.findUnique({
        where: { slug: 'first-celtic' },
      })
      if (achievement) {
        const existing = await prisma.userAchievement.findUnique({
          where: { userId_achievementId: { userId: user.id, achievementId: achievement.id } },
        }).catch(() => null)
        if (!existing) {
          try {
            await prisma.userAchievement.create({
              data: { userId: user.id, achievementId: achievement.id },
            })
            await prisma.user.update({
              where: { id: user.id },
              data: {
                coins: { increment: achievement.coinsReward },
                xp: { increment: achievement.xpReward },
              },
            })
            newAchievements.push(achievement.name)
          } catch { /* ignore */ }
        }
      }
    }

    return NextResponse.json({
      reading,
      coinsAwarded: reward.coins + (newAchievements.length > 0 ? 0 : 0),
      xpAwarded: reward.xp,
      coins: updatedUser.coins,
      xp: updatedUser.xp,
      level: updatedUser.level,
      newAchievements,
    })
  } catch (error) {
    console.error('Create reading error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
