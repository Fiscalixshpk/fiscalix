import type { BusinessCategoryId } from './business-categories'

export interface CategoryConfig {
  kpis: { label: string; key: string; icon: string; color: string }[]
  quickActions: { label: string; href: string; icon: string }[]
  invoiceTemplates: { label: string; items: { description: string; unit_price: number }[] }[]
  tips: string[]
  revenueLabel: string
  expenseLabel: string
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  construction: {
    revenueLabel: 'Vlera Kontratave',
    expenseLabel: 'Kostot e Projekteve',
    kpis: [
      { label: 'Kontrata Aktive', key: 'active_contracts', icon: '🏗️', color: '#F59E0B' },
      { label: 'Situata të Papaguara', key: 'pending_invoices', icon: '📋', color: '#EF4444' },
      { label: 'Punëtorë Aktivë', key: 'employees', icon: '👷', color: '#10B981' },
      { label: 'Materiale këtë muaj', key: 'material_expenses', icon: '🧱', color: '#3B82F6' },
    ],
    quickActions: [
      { label: 'Situatë e Re', href: '/invoices/new', icon: '📋' },
      { label: 'Shpenzim Materiali', href: '/expenses/new', icon: '🧱' },
      { label: 'Listëpagesa', href: '/listepagesa', icon: '👷' },
    ],
    invoiceTemplates: [
      { label: 'Situatë Mujore', items: [
        { description: 'Punë ndërtimi sipas kontratës — Situata Nr.', unit_price: 0 },
        { description: 'Materiale të furnizuara', unit_price: 0 },
        { description: 'Transport dhe logjistikë', unit_price: 0 },
      ]},
      { label: 'Faturë Finale', items: [
        { description: 'Realizim i plotë i projektit sipas kontratës', unit_price: 0 },
        { description: 'Mbikëqyrje dhe koordinim', unit_price: 0 },
      ]},
    ],
    tips: [
      'Situatat mujore duhen dërguar brenda 5 ditëve të muajit pasues',
      'Tatimi në Burim 9% aplikohet për pagesat ndaj nënkontraktorëve',
      'Ruaj të gjitha faturat e materialeve — nevojiten për zbritje tatimore',
    ],
  },
  health: {
    revenueLabel: 'Të Ardhura nga Shërbimet',
    expenseLabel: 'Shpenzime Mjekësore',
    kpis: [
      { label: 'Vizita këtë muaj', key: 'monthly_invoices', icon: '🩺', color: '#10B981' },
      { label: 'Pacientë të Rinj', key: 'new_clients', icon: '👤', color: '#3B82F6' },
      { label: 'Ilaçe dhe Material', key: 'medical_supplies', icon: '💊', color: '#EF4444' },
      { label: 'Të ardhura mesatare/vizitë', key: 'avg_invoice', icon: '💰', color: '#F59E0B' },
    ],
    quickActions: [
      { label: 'Faturë Vizite', href: '/invoices/new', icon: '🩺' },
      { label: 'Blerje Ilaçe', href: '/expenses/new', icon: '💊' },
      { label: 'Raport Mujor', href: '/reports', icon: '📊' },
    ],
    invoiceTemplates: [
      { label: 'Vizitë Standarde', items: [
        { description: 'Vizitë mjekësore dhe konsultim', unit_price: 20 },
      ]},
      { label: 'Procedurë Mjekësore', items: [
        { description: 'Vizitë dhe ekzaminim', unit_price: 20 },
        { description: 'Procedurë mjekësore', unit_price: 0 },
        { description: 'Materiale dhe ilaçe', unit_price: 0 },
      ]},
    ],
    tips: [
      'Mbaj regjistër të vizitave dhe procedurave për çdo pacient',
      'Faturat mjekësore janë të zbritshme nga tatimi i pacientëve',
      'Sigurim profesional i detyrueshëm për shërbime mjekësore',
    ],
  },
  legal: {
    revenueLabel: 'Honorare dhe Tarifa',
    expenseLabel: 'Shpenzime të Zyrës',
    kpis: [
      { label: 'Raste Aktive', key: 'active_cases', icon: '⚖️', color: '#8B5CF6' },
      { label: 'Honorare të Papaguara', key: 'pending_invoices', icon: '💰', color: '#EF4444' },
      { label: 'Orë të Faturuara', key: 'billed_hours', icon: '⏱️', color: '#10B981' },
      { label: 'Tarifa mesatare/rast', key: 'avg_invoice', icon: '📊', color: '#F59E0B' },
    ],
    quickActions: [
      { label: 'Faturë Honorari', href: '/invoices/new', icon: '⚖️' },
      { label: 'Tarifë Gjyqësore', href: '/expenses/new', icon: '🏛️' },
      { label: 'Raport Vjetor', href: '/reports', icon: '📊' },
    ],
    invoiceTemplates: [
      { label: 'Honorar Konsultimi', items: [
        { description: 'Konsultim juridik — orë pune', unit_price: 50 },
      ]},
      { label: 'Përfaqësim Gjyqësor', items: [
        { description: 'Përfaqësim në procedurë gjyqësore', unit_price: 0 },
        { description: 'Shpenzime gjyqësore dhe taksa', unit_price: 0 },
        { description: 'Konsultime dhe dosje', unit_price: 0 },
      ]},
    ],
    tips: [
      'Konfidencialiteti i klientit është i detyrueshëm — ruaj dokumentet me siguri',
      'Tatimi në Burim aplikohet për honorare mbi €500',
      'Sigurim profesional për avokatë është i detyrueshëm sipas Barrës',
    ],
  },
  agency: {
    revenueLabel: 'Retainerë dhe Projekte',
    expenseLabel: 'Shpenzime Operative',
    kpis: [
      { label: 'Klientë Aktivë', key: 'active_clients', icon: '🤝', color: '#10B981' },
      { label: 'Retainerë Mujorë', key: 'recurring', icon: '🔄', color: '#3B82F6' },
      { label: 'Projekte në Progres', key: 'pending_invoices', icon: '🎨', color: '#8B5CF6' },
      { label: 'MRR', key: 'monthly_revenue', icon: '💰', color: '#F59E0B' },
    ],
    quickActions: [
      { label: 'Faturë Retainer', href: '/invoices/new', icon: '🔄' },
      { label: 'Faturë Projekti', href: '/invoices/new', icon: '🎨' },
      { label: 'Shpenzim Reklamash', href: '/expenses/new', icon: '📢' },
    ],
    invoiceTemplates: [
      { label: 'Retainer Mujor', items: [
        { description: 'Menaxhim rrjetesh sociale — Muaji', unit_price: 300 },
        { description: 'Krijim përmbajtjeje (4 postime/javë)', unit_price: 200 },
        { description: 'Raportim mujor', unit_price: 100 },
      ]},
      { label: 'Projekt Dizajni', items: [
        { description: 'Dizajn identiteti vizual (Logo + Brand Guide)', unit_price: 0 },
        { description: 'Dizajn materiale marketingu', unit_price: 0 },
        { description: 'Rishikime (3 raunde)', unit_price: 0 },
      ]},
    ],
    tips: [
      'Retainerët mujorë sigurojnë cash flow të parashikueshëm',
      'Dokumento punën me orë për klientët që pyesin',
      'Kontratat me klientë duhen nënshkruar para fillimit të projektit',
    ],
  },
  it: {
    revenueLabel: 'Projekte dhe Mirëmbajtje',
    expenseLabel: 'Shpenzime Tech',
    kpis: [
      { label: 'Projekte Aktive', key: 'active_projects', icon: '💻', color: '#3B82F6' },
      { label: 'MRR (Mirëmbajtje)', key: 'recurring', icon: '🔄', color: '#10B981' },
      { label: 'Licenca Software', key: 'software_expenses', icon: '💿', color: '#8B5CF6' },
      { label: 'Tarifë Mesatare/Orë', key: 'avg_hourly', icon: '⏱️', color: '#F59E0B' },
    ],
    quickActions: [
      { label: 'Faturë Projekti', href: '/invoices/new', icon: '💻' },
      { label: 'Faturë Mirëmbajtjeje', href: '/invoices/new', icon: '🔧' },
      { label: 'Shpenzim Hosting', href: '/expenses/new', icon: '🖥️' },
    ],
    invoiceTemplates: [
      { label: 'Zhvillim Web/App', items: [
        { description: 'Zhvillim frontend', unit_price: 0 },
        { description: 'Zhvillim backend dhe API', unit_price: 0 },
        { description: 'Testim dhe deployment', unit_price: 0 },
      ]},
      { label: 'Mirëmbajtje Mujore', items: [
        { description: 'Mirëmbajtje teknike dhe updates', unit_price: 150 },
        { description: 'Hosting dhe server management', unit_price: 50 },
        { description: 'Suport teknik (10 orë)', unit_price: 200 },
      ]},
    ],
    tips: [
      'Kontratat SaaS shpesh janë të zbritshme si shpenzim biznesi',
      'Ruaj të gjitha recetat e hosting dhe licencave',
      'Dokumento orët e punës — ndihmon në faturim dhe taksim',
    ],
  },
  restaurant: {
    revenueLabel: 'Shitjet Ditore',
    expenseLabel: 'Kostot Operative',
    kpis: [
      { label: 'Shitje Sot', key: 'today_revenue', icon: '🍕', color: '#F59E0B' },
      { label: 'Ushqime dhe Pije', key: 'food_expenses', icon: '🥘', color: '#EF4444' },
      { label: 'Stafi Aktiv', key: 'employees', icon: '👨‍🍳', color: '#10B981' },
      { label: 'Marzhi i Fitimit', key: 'profit_margin', icon: '📊', color: '#3B82F6' },
    ],
    quickActions: [
      { label: 'Regjistro Shitje', href: '/invoices/new', icon: '🍕' },
      { label: 'Blerje Ushqimesh', href: '/expenses/new', icon: '🥘' },
      { label: 'Listëpagesa', href: '/listepagesa', icon: '👨‍🍳' },
    ],
    invoiceTemplates: [
      { label: 'Faturë Katering', items: [
        { description: 'Shërbim katering — person', unit_price: 15 },
        { description: 'Pije dhe aperitive', unit_price: 0 },
        { description: 'Staf dhe shërbim', unit_price: 0 },
      ]},
      { label: 'Rezervim Sallë', items: [
        { description: 'Qiraja sallës për event', unit_price: 0 },
        { description: 'Setup dhe pastrim', unit_price: 0 },
      ]},
    ],
    tips: [
      'TVSH 8% aplikohet për ushqim dhe pije (jo alkool)',
      'Faturat e blerjes ushqimesh zvogëlojnë TVSH-n që paguhet',
      'Listëpagesa mujore duhet dorëzuar deri më 15 të muajit',
    ],
  },
  transport: {
    revenueLabel: 'Të Ardhura Transport',
    expenseLabel: 'Kostot Operative',
    kpis: [
      { label: 'Transportime këtë muaj', key: 'monthly_invoices', icon: '🚗', color: '#3B82F6' },
      { label: 'Karburant këtë muaj', key: 'fuel_expenses', icon: '⛽', color: '#EF4444' },
      { label: 'Mjete Aktive', key: 'vehicles', icon: '🚌', color: '#10B981' },
      { label: 'Kosto për km', key: 'cost_per_km', icon: '📊', color: '#F59E0B' },
    ],
    quickActions: [
      { label: 'Faturë Transporti', href: '/invoices/new', icon: '🚗' },
      { label: 'Shpenzim Karburanti', href: '/expenses/new', icon: '⛽' },
      { label: 'Listëpagesa Shoferëve', href: '/listepagesa', icon: '👤' },
    ],
    invoiceTemplates: [
      { label: 'Transport Mallrash', items: [
        { description: 'Transport mallrash — km', unit_price: 0 },
        { description: 'Ngarkim dhe shkarkim', unit_price: 0 },
        { description: 'Sigurim ngarkese', unit_price: 0 },
      ]},
      { label: 'Transport Pasagjerësh', items: [
        { description: 'Transport grup — person', unit_price: 0 },
        { description: 'Udhëtim vajtje-ardhje', unit_price: 0 },
      ]},
    ],
    tips: [
      'Faturat e karburantit janë të zbritshme 100% nëse mjeti është i regjistruar si biznes',
      'Sigurimi i mjetit dhe tatimi vjetor janë shpenzime të zbritshme',
      'Mbaj libër udhëtimesh për çdo mjet',
    ],
  },
  education: {
    revenueLabel: 'Tarifa Kursesh',
    expenseLabel: 'Shpenzime Arsimore',
    kpis: [
      { label: 'Studentë Aktivë', key: 'active_students', icon: '📚', color: '#8B5CF6' },
      { label: 'Kurse Aktive', key: 'active_courses', icon: '🎓', color: '#10B981' },
      { label: 'Pagesa Mujore', key: 'monthly_revenue', icon: '💰', color: '#F59E0B' },
      { label: 'Mësues', key: 'employees', icon: '👩‍🏫', color: '#3B82F6' },
    ],
    quickActions: [
      { label: 'Faturë Kursi', href: '/invoices/new', icon: '🎓' },
      { label: 'Pagesë Mësuesi', href: '/expenses/new', icon: '👩‍🏫' },
      { label: 'Listëpagesa', href: '/listepagesa', icon: '💰' },
    ],
    invoiceTemplates: [
      { label: 'Tarifë Mujore Kursi', items: [
        { description: 'Tarifë mujore kursit — student', unit_price: 0 },
        { description: 'Materiale mësimore', unit_price: 0 },
      ]},
      { label: 'Trajnim Korporativ', items: [
        { description: 'Trajnim i personalizuar — orë', unit_price: 0 },
        { description: 'Materiale dhe çertifikata', unit_price: 0 },
        { description: 'Salla dhe infrastruktura', unit_price: 0 },
      ]},
    ],
    tips: [
      'Shpenzimet arsimore janë shpesh të zbritshme për bizneset',
      'Certifikatat dhe akreditimet shtojnë vlerën e kurseve',
      'Faturimi mujor i studentëve siguron cash flow të qëndrueshëm',
    ],
  },
  services: {
    revenueLabel: 'Të Ardhura Shërbimesh',
    expenseLabel: 'Shpenzime Operative',
    kpis: [
      { label: 'Klientë Aktivë', key: 'active_clients', icon: '🤝', color: '#10B981' },
      { label: 'Fatura në Pritje', key: 'pending_invoices', icon: '💰', color: '#EF4444' },
      { label: 'Punëtorë', key: 'employees', icon: '👥', color: '#3B82F6' },
      { label: 'Të ardhura/muaj', key: 'monthly_revenue', icon: '📊', color: '#F59E0B' },
    ],
    quickActions: [
      { label: 'Faturë Shërbimi', href: '/invoices/new', icon: '🔧' },
      { label: 'Shpenzim', href: '/expenses/new', icon: '📦' },
      { label: 'Listëpagesa', href: '/listepagesa', icon: '👥' },
    ],
    invoiceTemplates: [
      { label: 'Shërbim Standard', items: [
        { description: 'Shërbim sipas kërkesës', unit_price: 0 },
        { description: 'Materiale dhe vegla', unit_price: 0 },
        { description: 'Transport', unit_price: 0 },
      ]},
    ],
    tips: [
      'Faturimi menjëherë pas përfundimit të shërbimit zvogëlon vonesën e pagesave',
      'Kontratat me klientë rregullorë zvogëlojnë rrezikun e mospagesës',
    ],
  },
  import_export: {
    revenueLabel: 'Shitjet dhe Eksporti',
    expenseLabel: 'Importi dhe Kostot',
    kpis: [
      { label: 'Importi këtë muaj', key: 'import_expenses', icon: '📦', color: '#3B82F6' },
      { label: 'Shitjet këtë muaj', key: 'monthly_revenue', icon: '💰', color: '#10B981' },
      { label: 'Dogana dhe Taksa', key: 'customs_expenses', icon: '🛃', color: '#EF4444' },
      { label: 'Marzhi Neto', key: 'net_margin', icon: '📊', color: '#F59E0B' },
    ],
    quickActions: [
      { label: 'Faturë Shitjeje', href: '/invoices/new', icon: '📦' },
      { label: 'Shpenzim Dogane', href: '/expenses/new', icon: '🛃' },
      { label: 'Raport Import/Export', href: '/reports', icon: '📊' },
    ],
    invoiceTemplates: [
      { label: 'Faturë Eksporti', items: [
        { description: 'Mallra sipas specifikimit', unit_price: 0 },
        { description: 'Transport ndërkombëtar', unit_price: 0 },
        { description: 'Sigurim ngarkesë', unit_price: 0 },
      ]},
      { label: 'Faturë Shitjeje Importi', items: [
        { description: 'Mallra të importuara — njësi', unit_price: 0 },
        { description: 'Kosto doganore e alokuar', unit_price: 0 },
      ]},
    ],
    tips: [
      'Ruaj të gjitha dokumentet doganore — nevojiten për TVSH',
      'Kursi i këmbimit ndikon në fitim — mbaj regjistër',
      'Dokumentet e importit janë bazë për zbritjen e TVSH-s hyrëse',
    ],
  },
  tourism: {
    revenueLabel: 'Rezervimet dhe Shërbimet',
    expenseLabel: 'Kostot Operative',
    kpis: [
      { label: 'Rezervime Aktive', key: 'active_bookings', icon: '🏨', color: '#10B981' },
      { label: 'Të ardhura/muaj', key: 'monthly_revenue', icon: '💰', color: '#F59E0B' },
      { label: 'Stafi', key: 'employees', icon: '👥', color: '#3B82F6' },
      { label: 'Shkalla Zënies', key: 'occupancy', icon: '📊', color: '#8B5CF6' },
    ],
    quickActions: [
      { label: 'Faturë Rezervimi', href: '/invoices/new', icon: '🏨' },
      { label: 'Shpenzim Mirëmbajtjeje', href: '/expenses/new', icon: '🔧' },
      { label: 'Listëpagesa Stafit', href: '/listepagesa', icon: '👥' },
    ],
    invoiceTemplates: [
      { label: 'Rezervim Dhome', items: [
        { description: 'Qëndrim — netë', unit_price: 0 },
        { description: 'Mëngjes i përfshirë', unit_price: 0 },
        { description: 'Shërbime shtesë', unit_price: 0 },
      ]},
      { label: 'Paketë Turistike', items: [
        { description: 'Akomodim — person/natë', unit_price: 0 },
        { description: 'Transport dhe ekskursione', unit_price: 0 },
        { description: 'Ushqime (gjysmë pension)', unit_price: 0 },
      ]},
    ],
    tips: [
      'Platformat OTA (Booking, Airbnb) marrin komision — llogarise në çmim',
      'Sezoni ndikon shumë — planifiko cash flow-n për periudhat e qeta',
      'TVSH për akomodim është 8% në Kosovë',
    ],
  },
}

export function getCategoryConfig(businessType: string | null): CategoryConfig | null {
  if (!businessType) return null
  return CATEGORY_CONFIG[businessType] || null
}
