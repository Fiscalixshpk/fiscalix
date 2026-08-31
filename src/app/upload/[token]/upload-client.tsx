'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  clientId: string
  clientName: string
  token: string
}

export default function UploadClient({ clientId, clientName, token }: Props) {
  const supabase = createClient()
  const [files,     setFiles]     = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [done,      setDone]      = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [description, setDesc]    = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  async function upload() {
    if (!files.length) return
    setUploading(true)
    setProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const path = `external/${clientId}/${Date.now()}_${file.name}`

        // Upload to Supabase Storage
        const { data: storageData, error: storageErr } = await supabase.storage
          .from('external-docs')
          .upload(path, file, { upsert: false })

        if (storageErr) throw storageErr

        const { data: { publicUrl } } = supabase.storage
          .from('external-docs')
          .getPublicUrl(path)

        // Regjistro te DB
        await supabase.from('external_documents').insert({
          external_client_id: clientId,
          file_name:          file.name,
          file_url:           publicUrl,
          file_size:          file.size,
          mime_type:          file.type,
          description:        description || null,
        })

        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
      setDone(true)
    } catch (e) {
      alert('Gabim gjatë ngarkimit. Provo sërish.')
    } finally {
      setUploading(false)
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', padding: 20 }}>
        <div style={{ maxWidth: 400, width: '100%', background: 'white', borderRadius: 20, padding: 36, textAlign: 'center', boxShadow: '0 8px 40px rgba(124,58,237,0.12)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '3px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F0A1A', marginBottom: 10 }}>Dokumentat u ngarkuan!</h2>
          <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6 }}>
            Kontabilisti juaj i ka marrë dokumentat dhe do t'i procesojë së shpejti.
          </p>
          <button onClick={() => { setDone(false); setFiles([]); setDesc('') }}
            style={{ marginTop: 24, padding: '11px 24px', borderRadius: 12, background: '#7C3AED', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
            Ngarko Dokumente të Tjera
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3FF', fontFamily: 'Inter,sans-serif', padding: '40px 20px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', color: '#0F0A1A', marginBottom: 8 }}>
            Fiscal<span style={{ color: '#7C3AED' }}>ix</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F0A1A', marginBottom: 8 }}>Ngarko Dokumentat</h1>
          <p style={{ fontSize: 15, color: '#6B7280' }}>
            Për: <strong style={{ color: '#0F0A1A' }}>{clientName}</strong>
          </p>
        </div>

        {/* Upload area */}
        <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 4px 24px rgba(124,58,237,0.08)' }}>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            style={{ border: '2px dashed var(--border-purple)', borderRadius: 14, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, transition: 'all 0.15s', background: files.length ? 'rgba(124,58,237,0.04)' : 'white' }}>
            <input ref={inputRef} type="file" multiple accept="image/*,.pdf,.jpg,.jpeg,.png,.heic" style={{ display: 'none' }} onChange={onSelect} capture="environment" />
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0F0A1A', marginBottom: 6 }}>
              {files.length > 0 ? `${files.length} dokument${files.length > 1 ? 'e' : ''} i zgjedhur` : 'Prek për të zgjedhur dokumente'}
            </p>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>
              Fotografi, PDF, skanime — çdo lloj dokumenti
            </p>
          </div>

          {/* Camera button (mobile) */}
          <button
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.setAttribute('capture', 'environment')
                inputRef.current.click()
              }
            }}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1px solid #E2DCFF', background: '#F5F3FF', color: '#7C3AED', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Fotografo me Kamerën
          </button>

          {/* Files list */}
          {files.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, background: '#F5F3FF', marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{f.type.includes('image') ? '🖼️' : '📄'}</span>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0F0A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF' }}>{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
              Përshkrimi (opsional)
            </label>
            <input
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="p.sh. Faturat e muajit Gusht..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2DCFF', fontSize: 14, color: '#0F0A1A', outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>

          {/* Progress */}
          {uploading && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ height: 6, borderRadius: 3, background: '#E2DCFF', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: '#7C3AED', width: `${progress}%`, transition: 'width 0.3s' }} />
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 6, textAlign: 'center' }}>Duke ngarkuar... {progress}%</p>
            </div>
          )}

          {/* Upload button */}
          <button
            onClick={upload}
            disabled={files.length === 0 || uploading}
            style={{ width: '100%', padding: '14px', borderRadius: 12, background: files.length > 0 && !uploading ? '#7C3AED' : '#E2DCFF', color: files.length > 0 && !uploading ? 'white' : '#9CA3AF', border: 'none', cursor: files.length > 0 && !uploading ? 'pointer' : 'not-allowed', fontSize: 15, fontWeight: 700, transition: 'all 0.15s' }}>
            {uploading ? 'Duke ngarkuar...' : `Dërgo Dokumentat${files.length > 0 ? ` (${files.length})` : ''}`}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 20 }}>
          Fiscalix · Dokumentat juaj janë të sigurta dhe të enkriptuara
        </p>
      </div>
    </div>
  )
}
