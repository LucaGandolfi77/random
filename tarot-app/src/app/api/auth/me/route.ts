import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  console.log('[AUTH ME] Request received')

  const token = request.cookies.get('token')?.value
  console.log('[AUTH ME] Token cookie present:', !!token)
  if (token) {
    console.log('[AUTH ME] Token length:', token.length)
  }

  const user = await getUser(request)
  if (!user) {
    console.log('[AUTH ME] No valid user found → 401')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[AUTH ME] User authenticated:', user.id, '|', user.email)

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    coins: user.coins,
    xp: user.xp,
    level: user.level,
    loginStreak: user.loginStreak,
    zodiacSign: user.zodiacSign,
  })
}