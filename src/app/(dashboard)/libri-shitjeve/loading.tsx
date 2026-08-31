export default function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTop: '3px solid var(--purple-light)', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Duke ngarkuar...</p>
    </div>
  )
}
