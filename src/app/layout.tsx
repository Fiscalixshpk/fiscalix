import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { Toaster } from 'sonner'
import RemoveDevToolbar from './remove-dev-toolbar'
import './globals.css'

const inter = localFont({
  src: [
    { path: '../../public/fonts/inter-400.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/inter-500.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/inter-600.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/inter-700.woff2', weight: '700', style: 'normal' },
    { path: '../../public/fonts/inter-800.woff2', weight: '800', style: 'normal' },
    { path: '../../public/fonts/inter-900.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: { default: 'Fiscalix', template: '%s — Fiscalix' },
  description: 'Sistemi modern financiar per bizneset e Kosoves',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <RemoveDevToolbar />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster
            position="top-right"
            theme="dark"
            richColors
            toastOptions={{
              style: {
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                background: 'var(--bg-card)',
                border: '1px solid rgba(123,44,245,0.3)',
                color: 'var(--text-1)',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
