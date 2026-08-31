import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BookingConfirmEditor from './booking-confirm-editor'
export default async function BookingConfirmPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const { data: company } = await supabase.from('companies').select('name,address,phone,email,vat_number').eq('id', profile?.company_id).single()
  return <BookingConfirmEditor company={company} />
}
