'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Search, Link2, Download, FileText, X, Check, Copy, ExternalLink, Trash2 } from 'lucide-react'

interface Document {
  id: string; file_name: string; file_url: string; file_size?: number
  mime_type?: string; uploaded_at: string; downloaded_at?: string
}

interface Client {
  id: string; name: string; vat_number?: string; phone?: string
  email?: string; notes?: string; upload_token: string; created_at: string
  external_documents: Document[]
}

const EMPTY = { name: '', vat_number: '', phone: '', email: '', notes: '' }

export default function ExternalClientsClient({ accountantId, initialClients }: { accountantId: string; initialClients: Client[] }) {
  const supabase = createClient()
  const [clients,    setClients]    = useState<Client[]>(initialClients)
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [form,       setForm]       = useState(EMPTY)
  const [copiedId,   setCopiedId]   = useState<string | null>(null)

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.vat_number?.includes(search) || c.phone?.includes(search)
  )

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const getUploadUrl = (token: string) => `${window.location.origin}/upload/${token}`

  async function copyLink(client: Client) {
    await navigator.clipboard.writeText(getUploadUrl(client.upload_token))
    setCopiedId(client.id)
    toast.success('Linku u kopjua!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function saveClient() {
    if (!form.name.trim()) { toast.error('Emri kërkohet'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('external_clients')
        .insert({ ...form, accountant_id: accountantId })
        .select('*, external_documents(*)')
        .single()
      if (error) throw error
      setClients(c => [data, ...c])
      setShowForm(false); setForm(EMPTY)
      toast.success('Klienti u shtua — linku është gati')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Gabim') }
    finally { setSaving(false) }
  }

  async function deleteClient(id: string) {
    if (!confirm('Fshij klientin dhe të gjitha dokumentat e tij?')) return
    await supabase.from('external_clients').delete().eq('id', id)
    setClients(c => c.filter(x => x.id !== id))
    toast.success('Klienti u fshi')
  }

  async function downloadDoc(doc: Document, clientId: string) {
    // Mark as downloaded
    await supabase.from('external_documents').update({ downloaded_at: new Date().toISOString() }).eq('id', doc.id)
    setClients(c => c.map(cl => cl.id === clientId ? {
      ...cl,
      external_documents: cl.external_documents.map(d => d.id === doc.id ? { ...d, downloaded_at: new Date().toISOString() } : d)
    } : cl))
    window.open(doc.file_url, '_blank')
  }

  const S = {
    label: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    input: { width: '100%' },
  }

  return (
    <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>Klientët e Jashtëm</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
            Klientë pa llogari Fiscalix — dërgojuni linkun, ata ngarkojnë dokumentat
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="finex-button-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', fontSize: 13 }}>
          <Plus size={15} /> Shto Klient
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Kërko klient, NIPT, telefon..."
          className="finex-input" style={{ paddingLeft: 36, width: '100%' }} />
      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <Link2 size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 15, fontWeight: 600 }}>Nuk ka klientë të jashtëm</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Shto klientin dhe dërgoja linkun për të ngarkuar dokumentat</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(client => {
            const newDocs = client.external_documents.filter(d => !d.downloaded_at)
            const isExpanded = expanded === client.id
            return (
              <div key={client.id} style={{ background: 'var(--bg-card)', border: `1px solid ${newDocs.length > 0 ? 'var(--purple)' : 'var(--border)'}`, borderRadius: 16, overflow: 'hidden', transition: 'all 0.15s' }}>

                {/* Client row */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--purple-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, fontWeight: 800, color: 'var(--purple-light)' }}>
                    {client.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{client.name}</p>
                      {newDocs.length > 0 && (
                        <span style={{ padding: '2px 8px', borderRadius: 20, background: 'var(--purple)', color:'var(--text-1)', fontSize: 11, fontWeight: 700 }}>
                          {newDocs.length} dokument{newDocs.length > 1 ? 'e' : ''} i ri
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' as const }}>
                      {client.vat_number && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>NIPT: {client.vat_number}</span>}
                      {client.phone && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{client.phone}</span>}
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{client.external_documents.length} dokumente gjithsej</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => copyLink(client)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: '1px solid var(--border)', background: copiedId === client.id ? 'rgba(16,185,129,0.08)' : 'var(--bg-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: copiedId === client.id ? '#10B981' : 'var(--text-2)', transition: 'all 0.15s' }}>
                      {copiedId === client.id ? <><Check size={13}/> Kopjuar</> : <><Copy size={13}/> Kopjo Linkun</>}
                    </button>
                    <button onClick={() => setExpanded(isExpanded ? null : client.id)}
                      style={{ padding: '7px 12px', borderRadius: 9, border: '1px solid var(--border)', background: isExpanded ? 'var(--purple-bg)' : 'var(--bg-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: isExpanded ? 'var(--purple-light)' : 'var(--text-2)' }}>
                      <FileText size={13}/> {client.external_documents.length > 0 ? `Dokumentat (${client.external_documents.length})` : 'Dokumentat'}
                    </button>
                    <button onClick={() => deleteClient(client.id)}
                      style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color:'white', transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEE2E2'; (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)' }}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>

                {/* Link display */}
                <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, padding: '7px 12px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {typeof window !== 'undefined' ? getUploadUrl(client.upload_token) : `fiscalix.com/upload/${client.upload_token}`}
                  </div>
                  <a href={typeof window !== 'undefined' ? getUploadUrl(client.upload_token) : '#'} target="_blank" rel="noreferrer"
                    style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text-3)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                    <ExternalLink size={13}/>
                  </a>
                </div>

                {/* Documents expanded */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-muted)', padding: '14px 20px' }}>
                    {client.external_documents.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '12px 0' }}>
                        Nuk ka dokumente ende — dërgoja linkun klientit
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px', gap: 8, padding: '4px 10px' }}>
                          {['Dokumenti', 'Data ngarkimit', 'Madhësia', ''].map(h => (
                            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{h}</span>
                          ))}
                        </div>
                        {client.external_documents.sort((a,b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()).map(doc => (
                          <div key={doc.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px', gap: 8, padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 10, border: `1px solid ${!doc.downloaded_at ? 'var(--purple)' : 'var(--border)'}`, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <FileText size={14} color={!doc.downloaded_at ? 'var(--purple-light)' : 'var(--text-3)'} />
                              <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: !doc.downloaded_at ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{doc.file_name}</span>
                              {!doc.downloaded_at && <span style={{ padding: '1px 6px', borderRadius: 10, background: 'var(--purple)', color:'var(--text-1)', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>I ri</span>}
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                              {new Date(doc.uploaded_at).toLocaleDateString('sq-AL')}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                              {doc.file_size ? (doc.file_size / 1024 / 1024).toFixed(1) + ' MB' : '—'}
                            </span>
                            <button onClick={() => downloadDoc(doc, client.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: !doc.downloaded_at ? 'var(--purple)' : 'var(--bg-muted)', color: !doc.downloaded_at ? 'white' : 'var(--text-2)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                              <Download size={12}/> Shkarko
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={async () => {
                            for (const doc of client.external_documents.filter(d => !d.downloaded_at)) {
                              await downloadDoc(doc, client.id)
                            }
                          }}
                          disabled={client.external_documents.filter(d => !d.downloaded_at).length === 0}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 10, background: 'var(--purple)', color:'var(--text-1)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: client.external_documents.filter(d => !d.downloaded_at).length === 0 ? 0.5 : 1 }}>
                          <Download size={14}/> Shkarko të Gjitha të Reja ({client.external_documents.filter(d => !d.downloaded_at).length})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL — Shto Klient */}
      {showForm && (
        <>
          <div onClick={() => { setShowForm(false); setForm(EMPTY) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 'min(480px,94vw)', zIndex: 201, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)' }}>Shto Klient të Jashtëm</h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>Klient pa llogari Fiscalix — do të marrë link për ngarkim dokumentash</p>
              </div>
              <button onClick={() => { setShowForm(false); setForm(EMPTY) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18}/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={S.label}>Emri i Kompanisë *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="ABC shpk" className="finex-input" style={S.input} autoFocus />
              </div>
              <div>
                <label style={S.label}>NIPT</label>
                <input value={form.vat_number} onChange={e => set('vat_number', e.target.value)} placeholder="811234567A" className="finex-input" style={S.input} />
              </div>
              <div>
                <label style={S.label}>Telefoni</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+383 44 000 000" className="finex-input" style={S.input} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={S.label}>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="klienti@email.com" className="finex-input" style={S.input} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={S.label}>Shënime</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Çfarë dokumentash nevojiten..." className="finex-input" style={{ ...S.input, minHeight: 70, resize: 'vertical' as const }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowForm(false); setForm(EMPTY) }} className="finex-button-secondary" style={{ flex: 1, padding: '11px' }}>Anulo</button>
              <button onClick={saveClient} disabled={saving} className="finex-button-primary" style={{ flex: 2, padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {saving ? 'Duke ruajtur...' : <><Check size={14}/> Shto dhe Gjenero Link</>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
