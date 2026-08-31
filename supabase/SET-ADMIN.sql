-- ============================================================
-- FineX OS — VENDOS ADMIN
-- Ndrysho EMAIL_JUAJ me emailin tuaj dhe ekzekuto
-- ============================================================

UPDATE users 
SET role = 'admin' 
WHERE email = 'EMAIL_JUAJ@DOMAIN.COM';

-- Konfirmo (duhet të shohësh 1 row updated)
SELECT id, full_name, email, role FROM users WHERE role = 'admin';
