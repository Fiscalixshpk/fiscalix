import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { fiscalize }                 from '@/lib/atk/fiscalizer'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { companyId, environment } = await req.json()

  const { data: device } = await supabase
    .from('pos_devices')
    .select('*')
    .eq('company_id', companyId)
    .eq('environment', environment)
    .in('status', ['onboarded', 'active'])
    .order('pos_id')
    .limit(1)
    .maybeSingle()

  if (!device) return NextResponse.json({ error: 'Pajisja nuk u gjet' }, { status: 404 })
  if (!device.private_key_enc) return NextResponse.json({ error: 'Private key mungon' }, { status: 422 })

  const { data: company } = await supabase
    .from('companies').select('nui, location_city').eq('id', companyId).single()

  if (!company?.nui) return NextResponse.json({ error: 'NUI mungon' }, { status: 422 })

  try {
    const result = await fiscalize({
      businessNui:   Number(company.nui.replace(/\D/g,'')) || 0,
      locationCity:  company.location_city ?? 'Kosovë',
      posId:         device.pos_id,
      branchId:      device.branch_id ?? 1,
      applicationId: device.application_id ?? 857345132322,
      privateKeyPem: device.private_key_enc,
      certificatePem: device.certificate_pem ?? undefined,
      environment:   environment as 'TEST' | 'PROD',
      couponId:      99999,
      couponType:    'SALE',
      referenceNo:   0,
      operatorName:  'Verify Test',
      paymentMethod: 'cash',
      items: [{ productId: 'test', name: 'Test Item', emoji: '🧪', price: 10000, unit: 'cope', quantity: 1, taxRate: 'E', total: 100 }],
      totals: { subtotal: 100, tax: 18, noTax: 82, discount: 0, total: 100 },
      issuedAt: new Date(),
    })

    if (result.status === 'fiscalized') {
      return NextResponse.json({ success: true, transactionId: result.transactionId })
    }
    return NextResponse.json({ success: false, error: result.error })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Gabim' })
  }
}
