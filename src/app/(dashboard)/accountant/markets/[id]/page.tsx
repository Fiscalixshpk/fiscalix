import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LightweightClientDetail from '@/components/accountant/lightweight-client-detail'

export default async function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('lightweight_clients')
    .select('*')
    .eq('id', id)
    .eq('accountant_id', user.id)
    .maybeSingle()

  if (!client) redirect('/accountant/markets')

  return <LightweightClientDetail client={client} />
}
