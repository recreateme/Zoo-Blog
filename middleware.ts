import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    if (
      req.nextUrl.pathname.startsWith('/admin/settings') &&
      req.nextauth.token?.role === 'EDITOR'
    ) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    }

    // 已登录用户访问 /admin/login 时重定向到仪表盘
    if (req.nextUrl.pathname === '/admin/login' && req.nextauth.token) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl
        // 只有已登录用户可以访问 /admin（login 页面除外）
        if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
          return !!token
        }
        return true
      },
    },
    pages: {
      signIn: '/admin/login',
    },
  }
)

export const config = {
  matcher: ['/admin/:path*'],
}
