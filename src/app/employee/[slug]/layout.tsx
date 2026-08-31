export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', background: '#F8F7FF' }}>
        {children}
      </body>
    </html>
  )
}
