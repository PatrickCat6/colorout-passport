import './globals.css'

export const metadata = {
  title: 'ColorOut™ Passport',
  description: 'Certificate of Authenticity for ColorOut™ tattoos by Patrick Cat',
  manifest: '/manifest.json',
  themeColor: '#FF0080',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ColorOut™'
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF0080" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ColorOut™" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('ServiceWorker registered: ', registration.scope);
                  },
                  function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  }
                );
              });
            }
          `
        }} />
      </body>
    </html>
  )
}
