import { createClient }    from '@/lib/supabase/server'
import { redirect }        from 'next/navigation'
import { RESTAURANT_TYPES } from '@/lib/business-categories'

const ALLOWED_TYPES = [...RESTAURANT_TYPES, 'market','pharmacy','bakery','salon','health','barber','beauty','spa','gym','other','b2b']

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role, companies(business_type)')
      .eq('id', user.id)
      .single()

    if (userData?.role === 'admin')      redirect('/admin')
    if (userData?.role === 'accountant') redirect('/accountant')

    const bizType = (userData?.companies as { business_type?: string } | null)?.business_type
    if (bizType && !ALLOWED_TYPES.includes(bizType)) redirect('/unsupported-plan')

    redirect('/dashboard')
  }

  redirect('/landing.html')
}
