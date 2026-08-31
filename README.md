# Fiscalix — Smart Accounting for Kosovo Businesses

Modern SaaS financial management platform built for the Kosovo market.

## Stack
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Charts**: Recharts
- **OCR**: Tesseract.js (free, browser-based)
- **Email**: Resend.com (optional)
- **Deploy**: Vercel

## Quick Start

```bash
git clone <repo>
cd fiscalix
npm install
cp .env.example .env.local
# Fill in your keys
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `OPENAI_API_KEY` | ❌ | OpenAI (AI Advisor chat) |
| `RESEND_API_KEY` | ❌ | Resend (email sending) |
| `CRON_SECRET` | ❌ | Cron job auth secret |

## Database Setup

Run migrations in Supabase SQL Editor:

```sql
-- Run: supabase/SETUP-ALL-IN-ONE.sql
-- Then: supabase/ADD-EXPENSE-COLUMNS.sql
```

Set admin role:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

## Subscription Plans

| Plan | Price | Features |
|------|-------|---------|
| Basic | €19/mo | Invoices, Expenses, Dashboard |
| Premium | €39/mo | + AI Scanner, Recurring |
| Advanced | €79/mo | + AI Advisor, Reports, Tax Calendar |
| Enterprise | Custom | Everything + Fiscal integration |

## Recurring Invoices (Auto-generation)

Add to Vercel cron (already in `vercel.json`):
- Runs daily at 08:00
- Endpoint: `POST /api/recurring/generate`
- Auth: `Authorization: Bearer CRON_SECRET`

## Email Setup (Resend)

1. Sign up at [resend.com](https://resend.com) (free 3000 emails/month)
2. Get API key
3. Add `RESEND_API_KEY` to `.env.local`
4. Verify your domain in Resend

## Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Add environment variables in Vercel dashboard.

---

Built by [Bearix Agency](https://bearix-agency.com) © 2026
