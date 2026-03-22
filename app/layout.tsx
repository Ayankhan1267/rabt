import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rabt HQ — AI Business OS',
  description: 'Complete AI-powered business operating system for Rabt Naturals',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
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
      </body>
    </html>
  )
}
