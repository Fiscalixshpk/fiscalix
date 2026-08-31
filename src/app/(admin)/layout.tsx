import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/admin-layout'

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('role, full_name, email').eq('id', user.id).single()

  if (userData?.role !== 'admin') redirect('/dashboard')

  return (
    <AdminLayout user={{ full_name: userData.full_name, email: userData.email || user.email || '' }}>
      {children}
    </AdminLayout>
  )
}
