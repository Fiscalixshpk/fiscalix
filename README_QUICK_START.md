# FineX OS — Quick Start (Shqip)

## Hapat e plotë për ta nisur

### ÇFARË KA DUKE U NDËRTUAR
- Next.js 15 + TypeScript
- Supabase (databazë + auth + storage)
- OpenAI GPT-4o Vision (AI OCR)
- Vercel (hosting)

---

## HAPI 1 — Krijo llogaritë (5 min)

### Supabase (FALAS)
1. Shko te **supabase.com** → Sign Up
2. New Project → emri: `finex-os`
3. Zgjidh regjionin: **Frankfurt (EU West)**
4. Krijo password të fortë
5. Prit 2 minuta derisa projekti të inicializohet

### OpenAI
1. Shko te **platform.openai.com** → Sign Up
2. API Keys → Create new secret key
3. Shto $5-10 kredi (mjafton për muaj)

### Vercel (FALAS)
1. Shko te **vercel.com** → Sign Up me GitHub
2. Do të ndërtosh projektin këtu

---

## HAPI 2 — Konfiguro (3 min)

### Shpako projektin
```bash
unzip finex-os-v2.zip
cd finex-os
cp .env.example .env.local
```

### Plotëso .env.local
Hap fajllin `.env.local` dhe plotëso:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-proj-...
```

**Ku i merr çelësat Supabase:**
`supabase.com` → Projekti yt → Settings → API → kopjo URL + anon key + service_role key

---

## HAPI 3 — Databaza (3 min)

1. `supabase.com` → Projekti yt → **SQL Editor**
2. Klik **New Query**
3. Hap fajllin `supabase/SETUP-ALL-IN-ONE.sql` (nga zip-i)
4. Kopjo TË GJITHË përmbajtjen → Paste → **Run**
5. Duhet të shohësh: ✓ Success

---

## HAPI 4 — Storage Buckets (2 min)

`supabase.com` → Projekti yt → **Storage** → New Bucket

| Emri | Tipi |
|------|------|
| `receipts` | Public |
| `logos` | Public |
| `ai-scans` | Private |

---

## HAPI 5 — Nis lokalisht (1 min)

```bash
cd finex-os
npm install
npm run dev
```

Hap shfletuesin: **http://localhost:3000**

---

## HAPI 6 — Regjistrohu dhe bëhu Admin

1. Shko te `http://localhost:3000/register`
2. Plotëso: emri, emaili, fjalëkalimi, emri i kompanisë
3. Pas regjistrimit, shko te **Supabase SQL Editor** dhe ekzekuto:

```sql
-- NDRYSHO me emailin tënd
UPDATE users SET role = 'admin' WHERE email = 'emailijot@domain.com';
```

4. Hap Admin Panelin: **http://localhost:3000/admin**

---

## HAPI 7 — Deploy në internet (5 min)

### GitHub (duhet llogari GitHub)
```bash
git init
git add .
git commit -m "FineX OS v1.0"
```
Krijo repo te github.com → New Repository → kopjo URL-në
```bash
git remote add origin https://github.com/username/finex-os.git
git push -u origin main
```

### Vercel
1. Shko te **vercel.com** → New Project → zgjidh repo-n tënd
2. Settings → Environment Variables → shto të njëjtat vlera nga `.env.local`
3. Klik **Deploy**

✅ Pas deploy-it merr URL si: `finex-os.vercel.app`

---

## SI FUNKSIONON ADMIN PANELI

Pasi të bëhesh admin:

1. **Shto klient:** Admin Panel → Buton "Shto Klient" → plotëso emrin, emailin, fjalëkalimin, planin
2. **Konfirmo pagesë:** Tab "Pagesat" → Konfirmo → abonimi zgjatet automatikisht
3. **Ndrysho plan:** Klik mbi klientin → Ndrysho pakon
4. **Zgjat abonim:** Tab "Abonimet" → +1 muaj / +3 / +12

---

## ÇMIMET E PLANEVE

| Plan | Çmimi | AI OCR | Recurring |
|------|-------|--------|-----------|
| Basic | €19/muaj | ✗ | ✗ |
| Premium | €39/muaj | 150/muaj | ✓ |
| Advanced | €79/muaj | Pa limit | ✓ |
| Enterprise | Me kontratë | Pa limit | ✓ |

---

## PROBLEME TË ZAKONSHME

**"relation users does not exist"**
→ SQL nuk u ekzekutua. Provo përsëri me `SETUP-ALL-IN-ONE.sql`

**"Invalid login credentials"**
→ Supabase Auth email confirmation mund të jetë ON. 
Çaktivizo te: Authentication → Settings → Email Confirmations → OFF (për development)

**Build error në Vercel**
→ Kontrollo nëse i ke shuar të gjitha Environment Variables

---

*Ndërtuar nga Bearix Agency © 2026*
