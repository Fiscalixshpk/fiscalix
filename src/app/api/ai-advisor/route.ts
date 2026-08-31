import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()

  const { data: sub } = await supabase
    .from('subscriptions').select('plan').eq('company_id', profile?.company_id).maybeSingle()

  if (!['advanced', 'enterprise'].includes(sub?.plan || '')) {
    return NextResponse.json({ error: 'Advanced plan required' }, { status: 403 })
  }

  const { messages, financialContext } = await req.json()

  // Build system prompt with financial context
  const systemPrompt = `Ti je AI Kontabilisti i Fiscalix — asistenti financiar personal i biznesit.

KONTEKSTI FINANCIAR I BIZNESIT (të dhëna reale):
${JSON.stringify(financialContext, null, 2)}

ROLI YT:
- Je kontabilist dhe këshilltar financiar i specializuar për bizneset e Kosovës
- Analizon të dhënat financiare reale të biznesit dhe jep këshilla praktike
- Flet shqip, je miqësor por profesional
- Jep parashikime bazuar në trendet e të dhënave
- Këshillon për TVSH, tatim fitimi, shpenzime të zbritshme sipas ligjit kosovar
- Identifikon rreziqe dhe mundësi

AFTËSITË:
1. Analizon rrjedhën e parasë (cashflow) dhe parashikon muajt e ardhshëm
2. Identifikon fatura të vonuara dhe rrezikun e mos-pagesës
3. Këshillon për shpenzime të zbritshme dhe optimizim tatimor
4. Paralajmëron për afate tatimore të ATK-së
5. Krahason performancën me periudhën paraardhëse
6. Sugjeron strategji për rritje të fitimit

FORMATI I PËRGJIGJES:
- Përdor numra konkretë nga të dhënat e biznesit
- Jep rekomandime specifike dhe të veprueshme
- Kur parashikon, shpjego arsyetimin
- Përdor emoji për ta bërë leximin më të lehtë
- Formato me bullet points kur ke lista`

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ reply: 'AI Kontabilisti nuk është konfiguruar. Kontakto administratorin për të shtuar OpenAI API key.' })
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1500,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    return NextResponse.json({ error: err.error?.message || 'OpenAI error' }, { status: 500 })
  }

  const data = await response.json()
  const reply = data.choices[0]?.message?.content || ''

  return NextResponse.json({ reply })

  } catch (err) {
    console.error('AI advisor error:', err)
    const msg = err instanceof Error ? err.message : 'Gabim i brendshëm'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}