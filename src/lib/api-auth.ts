/**
 * api-auth.ts — Centralizim i auth, ownership dhe subscription checks
 * Përdorim: import { requireAuth, requireCompanyOwnership, requirePlan } from '@/lib/api-auth'
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export type UserProfile = {
  id: string
  role: 'admin' | 'business_owner' | 'staff' | 'accountant'
  company_id: string | null
  full_name: string
  email: string
}

export type AuthResult =
  | { ok: true;  user: { id: string }; profile: UserProfile }
  | { ok: false; response: NextResponse }

/**
 * Kontrollon nëse përdoruesi është kyçur.
 * Kthe { ok: true, user, profile } ose { ok: false, response: 401 }
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, company_id, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'User profile not found' }, { status: 401 }),
    }
  }

  return { ok: true, user, profile: profile as UserProfile }
}

/**
 * Kontrollon nëse `profile.company_id === requiredCompanyId` ose roli është admin.
 * Kthe `null` nëse OK, ose `NextResponse` 403 nëse jo.
 */
export function checkCompanyOwnership(
  profile: UserProfile,
  requiredCompanyId: string
): NextResponse | null {
  if (profile.role === 'admin') return null
  if (profile.company_id !== requiredCompanyId) {
    return NextResponse.json(
      { error: 'Forbidden: you do not own this resource' },
      { status: 403 }
    )
  }
  return null
}

/**
 * Kthe 403 nëse roli nuk është 'admin'.
 */
export function requireAdmin(profile: UserProfile): NextResponse | null {
  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
  }
  return null
}

/**
 * Kthe 403 nëse roli është 'accountant' (nuk duhet të aksesojë resurset e biznesit direkt).
 * Mund të anashkalohet nga admin.
 */
export function requireBusinessOwner(profile: UserProfile): NextResponse | null {
  if (profile.role === 'admin') return null
  if (profile.role !== 'business_owner' && profile.role !== 'staff') {
    return NextResponse.json(
      { error: 'Forbidden: business account required' },
      { status: 403 }
    )
  }
  return null
}

type PlanTier = 'basic' | 'starter' | 'professional' | 'premium' | 'advanced' | 'enterprise'
const PLAN_ORDER: PlanTier[] = ['basic', 'starter', 'premium', 'professional', 'advanced', 'enterprise']

/**
 * Kontrollon nëse kompania ka planin e kërkuar (ose më të lartë).
 * Kthe 403 nëse nuk ka, null nëse OK.
 */
export async function requirePlan(
  companyId: string,
  minimumPlan: PlanTier
): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!subscription || subscription.status !== 'active') {
    return NextResponse.json(
      { error: 'Subscription e pazhdukur ose jo aktive' },
      { status: 403 }
    )
  }

  const userTier = PLAN_ORDER.indexOf(subscription.plan as PlanTier)
  const requiredTier = PLAN_ORDER.indexOf(minimumPlan)

  if (userTier < requiredTier) {
    return NextResponse.json(
      { error: `Ky funksion kërkon planin ${minimumPlan} ose më të lartë` },
      { status: 403 }
    )
  }

  return null
}

/**
 * Kontrollon nëse kontabilisti ka qasje te një kompani specifike.
 */
export async function requireAccountantAccess(
  accountantId: string,
  companyId: string
): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: rel } = await supabase
    .from('accountant_clients')
    .select('id')
    .eq('accountant_id', accountantId)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .eq('status', 'active')
    .maybeSingle()

  if (!rel) {
    return NextResponse.json(
      { error: 'Forbidden: no active accountant relationship for this company' },
      { status: 403 }
    )
  }
  return null
}

/**
 * Standard error response helper
 */
export function apiError(message: string, status: 400 | 401 | 403 | 404 | 409 | 429 | 500): NextResponse {
  if (status >= 500) {
    console.error(`[API Error ${status}]`, message)
  }
  return NextResponse.json({ error: message }, { status })
}
