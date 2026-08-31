'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function FiscalixLogo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: { fontSize: 20, letterSpacing: '-0.5px' },
    md: { fontSize: 28, letterSpacing: '-1px' },
    lg: { fontSize: 38, letterSpacing: '-1.5px' },
  }
  const s = sizes[size]

  return (
    <span
      className={className}
      style={{
        fontFamily: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: s.fontSize,
        fontWeight: 800,
        letterSpacing: s.letterSpacing,
        color:'var(--text-1)',
        lineHeight: 1,
        display: 'inline-block',
        userSelect: 'none',
      }}
    >
      fiscalix
    </span>
  )
}
