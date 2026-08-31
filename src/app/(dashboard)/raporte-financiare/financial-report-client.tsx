'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, Users, TrendingUp, Calculator, FileText, AlertCircle, CheckCircle, Info } from 'lucide-react'

interface Props {
  company: any
  invoices: { total_amount: number; issue_date: string; status: string }[]
  expenses: { amount: number; expense_date: string }[]
  employees: any[]
  currentQuarter: number
  currentYear: number
  qStart: string
  qEnd: string
  userRole?: string
}

const QUARTERS = [
  { q: 1, label: 'Q1', months: 'Janar–Mars', start: '-01-01', end: '-03-31' },
  { q: 2, label: 'Q2', months: 'Prill–Qershor', start: '-04-01', end: '-06-30' },
  { q: 3, label: 'Q3', months: 'Korrik–Shtator', start: '-07-01', end: '-09-30' },
  { q: 4, label: 'Q4', months: 'Tetor–Dhjetor', start: '-10-01', end: '-12-31' },
]

export default function FinancialReportClient({ company, invoices, expenses, employees: initialEmployees, currentQuarter, currentYear, userRole = 'business_owner' }: Props) {
  const [selectedQ, setSelectedQ] = useState(currentQuarter)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [employees, setEmployees] = useState<any[]>(initialEmployees || [])
  const [showAddEmp, setShowAddEmp] = useState(false)
  const [empForm, setEmpForm] = useState({ full_name: '', gross_salary: '', position: '', start_date: '' })
  const [activeTab, setActiveTab] = useState<'tatimi'>('tatimi')
  const supabase = createClient()

  const qInfo = QUARTERS.find(q => q.q === selectedQ)!
  const isHealth = ['health', 'salon', 'barber', 'beauty', 'spa', 'gym'].includes(company?.business_type || '')
  const qStart = `${selectedYear}${qInfo.start}`
  const qEnd = `${selectedYear}${qInfo.end}`

  // Llogarit qarkullimin 3-mujor
  const qRevenue = useMemo(() => {
    return invoices
      .filter(inv => inv.issue_date >= qStart && inv.issue_date <= qEnd)
      .reduce((s, inv) => s + Number(inv.total_amount || 0), 0)
  }, [invoices, qStart, qEnd])

  const qExpenses = useMemo(() => {
    return expenses
      .filter(exp => exp.expense_date >= qStart && exp.expense_date <= qEnd)
      .reduce((s, exp) => s + Number(exp.amount || 0), 0)
  }, [expenses, qStart, qEnd])

  const yearRevenue = useMemo(() => invoices.reduce((s, inv) => s + Number(inv.total_amount || 0), 0), [invoices])

  // Tatimi mbi Biznesin (TB) — 9% e fitimit
  const qProfit = qRevenue - qExpenses
  const tbAmount = Math.max(0, qProfit * 0.09)

  // Kontributet e punonjësve (mujore dhe tremujore)
  const employeeContributions = useMemo(() => {
    return employees.map(emp => {
      const gross = Number(emp.gross_salary || 0)
      const empPension = gross * 0.05       // 5% punëmarrësi
      const empPensionER = gross * 0.05     // 5% punëdhënësi
      const healthIns = gross * 0.015       // 1.5% shëndetësi (opsionale)
      const netSalary = gross - empPension
      const totalCostToCompany = gross + empPensionER
      return {
        ...emp, gross, empPension, empPensionER, healthIns, netSalary, totalCostToCompany,
        qEmpPension: empPension * 3,
        qEmpPensionER: empPensionER * 3,
        qCost: totalCostToCompany * 3,
      }
    })
  }, [employees])

  const totalMonthlyGross = employees.reduce((s, e) => s + Number(e.gross_salary || 0), 0)
  const totalMonthlyPensionER = totalMonthlyGross * 0.05
  const totalMonthlyPensionEE = totalMonthlyGross * 0.05
  const totalMonthlyCost = totalMonthlyGross + totalMonthlyPensionER
  const totalQCost = totalMonthlyCost * 3

  async function addEmployee() {
    if (!empForm.full_name || !empForm.gross_salary) { toast.error('Shto emrin dhe rrogan'); return }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      const { data, error } = await supabase.from('employees').insert({
        company_id: profile?.company_id,
        full_name: empForm.full_name,
        gross_salary: parseFloat(empForm.gross_salary),
        position: empForm.position || null,
        start_date: empForm.start_date || null,
      }).select().single()
      if (error) throw error
      setEmployees(prev => [...prev, data])
      setEmpForm({ full_name: '', gross_salary: '', position: '', start_date: '' })
      setShowAddEmp(false)
      toast.success('Punëtori u shtua')
    } catch (e: any) { toast.error(e.message) }
  }

  async function removeEmployee(id: string) {
    await supabase.from('employees').delete().eq('id', id)
    setEmployees(prev => prev.filter(e => e.id !== id))
    toast.success('Punëtori u hoq')
  }

  const S = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }
  const I = { background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--text-1)', fontSize: 13, width: '100%', outline: 'none' }
  const L = { fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }

  return (
    <div className="page-enter" style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
          {userRole === 'accountant' ? 'Mjetet e Mia — Raporte Financiare' : 'Raporte Financiare'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          {userRole === 'accountant' 
            ? 'Tatimi, kontributet dhe pagat e firmës suaj' 
            : `Tatimi, kontributet dhe pagat — ${company?.name}`}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'tatimi', label: 'Tatimi & Qarkullimi', icon: Calculator },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            style={{ padding: '10px 20px', borderRadius: 12, border: `1px solid ${activeTab === tab.id ? '#7C3AED' : 'var(--border)'}`, background: activeTab === tab.id ? '#7C3AED' : 'var(--bg-card)', color: activeTab === tab.id ? '#ffffff' : 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'tatimi' && (
        <>
          {/* Quarter selector */}
          <div style={S}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>Periudha:</span>
              {QUARTERS.map(q => (
                <button key={q.q} onClick={() => setSelectedQ(q.q)}
                  style={{ padding: '6px 14px', borderRadius: 9, border: `1px solid ${selectedQ === q.q ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`, background: selectedQ === q.q ? 'rgba(124,58,237,0.12)' : 'transparent', color: selectedQ === q.q ? 'var(--purple)' : 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {q.label} <span style={{ fontSize: 10, opacity: 0.7 }}>({q.months})</span>
                </button>
              ))}
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
                style={{ ...I, width: 80, fontSize: 12, padding: '6px 8px' }}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 14 }}>
            {[
              { label: `Qarkullimi Q${selectedQ}`, value: `€${qRevenue.toFixed(2)}`, color: '#10B981', icon: 'revenue' },
              { label: `Shpenzimet Q${selectedQ}`, value: `€${qExpenses.toFixed(2)}`, color: '#EF4444', icon: 'expenses' },
              { label: `Fitimi Neto Q${selectedQ}`, value: `€${qProfit.toFixed(2)}`, color: qProfit >= 0 ? '#3B82F6' : '#EF4444', icon: 'profit' },
              { label: 'Tatimi 9% (TB)', value: `€${tbAmount.toFixed(2)}`, color: '#F59E0B', icon: 'tax' },
            ].map((k, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', borderTop: `3px solid ${k.color}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{k.icon} {k.label}</p>
                <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 22, fontWeight: 900, color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Llogaritja e tatimit */}
          {/* Informatë për mjekun/shërbime — TVSH e liruar */}
          {isHealth && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, color: '#2563EB', fontSize: 15 }}>i</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', marginBottom: 4 }}>Shërbimet tuaja janë të liruara nga TVSH</p>
                <p style={{ fontSize: 12, color: '#3B82F6', lineHeight: 1.5 }}>Sipas Ligjit Nr. 03/L-146 — shërbime mjekësore dhe shëndetësore (norma 0% TVSH). Tatimi mbi Biznes (TB) 9% aplikohet mbi fitimin neto vjetor.</p>
              </div>
            </div>
          )}
          <div style={S}>
            <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--text-1)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calculator size={16} style={{ color: '#F59E0B' }} /> Llogaritja e Tatimit mbi Biznesin (TB)
            </h3>

            {/* Formula */}
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>📐 Formula sipas ATK-së:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>Qarkullimi (të ardhura bruto)</span>
                  <span style={{ fontWeight: 700, color: '#10B981' }}>€{qRevenue.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>(-) Shpenzime të zbritshme</span>
                  <span style={{ fontWeight: 700, color: '#EF4444' }}>€{qExpenses.toFixed(2)}</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(245,158,11,0.2)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>(=) Fitimi Tatueshëm</span>
                  <span style={{ fontWeight: 700, color: '#3B82F6' }}>€{qProfit.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>(×) Norma Tatimore 9%</span>
                  <span style={{ fontWeight: 700, color: '#F59E0B' }}>9%</span>
                </div>
                <div style={{ borderTop: '2px solid #F59E0B', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-1)' }}>= TATIMI QË PAGUHET</span>
                  <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 900, color: '#F59E0B', fontSize: 20 }}>€{tbAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Info ATK */}
            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={13}/> Rregullorja ATK — Tatimi mbi Biznesin
              </p>
              <ul style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.8, paddingLeft: 16 }}>
                <li>Norma tatimore: <strong style={{ color: '#5B21B6' }}>9%</strong> e fitimit neto (Ligji Nr. 05/L-029)</li>
                <li>Deklarata dorëzohet çdo <strong style={{ color: '#5B21B6' }}>3 muaj</strong> (tatimi tremujor)</li>
                <li>Afati: <strong style={{ color: '#F59E0B' }}>15 ditë pas mbarimit të tremujorit</strong></li>
                <li>Q1→15 Prill · Q2→15 Korrik · Q3→15 Tetor · Q4→15 Janar</li>
                <li>Bizneset me qarkullim nën €30,000/vit mund të jenë të liruara</li>
              </ul>
            </div>
          </div>

          {/* TVSH nëse regjistrohet — nuk shfaqet për shërbime të liruara */}
          {!isHealth && (
          <div style={S}>
            <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--text-1)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              TVSH — Tatimi mbi Vlerën e Shtuar
            </h3>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 16px' }}>
              <ul style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.9, paddingLeft: 16 }}>
                <li>Regjistrim i detyrueshëm kur qarkullimi tejkalon <strong style={{ color: '#5B21B6' }}>€30,000/vit</strong></li>
                <li>Normat: <strong style={{ color: '#5B21B6' }}>18%</strong> standard · <strong style={{ color: '#5B21B6' }}>8%</strong> ushqim bazik · <strong style={{ color: '#5B21B6' }}>0%</strong> eksport</li>
                <li>Deklarata çdo <strong style={{ color: '#5B21B6' }}>muaj</strong> (deri më 20 të muajit pasues)</li>
                <li>TVSH e mbledhur − TVSH e paguar = <strong style={{ color: '#059669' }}>TVSH neto për pagesë</strong></li>
              </ul>
            </div>
          </div>
          )}

          {/* Viti i plotë */}
          <div style={S}>
            <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--text-1)', marginBottom: 12 }}>
              📅 Viti i Plotë {selectedYear}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
              {[
                { label: 'Qarkullimi Vjetor', value: `€${yearRevenue.toFixed(2)}`, color: '#10B981' },
                { label: 'Tatimi Vjetor 9%', value: `€${(yearRevenue * 0.09).toFixed(2)}`, color: '#F59E0B' },
                { label: 'Kontributet (est.)', value: `€${(totalQCost * 4).toFixed(2)}`, color: '#9B5CF8' },
              ].map((k, i) => (
                <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: `${k.color}10`, border: `1px solid ${k.color}30` }}>
                  <p style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{k.label}</p>
                  <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 18, fontWeight: 800, color: k.color }}></p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
