-- ═══════════════════════════════════════════════════════════
-- PLANI KONTABËL PËR KOSOVË (Chart of Accounts)
-- Themeli për Librin e Arkës, Librin e Bankës, dhe Dy Hyrje (e ardhshme)
-- Ekzekuto në Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) NOT NULL UNIQUE,         -- p.sh. '1000', '6100'
  name_sq VARCHAR(150) NOT NULL,
  class_number INTEGER NOT NULL,            -- 1-9 (Klasa)
  class_name VARCHAR(100) NOT NULL,         -- p.sh. 'ASETET', 'DETYRIMET'
  group_code VARCHAR(10),                   -- p.sh. '10', '12', '60' (nën-grupi)
  group_name VARCHAR(150),                  -- p.sh. 'Paraja dhe Banka', 'Klientët'
  normal_balance VARCHAR(10) NOT NULL DEFAULT 'debit', -- 'debit' | 'credit'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coa_class ON chart_of_accounts(class_number);
CREATE INDEX IF NOT EXISTS idx_coa_code ON chart_of_accounts(code);

-- ───────────────────────────────────────────────
-- KLASA 1 – ASETET (Debi normal)
-- ───────────────────────────────────────────────
INSERT INTO chart_of_accounts (code, name_sq, class_number, class_name, group_code, group_name, normal_balance) VALUES
('1000','Arka Qendrore',1,'ASETET','10','Paraja dhe Banka','debit'),
('1010','Arka EUR',1,'ASETET','10','Paraja dhe Banka','debit'),
('1020','Arka Valutë',1,'ASETET','10','Paraja dhe Banka','debit'),
('1030','Arka POS',1,'ASETET','10','Paraja dhe Banka','debit'),
('1100','Llogaria Bankare Kryesore',1,'ASETET','10','Paraja dhe Banka','debit'),
('1110','Banka ProCredit',1,'ASETET','10','Paraja dhe Banka','debit'),
('1120','Banka Raiffeisen',1,'ASETET','10','Paraja dhe Banka','debit'),
('1130','Banka TEB',1,'ASETET','10','Paraja dhe Banka','debit'),
('1140','Banka BKT',1,'ASETET','10','Paraja dhe Banka','debit'),
('1150','PayPal / Stripe',1,'ASETET','10','Paraja dhe Banka','debit'),
('1190','Transferet në rrugë',1,'ASETET','10','Paraja dhe Banka','debit'),
('1200','Klientë Vendor',1,'ASETET','12','Klientët','debit'),
('1210','Klientë Jashtë Vendit',1,'ASETET','12','Klientët','debit'),
('1220','Klientë me këste',1,'ASETET','12','Klientët','debit'),
('1230','Klientë të dyshimtë',1,'ASETET','12','Klientët','debit'),
('1290','Zhvlerësimi i klientëve',1,'ASETET','12','Klientët','credit'),
('1300','Mallra',1,'ASETET','13','Inventari','debit'),
('1310','Lëndë e parë',1,'ASETET','13','Inventari','debit'),
('1320','Material ndihmës',1,'ASETET','13','Inventari','debit'),
('1330','Produkte në proces',1,'ASETET','13','Inventari','debit'),
('1340','Produkte të gatshme',1,'ASETET','13','Inventari','debit'),
('1350','Mall në transit',1,'ASETET','13','Inventari','debit'),
('1360','Ambalazh',1,'ASETET','13','Inventari','debit'),
('1400','Paradhënie furnitorëve',1,'ASETET','14','Paradhënie','debit'),
('1410','Paradhënie punonjësve',1,'ASETET','14','Paradhënie','debit'),
('1420','Depozita',1,'ASETET','14','Paradhënie','debit'),
('1500','TVSH e zbritshme',1,'ASETET','15','TVSH','debit'),
('1510','TVSH e pagueshme',1,'ASETET','15','TVSH','credit'),
('1520','TVSH në import',1,'ASETET','15','TVSH','debit'),
('1600','Tokë',1,'ASETET','16','Asete Afatgjata','debit'),
('1610','Ndërtesa',1,'ASETET','16','Asete Afatgjata','debit'),
('1620','Pajisje',1,'ASETET','16','Asete Afatgjata','debit'),
('1630','Automjete',1,'ASETET','16','Asete Afatgjata','debit'),
('1640','Mobilje',1,'ASETET','16','Asete Afatgjata','debit'),
('1650','Kompjuterë',1,'ASETET','16','Asete Afatgjata','debit'),
('1660','Software',1,'ASETET','16','Asete Afatgjata','debit'),
('1670','Investime Afatgjata',1,'ASETET','16','Asete Afatgjata','debit'),
('1700','Amortizimi i ndërtesave',1,'ASETET','17','Amortizimi','credit'),
('1710','Amortizimi i pajisjeve',1,'ASETET','17','Amortizimi','credit'),
('1720','Amortizimi i automjeteve',1,'ASETET','17','Amortizimi','credit'),
('1730','Amortizimi i mobiljeve',1,'ASETET','17','Amortizimi','credit'),
('1740','Amortizimi i software',1,'ASETET','17','Amortizimi','credit')
ON CONFLICT (code) DO NOTHING;

