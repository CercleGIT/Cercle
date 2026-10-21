import './globals.css'
import EnregistrerSW from '@/components/EnregistrerSW'

export const metadata = {
  title: 'Cercle',
  description: 'Retrouve tes amis et tes groupes',
  icons: { apple: '/icon-192.png' },
}
export const viewport = { themeColor: '#2455e6' }

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <EnregistrerSW />
        {children}
      </body>
    </html>
  )
}
