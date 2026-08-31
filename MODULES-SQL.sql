-- ═══════════════════════════════════════════
-- IT/TECH MODULE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS it_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  type TEXT DEFAULT 'website', -- website, app, software, maintenance, consulting
  status TEXT DEFAULT 'active', -- active, completed, paused, cancelled
  start_date DATE, deadline DATE,
  budget NUMERIC(12,2) DEFAULT 0,
  hourly_rate NUMERIC(8,2) DEFAULT 0,
  hours_estimated NUMERIC(8,2) DEFAULT 0,
  hours_logged NUMERIC(8,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS it_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES it_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo', -- todo, in_progress, review, done
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  assigned_to TEXT,
  hours_estimated NUMERIC(6,2) DEFAULT 0,
  hours_logged NUMERIC(6,2) DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS it_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT, phone TEXT, website TEXT,
  industry TEXT, address TEXT,
  total_projects INTEGER DEFAULT 0,
  total_value NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE it_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "it_projects_all" ON it_projects FOR ALL USING (true);
CREATE POLICY "it_tasks_all" ON it_tasks FOR ALL USING (true);
CREATE POLICY "it_clients_all" ON it_clients FOR ALL USING (true);

-- ═══════════════════════════════════════════
-- JURIDIK MODULE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS legal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  case_number TEXT,
  client_name TEXT NOT NULL,
  client_phone TEXT, client_email TEXT,
  case_type TEXT DEFAULT 'civil', -- civil, criminal, commercial, family, administrative
  court TEXT,
  status TEXT DEFAULT 'active', -- active, won, lost, settled, closed
  start_date DATE, next_hearing DATE, close_date DATE,
  total_fee NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  lawyer_name TEXT,
  description TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS legal_hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  hearing_date DATE NOT NULL,
  hearing_time TEXT,
  court TEXT, judge TEXT,
  outcome TEXT, notes TEXT,
  next_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS legal_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  id_number TEXT, phone TEXT, email TEXT, address TEXT,
  client_type TEXT DEFAULT 'individual', -- individual, company
  total_cases INTEGER DEFAULT 0,
  active_cases INTEGER DEFAULT 0,
  total_fees NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legal_cases_all" ON legal_cases FOR ALL USING (true);
CREATE POLICY "legal_hearings_all" ON legal_hearings FOR ALL USING (true);
CREATE POLICY "legal_clients_all" ON legal_clients FOR ALL USING (true);

-- ═══════════════════════════════════════════
-- AGJENSI MODULE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agency_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT, contact_person TEXT,
  email TEXT, phone TEXT, website TEXT,
  monthly_retainer NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  start_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agency_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES agency_clients(id),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'branding', -- branding, social, website, campaign, video, print
  status TEXT DEFAULT 'briefing', -- briefing, in_progress, review, approved, delivered
  budget NUMERIC(12,2) DEFAULT 0,
  deadline DATE,
  assigned_to TEXT,
  brief TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agency_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES agency_clients(id),
  name TEXT NOT NULL,
  platform TEXT DEFAULT 'facebook', -- facebook, instagram, google, tiktok, linkedin
  budget NUMERIC(10,2) DEFAULT 0,
  spent NUMERIC(10,2) DEFAULT 0,
  start_date DATE, end_date DATE,
  status TEXT DEFAULT 'active',
  reach INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0, conversions INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE agency_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_clients_all" ON agency_clients FOR ALL USING (true);
CREATE POLICY "agency_projects_all" ON agency_projects FOR ALL USING (true);
CREATE POLICY "agency_campaigns_all" ON agency_campaigns FOR ALL USING (true);

-- ═══════════════════════════════════════════
-- TRANSPORT MODULE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plate TEXT NOT NULL, brand TEXT, model TEXT,
  year INTEGER, type TEXT DEFAULT 'truck',
  status TEXT DEFAULT 'active', -- active, maintenance, retired
  driver_name TEXT,
  fuel_type TEXT DEFAULT 'diesel',
  mileage NUMERIC(10,2) DEFAULT 0,
  insurance_expiry DATE, registration_expiry DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS transport_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id),
  client_name TEXT NOT NULL,
  client_phone TEXT,
  from_location TEXT, to_location TEXT,
  departure_date DATE, arrival_date DATE,
  cargo_type TEXT, weight_kg NUMERIC(8,2),
  distance_km NUMERIC(8,2),
  price NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'scheduled', -- scheduled, in_transit, delivered, cancelled
  driver_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL,
  type TEXT DEFAULT 'regular', -- regular, repair, emergency
  description TEXT,
  cost NUMERIC(10,2) DEFAULT 0,
  mileage_at_service NUMERIC(10,2),
  next_service_date DATE,
  service_center TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles_all" ON vehicles FOR ALL USING (true);
CREATE POLICY "transport_orders_all" ON transport_orders FOR ALL USING (true);
CREATE POLICY "vehicle_maintenance_all" ON vehicle_maintenance FOR ALL USING (true);

