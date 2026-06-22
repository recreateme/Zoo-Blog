import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import AdminSidebar from '../AdminSidebar'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  )
}
