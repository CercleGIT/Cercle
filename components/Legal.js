import Link from 'next/link'
import Logo from '@/components/Logo'

export default function Legal({ titre, children }) {
  return (
    <main className="legal">
      <Link href="/" aria-label="Retour à l’accueil"><Logo /></Link>
      <h1>{titre}</h1>
      <p className="maj">Dernière mise à jour : 21 octobre 2026</p>
      {children}
    </main>
  )
}
