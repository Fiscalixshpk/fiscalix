export default function PageSkeleton() {
  return (
    <div className="page-enter space-y-6 animate-pulse">
      <div style={{ height: 32, width: '40%', background: 'var(--bg-muted)', borderRadius: 8 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }} />
        ))}
      </div>
      <div style={{ height: 300, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }} />
      <div style={{ height: 200, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }} />
    </div>
  )
}
