import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rabt HQ — Specialist Panel',
  description: 'Rabt Naturals Specialist Dashboard',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Rabt HQ',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: '/api/pwa-icon?size=192',
    apple: '/api/pwa-icon?size=192',
  },
}

export const viewport: Viewport = {
  themeColor: '#0197a6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rabt HQ" />
        <link rel="apple-touch-icon" href="/api/pwa-icon?size=192" />
        <link rel="apple-touch-startup-image" href="/api/pwa-icon?size=512" />
        <meta name="msapplication-TileColor" content="#0197a6" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#0A1414',
              border: '1px solid rgba(26,155,160,0.20)',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontFamily: 'DM Sans, sans-serif',
              boxShadow: '0 4px 20px rgba(26,155,160,0.12)',
            },
            success: { iconTheme: { primary: '#16A34A', secondary: '#FFFFFF' } },
            error:   { iconTheme: { primary: '#DC2626', secondary: '#FFFFFF' } },
          }}
        />
        {/* Register Service Worker */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('SW registered:', reg.scope) })
                .catch(function(err) { console.log('SW error:', err) })
            })
          }
        `}} />
      </body>
    </html>
  )
}
