import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import ExternalClientsClient from './external-clients-client'

export const metadata = { title: 'Klientët e Jashtëm — Fiscalix' }

export default async function ExternalClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['accountant','admin'].includes(profile?.role || '')) redirect('/accountant')

  const { data: clients } = await supabase
    .from('external_clients')
    .select(`*, external_documents(id, file_name, file_url, file_size, mime_type, uploaded_at, downloaded_at)`)
    .eq('accountant_id', user.id)
    .order('created_at', { ascending: false })

  return <ExternalClientsClient accountantId={user.id} initialClients={clients || []} />
}
