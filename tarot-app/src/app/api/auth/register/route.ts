import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, signToken, getZodiacSign } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, birthdate } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const birthDateObj = birthdate ? new Date(birthdate) : null
    const zodiacSign = birthDateObj ? getZodiacSign(birthDateObj) : null

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        birthdate: birthDateObj,
        zodiacSign,
        loginStreak: 1,
        lastLoginAt: new Date(),
      },
    })

    const token = await signToken({ userId: user.id, email: user.email })

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, coins: user.coins, xp: user.xp, level: user.level },
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
