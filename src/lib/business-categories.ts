// lib/business-categories.ts
// Kategoritë aktive për tregun kosovar

export const BUSINESS_CATEGORIES = [
  { id: 'restaurant', label: 'Restorant',           needs_pos: true  },
  { id: 'bakery',     label: 'Furrë / Pastiqeri',   needs_pos: true  },
  { id: 'market',     label: 'Dyqan / Market',       needs_pos: true  },
  { id: 'pharmacy',   label: 'Farmaci',              needs_pos: true  },
  { id: 'salon',      label: 'Sallon / Berber / Spa',needs_pos: true  },
  { id: 'health',     label: 'Mjek / Klinikë',       needs_pos: true  },
  { id: 'b2b',        label: 'Biznes B2B',            needs_pos: false },
  { id: 'other',      label: 'Tjera',                needs_pos: true  },
] as const

export type BusinessCategoryId = typeof BUSINESS_CATEGORIES[number]['id'] | 'other'

export function categoryNeedsPos(businessType: string | null | undefined): boolean {
  if (!businessType) return false
  if (businessType === 'b2b') return false
  return BUSINESS_CATEGORIES.find(c => c.id === businessType)?.needs_pos ?? false
}

export function getCategoryConfig(businessType: string | null | undefined) {
  return BUSINESS_CATEGORIES.find(c => c.id === businessType) ?? null
}

export const CATEGORIES_WITH_POS = BUSINESS_CATEGORIES.filter(c => c.needs_pos).map(c => c.id)

// Grupet — 'restaurant' mbulon kafe/bar/fastfood, 'salon' mbulon berber/spa/beauty
export const RESTAURANT_TYPES = ['restaurant', 'cafe', 'bar', 'fastfood']
export const SALON_TYPES      = ['salon', 'barber', 'spa', 'beauty']
export const HEALTH_TYPES     = ['health']
export const BAKERY_TYPES     = ['bakery']
export const COUNTER_TYPES    = ['other']
export const B2B_TYPES        = ['b2b']

// ── Helpers ──────────────────────────────────────────────────
export function hasQuantity(businessType: string | null | undefined): boolean {
  const types = ['market', 'pharmacy', 'bakery', 'restaurant', 'cafe', 'bar', 'fastfood', 'construction', 'import_export']
  return types.includes(businessType || '')
}

export function hasDiscount(businessType: string | null | undefined): boolean {
  const types = ['market', 'pharmacy', 'restaurant', 'construction', 'import_export', 'bakery']
  return types.includes(businessType || '')
}

// ── Expense presets ───────────────────────────────────────────
export const DEFAULT_EXPENSE_CATEGORIES = [
  'Qiraja', 'Paga', 'Rrymi / Uji', 'Interneti / Telefoni',
  'Materialet', 'Transport', 'Marketing', 'Sigurimet', 'Taksat', 'Të tjera',
]

export const CATEGORY_EXPENSE_PRESETS: Record<string, string[]> = {
  restaurant: ['Lëndët ushqimore', 'Paga', 'Qiraja', 'Rrymi', 'Pastrimi', 'Marketing', 'Inventari', 'Të tjera'],
  bakery:     ['Mielli / Lëndët', 'Paga', 'Qiraja', 'Rrymi / Furra', 'Paketimi', 'Transport', 'Të tjera'],
  market:     ['Mallrat', 'Paga', 'Qiraja', 'Rrymi', 'Transport', 'Sigurimet', 'Të tjera'],
  pharmacy:   ['Ilaçet / Produktet', 'Paga', 'Qiraja', 'Rrymi', 'Licencat', 'Sigurimet', 'Të tjera'],
  salon:      ['Produktet kozmetike', 'Paga', 'Qiraja', 'Rrymi / Uji', 'Inventari', 'Marketing', 'Të tjera'],
  health:     ['Materialet mjekësore', 'Paga', 'Qiraja', 'Rrymi', 'Licencat', 'Sigurimet', 'Të tjera'],
  b2b:        ['Paga', 'Qiraja', 'Interneti / Telefoni', 'Software', 'Marketing', 'Transport', 'Taksat', 'Të tjera'],
  other:      DEFAULT_EXPENSE_CATEGORIES,
}
