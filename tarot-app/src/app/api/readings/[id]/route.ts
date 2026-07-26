import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const reading = await prisma.reading.findUnique({
    where: { id },
    include: {
      spread: { select: { name: true, slug: true, positionsJson: true, cardCount: true } },
      deck: { select: { name: true, slug: true, themeJson: true } },
    },
  })

  if (!reading || reading.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ reading })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const reading = await prisma.reading.findUnique({ where: { id } })
  if (!reading || reading.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.reading.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
