/**
 * audit.ts — Audit logging sistematik për të gjitha veprimet financiare
 * Shkruan te tabela `activity_logs` ekzistuese.
 */

import { createClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'create_invoice' | 'update_invoice' | 'delete_invoice' | 'send_invoice'
  | 'mark_paid_invoice' | 'export_pdf'
  | 'create_expense' | 'update_expense' | 'delete_expense'
  | 'create_category' | 'delete_category'
  | 'update_company' | 'upload_logo'
  | 'export_csv'
  | 'payment_submitted' | 'payment_confirmed'
  | 'subscription_activated' | 'subscription_expired'
  | 'user_created' | 'login' | 'logout'
  | 'accountant_invite_sent' | 'accountant_invite_accepted' | 'accountant_invite_rejected'
  | 'document_request_created' | 'document_uploaded'
  | 'company_created'

export interface AuditEntry {
  user_id: string
  company_id?: string | null
  action: AuditAction
  entity_type?: string
  entity_id?: string
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Regjistron një veprim në audit log.
 * Nuk hedh gabim nëse dështon — audit log nuk duhet të bllokojë operacionet.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('activity_logs').insert({
      user_id: entry.user_id,
      company_id: entry.company_id ?? null,
      action: entry.action,
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ? String(entry.entity_id) : null,
      description: entry.description ?? null,
      metadata: entry.metadata ?? null,
    })
  } catch {
    // Silent fail - audit log nuk bllokon operacionin kryesor
    console.warn('[audit] Failed to write audit log for action:', entry.action)
  }
}

/**
 * Helper i shpejtë për fatura
 */
export function invoiceAudit(
  action: 'create_invoice' | 'update_invoice' | 'delete_invoice' | 'send_invoice' | 'mark_paid_invoice' | 'export_pdf',
  userId: string,
  companyId: string,
  invoiceId: string,
  invoiceNumber?: string,
  extra?: Record<string, unknown>
) {
  return logAudit({
    user_id: userId,
    company_id: companyId,
    action,
    entity_type: 'invoice',
    entity_id: invoiceId,
    description: invoiceNumber ? `Fatura ${invoiceNumber}` : undefined,
    metadata: extra,
  })
}

/**
 * Helper i shpejtë për shpenzime
 */
export function expenseAudit(
  action: 'create_expense' | 'update_expense' | 'delete_expense',
  userId: string,
  companyId: string,
  expenseId: string,
  amount?: number,
  extra?: Record<string, unknown>
) {
  return logAudit({
    user_id: userId,
    company_id: companyId,
    action,
    entity_type: 'expense',
    entity_id: expenseId,
    description: amount ? `Shpenzim €${amount}` : undefined,
    metadata: extra,
  })
}
