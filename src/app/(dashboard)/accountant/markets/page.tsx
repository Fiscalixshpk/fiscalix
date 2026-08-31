import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LightweightClientsClient from '@/components/accountant/lightweight-clients-client'

export default async function MarketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['accountant', 'admin'].includes(profile?.role || '')) redirect('/dashboard')

  return <LightweightClientsClient />
}
