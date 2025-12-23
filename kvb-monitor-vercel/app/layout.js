import './globals.css'
import EnvironmentBadge from './components/EnvironmentBadge'

export const metadata = {
  title: 'KVB Live Monitor',
  description: 'Live-Abfahrten der KVB Köln',
  manifest: '/manifest.json',
  themeColor: '#e30613',
  viewport: 'width=device-width, initial-scale=1, user-scalable=no',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KVB Monitor',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <EnvironmentBadge />
        {children}
      </body>
    </html>
  )
}
