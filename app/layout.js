import './globals.css'

export const metadata = { title: 'Cercle', description: 'Retrouve tes amis et tes groupes' }

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