-- ───────────────────────────────────────────────
-- KLASA 2 – DETYRIMET (Kredi normal)
-- ───────────────────────────────────────────────
INSERT INTO chart_of_accounts (code, name_sq, class_number, class_name, group_code, group_name, normal_balance) VALUES
('2000','Furnitorë Vendor',2,'DETYRIMET','20','Furnitorët','credit'),
('2010','Furnitorë Jashtë Vendit',2,'DETYRIMET','20','Furnitorët','credit'),
('2020','Furnitorë të tjerë',2,'DETYRIMET','20','Furnitorët','credit'),
('2100','TVSH për pagesë',2,'DETYRIMET','21','Tatimet','credit'),
('2110','Tatimi në Fitim',2,'DETYRIMET','21','Tatimet','credit'),
('2120','Tatimi në Burim',2,'DETYRIMET','21','Tatimet','credit'),
('2130','Tatimi në Paga',2,'DETYRIMET','21','Tatimet','credit'),
('2200','Pagat për pagesë',2,'DETYRIMET','22','Pagat','credit'),
('2210','Kontributet Pensionale',2,'DETYRIMET','22','Pagat','credit'),
('2220','Sigurime',2,'DETYRIMET','22','Pagat','credit'),
('2300','Hua Afatshkurtra',2,'DETYRIMET','23','Kreditë dhe Huatë','credit'),
('2310','Hua Afatgjata',2,'DETYRIMET','23','Kreditë dhe Huatë','credit'),
('2320','Interesa për pagesë',2,'DETYRIMET','23','Kreditë dhe Huatë','credit')
ON CONFLICT (code) DO NOTHING;

-- ───────────────────────────────────────────────
-- KLASA 3 – KAPITALI (Kredi normal)
-- ───────────────────────────────────────────────
INSERT INTO chart_of_accounts (code, name_sq, class_number, class_name, group_code, group_name, normal_balance) VALUES
('3000','Kapitali Themeltar',3,'KAPITALI','30','Kapitali','credit'),
('3010','Rezervat',3,'KAPITALI','30','Kapitali','credit'),
('3020','Fitimi i Pashpërndarë',3,'KAPITALI','30','Kapitali','credit'),
('3030','Fitimi i Vitit',3,'KAPITALI','30','Kapitali','credit'),
('3040','Humbja e Vitit',3,'KAPITALI','30','Kapitali','debit')
ON CONFLICT (code) DO NOTHING;

-- ───────────────────────────────────────────────
-- KLASA 4 – TË HYRAT (Kredi normal)
-- ───────────────────────────────────────────────
INSERT INTO chart_of_accounts (code, name_sq, class_number, class_name, group_code, group_name, normal_balance) VALUES
('4000','Shitje Mallrash',4,'TË HYRAT','40','Të Hyrat Operative','credit'),
('4010','Shitje Shërbimesh',4,'TË HYRAT','40','Të Hyrat Operative','credit'),
('4020','Eksport',4,'TË HYRAT','40','Të Hyrat Operative','credit'),
('4030','Zbritje në shitje',4,'TË HYRAT','40','Të Hyrat Operative','debit'),
('4040','Kthime nga shitjet',4,'TË HYRAT','40','Të Hyrat Operative','debit'),
('4100','Të hyra operative',4,'TË HYRAT','41','Të Hyra Tjera','credit'),
('4200','Të hyra financiare',4,'TË HYRAT','42','Të Hyra Financiare','credit')
ON CONFLICT (code) DO NOTHING;

