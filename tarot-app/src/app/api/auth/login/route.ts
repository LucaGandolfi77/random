import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  console.log('[LOGIN API] Received login request')

  try {
    const body = await request.json()
    const { email, password } = body
    console.log('[LOGIN API] Email:', email, '| Password length:', password?.length)

    if (!email || !password) {
      console.log('[LOGIN API] Missing email or password')
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    console.log('[LOGIN API] Looking up user in database...')
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.log('[LOGIN API] User not found:', email)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    console.log('[LOGIN API] User found:', user.id, '| name:', user.name)

    console.log('[LOGIN API] Verifying password...')
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      console.log('[LOGIN API] Password verification failed')
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    console.log('[LOGIN API] Password verified OK')

    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const lastLoginDay = user.lastLoginAt?.toISOString().slice(0, 10)

    let streak = user.loginStreak
    if (lastLoginDay !== today) {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)
      streak = lastLoginDay === yesterdayStr ? streak + 1 : 1

      const dailyReward = 5 + Math.min(streak - 1, 15)
      console.log('[LOGIN API] Updating streak:', streak, '| reward:', dailyReward)

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginStreak: streak,
          lastLoginAt: now,
          coins: { increment: dailyReward },
        },
      })
    }

    console.log('[LOGIN API] Signing JWT token...')
    const token = await signToken({ userId: user.id, email: user.email })
    console.log('[LOGIN API] Token signed, length:', token.length)

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, coins: user.coins, xp: user.xp, level: user.level, loginStreak: streak },
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    console.log('[LOGIN API] Cookie set, returning success')
    console.log('[LOGIN API] NODE_ENV:', process.env.NODE_ENV)
    console.log('[LOGIN API] JWT_SECRET set:', !!process.env.JWT_SECRET)

    return response
  } catch (error) {
    console.error('[LOGIN API] ERROR:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error as Error).message }, { status: 500 })
  }
}