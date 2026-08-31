// lib/pos-business-config.ts
// Konfiguron POS sipas llojit të biznesit

export type POSMode = 'products' | 'services'

export interface POSBusinessConfig {
  mode:            POSMode
  itemLabel:       string     // "Produkt" ose "Shërbim"
  itemLabelPlural: string     // "Produkte" ose "Shërbime"
  showStock:       boolean    // stoku ka kuptim?
  editablePrice:   boolean    // çmimi ndryshohet gjatë shitjes?
  defaultUnit:     string
  defaultTaxRate:  string
  placeholderSearch: string
  categories:      string[]
}

const CONFIGS: Record<string, POSBusinessConfig> = {
  // ── SHËRBIME — çmimi mund të ndryshohet, pa stok ─────────
  health: {
    mode: 'services', itemLabel: 'Shërbim', itemLabelPlural: 'Shërbimet',
    showStock: false, editablePrice: true,
    defaultUnit: 'vizitë', defaultTaxRate: 'E',
    placeholderSearch: 'Kërko vizitë ose shërbim...',
    categories: ['Vizita', 'Analiza', 'Procedura', 'Konsulta', 'Certifikata'],
  },
  salon: {
    mode: 'services', itemLabel: 'Shërbim', itemLabelPlural: 'Shërbimet',
    showStock: false, editablePrice: true,
    defaultUnit: 'shërbim', defaultTaxRate: 'E',
    placeholderSearch: 'Kërko shërbim...',
    categories: ['Flokë', 'Thonjë', 'Fytyrë', 'Depilim', 'Qerpikë', 'Produkte'],
  },
  tourism: {
    mode: 'services', itemLabel: 'Shërbim', itemLabelPlural: 'Shërbimet',
    showStock: false, editablePrice: true,
    defaultUnit: 'natë', defaultTaxRate: 'E',
    placeholderSearch: 'Kërko shërbim hoteli...',
    categories: ['Dhoma', 'Restaurant', 'Bar', 'Shërbime', 'Transport', 'Salla'],
  },
  // ── PRODUKTE — me stok, çmim fiks ────────────────────────
  market: {
    mode: 'products', itemLabel: 'Produkt', itemLabelPlural: 'Produktet',
    showStock: true, editablePrice: false,
    defaultUnit: 'cope', defaultTaxRate: 'D',
    placeholderSearch: 'Kërko produkt...',
    categories: ['Furra', 'Mish', 'Bulmet', 'Perime', 'Fruta', 'Pije', 'Higjienë', 'Tjetër'],
  },
  restaurant: {
    mode: 'products', itemLabel: 'Artikull', itemLabelPlural: 'Artikujt',
    showStock: false, editablePrice: false,
    defaultUnit: 'cope', defaultTaxRate: 'E',
    placeholderSearch: 'Kërko artikull...',
    categories: ['Kafe', 'Pije', 'Ushqim', 'Ëmbëlsira', 'Alkool'],
  },
  pharmacy: {
    mode: 'products', itemLabel: 'Produkt', itemLabelPlural: 'Produktet',
    showStock: true, editablePrice: false,
    defaultUnit: 'kuti', defaultTaxRate: 'D',
    placeholderSearch: 'Kërko ilaç ose produkt...',
    categories: ['Analgjezik', 'Vitamina', 'Harxhueshme', 'Higjienë', 'Kujdes', 'Pajisje'],
  },
  bakery: {
    mode: 'products', itemLabel: 'Produkt', itemLabelPlural: 'Produktet',
    showStock: true, editablePrice: false,
    defaultUnit: 'cope', defaultTaxRate: 'D',
    placeholderSearch: 'Kërko produkt...',
    categories: ['Bukë', 'Byrek', 'Ëmbëlsira', 'Kafe'],
  },
  retail: {
    mode: 'products', itemLabel: 'Produkt', itemLabelPlural: 'Produktet',
    showStock: true, editablePrice: false,
    defaultUnit: 'cope', defaultTaxRate: 'E',
    placeholderSearch: 'Kërko produkt...',
    categories: ['Veshje', 'Këpucë', 'Aksesorë', 'Tjetër'],
  },
}

const DEFAULT_CONFIG: POSBusinessConfig = {
  mode: 'products', itemLabel: 'Artikull', itemLabelPlural: 'Artikujt',
  showStock: true, editablePrice: false,
  defaultUnit: 'cope', defaultTaxRate: 'E',
  placeholderSearch: 'Kërko...',
  categories: ['Të gjitha'],
}

export function getPOSConfig(businessType: string | null): POSBusinessConfig {
  if (!businessType) return DEFAULT_CONFIG
  return CONFIGS[businessType] ?? DEFAULT_CONFIG
}

export function isServiceBusiness(businessType: string | null): boolean {
  return getPOSConfig(businessType).mode === 'services'
}