-- ───────────────────────────────────────────────
-- KLASA 5 – KOSTO E SHITJES (Debi normal)
-- ───────────────────────────────────────────────
INSERT INTO chart_of_accounts (code, name_sq, class_number, class_name, group_code, group_name, normal_balance) VALUES
('5000','Kosto e Mallrave të Shitura',5,'KOSTO E SHITJES','50','Kosto e Shitjes','debit'),
('5010','Kosto e Materialit',5,'KOSTO E SHITJES','50','Kosto e Shitjes','debit'),
('5020','Transport hyrës',5,'KOSTO E SHITJES','50','Kosto e Shitjes','debit'),
('5030','Doganë',5,'KOSTO E SHITJES','50','Kosto e Shitjes','debit'),
('5040','Kosto Prodhimi',5,'KOSTO E SHITJES','50','Kosto e Shitjes','debit')
ON CONFLICT (code) DO NOTHING;

-- ───────────────────────────────────────────────
-- KLASA 6 – SHPENZIMET (Debi normal)
-- ───────────────────────────────────────────────
INSERT INTO chart_of_accounts (code, name_sq, class_number, class_name, group_code, group_name, normal_balance) VALUES
('6000','Pagat Neto',6,'SHPENZIMET','60','Pagat','debit'),
('6010','Kontributet Pensionale',6,'SHPENZIMET','60','Pagat','debit'),
('6020','Bonuse',6,'SHPENZIMET','60','Pagat','debit'),
('6030','Mëditje',6,'SHPENZIMET','60','Pagat','debit'),
('6100','Qiraja',6,'SHPENZIMET','61','Zyra','debit'),
('6110','Energjia Elektrike',6,'SHPENZIMET','61','Zyra','debit'),
('6120','Uji',6,'SHPENZIMET','61','Zyra','debit'),
('6130','Interneti',6,'SHPENZIMET','61','Zyra','debit'),
('6140','Telefoni',6,'SHPENZIMET','61','Zyra','debit'),
('6150','Pastrimi',6,'SHPENZIMET','61','Zyra','debit'),
('6160','Sigurimi i objektit',6,'SHPENZIMET','61','Zyra','debit'),
('6200','Karburanti',6,'SHPENZIMET','62','Automjetet','debit'),
('6210','Servisi',6,'SHPENZIMET','62','Automjetet','debit'),
('6220','Regjistrimi',6,'SHPENZIMET','62','Automjetet','debit'),
('6230','Sigurimi',6,'SHPENZIMET','62','Automjetet','debit'),
('6240','Gomat',6,'SHPENZIMET','62','Automjetet','debit'),
('6300','Marketing',6,'SHPENZIMET','63','Marketing','debit'),
('6310','Facebook Ads',6,'SHPENZIMET','63','Marketing','debit'),
('6320','Google Ads',6,'SHPENZIMET','63','Marketing','debit'),
('6330','Reklama',6,'SHPENZIMET','63','Marketing','debit'),
('6400','Software',6,'SHPENZIMET','64','IT','debit'),
('6410','Hosting',6,'SHPENZIMET','64','IT','debit'),
('6420','Domain',6,'SHPENZIMET','64','IT','debit'),
('6430','Cloud Services',6,'SHPENZIMET','64','IT','debit'),
('6440','Licenca',6,'SHPENZIMET','64','IT','debit'),
('6500','Material Zyre',6,'SHPENZIMET','65','Shpenzime Operative','debit'),
('6510','Mirëmbajtje',6,'SHPENZIMET','65','Shpenzime Operative','debit'),
('6520','Reprezentacion',6,'SHPENZIMET','65','Shpenzime Operative','debit'),
('6530','Udhëtime',6,'SHPENZIMET','65','Shpenzime Operative','debit'),
('6540','Trajnime',6,'SHPENZIMET','65','Shpenzime Operative','debit'),
('6550','Komisione Bankare',6,'SHPENZIMET','65','Shpenzime Operative','debit'),
('6560','Komisione POS',6,'SHPENZIMET','65','Shpenzime Operative','debit'),
('6570','Gjoba',6,'SHPENZIMET','65','Shpenzime Operative','debit'),
('6580','Donacione',6,'SHPENZIMET','65','Shpenzime Operative','debit'),
('6590','Shpenzime të ndryshme',6,'SHPENZIMET','65','Shpenzime Operative','debit'),
('6600','Amortizimi i ndërtesave',6,'SHPENZIMET','66','Amortizimi','debit'),
('6610','Amortizimi i pajisjeve',6,'SHPENZIMET','66','Amortizimi','debit'),
('6620','Amortizimi i automjeteve',6,'SHPENZIMET','66','Amortizimi','debit'),
('6630','Amortizimi i mobiljeve',6,'SHPENZIMET','66','Amortizimi','debit'),
('6640','Amortizimi i software',6,'SHPENZIMET','66','Amortizimi','debit')
ON CONFLICT (code) DO NOTHING;

