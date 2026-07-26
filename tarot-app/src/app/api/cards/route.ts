import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const deckSlug = searchParams.get('deck') || undefined

  const where = deckSlug ? { deck: { slug: deckSlug } } : {}

  const cards = await prisma.card.findMany({
    where,
    include: { deck: { select: { name: true, slug: true } } },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json({ cards })
}
