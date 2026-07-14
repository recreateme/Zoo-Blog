import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminSession } from '@/lib/rbac'
import { getDeployStatus } from '@/lib/deploy-ops'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }

  const status = await getDeployStatus()
  return NextResponse.json(status)
}
