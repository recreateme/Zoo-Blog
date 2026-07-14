import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminSession } from '@/lib/rbac'
import { applyRateLimit } from '@/lib/rate-limit'
import { getDeployStatus, runGitSync } from '@/lib/deploy-ops'
import { z } from 'zod'

export const maxDuration = 180

const BodySchema = z.object({
  message: z.string().max(200).optional(),
  confirm: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const rl = applyRateLimit(req, 'api-admin-git-sync', 10, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    )
  }

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 })
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
  }

  try {
    const body = BodySchema.parse(await req.json().catch(() => ({})))
    if (body.confirm === false) {
      return NextResponse.json({ error: '已取消' }, { status: 400 })
    }

    const status = await getDeployStatus()
    if (!status.gitReady) {
      return NextResponse.json(
        { error: '当前环境不是 git 仓库，无法推送', status },
        { status: 400 }
      )
    }

    const actor = session.user?.email ?? session.user?.name ?? null
    console.info(`[deploy] git-sync by ${actor}`)
    const result = await runGitSync({ message: body.message, actor })
    return NextResponse.json({ success: result.success, result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '参数无效' }, { status: 400 })
    }
    console.error('git-sync error:', error)
    return NextResponse.json({ error: '推送失败' }, { status: 500 })
  }
}
