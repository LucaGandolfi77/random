import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  console.log('[DEBUG API] Endpoint hit')

  const result: any = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    jwtSecretSet: !!process.env.JWT_SECRET,
    databaseUrlSet: !!process.env.DATABASE_URL,
  }

  // Check if token cookie exists
  const token = request.cookies.get('token')?.value
  result.tokenCookiePresent = !!token
  result.tokenCookieLength = token?.length || 0

  if (token) {
    result.tokenPreview = token.slice(0, 20) + '...'
  }

  // Try to get user from token
  const user = await getUser(request)
  result.userFromToken = user ? { id: user.id, name: user.name, email: user.email } : null

  // Count users in DB
  try {
    const userCount = await prisma.user.count()
    result.totalUsersInDb = userCount

    const testUser = await prisma.user.findUnique({ where: { email: 'test@arcana.app' } })
    result.testUserExists = !!testUser
    if (testUser) {
      result.testUserInfo = { id: testUser.id, name: testUser.name, coins: testUser.coins }
    }
  } catch (err) {
    result.dbError = (err as Error).message
  }

  console.log('[DEBUG API] Result:', JSON.stringify(result, null, 2))

  return NextResponse.json(result)
}