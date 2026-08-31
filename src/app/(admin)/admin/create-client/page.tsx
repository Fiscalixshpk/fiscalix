import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import CreateClientForm from './create-client-form'
import { Suspense }     from 'react'

export const metadata = { title: 'Krijo Llogari — Admin' }

export default async function CreateClientPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <Suspense fallback={<div style={{ padding: 40, color: 'var(--text-3)' }}>Duke ngarkuar...</div>}>
      <CreateClientForm />
    </Suspense>
  )
}
