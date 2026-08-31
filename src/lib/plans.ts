// ── FISCALIX PLAN DEFINITIONS ──────────────────────────────────

export type PlanId = 'arka' | 'basic' | 'pro' | 'business' | 'accountant'

export interface PlanFeatures {
  maxDevices:        number   // -1 = unlimited
  maxUsers:          number   // -1 = unlimited
  hasInvoices:       boolean  // Faturat B2B
  hasPOS:            boolean  // POS me tavolina (restorant)
  hasServicePOS:     boolean  // Arka Fiskale (sallon/mjek)
  hasReports:        boolean  // Raporte financiare
  hasAdvancedReports:boolean  // Raporte të avancuara (TB, TVSH)
  hasTerminet:       boolean  // Terminet & rezervime
  hasStock:          boolean  // Menaxhim stoku
  hasAccountant:     boolean  // Portal kontabilisti
  hasMultiClient:    boolean  // Shumë klientë (kontabilist)
  hasRoles:          boolean  // Role & permisione
  hasGymMembers:     boolean  // Anëtarët gym
  hasExpenses:       boolean  // Shpenzimet
  hasSuppliers:      boolean  // Furnitorët
  supportType:       'email' | 'priority' | 'phone'
}

export interface Plan {
  id:          PlanId
  name:        string
  description: string
  priceYear:   number   // €/vit
  priceMonth:  number   // €/muaj (vit / 12, rounded)
  color:       string
  features:    PlanFeatures
  highlights:  string[] // Top 4 features për UI
}

export const PLANS: Record<PlanId, Plan> = {
  arka: {
    id:          'arka',
    name:        'Arka',
    description: 'Vetëm arka fiskale digjitale',
    priceYear:   59,
    priceMonth:  4.92,
    color:       '#06B6D4',
    features: {
      maxDevices:         1,
      maxUsers:           1,
      hasInvoices:        false,
      hasPOS:             false,
      hasServicePOS:      true,
      hasReports:         false,
      hasAdvancedReports: false,
      hasTerminet:        false,
      hasStock:           false,
      hasAccountant:      true,
      hasMultiClient:     false,
      hasRoles:           false,
      hasGymMembers:      false,
      hasExpenses:        false,
      hasSuppliers:       false,
      supportType:        'email',
    },
    highlights: ['1 pajisje', 'Arka Fiskale ATK', 'Historia kuponave', 'Lidhja me kontabilist'],
  },

  basic: {
    id:          'basic',
    name:        'Basic',
    description: 'Kafe, berber, sallon i vogël',
    priceYear:   99,
    priceMonth:  8.25,
    color:       '#10B981',
    features: {
      maxDevices:         1,
      maxUsers:           2,
      hasInvoices:        true,
      hasPOS:             false,
      hasServicePOS:      true,
      hasReports:         true,
      hasAdvancedReports: false,
      hasTerminet:        false,
      hasStock:           false,
      hasAccountant:      false,
      hasMultiClient:     false,
      hasRoles:           false,
      hasGymMembers:      false,
      hasExpenses:        true,
      hasSuppliers:       false,
      supportType:        'email',
    },
    highlights: ['1 pajisje', 'Arka Fiskale ATK', 'Raporte simple', 'iOS + Android + Web'],
  },

  pro: {
    id:          'pro',
    name:        'Pro',
    description: 'Restorant, market, farmaci',
    priceYear:   199,
    priceMonth:  16.58,
    color:       '#2563EB',
    features: {
      maxDevices:         3,
      maxUsers:           10,
      hasInvoices:        true,
      hasPOS:             true,
      hasServicePOS:      true,
      hasReports:         true,
      hasAdvancedReports: true,
      hasTerminet:        true,
      hasStock:           true,
      hasAccountant:      true,
      hasMultiClient:     false,
      hasRoles:           false,
      hasGymMembers:      true,
      hasExpenses:        true,
      hasSuppliers:       true,
      supportType:        'priority',
    },
    highlights: ['3 pajisje', 'POS Tavolina & Kamarierë', 'Portal Kontabilisti', 'Stoku & Terminet'],
  },

  business: {
    id:          'business',
    name:        'Business',
    description: 'Zinxhir, shumë degë',
    priceYear:   230,
    priceMonth:  19.17,
    color:       '#7C3AED',
    features: {
      maxDevices:         -1,
      maxUsers:           -1,
      hasInvoices:        true,
      hasPOS:             true,
      hasServicePOS:      true,
      hasReports:         true,
      hasAdvancedReports: true,
      hasTerminet:        true,
      hasStock:           true,
      hasAccountant:      true,
      hasMultiClient:     false,
      hasRoles:           true,
      hasGymMembers:      true,
      hasExpenses:        true,
      hasSuppliers:       true,
      supportType:        'phone',
    },
    highlights: ['Pajisje pa limit', 'Përdorues pa limit', 'Role & Permisione', 'Support 24/7'],
  },

  accountant: {
    id:          'accountant',
    name:        'Kontabilist',
    description: 'Menaxho të gjithë klientët',
    priceYear:   149,
    priceMonth:  12.42,
    color:       '#F59E0B',
    features: {
      maxDevices:         0,
      maxUsers:           1,
      hasInvoices:        true,
      hasPOS:             false,
      hasServicePOS:      false,
      hasReports:         true,
      hasAdvancedReports: true,
      hasTerminet:        false,
      hasStock:           false,
      hasAccountant:      true,
      hasMultiClient:     true,
      hasRoles:           false,
      hasGymMembers:      false,
      hasExpenses:        true,
      hasSuppliers:       false,
      supportType:        'priority',
    },
    highlights: ['Klientë pa limit', 'Panel i unifikuar', 'Raporte tatimore', 'Komision 20% reseller'],
  },
}

// Helper — merr planin e një kompanie
export function getPlan(planId: string | null | undefined): Plan {
  return PLANS[(planId as PlanId) || 'basic'] || PLANS.basic
}

// Helper — kontrollo nëse ka akses te një feature
export function hasFeature(planId: string | null | undefined, feature: keyof PlanFeatures): boolean {
  const plan = getPlan(planId)
  return Boolean(plan.features[feature])
}

// Helper — merr limitet
export function getLimit(planId: string | null | undefined, limit: 'maxDevices' | 'maxUsers'): number {
  const plan = getPlan(planId)
  return plan.features[limit]
}

export const PLAN_LIST = Object.values(PLANS)
