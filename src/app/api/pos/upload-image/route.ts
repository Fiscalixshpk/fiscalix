// POST — ngarko foto produkti te Supabase Storage
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ud } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  if (!ud?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 })

  const formData = await req.formData()
  const file     = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const ext  = file.name.split('.').pop() || 'jpg'
  const path = `${ud.company_id}/products/${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from('pos-images')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from('pos-images').getPublicUrl(path)
  return NextResponse.json({ url: urlData.publicUrl })
}
