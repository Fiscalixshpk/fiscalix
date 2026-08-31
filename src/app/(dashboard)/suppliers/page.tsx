import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import SuppliersClient  from './suppliers-client'

export const metadata = { title: 'Furnitorët — Fiscalix' }

export default async function SuppliersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id) redirect('/dashboard')

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('*')
    .eq('company_id', userData.company_id)
    .order('name', { ascending: true })

  return <SuppliersClient companyId={userData.company_id} userId={user.id} initialSuppliers={suppliers || []} />
}
