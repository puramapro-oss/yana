import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Toaster } from 'sonner'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import CookieBanner from '@/components/shared/CookieBanner'
import CursorGlow from '@/components/layout/CursorGlow'
import FloatingLeaves from '@/components/layout/FloatingLeaves'
import SkipToContent from '@/components/shared/SkipToContent'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'YANA — Chaque trajet devient une méditation en mouvement',
  description:
    "Conduis en sécurité, dépollue, partage la route. SAFE DRIVE + GREEN DRIVE + Covoiturage. NAMA-PILOTE, ton copilote IA pour la sécurité routière et l'écoconduite.",
  metadataBase: new URL('https://yana.purama.dev'),
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'YANA — Mobility Wellness',
    description:
      'Chaque trajet compte. Conduis en sécurité, dépollue la planète, partage la route. Des récompenses réelles pour une mobilité consciente.',
    url: 'https://yana.purama.dev',
    siteName: 'YANA',
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'YANA — la route comme pratique',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YANA — Mobility Wellness',
    description: 'La route comme pratique. SAFE DRIVE · GREEN DRIVE · Covoiturage.',
    images: ['/api/og'],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://yana.purama.dev',
  },
}

export const viewport: Viewport = {
  themeColor: '#F97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('yana_theme');if(t==='light'||t==='dark'||t==='oled'){document.documentElement.dataset.theme=t}else{document.documentElement.dataset.theme='dark'}}catch(e){document.documentElement.dataset.theme='dark'}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--bg-void)] font-[family-name:var(--font-body)] text-[var(--text-primary)] antialiased">
        <SkipToContent />
        <div className="aurora" />
        <div className="grid-overlay" />
        <div className="noise-overlay" />
        <FloatingLeaves />
        <CursorGlow />
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ErrorBoundary>
            <div id="main-content" tabIndex={-1} className="outline-none">
              {children}
            </div>
          </ErrorBoundary>
          <CookieBanner />
        </NextIntlClientProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#f0f2ff',
            },
          }}
        />
      </body>
    </html>
  )
}
