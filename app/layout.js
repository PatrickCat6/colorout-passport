import './globals.css'
import { Analytics } from '@vercel/analytics/next'

export const metadata = {
  title: 'ColorOut™ Passport',
  description: 'Certificate of Authenticity for ColorOut™ tattoos by Patrick Cat',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ColorOut™'
  }
}

export const viewport = {
  themeColor: '#FF0080'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ColorOut™" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