-- ───────────────────────────────────────────────
-- KLASA 7 – SHPENZIME FINANCIARE (Debi normal)
-- ───────────────────────────────────────────────
INSERT INTO chart_of_accounts (code, name_sq, class_number, class_name, group_code, group_name, normal_balance) VALUES
('7000','Interesa',7,'SHPENZIME FINANCIARE','70','Shpenzime Financiare','debit'),
('7010','Humbje nga kursi valutor',7,'SHPENZIME FINANCIARE','70','Shpenzime Financiare','debit'),
('7020','Shpenzime financiare tjera',7,'SHPENZIME FINANCIARE','70','Shpenzime Financiare','debit')
ON CONFLICT (code) DO NOTHING;

-- ───────────────────────────────────────────────
-- KLASA 8 – TË HYRA FINANCIARE (Kredi normal)
-- ───────────────────────────────────────────────
INSERT INTO chart_of_accounts (code, name_sq, class_number, class_name, group_code, group_name, normal_balance) VALUES
('8000','Interesa të arkëtuara',8,'TË HYRA FINANCIARE','80','Të Hyra Financiare','credit'),
('8010','Fitime nga kursi valutor',8,'TË HYRA FINANCIARE','80','Të Hyra Financiare','credit'),
('8020','Të hyra financiare tjera',8,'TË HYRA FINANCIARE','80','Të Hyra Financiare','credit')
ON CONFLICT (code) DO NOTHING;

-- ───────────────────────────────────────────────
-- KLASA 9 – LLOGARI JASHTË BILANCIT
-- ───────────────────────────────────────────────
INSERT INTO chart_of_accounts (code, name_sq, class_number, class_name, group_code, group_name, normal_balance) VALUES
('9000','Garanci',9,'LLOGARI JASHTË BILANCIT','90','Jashtë Bilancit','debit'),
('9010','Mall në konsignacion',9,'LLOGARI JASHTË BILANCIT','90','Jashtë Bilancit','debit'),
('9020','Detyrime kontingjente',9,'LLOGARI JASHTË BILANCIT','90','Jashtë Bilancit','credit'),
('9030','Asete kontingjente',9,'LLOGARI JASHTË BILANCIT','90','Jashtë Bilancit','debit')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- LIBRI I ARKËS dhe LIBRI I BANKËS
-- Çdo hyrje lidhet me një llogari specifike nga Plani Kontabël
-- (p.sh. 1000 Arka Qendrore, 1120 Banka Raiffeisen)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cash_bank_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_code VARCHAR(10) NOT NULL REFERENCES chart_of_accounts(code),
  entry_type VARCHAR(10) NOT NULL DEFAULT 'cash', -- 'cash' | 'bank'
  bank_name VARCHAR(100),                          -- p.sh. 'ProCredit', 'Raiffeisen' (vetëm nëse entry_type='bank')
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  direction VARCHAR(10) NOT NULL,                  -- 'in' (hyrje) | 'out' (dalje)
  amount DECIMAL(10,2) NOT NULL,
  reference_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  reference_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cash_bank_company ON cash_bank_entries(company_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_bank_type ON cash_bank_entries(company_id, entry_type);

ALTER TABLE chart_of_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_bank_entries DISABLE ROW LEVEL SECURITY;

-- Kolonë për të kufizuar kontrollin e pragut TVSH (1x/ditë, jo çdo load faqeje)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_vat_threshold_check TIMESTAMPTZ;

SELECT 'Plani Kontabël + Libri Arkës/Bankës — migrim i plotë!' as status;
