-- ═══════════════════════════════════════════
-- NDËRTIM — Construction Module
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS construction_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'active', -- active, completed, paused
  start_date DATE,
  end_date DATE,
  total_value NUMERIC(12,2) DEFAULT 0,
  progress_percent INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS construction_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  type TEXT DEFAULT 'apartment', -- apartment, commercial, garage, office
  floor INTEGER,
  area_sqm NUMERIC(8,2),
  price NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'available', -- available, reserved, sold, delivered
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS construction_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES construction_projects(id),
  unit_id UUID REFERENCES construction_units(id),
  contract_number TEXT,
  buyer_name TEXT NOT NULL,
  buyer_id_number TEXT,
  total_value NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  contract_date DATE,
  delivery_date DATE,
  status TEXT DEFAULT 'active', -- active, completed, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS construction_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES construction_contracts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'bank_transfer',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS construction_subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES construction_projects(id),
  name TEXT NOT NULL,
  work_type TEXT,
  contract_value NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE construction_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_subcontractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "construction_projects_all" ON construction_projects FOR ALL USING (true);
CREATE POLICY "construction_units_all" ON construction_units FOR ALL USING (true);
CREATE POLICY "construction_contracts_all" ON construction_contracts FOR ALL USING (true);
CREATE POLICY "construction_payments_all" ON construction_payments FOR ALL USING (true);
CREATE POLICY "construction_subcontractors_all" ON construction_subcontractors FOR ALL USING (true);

-- ═══════════════════════════════════════════
-- SHËNDETËSI — Health Module
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  id_number TEXT,
  blood_type TEXT,
  allergies TEXT,
  chronic_conditions TEXT,
  insurance_number TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  visit_type TEXT DEFAULT 'regular', -- regular, emergency, followup, surgery
  doctor_name TEXT,
  diagnosis TEXT,
  treatment TEXT,
  prescription TEXT,
  next_visit DATE,
  invoice_id UUID REFERENCES invoices(id),
  amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'completed', -- scheduled, completed, cancelled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES medical_visits(id),
  prescription_date DATE NOT NULL,
  medications JSONB DEFAULT '[]',
  doctor_name TEXT,
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_all" ON patients FOR ALL USING (true);
CREATE POLICY "medical_visits_all" ON medical_visits FOR ALL USING (true);
CREATE POLICY "medical_prescriptions_all" ON medical_prescriptions FOR ALL USING (true);

-- ═══════════════════════════════════════════
-- TURIZËM — Tourism Module
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_type TEXT DEFAULT 'standard', -- standard, deluxe, suite, apartment
  floor INTEGER,
  capacity INTEGER DEFAULT 2,
  price_per_night NUMERIC(10,2) DEFAULT 0,
  amenities JSONB DEFAULT '[]',
  status TEXT DEFAULT 'available', -- available, occupied, maintenance, cleaning
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id),
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,
  guest_id_number TEXT,
  guest_nationality TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  price_per_night NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  source TEXT DEFAULT 'direct', -- direct, booking.com, airbnb, expedia, phone
  status TEXT DEFAULT 'confirmed', -- confirmed, checked_in, checked_out, cancelled, no_show
  special_requests TEXT,
  invoice_id UUID REFERENCES invoices(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tourism_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'food', -- food, transport, activity, spa, laundry
  price NUMERIC(10,2) DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tourism_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_all" ON rooms FOR ALL USING (true);
CREATE POLICY "bookings_all" ON bookings FOR ALL USING (true);
CREATE POLICY "tourism_services_all" ON tourism_services FOR ALL USING (true);
