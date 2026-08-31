export interface CategoryModule {
  id: string
  title: string
  type: 'kpi' | 'list' | 'chart' | 'action'
}

export interface CategoryDashboardConfig {
  greeting: string
  revenueLabel: string
  expenseLabel: string
  invoiceLabel: string
  clientLabel: string
  kpis: {
    label: string
    sublabel: string
    color: string
    icon: string
    key: 'revenue' | 'expenses' | 'profit' | 'invoices' | 'pending'
  }[]
  quickActions: { label: string; href: string; icon: string; color: string }[]
  tips: string[]
  invoiceCTA: string
  expenseCTA: string
}

const configs: Record<string, CategoryDashboardConfig> = {

  // ── MARKET ────────────────────────────────────────────────
  market: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Shitjet ditore',
    expenseLabel: 'Blerjet e mallrave',
    invoiceLabel: 'Kuponë fiskalë',
    clientLabel: 'Klientë sot',
    kpis: [
      { label: 'Shitjet sot',     sublabel: 'kuponë fiskalë',        color: '#10B981', icon: 'dot', key: 'revenue'  },
      { label: 'Kuponë sot',      sublabel: 'transaksione',          color: '#3B82F6', icon: 'dot', key: 'invoices' },
      { label: 'Shpenzime',       sublabel: 'blerje mallrash',       color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Fitimi neto',     sublabel: 'pas shpenzimeve',       color: '#9B5CF8', icon: 'dot', key: 'profit'   },
    ],
    quickActions: [
      { label: 'Shto Produkt',  href: '/pos/products',  icon: 'dot', color: '#3B82F6' },
      { label: 'Shto Shpenzim', href: '/expenses/new',  icon: 'dot', color: '#EF4444' },
      { label: 'Raporti Ditor', href: '/pos/reports',   icon: 'dot', color: '#10B981' },
    ],
    tips: [
      'Stoku i ulët gjeneron alarm automatik — kontrollo çdo ditë',
      'TVSH 18% për produktet ushqimore të processuara',
      'Importo produktet me Excel për kursim kohe',
    ],
    invoiceCTA: 'Shto Produkt',
    expenseCTA: 'Blerje Mallrash',
  },

  // ── PHARMACY ──────────────────────────────────────────────
  pharmacy: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Shitjet e ilaçeve',
    expenseLabel: 'Blerjet nga furnizuesi',
    invoiceLabel: 'Receta të shitura',
    clientLabel: 'Pacientë sot',
    kpis: [
      { label: 'Shitjet sot',     sublabel: 'ilaçe dhe produkte',    color: '#10B981', icon: 'dot', key: 'revenue'  },
      { label: 'Receta sot',      sublabel: 'kuponë fiskalë',        color: '#3B82F6', icon: 'dot', key: 'invoices' },
      { label: 'Blerje ilaçe',    sublabel: 'nga furnizuesi',        color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Fitimi',          sublabel: 'pas blerjes',           color: '#9B5CF8', icon: 'dot', key: 'profit'   },
    ],
    quickActions: [
      { label: 'Shto Ilaç/Produkt', href: '/pos/products', icon: 'dot', color: '#10B981' },
      { label: 'Blerje Furnizuesi', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
      { label: 'Raport Ditor',      href: '/pos/reports',  icon: 'dot', color: '#3B82F6' },
    ],
    tips: [
      'Ilaçet me recetë kanë TVSH 8%, OTC 18%',
      'Skadimet e ilaçeve kontrollohen çdo muaj',
      'Faturat e furnizuesit shkojnë te Libri Blerjeve',
    ],
    invoiceCTA: 'Shto Ilaç',
    expenseCTA: 'Blerje Furnizuesi',
  },

  // ── BAKERY ────────────────────────────────────────────────
  bakery: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Shitjet e ditës',
    expenseLabel: 'Lëndët e para',
    invoiceLabel: 'Kuponë sot',
    clientLabel: 'Klientë sot',
    kpis: [
      { label: 'Shitjet sot',     sublabel: 'bukë dhe produkte',     color: '#F59E0B', icon: 'dot', key: 'revenue'  },
      { label: 'Kuponë sot',      sublabel: 'transaksione fiskale',  color: '#10B981', icon: 'dot', key: 'invoices' },
      { label: 'Lëndë të para',   sublabel: 'miell, sheqer, vezë',   color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Fitimi',          sublabel: 'neto i ditës',          color: '#9B5CF8', icon: 'dot', key: 'profit'   },
    ],
    quickActions: [
      { label: 'Shto Produkt',  href: '/pos/products', icon: 'dot', color: '#F59E0B' },
      { label: 'Blerje Lëndësh', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
      { label: 'Raport Ditor',  href: '/pos/reports',  icon: 'dot', color: '#10B981' },
    ],
    tips: [
      'Produktet ditore — çmimet ndryshojnë me koston e miellit',
      'TVSH 8% për bukë dhe produkte buke bazë',
      'Pastiqeria — TVSH 18% për ëmbëlsirat',
    ],
    invoiceCTA: 'Shto Produkt',
    expenseCTA: 'Blerje Lëndësh',
  },

  // ── SALON ─────────────────────────────────────────────────
  salon: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Të ardhura nga shërbimet',
    expenseLabel: 'Produktet kozmetike',
    invoiceLabel: 'Shërbime sot',
    clientLabel: 'Klientë sot',
    kpis: [
      { label: 'Shërbimet sot',   sublabel: 'kuponë fiskalë',        color: '#EC4899', icon: 'dot', key: 'revenue'  },
      { label: 'Terminet sot',    sublabel: 'klientë të shërbyer',   color: '#8B5CF6', icon: 'dot', key: 'invoices' },
      { label: 'Produkte',        sublabel: 'kozmetikë dhe shërbime', color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Fitimi',          sublabel: 'neto i ditës',          color: '#10B981', icon: 'dot', key: 'profit'   },
    ],
    quickActions: [
      { label: 'Shto Shërbim',  href: '/pos/products',  icon: 'dot', color: '#EC4899' },
      { label: 'Shto Termin',   href: '/appointments',  icon: 'dot', color: '#8B5CF6' },
      { label: 'Raport Ditor',  href: '/pos/reports',   icon: 'dot', color: '#10B981' },
    ],
    tips: [
      'Terminet parapake zvogëlojnë kohën e pritjes',
      'Produktet kozmetike — TVSH 18%',
      'Shërbimet e sallonit — TVSH 18%',
    ],
    invoiceCTA: 'Shto Shërbim',
    expenseCTA: 'Blerje Produktesh',
  },

  // ── BARBER ────────────────────────────────────────────────
  barber: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Të ardhura nga prerjet',
    expenseLabel: 'Produktet dhe pajisjet',
    invoiceLabel: 'Prerje sot',
    clientLabel: 'Klientë sot',
    kpis: [
      { label: 'Prerjet sot',     sublabel: 'kuponë fiskalë',        color: '#1D4ED8', icon: 'dot', key: 'revenue'  },
      { label: 'Klientë sot',     sublabel: 'të shërbyer',           color: '#3B82F6', icon: 'dot', key: 'invoices' },
      { label: 'Produkte',        sublabel: 'blerje dhe mirëmbajtje', color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Fitimi',          sublabel: 'neto i ditës',          color: '#10B981', icon: 'dot', key: 'profit'   },
    ],
    quickActions: [
      { label: 'Shto Shërbim',  href: '/pos/products', icon: 'dot', color: '#1D4ED8' },
      { label: 'Shto Shpenzim', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
      { label: 'Raport Ditor',  href: '/pos/reports',  icon: 'dot', color: '#10B981' },
    ],
    tips: [
      'Shërbime shtesë (beard trim, treatments) rrisin të ardhurat',
      'Produktet për shitje — marzh i mirë',
      'TVSH 18% për të gjitha shërbimet',
    ],
    invoiceCTA: 'Shto Shërbim',
    expenseCTA: 'Blerje Produktesh',
  },

  // ── BEAUTY / SPA ──────────────────────────────────────────
  beauty: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Të ardhura nga trajtimete',
    expenseLabel: 'Produktet dhe materiale',
    invoiceLabel: 'Trajtime sot',
    clientLabel: 'Klientë sot',
    kpis: [
      { label: 'Trajtimet sot',   sublabel: 'kuponë fiskalë',        color: '#A855F7', icon: 'dot', key: 'revenue'  },
      { label: 'Klientë sot',     sublabel: 'të shërbyer',           color: '#EC4899', icon: 'dot', key: 'invoices' },
      { label: 'Produkte',        sublabel: 'kozmetikë premium',     color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Fitimi',          sublabel: 'neto i ditës',          color: '#10B981', icon: 'dot', key: 'profit'   },
    ],
    quickActions: [
      { label: 'Shto Trajtim',  href: '/pos/products',  icon: 'dot', color: '#A855F7' },
      { label: 'Shto Termin',   href: '/appointments',  icon: 'dot', color: '#EC4899' },
      { label: 'Raport Ditor',  href: '/pos/reports',   icon: 'dot', color: '#10B981' },
    ],
    tips: [
      'Pakot e trajtimeve rrisin vlerën mesatare të faturës',
      'Produktet premium për shitje — marzh i lartë',
      'TVSH 18% për shërbime kozmetike',
    ],
    invoiceCTA: 'Shto Trajtim',
    expenseCTA: 'Blerje Produktesh',
  },

  spa: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Të ardhura nga spa',
    expenseLabel: 'Produktet dhe utilities',
    invoiceLabel: 'Sesione sot',
    clientLabel: 'Klientë sot',
    kpis: [
      { label: 'Sesinoet sot',    sublabel: 'kuponë fiskalë',        color: '#0EA5E9', icon: 'dot', key: 'revenue'  },
      { label: 'Klientë sot',     sublabel: 'të shërbyer',           color: '#6366F1', icon: 'dot', key: 'invoices' },
      { label: 'Shpenzime',       sublabel: 'produkte & utilities',  color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Fitimi',          sublabel: 'neto i ditës',          color: '#10B981', icon: 'dot', key: 'profit'   },
    ],
    quickActions: [
      { label: 'Shto Shërbim',  href: '/pos/products',  icon: 'dot', color: '#0EA5E9' },
      { label: 'Shto Termin',   href: '/appointments',  icon: 'dot', color: '#6366F1' },
      { label: 'Raport Ditor',  href: '/pos/reports',   icon: 'dot', color: '#10B981' },
    ],
    tips: [
      'Rezervimet parapake sigurojnë kapacitet të plotë',
      'Pakot ditore/javore rrisin besnike',
      'TVSH 18% për shërbime spa',
    ],
    invoiceCTA: 'Shto Shërbim',
    expenseCTA: 'Shpenzim Operativ',
  },

  gym: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Abonemenet dhe shërbime',
    expenseLabel: 'Mirëmbajtja dhe utilities',
    invoiceLabel: 'Abonentë sot',
    clientLabel: 'Anëtarë aktivë',
    kpis: [
      { label: 'Shitjet sot',     sublabel: 'abonime dhe shërbime',  color: '#F97316', icon: 'dot', key: 'revenue'  },
      { label: 'Kuponë sot',      sublabel: 'pagesa ditore',         color: '#3B82F6', icon: 'dot', key: 'invoices' },
      { label: 'Shpenzime',       sublabel: 'mirëmbajtje & staff',   color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Fitimi',          sublabel: 'neto i muajit',         color: '#10B981', icon: 'dot', key: 'profit'   },
    ],
    quickActions: [
      { label: 'Shto Shërbim',  href: '/pos/products', icon: 'dot', color: '#F97316' },
      { label: 'Shto Shpenzim', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
      { label: 'Raport Ditor',  href: '/pos/reports',  icon: 'dot', color: '#10B981' },
    ],
    tips: [
      'Abonemenet 3/6/12 mujore sigurojnë cash flow',
      'Personal training — shërbim shtesë me marzh të lartë',
      'TVSH 18% për shërbime fitness',
    ],
    invoiceCTA: 'Shto Shërbim',
    expenseCTA: 'Shpenzim Operativ',
  },

  // ── HEALTH ────────────────────────────────────────────────
  health: {
    greeting: 'Mirëmëngjes, Mjek',
    revenueLabel: 'Të ardhura nga vizitat',
    expenseLabel: 'Shpenzime mjekësore',
    invoiceLabel: 'Vizitat e faturuara',
    clientLabel: 'Pacientë',
    kpis: [
      { label: 'Vizita këtë muaj', sublabel: 'fatura të lëshuara', color: '#10B981', icon: 'dot', key: 'invoices' },
      { label: 'Të ardhura', sublabel: 'nga shërbimet mjekësore', color: '#9B5CF8', icon: 'dot', key: 'revenue' },
      { label: 'Shpenzime', sublabel: 'materiale & pajisje', color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Në pritje pagese', sublabel: 'fatura të hapura', color: '#F59E0B', icon: 'dot', key: 'pending' },
    ],
    quickActions: [
      { label: 'Shto Vizitë', href: '/health-module', icon: 'dot', color: '#10B981' },
      { label: 'Blerje Ilaçe', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
      { label: 'Shërbime', href: '/pos', icon: 'dot', color: '#9B5CF8' },
    ],
    tips: [
      'Vizitat mjekësore faturojini menjëherë pas çdo konsultimi',
      'TVSH nuk aplikohet për shërbime shëndetësore',
      'Sigurim profesional i detyrueshëm — regjistrojeni si shpenzim',
    ],
    invoiceCTA: 'Faturë Vizite',
    expenseCTA: 'Blerje Ilaçe/Materiale',
  },
  construction: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Vlera kontratave',
    expenseLabel: 'Kosto projekti',
    invoiceLabel: 'Situata të lëshuara',
    clientLabel: 'Klientë/Projekte',
    kpis: [
      { label: 'Situata këtë muaj', sublabel: 'fatura të lëshuara', color: '#F59E0B', icon: 'dot', key: 'invoices' },
      { label: 'Të ardhura', sublabel: 'nga kontratat', color: '#9B5CF8', icon: 'dot', key: 'revenue' },
      { label: 'Kosto materiale', sublabel: 'blerje dhe transport', color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Situata të hapura', sublabel: 'në pritje pagese', color: '#3B82F6', icon: 'dot', key: 'pending' },
    ],
    quickActions: [
      { label: 'Situatë e Re', href: '/invoices/new', icon: 'dot', color: '#F59E0B' },
      { label: 'Blerje Materiale', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
      { label: 'Listëpagesa', href: '/listepagesa', icon: 'dot', color: '#10B981' },
    ],
    tips: [
      'Situatat mujore lëshohen brenda 5 ditëve të muajit pasues',
      'Tatimi 9% aplikohet për pagesat ndaj nënkontraktorëve',
      'Ruaj faturat e materialeve — zbritje tatimore',
    ],
    invoiceCTA: 'Situatë e Re',
    expenseCTA: 'Blerje Materiale',
  },
  legal: {
    greeting: 'Mirëmëngjes, Avokat',
    revenueLabel: 'Honorare dhe tarifa',
    expenseLabel: 'Shpenzime të zyrës',
    invoiceLabel: 'Fatura honorari',
    clientLabel: 'Klientë/Raste',
    kpis: [
      { label: 'Raste aktive', sublabel: 'fatura të hapura', color: '#8B5CF6', icon: 'dot', key: 'invoices' },
      { label: 'Honorare', sublabel: 'të ardhura nga rastet', color: '#9B5CF8', icon: 'dot', key: 'revenue' },
      { label: 'Shpenzime', sublabel: 'tarifa gjyqësore & admin', color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Të papaguara', sublabel: 'honorare në pritje', color: '#F59E0B', icon: 'dot', key: 'pending' },
    ],
    quickActions: [
      { label: 'Faturë Honorari', href: '/invoices/new', icon: 'dot', color: '#8B5CF6' },
      { label: 'Tarifë Gjyqësore', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
      { label: 'Shërbime', href: '/settings?tab=services', icon: 'dot', color: '#9B5CF8' },
    ],
    tips: [
      'Dokumentoni orët e punës për çdo rast',
      'Honoraret mbi €500 — tatim 9% në burim',
      'Konfidencialiteti i klientit është i detyrueshëm',
    ],
    invoiceCTA: 'Faturë Honorari',
    expenseCTA: 'Shpenzim Gjyqësor',
  },
  agency: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Retainerë dhe projekte',
    expenseLabel: 'Shpenzime operative',
    invoiceLabel: 'Fatura klientëve',
    clientLabel: 'Klientë aktivë',
    kpis: [
      { label: 'Fatura këtë muaj', sublabel: 'projekte dhe retainerë', color: '#3B82F6', icon: 'dot', key: 'invoices' },
      { label: 'MRR', sublabel: 'të ardhura mujore', color: '#9B5CF8', icon: 'dot', key: 'revenue' },
      { label: 'Shpenzime', sublabel: 'staff & softuer', color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Të papaguara', sublabel: 'fatura në pritje', color: '#F59E0B', icon: 'dot', key: 'pending' },
    ],
    quickActions: [
      { label: 'Faturë Retainer', href: '/invoices/new', icon: 'dot', color: '#3B82F6' },
      { label: 'Faturë Projekti', href: '/invoices/new', icon: 'dot', color: '#8B5CF6' },
      { label: 'Shpenzim Reklamash', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
    ],
    tips: [
      'Retainerët mujorë sigurojnë cash flow të qëndrueshëm',
      'Kontratat me klientë nënshkruani para fillimit',
      'Dokumentoni punën për klientët që pyesin',
    ],
    invoiceCTA: 'Faturë Klienti',
    expenseCTA: 'Shpenzim Agjencie',
  },
  it: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Projekte dhe mirëmbajtje',
    expenseLabel: 'Shpenzime tech',
    invoiceLabel: 'Fatura projektesh',
    clientLabel: 'Klientë tech',
    kpis: [
      { label: 'Projekte aktive', sublabel: 'fatura të hapura', color: '#3B82F6', icon: 'dot', key: 'invoices' },
      { label: 'MRR', sublabel: 'mirëmbajtje + projekte', color: '#9B5CF8', icon: 'dot', key: 'revenue' },
      { label: 'Hosting & Licenca', sublabel: 'shpenzime tech', color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Të papaguara', sublabel: 'fatura në pritje', color: '#F59E0B', icon: 'dot', key: 'pending' },
    ],
    quickActions: [
      { label: 'Faturë Projekti', href: '/invoices/new', icon: 'dot', color: '#3B82F6' },
      { label: 'Mirëmbajtje Mujore', href: '/invoices/new', icon: 'dot', color: '#8B5CF6' },
      { label: 'Shpenzim Hosting', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
    ],
    tips: [
      'Kontratat SaaS regjistrojini si shpenzim i zbritshëm',
      'Dokumentoni orët — ndihmon në faturim dhe taksim',
      'Mirëmbajtja mujore siguron të ardhura të parashikueshme',
    ],
    invoiceCTA: 'Faturë Projekti',
    expenseCTA: 'Shpenzim Tech',
  },
  restaurant: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Shitjet ditore',
    expenseLabel: 'Kostot operative',
    invoiceLabel: 'Fatura dhe shitje',
    clientLabel: 'Shitje',
    kpis: [
      { label: 'Fatura këtë muaj', sublabel: 'shitje dhe katering', color: '#F59E0B', icon: 'dot', key: 'invoices' },
      { label: 'Të ardhura', sublabel: 'shitjet totale', color: '#9B5CF8', icon: 'dot', key: 'revenue' },
      { label: 'Ushqime & Pije', sublabel: 'shpenzime furnizimi', color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Katering aktiv', sublabel: 'fatura të hapura', color: '#10B981', icon: 'dot', key: 'pending' },
    ],
    quickActions: [
      { label: 'Faturë Katering', href: '/invoices/new', icon: 'dot', color: '#F59E0B' },
      { label: 'Blerje Ushqimesh', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
      { label: 'Listëpagesa', href: '/listepagesa', icon: '‍', color: '#10B981' },
    ],
    tips: [
      'TVSH 8% për ushqim, 18% për alkool',
      'Faturat blerjes zvogëlojnë TVSH-n që paguhet',
      'Listëpagesa deri më 15 të muajit pasues',
    ],
    invoiceCTA: 'Faturë / Katering',
    expenseCTA: 'Blerje Furnizimi',
  },
  transport: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Të ardhura transport',
    expenseLabel: 'Kosto operative',
    invoiceLabel: 'Fatura transporti',
    clientLabel: 'Klientë',
    kpis: [
      { label: 'Transportime', sublabel: 'fatura këtë muaj', color: '#3B82F6', icon: 'dot', key: 'invoices' },
      { label: 'Të ardhura', sublabel: 'nga transporti', color: '#9B5CF8', icon: 'dot', key: 'revenue' },
      { label: 'Karburant & shpenzime', sublabel: 'kosto operative', color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Fatura hapura', sublabel: 'në pritje pagese', color: '#F59E0B', icon: 'dot', key: 'pending' },
    ],
    quickActions: [
      { label: 'Faturë Transporti', href: '/invoices/new', icon: 'dot', color: '#3B82F6' },
      { label: 'Karburant', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
      { label: 'Listëpagesa Shoferëve', href: '/listepagesa', icon: 'dot', color: '#10B981' },
    ],
    tips: [
      'Karburanti 100% i zbritshëm nëse mjeti është i regjistruar si biznes',
      'Sigurimi dhe tatimi vjetor janë shpenzime të zbritshme',
      'Mbaj libër udhëtimesh për çdo mjet',
    ],
    invoiceCTA: 'Faturë Transporti',
    expenseCTA: 'Shpenzim Mjeti',
  },
  education: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Tarifa kursesh',
    expenseLabel: 'Shpenzime arsimore',
    invoiceLabel: 'Fatura studentësh',
    clientLabel: 'Studentë',
    kpis: [
      { label: 'Studentë aktivë', sublabel: 'fatura këtë muaj', color: '#8B5CF6', icon: 'dot', key: 'invoices' },
      { label: 'Të ardhura', sublabel: 'tarifa kursesh', color: '#9B5CF8', icon: 'dot', key: 'revenue' },
      { label: 'Shpenzime', sublabel: 'materiale & mësues', color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Fatura hapura', sublabel: 'pagesa të vonuara', color: '#F59E0B', icon: 'dot', key: 'pending' },
    ],
    quickActions: [
      { label: 'Faturë Kursi', href: '/invoices/new', icon: 'dot', color: '#8B5CF6' },
      { label: 'Pagesë Mësuesi', href: '/expenses/new', icon: '‍', color: '#EF4444' },
      { label: 'Listëpagesa', href: '/listepagesa', icon: 'dot', color: '#10B981' },
    ],
    tips: [
      'Faturimi mujor i studentëve siguron cash flow',
      'Certifikatat dhe akreditimet shtojnë vlerën',
      'Shpenzimet arsimore janë të zbritshme',
    ],
    invoiceCTA: 'Faturë Kursi',
    expenseCTA: 'Shpenzim Arsimor',
  },
  services: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Të ardhura shërbimesh',
    expenseLabel: 'Shpenzime operative',
    invoiceLabel: 'Fatura shërbimesh',
    clientLabel: 'Klientë',
    kpis: [
      { label: 'Shërbime këtë muaj', sublabel: 'fatura të lëshuara', color: '#10B981', icon: 'dot', key: 'invoices' },
      { label: 'Të ardhura', sublabel: 'nga shërbimet', color: '#9B5CF8', icon: 'dot', key: 'revenue' },
      { label: 'Shpenzime', sublabel: 'materiale & punëtorë', color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Fatura hapura', sublabel: 'në pritje pagese', color: '#F59E0B', icon: 'dot', key: 'pending' },
    ],
    quickActions: [
      { label: 'Faturë Shërbimi', href: '/invoices/new', icon: 'dot', color: '#10B981' },
      { label: 'Shpenzim', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
      { label: 'Shërbime', href: '/settings?tab=services', icon: 'dot', color: '#9B5CF8' },
    ],
    tips: [
      'Faturoni menjëherë pas përfundimit të shërbimit',
      'Kontratat me klientë rregullorë zvogëlojnë rrezikun',
    ],
    invoiceCTA: 'Faturë Shërbimi',
    expenseCTA: 'Shpenzim',
  },
  import_export: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Shitjet dhe eksporti',
    expenseLabel: 'Importi dhe kostot',
    invoiceLabel: 'Fatura eksporti/shitjesh',
    clientLabel: 'Klientë',
    kpis: [
      { label: 'Fatura këtë muaj', sublabel: 'shitje dhe eksport', color: '#3B82F6', icon: 'dot', key: 'invoices' },
      { label: 'Të ardhura', sublabel: 'nga shitjet', color: '#9B5CF8', icon: 'dot', key: 'revenue' },
      { label: 'Importi & dogana', sublabel: 'kosto furnizimi', color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Fatura hapura', sublabel: 'në pritje pagese', color: '#F59E0B', icon: 'dot', key: 'pending' },
    ],
    quickActions: [
      { label: 'Faturë Shitjeje', href: '/invoices/new', icon: 'dot', color: '#3B82F6' },
      { label: 'Shpenzim Dogane', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
      { label: 'Shërbime', href: '/settings?tab=services', icon: 'dot', color: '#9B5CF8' },
    ],
    tips: [
      'Dokumentet doganore nevojiten për TVSH',
      'Kursi i këmbimit ndikon në fitim — mbaj regjistër',
      'TVSH hyrëse nga importi është e zbritshme',
    ],
    invoiceCTA: 'Faturë Eksporti',
    expenseCTA: 'Shpenzim Importi',
  },
  tourism: {
    greeting: 'Mirëmëngjes',
    revenueLabel: 'Rezervimet dhe shërbimet',
    expenseLabel: 'Kostot operative',
    invoiceLabel: 'Fatura rezervimesh',
    clientLabel: 'Mysafirë',
    kpis: [
      { label: 'Rezervime aktive', sublabel: 'fatura këtë muaj', color: '#10B981', icon: 'dot', key: 'invoices' },
      { label: 'Të ardhura', sublabel: 'nga rezervimet', color: '#9B5CF8', icon: 'dot', key: 'revenue' },
      { label: 'Shpenzime', sublabel: 'mirëmbajtje & staff', color: '#EF4444', icon: 'dot', key: 'expenses' },
      { label: 'Fatura hapura', sublabel: 'pagesa të pritshme', color: '#F59E0B', icon: 'dot', key: 'pending' },
    ],
    quickActions: [
      { label: 'Faturë Rezervimi', href: '/invoices/new', icon: 'dot', color: '#10B981' },
      { label: 'Shpenzim Mirëmbajtjeje', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
      { label: 'Listëpagesa Stafit', href: '/listepagesa', icon: 'dot', color: '#3B82F6' },
    ],
    tips: [
      'OTA (Booking, Airbnb) marrin komision — llogarise në çmim',
      'Sezoni ndikon — planifiko cash flow për periudhat e qeta',
      'TVSH 8% për akomodim',
    ],
    invoiceCTA: 'Faturë Rezervimi',
    expenseCTA: 'Shpenzim Operativ',
  },
}

export function getCategoryDashboardConfig(businessType: string | null): CategoryDashboardConfig | null {
  if (!businessType) return null
  return configs[businessType] || null
}

export const DEFAULT_CONFIG: CategoryDashboardConfig = {
  greeting: 'Mirëmëngjes',
  revenueLabel: 'Të ardhura',
  expenseLabel: 'Shpenzime',
  invoiceLabel: 'Fatura',
  clientLabel: 'Klientë',
  kpis: [
    { label: 'Fatura këtë muaj', sublabel: 'të lëshuara', color: '#9B5CF8', icon: 'dot', key: 'invoices' },
    { label: 'Të ardhura', sublabel: 'totale', color: '#10B981', icon: 'dot', key: 'revenue' },
    { label: 'Shpenzime', sublabel: 'totale', color: '#EF4444', icon: 'dot', key: 'expenses' },
    { label: 'Fitimi', sublabel: 'neto', color: '#3B82F6', icon: 'dot', key: 'profit' },
  ],
  quickActions: [
    { label: 'Faturë e Re', href: '/invoices/new', icon: 'dot', color: '#9B5CF8' },
    { label: 'Shpenzim i Ri', href: '/expenses/new', icon: 'dot', color: '#EF4444' },
  ],
  tips: [],
  invoiceCTA: 'Faturë e Re',
  expenseCTA: 'Shpenzim i Ri',
}
