// 登录页与受保护后台共用此层，不做鉴权（鉴权在 (dashboard)/layout.tsx）
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
