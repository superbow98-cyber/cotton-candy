import { redirect } from 'next/navigation'
import { isAdminUser } from '@/lib/admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = await isAdminUser()

  if (!isAdmin) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
