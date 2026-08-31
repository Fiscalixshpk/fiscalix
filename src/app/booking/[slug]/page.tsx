import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BookingPageClient from './booking-client'

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // Gjej linkun e booking
  const { data: link } = await supabase
    .from('booking_links')
    .select('*, companies(name, email, phone, address)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!link) notFound()

  const companyId = link.company_id

  // Shërbimet aktive
  const { data: services } = await supabase
    .from('business_services')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name')

  // Terminet ekzistuese (vetëm datat dhe orët — pa info klientit)
  const today = new Date().toISOString().split('T')[0]
  const { data: bookedSlots } = await supabase
    .from('appointments')
    .select('appointment_date, appointment_time, duration_minutes')
    .eq('company_id', companyId)
    .gte('appointment_date', today)
    .in('status', ['confirmed', 'completed'])

  return (
    <BookingPageClient
      companyId={companyId}
      company={link.companies}
      linkTitle={link.title || link.companies?.name}
      services={services || []}
      bookedSlots={bookedSlots || []}
    />
  )
}
