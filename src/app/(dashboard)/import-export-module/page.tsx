import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ImportExportModuleClient from './import-export-module-client'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const companyId = profile?.company_id || ''
  const [{ data: d1 }, { data: d2 }, { data: d3 }] = await Promise.all([
    // @ts-ignore
    supabase.from('ie_suppliers').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200),
    supabase.from('ie_orders').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200),
    supabase.from('ie_warehouse').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200),
  ])
  return <ImportExportModuleClient companyId={companyId} data1={d1||[]} data2={d2||[]} data3={d3||[]} />
}
