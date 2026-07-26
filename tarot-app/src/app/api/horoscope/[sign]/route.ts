import { NextRequest, NextResponse } from 'next/server'
import { ZODIAC_SIGNS } from '@/lib/auth'
import { getHoroscope } from '@/data/horoscopes'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sign: string }> },
) {
  const { sign } = await params

  if (!ZODIAC_SIGNS.includes(sign as any)) {
    return NextResponse.json({ error: 'Invalid sign' }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const seed = `${sign}_${today}`

  return NextResponse.json({
    sign,
    date: today,
    love: getHoroscope(sign, 'love', `${seed}_love`),
    career: getHoroscope(sign, 'career', `${seed}_career`),
    health: getHoroscope(sign, 'health', `${seed}_health`),
  })
}
