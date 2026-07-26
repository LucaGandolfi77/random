import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'

const protectedPages = ['/dashboard', '/read', '/history', '/shop', '/profile', '/fortune', '/collection']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  console.log('[MIDDLEWARE] Request:', pathname)

  const isApiAuth = pathname.startsWith('/api/auth') || pathname.startsWith('/api/debug')
  const isApi = pathname.startsWith('/api')
  const isPageProtected = protectedPages.some(p => pathname.startsWith(p))

  console.log('[MIDDLEWARE] isApiAuth:', isApiAuth, '| isApi:', isApi, '| isPageProtected:', isPageProtected)

  if (!isApiAuth && (isApi || isPageProtected)) {
    const token = request.cookies.get('token')?.value
    console.log('[MIDDLEWARE] Token cookie present:', !!token)

    if (!token) {
      console.log('[MIDDLEWARE] No token → redirecting to /login')
      if (isApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = await verifyToken(token)
    console.log('[MIDDLEWARE] Token verified:', !!payload)

    if (!payload) {
      console.log('[MIDDLEWARE] Token invalid → redirecting to /login')
      if (isApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('token')
      return response
    }

    console.log('[MIDDLEWARE] Access granted for:', pathname)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/read', '/read/:path*', '/history', '/history/:path*', '/shop', '/shop/:path*', '/profile', '/profile/:path*', '/fortune', '/fortune/:path*', '/collection', '/collection/:path*', '/api/:path*'],
}