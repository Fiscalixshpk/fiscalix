-- ═══════════════════════════════════════════════════════════
-- ACCOUNTANT WORKSPACE EXPANSION
-- 6 veçori të reja: Notes, Checklist, Timeline, Documents (Vault+Requests+Chat)
-- Ekzekuto në Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────
-- 1. ACCOUNTANT NOTES — shënime private kontabilisti për një klient
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accountant_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accountant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_accountant_notes_company ON accountant_notes(accountant_id, company_id);

-- ───────────────────────────────────────────────
-- 2. MONTHLY CLOSING CHECKLIST — lista mujore e mbylljes për klient
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS closing_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accountant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL,       -- 1-12
  period_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(accountant_id, company_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS closing_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES closing_checklists(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  is_done BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  done_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON closing_checklist_items(checklist_id);

-- Default checklist template items (used when creating a new month's checklist)
CREATE TABLE IF NOT EXISTS closing_checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accountant_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = global default
  label VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO closing_checklist_templates (accountant_id, label, sort_order) VALUES
  (NULL, 'Rakordo Librin e Shitjeve', 1),
  (NULL, 'Rakordo Librin e Blerjeve', 2),
  (NULL, 'Verifiko kontributet pensionale', 3),
  (NULL, 'Kontrollo faturat e pashlyera', 4),
  (NULL, 'Deklaro TVSH (nëse afati është këtë muaj)', 5),
  (NULL, 'Arkivo dokumentet e muajit', 6)
ON CONFLICT DO NOTHING;

-- ───────────────────────────────────────────────
-- 3. CLIENT ACTIVITY TIMELINE — shtojmë view të lehtë mbi activity_logs
--    (activity_logs ekziston tashmë, vetëm sigurohemi që ka company_id index)
-- ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_created ON activity_logs(company_id, created_at DESC);

-- ───────────────────────────────────────────────
-- 4. DOKUMENTET: Document Requests + Missing Alerts + Shared Vault + Chat
--    Të gjitha të bashkuara në modulin "client_documents"
-- ───────────────────────────────────────────────

-- 4a. Kërkesat për dokumente (kontabilisti kërkon, biznesi sheh "mungon")
CREATE TABLE IF NOT EXISTS document_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accountant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending | fulfilled | dismissed
  due_date DATE,
  fulfilled_document_id UUID, -- lidhet me shared_documents.id pas ngarkimit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_doc_requests_company ON document_requests(company_id, status);

-- 4b. Dokumentet e ngarkuara (vault i përbashkët biznes ↔ kontabilist)
CREATE TABLE IF NOT EXISTS shared_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  request_id UUID REFERENCES document_requests(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,        -- rruga te Supabase Storage
  file_size INTEGER,
  file_type VARCHAR(100),
  category VARCHAR(50) DEFAULT 'other', -- invoice | receipt | contract | bank_statement | other
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shared_docs_company ON shared_documents(company_id, created_at DESC);

-- 4c. Chat mes kontabilistit dhe biznesit (1 thread për company_id)
CREATE TABLE IF NOT EXISTS client_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  attachment_document_id UUID REFERENCES shared_documents(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_messages_company ON client_messages(company_id, created_at DESC);

-- Storage bucket për dokumentet (run separately if bucket doesn't exist)
-- Shko te Supabase Dashboard → Storage → New bucket → "shared-documents" (private)

-- ───────────────────────────────────────────────
-- 5. RLS — i lëmë çelur (disabled) si pjesa tjetër e accountant tables
-- ───────────────────────────────────────────────
ALTER TABLE accountant_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE closing_checklists DISABLE ROW LEVEL SECURITY;
ALTER TABLE closing_checklist_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE closing_checklist_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE shared_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_messages DISABLE ROW LEVEL SECURITY;

SELECT 'Accountant Workspace Expansion — migrim i plotë!' as status;
