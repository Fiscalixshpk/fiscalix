import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// This endpoint can be called by a cron job (e.g. Vercel Cron)
// POST /api/recurring/generate
// Authorization: Bearer CRON_SECRET

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Get all active recurring invoices due today or earlier
    const { data: dueRecurring } = await supabase
      .from('recurring_invoices')
      .select('*')
      .eq('status', 'active')
      .lte('next_invoice_date', today)

    if (!dueRecurring || dueRecurring.length === 0) {
      return NextResponse.json({ success: true, generated: 0, message: 'Nuk ka fatura për gjenerim' })
    }

    let generated = 0
    const errors: string[] = []

    for (const recurring of dueRecurring) {
      try {
        // Get next invoice number
        const { count } = await supabase
          .from('invoices').select('id', { count: 'exact', head: true })
          .eq('company_id', recurring.company_id)
        
        const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, '0')}`
        const issueDate = new Date().toISOString().split('T')[0]
        const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

        // Create invoice
        const { data: inv, error: invError } = await supabase
          .from('invoices').insert({
            company_id: recurring.company_id,
            created_by: recurring.created_by,
            invoice_number: invoiceNumber,
            client_name: recurring.client_name,
            client_email: recurring.client_email,
            issue_date: issueDate,
            due_date: dueDate,
            currency: recurring.currency || 'EUR',
            tax_rate: recurring.tax_rate || 18,
            subtotal: Number(recurring.amount),
            tax_amount: Number(recurring.amount) * (Number(recurring.tax_rate || 18) / 100),
            total: Number(recurring.amount) * (1 + Number(recurring.tax_rate || 18) / 100),
            total_amount: Number(recurring.amount) * (1 + Number(recurring.tax_rate || 18) / 100),
            status: 'pending',
            payment_method: 'Bank Transfer',
            notes: `Auto-gjeneruar nga Recurring: ${recurring.name}`,
            recurring_invoice_id: recurring.id,
          }).select().single()

        if (invError) throw invError

        // Create invoice items
        if (recurring.items && inv) {
          await supabase.from('invoice_items').insert(
            (recurring.items as {description:string;quantity:number;unit_price:number}[]).map(item => ({
              invoice_id: inv.id,
              description: item.description,
              quantity: item.quantity || 1,
              unit_price: item.unit_price || Number(recurring.amount),
              total: (item.quantity || 1) * (item.unit_price || Number(recurring.amount)),
            }))
          )
        } else if (inv) {
          await supabase.from('invoice_items').insert({
            invoice_id: inv.id,
            description: recurring.description || recurring.name,
            quantity: 1,
            unit_price: Number(recurring.amount),
            total: Number(recurring.amount),
          })
        }

        // Calculate next invoice date
        const next = new Date(recurring.next_invoice_date || today)
        if (recurring.frequency === 'monthly') next.setMonth(next.getMonth() + 1)
        else if (recurring.frequency === 'quarterly') next.setMonth(next.getMonth() + 3)
        else if (recurring.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1)
        else if (recurring.frequency === 'weekly') next.setDate(next.getDate() + 7)

        // Check if end date passed
        const shouldDeactivate = recurring.end_date && next > new Date(recurring.end_date)

        await supabase.from('recurring_invoices').update({
          last_invoice_date: today,
          next_invoice_date: next.toISOString().split('T')[0],
          status: shouldDeactivate ? 'completed' : 'active',
        }).eq('id', recurring.id)

        generated++
      } catch (err) {
        errors.push(`${recurring.name}: ${err instanceof Error ? err.message : 'Error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      generated,
      errors: errors.length > 0 ? errors : undefined,
      message: `U gjeneruan ${generated} fatura`,
    })
  } catch (err) {
    console.error('Recurring generate error:', err)
    return NextResponse.json({ error: 'Gabim gjatë gjenerimit' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