-- ═══════════════════════════════════════════
-- ARSIM MODULE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS edu_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE, gender TEXT,
  phone TEXT, email TEXT,
  parent_name TEXT, parent_phone TEXT,
  address TEXT, id_number TEXT,
  enrollment_date DATE,
  status TEXT DEFAULT 'active', -- active, graduated, dropped, paused
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS edu_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'language', -- language, it, driving, professional, arts
  duration_weeks INTEGER DEFAULT 0,
  price NUMERIC(10,2) DEFAULT 0,
  max_students INTEGER DEFAULT 20,
  schedule TEXT,
  instructor TEXT,
  status TEXT DEFAULT 'active',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS edu_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES edu_students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES edu_courses(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL,
  start_date DATE, end_date DATE,
  total_fee NUMERIC(10,2) DEFAULT 0,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, completed, dropped
  grade TEXT,
  certificate_issued BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE edu_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edu_students_all" ON edu_students FOR ALL USING (true);
CREATE POLICY "edu_courses_all" ON edu_courses FOR ALL USING (true);
CREATE POLICY "edu_enrollments_all" ON edu_enrollments FOR ALL USING (true);

-- ═══════════════════════════════════════════
-- IMPORT/EXPORT MODULE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ie_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT, city TEXT,
  contact_person TEXT, email TEXT, phone TEXT,
  payment_terms TEXT,
  currency TEXT DEFAULT 'EUR',
  category TEXT,
  total_orders INTEGER DEFAULT 0,
  total_value NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ie_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES ie_suppliers(id),
  order_type TEXT DEFAULT 'import', -- import, export
  order_number TEXT,
  client_or_supplier TEXT NOT NULL,
  country TEXT,
  goods_description TEXT,
  hs_code TEXT,
  quantity NUMERIC(10,2),
  unit TEXT DEFAULT 'kg',
  unit_price NUMERIC(10,2) DEFAULT 0,
  total_value NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  incoterm TEXT DEFAULT 'FOB',
  customs_value NUMERIC(12,2) DEFAULT 0,
  customs_duty NUMERIC(10,2) DEFAULT 0,
  vat_import NUMERIC(10,2) DEFAULT 0,
  transport_cost NUMERIC(10,2) DEFAULT 0,
  order_date DATE,
  expected_date DATE, arrival_date DATE,
  status TEXT DEFAULT 'ordered', -- ordered, in_transit, customs, delivered, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ie_warehouse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  hs_code TEXT, category TEXT,
  quantity_in_stock NUMERIC(10,2) DEFAULT 0,
  unit TEXT DEFAULT 'copë',
  unit_cost NUMERIC(10,2) DEFAULT 0,
  selling_price NUMERIC(10,2) DEFAULT 0,
  min_stock NUMERIC(10,2) DEFAULT 0,
  supplier_id UUID REFERENCES ie_suppliers(id),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ie_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ie_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ie_warehouse ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ie_suppliers_all" ON ie_suppliers FOR ALL USING (true);
CREATE POLICY "ie_orders_all" ON ie_orders FOR ALL USING (true);
CREATE POLICY "ie_warehouse_all" ON ie_warehouse FOR ALL USING (true);

-- ═══════════════════════════════════════════
-- SHËRBIME MODULE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS service_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT, email TEXT, address TEXT,
  client_type TEXT DEFAULT 'individual',
  total_jobs INTEGER DEFAULT 0,
  total_value NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS service_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES service_clients(id),
  job_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  service_type TEXT DEFAULT 'repair',
  assigned_to TEXT,
  scheduled_date DATE, completed_date DATE,
  status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  priority TEXT DEFAULT 'normal',
  labor_cost NUMERIC(10,2) DEFAULT 0,
  materials_cost NUMERIC(10,2) DEFAULT 0,
  total_price NUMERIC(10,2) DEFAULT 0,
  invoice_id UUID REFERENCES invoices(id),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS service_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialization TEXT,
  members JSONB DEFAULT '[]',
  active_jobs INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE service_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_clients_all" ON service_clients FOR ALL USING (true);
CREATE POLICY "service_jobs_all" ON service_jobs FOR ALL USING (true);
CREATE POLICY "service_teams_all" ON service_teams FOR ALL USING (true);

-- ═══════════════════════════════════════════
-- SHËRBIMET E BIZNESIT (per çdo kategori)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS business_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  price NUMERIC(10,2) DEFAULT 0,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TERMINET — sistem booking
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_id UUID REFERENCES business_services(id),
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'confirmed', -- confirmed, completed, cancelled, no_show
  notes TEXT,
  source TEXT DEFAULT 'manual', -- manual, online_link
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOOKING LINK — link publik per termin online
CREATE TABLE IF NOT EXISTS booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE business_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_services_all" ON business_services;
DROP POLICY IF EXISTS "appointments_all" ON appointments;
DROP POLICY IF EXISTS "booking_links_all" ON booking_links;

CREATE POLICY "business_services_all" ON business_services FOR ALL USING (true);
CREATE POLICY "appointments_all" ON appointments FOR ALL USING (true);
CREATE POLICY "booking_links_all" ON booking_links FOR ALL USING (true);
