import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // 先查数据库用户
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          if (user) {
            const valid = await bcrypt.compare(credentials.password, user.password)
            if (valid) {
              return {
                id: user.id,
                email: user.email,
                name: user.name ?? user.email,
                role: user.role,
              }
            }
            return null
          }
        } catch {
          // 数据库未初始化时跳过
        }

        // 回退：验证环境变量中的管理员账号（首次使用）
        const adminEmail = process.env.ADMIN_EMAIL?.trim().replace(/^["']|["']$/g, '')
        const adminPassword = process.env.ADMIN_PASSWORD?.trim().replace(/^["']|["']$/g, '')
        const inputEmail = credentials.email.trim()
        const inputPassword = credentials.password
        if (
          adminEmail &&
          adminPassword &&
          inputEmail === adminEmail &&
          inputPassword === adminPassword
        ) {
          return { id: 'env-admin', email: adminEmail, name: 'Admin', role: 'ADMIN' }
        }

        return null
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role?: string }).role ?? 'ADMIN'
      }
      return token
    },
    session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: (token.role as string) ?? 'ADMIN',
        },
      }
    },
  },
}
