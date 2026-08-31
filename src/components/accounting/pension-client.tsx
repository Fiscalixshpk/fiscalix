'use client'

import { useState } from 'react'
import { Users2, Download, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Company } from '@/types'

interface Employee {
  id: string
  name: string
  personal_id: string
  gross_salary: number
}

interface Props {
  company: Company | null
}

export default function PensionClient({ company }: Props) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [employees, setEmployees] = useState<Employee[]>([
    { id: '1', name: '', personal_id: '', gross_salary: 0 },
  ])

  const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

  const totGross = employees.reduce((s,e) => s+Number(e.gross_salary||0), 0)
  const totEmployee = totGross * 0.05
  const totEmployer = totGross * 0.05
  const totPension = totGross * 0.10

  function addEmployee() {
    setEmployees(prev => [...prev, { id: Date.now().toString(), name: '', personal_id: '', gross_salary: 0 }])
  }

  function removeEmployee(id: string) {
    setEmployees(prev => prev.filter(e => e.id !== id))
  }

  function updateEmployee(id: string, field: keyof Employee, value: string | number) {
    setEmployees(prev => prev.map(e => e.id === id ? {...e, [field]: value} : e))
  }

  async function exportExcel() {
    try {
      const { generateProfessionalExcel } = await import('@/lib/excel-export')
      const periodLabel = `${MONTHS[month-1]} ${year}`
      const headers = ['NR.', 'EMRI DHE MBIEMRI', 'NR. PERSONAL', 'PAGA BRUTO (€)', 'KONTRIB. PUNONJËSI 5% (€)', 'KONTRIB. PUNËDHËNËSI 5% (€)', 'TOTALI KONTRIBUTEVE (€)']
      const rows = employees.filter(e => e.name).map((emp, i) => {
        const gross = Number(emp.gross_salary||0)
        return [
          i+1,
          emp.name,
          emp.personal_id || '',
          gross.toFixed(2),
          (gross*0.05).toFixed(2),
          (gross*0.05).toFixed(2),
          (gross*0.10).toFixed(2),
        ]
      })
      const totalsRow = ['', '', 'TOTALI:', totGross.toFixed(2), totEmployee.toFixed(2), totEmployer.toFixed(2), totPension.toFixed(2)]

      const buf = await generateProfessionalExcel({
        title: 'DEKLARATA E KONTRIBUTEVE PENSIONALE',
        companyName: company?.name || '',
        vatNumber: company?.vat_number || company?.tax_number || undefined,
        periodLabel,
        sheetName: 'Pension',
        headers,
        rows,
        currencyColumns: [3, 4, 5, 6],
        totalsRow,
        notesSection: {
          heading: 'UDHËZIME LIGJORE',
          lines: [
            'Norma: 5% punonjësi + 5% punëdhënësi = 10% e pagës bruto',
            'Afati pagesës: 15-ta e muajit pasues',
            'Deklaro në: https://edi.atk-ks.org',
            'Ligji: Nr. 04/L-101 për Fondin Pensional të Kosovës',
            'FKPK: Fondi i Kursimeve Pensionale të Kosovës',
          ],
        },
      })
      const blob = new Blob([buf], {type:'application/octet-stream'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url
      a.download=`Pension_${MONTHS[month-1]}_${year}.xlsx`
      a.click(); URL.revokeObjectURL(url)
      toast.success('Excel u eksportua!')
    } catch { toast.error('Gabim gjatë eksportimit') }
  }

  const fmt = (n: number) => `€${n.toFixed(2)}`

  return (
    <div className="page-enter space-y-6">
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontFamily:'Poppins,sans-serif',fontSize:24,fontWeight:700,color:'var(--text-1)',marginBottom:4,display:'flex',alignItems:'center',gap:10}}>
            <Users2 size={22} style={{color:'#F59E0B'}}/> Kontributet Pensionale
          </h1>
          <p style={{color:'var(--text-3)',fontSize:13}}>
            5% punonjësi + 5% punëdhënësi — FKPK — deklarohet çdo muaj
          </p>
        </div>
        <button onClick={exportExcel}
          style={{display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderRadius:10,background:'#F59E0B',border:'none',color:'white',fontSize:13,fontWeight:700,cursor:'pointer'}}>
          <Download size={15}/> Eksporto Excel (ATK)
        </button>
      </div>

      {/* Period */}
      <div style={{display:'flex',gap:12,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:16,flexWrap:'wrap'}}>
        <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="finex-input" style={{width:'auto'}}>
          {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e=>setYear(Number(e.target.value))} className="finex-input" style={{width:'auto'}}>
          {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Info */}
      <div style={{background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:12,padding:'14px 16px'}}>
        <p style={{fontSize:13,fontWeight:700,color:'#F59E0B',marginBottom:8}}>📋 Ligji i Pensionit — Kosovë</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[
            ['Norma punonjësi', '5% e pagës bruto'],
            ['Norma punëdhënësi', '5% e pagës bruto'],
            ['Totali', '10% e pagës bruto'],
            ['Afati pageses', '15-ta e muajit pasues'],
            ['Ku deklarohet', 'edi.atk-ks.org'],
            ['Ligji bazë', 'Nr. 04/L-101 FKPK'],
          ].map(([k,v],i)=>(
            <div key={i} style={{display:'flex',gap:6}}>
              <span style={{fontSize:12,color:'var(--text-3)',minWidth:160}}>{k}:</span>
              <span style={{fontSize:12,fontWeight:700,color:'var(--text-1)'}}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="accounting-grid grid-4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          {l:'Punonjës', v:String(employees.filter(e=>e.name).length), col:'#9B5CF8'},
          {l:'Paga Bruto', v:fmt(totGross), col:'#3B82F6'},
          {l:'Kontrib. Punonjës 5%', v:fmt(totEmployee), col:'#10B981'},
          {l:'Kontrib. Punëdhënës 5%', v:fmt(totEmployer), col:'#F59E0B'},
        ].map((c,i)=>(
          <div key={i} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:16,borderTop:`3px solid ${c.col}`}}>
            <p style={{fontSize:11,color:'var(--text-3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{c.l}</p>
            <p style={{fontSize:18,fontWeight:800,color:c.col,fontFamily:'Poppins,sans-serif'}}>{c.v}</p>
          </div>
        ))}
      </div>

      {/* Employees table */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h3 style={{fontFamily:'Poppins,sans-serif',fontSize:15,fontWeight:700,color:'var(--text-1)'}}>Lista e Punonjësve</h3>
          <button onClick={addEmployee}
            style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:9,background:'var(--purple-bg)',border:'1px solid var(--border-purple)',color:'var(--purple-light)',fontSize:12,fontWeight:600,cursor:'pointer'}}>
            <Plus size={13}/> Shto punonjës
          </button>
        </div>
        <div style={{overflowX:'auto'}}>
          <table className="finex-table">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Emri dhe Mbiemri</th>
                <th>Nr. Personal</th>
                <th style={{textAlign:'right'}}>Paga Bruto (€)</th>
                <th style={{textAlign:'right'}}>Punonjësi 5%</th>
                <th style={{textAlign:'right'}}>Punëdhënësi 5%</th>
                <th style={{textAlign:'right'}}>Totali</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp,i)=>{
                const gross = Number(emp.gross_salary||0)
                return (
                  <tr key={emp.id}>
                    <td style={{color:'var(--text-3)',fontSize:12}}>{i+1}</td>
                    <td>
                      <input value={emp.name} onChange={e=>updateEmployee(emp.id,'name',e.target.value)}
                        placeholder="Emri Mbiemri" className="finex-input" style={{fontSize:13,padding:'5px 8px',minWidth:180}}/>
                    </td>
                    <td>
                      <input value={emp.personal_id} onChange={e=>updateEmployee(emp.id,'personal_id',e.target.value)}
                        placeholder="XXXXXXXXXX" className="finex-input" style={{fontSize:13,padding:'5px 8px',width:120}}/>
                    </td>
                    <td>
                      <input type="number" value={emp.gross_salary||''} onFocus={e=>e.target.select()}
                        onChange={e=>updateEmployee(emp.id,'gross_salary',parseFloat(e.target.value)||0)}
                        placeholder="0.00" className="finex-input" style={{fontSize:13,padding:'5px 8px',width:110,textAlign:'right'}}/>
                    </td>
                    <td style={{textAlign:'right',fontSize:13,color:'var(--text-1)',fontWeight:600}}>{fmt(gross*0.05)}</td>
                    <td style={{textAlign:'right',fontSize:13,color:'#F59E0B',fontWeight:600}}>{fmt(gross*0.05)}</td>
                    <td style={{textAlign:'right',fontSize:14,fontWeight:800,color:'var(--purple-light)'}}>{fmt(gross*0.10)}</td>
                    <td>
                      <button onClick={()=>removeEmployee(emp.id)} disabled={employees.length===1}
                        style={{padding:6,borderRadius:7,background:'transparent',border:'none',cursor:'pointer',color:'var(--text-3)'}}
                        onMouseEnter={e=>(e.currentTarget.style.color='#EF4444')}
                        onMouseLeave={e=>(e.currentTarget.style.color='var(--text-3)')}>
                        <Trash2 size={13}/>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{background:'rgba(245,158,11,0.05)'}}>
                <td colSpan={3} style={{fontWeight:700,fontSize:13,padding:'10px 12px'}}>TOTALI</td>
                <td style={{textAlign:'right',fontWeight:700,padding:'10px 12px'}}>{fmt(totGross)}</td>
                <td style={{textAlign:'right',fontWeight:700,color:'var(--text-1)',padding:'10px 12px'}}>{fmt(totEmployee)}</td>
                <td style={{textAlign:'right',fontWeight:700,color:'#F59E0B',padding:'10px 12px'}}>{fmt(totEmployer)}</td>
                <td style={{textAlign:'right',fontWeight:800,fontSize:14,color:'var(--purple-light)',padding:'10px 12px'}}>{fmt(totPension)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
