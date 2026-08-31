import { createClient } from '@/lib/supabase/server'
import { notFound }     from 'next/navigation'
import UploadClient     from './upload-client'

export default async function UploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase  = createClient()

  const { data: client } = await (await supabase)
    .from('external_clients')
    .select('id, name, vat_number')
    .eq('upload_token', token)
    .single()

  if (!client) return notFound()

  return <UploadClient clientId={client.id} clientName={client.name} token={token} />
}
