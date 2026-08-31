"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Expense, ExpenseCategory } from "@/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Plus, Search, Download, Trash2, Eye } from "lucide-react"
import { toast } from "sonner"

interface Props {
  expenses: Expense[]
  categories: ExpenseCategory[]
  monthlyRawData?: { amount: number; expense_date?: string; date?: string }[]
  companyId?: string
  userId?: string
  companyName?: string
  isAccountantView?: boolean
  defaultCategory?: string | null
  pageTitle?: string
}

const MONTHS_SQ = ['Jan','Shk','Mar','Pri','Maj','Qer','Kor','Gus','Sht','Tet','Nën','Dhj']

export function ExpenseListClient({ expenses, categories, isAccountantView = false, companyName, monthlyRawData, defaultCategory, pageTitle }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState(defaultCategory || "all")
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return expenses
      .filter(e => {
        const matchSearch = !search ||
          (e.vendor_name || "").toLowerCase().includes(search.toLowerCase()) ||
          (e.description || "").toLowerCase().includes(search.toLowerCase())
        const matchCat = categoryFilter === "all" || e.category_id === categoryFilter
        return matchSearch && matchCat
      })
      .sort((a, b) =>
        new Date(b.expense_date || b.date || "").getTime() -
        new Date(a.expense_date || a.date || "").getTime()
      )
  }, [expenses, search, categoryFilter])

  const totalAmount = filtered.reduce((s, e) => s + Number(e.amount), 0)

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const now = new Date()
    const months: { label: string; total: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const total = (monthlyRawData || [])
        .filter(e => {
          const ed = new Date(e.expense_date || e.date || "")
          return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear()
        })
        .reduce((s, e) => s + Number(e.amount), 0)
      months.push({ label: MONTHS_SQ[d.getMonth()], total })
    }
    return months
  }, [monthlyRawData])

  function exportCSV() {
    if (filtered.length === 0) { toast.error("Nuk ka shpenzime për eksport"); return }
    const headers = ['Data', 'Furnitori', 'Kategoria', 'Mënyra', 'Shuma (€)', 'Përshkrimi']
    const rows = filtered.map(e => {
      const cat = categories.find(c => c.id === e.category_id)
      return [
        e.expense_date || e.date || '',
        e.vendor_name || '',
        cat?.name_sq || cat?.name || '',
        e.payment_method || 'cash',
        Number(e.amount).toFixed(2),
        e.description || '',
      ]
    })
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shpenzime_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV u eksportua!')
  }

  async function handleDelete(id: string) {
    if (!confirm('A je i sigurt?')) return
    setDeleting(id)
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      toast.success('Shpenzimi u fshi')
      router.refresh()
    } catch {
      toast.error('Gabim gjatë fshirjes')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
            {pageTitle || 'Shpenzimet'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {filtered.length} shpenzime · Totali: <strong style={{ color: 'var(--text-1)' }}>{formatCurrency(totalAmount)}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-2)', cursor: 'pointer', fontWeight: 500 }}>
            <Download size={14} /> CSV
          </button>
          <a href="/expenses/new"
            className="finex-button-primary flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
            style={{ textDecoration: 'none' }}>
            <Plus size={15} /> Shto Shpenzim
          </a>
        </div>
      </div>

      {/* Chart */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
        <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>
          Shpenzimet — 6 Muajt e Fundit
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={v => `€${v}`} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid rgba(123,44,245,0.3)', borderRadius: 8, color: 'var(--text-1)' }}
              cursor={{ fill: 'rgba(123,44,245,0.08)' }}
              formatter={(v: number) => [`€${v.toFixed(2)}`, 'Shpenzime']}
            />
            <Bar dataKey="total" fill="#7B2CF5" radius={[4, 4, 0, 0]} activeBar={{ fill: '#9B5CF8' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="filters-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Kërko shpenzim..."
            className="finex-input"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="finex-input"
          style={{ width: 'auto', minWidth: 160 }}>
          <option value="all">Të gjitha kategoritë</option>
          <option value="furnitor">Furnitorët</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name_sq || cat.name_en || cat.name || ""}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
              {search || categoryFilter !== 'all' ? 'Asnjë shpenzim nuk u gjet' : 'Nuk ka shpenzime ende'}
            </p>
            {!search && categoryFilter === 'all' && (
              <a href="/expenses/new"
                className="finex-button-primary px-4 py-2 text-sm mt-3 inline-flex items-center gap-2"
                style={{ textDecoration: 'none' }}>
                <Plus size={14} /> Shto shpenzimin e parë
              </a>
            )}
          </div>
        ) : (
          <div className="finex-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="finex-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Furnitori</th>
                  <th>Kategoria</th>
                  <th>Mënyra</th>
                  <th style={{ textAlign: 'right' }}>Shuma</th>
                  <th style={{ textAlign: 'right' }}>Veprimet</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(exp => {
                  const cat = categories.find(c => c.id === exp.category_id)
                  return (
                    <tr key={exp.id}>
                      <td style={{ fontSize: 13, color: 'var(--text-3)' }}>
                        {formatDate(exp.expense_date || exp.date || '')}
                      </td>
                      <td>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                          {exp.vendor_name || '—'}
                        </p>
                        {exp.description && (
                          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                            {exp.description.slice(0, 50)}
                          </p>
                        )}
                      </td>
                      <td>
                        {cat ? (
                          <span style={{
                            display: 'inline-block', fontSize: 11, padding: '2px 10px',
                            borderRadius: 20, background: 'var(--purple-bg)',
                            color: 'var(--purple-light)', fontWeight: 600,
                          }}>
                            {cat.name_sq || cat.name_en || cat.name || ""}
                          </span>
                        ) : exp.category ? (
                          <span style={{
                            display: 'inline-block', fontSize: 11, padding: '2px 10px',
                            borderRadius: 20, background: 'var(--purple-bg)',
                            color: 'var(--purple-light)', fontWeight: 600,
                          }}>
                            {exp.category}
                          </span>
                        ) : <span style={{ color: 'var(--text-3)', fontSize: 13 }}>—</span>}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-3)', textTransform: 'capitalize' }}>
                        {exp.payment_method || '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#EF4444' }}>
                        {formatCurrency(Number(exp.amount))}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {exp.receipt_url && (
                            <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer"
                              style={{ padding: 6, borderRadius: 7, background: 'var(--bg-muted)', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', textDecoration: 'none' }}>
                              <Eye size={13} />
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(exp.id)}
                            disabled={deleting === exp.id}
                            style={{ padding: 6, borderRadius: 7, background: 'var(--bg-muted)', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpenseListClient
