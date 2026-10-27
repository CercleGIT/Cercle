import Link from 'next/link'
import { SECTIONS } from '@/lib/sections'

// Puces de navigation entre le fil général et les rubriques
export default function BarreRubriques({ actif = null }) {
  return (
    <nav className="rubriques" aria-label="Rubriques">
      <Link href="/" className={'rubrique' + (!actif ? ' actif' : '')}>🏠 Fil</Link>
      {Object.values(SECTIONS).map(s => (
        <Link key={s.id} href={s.route} className={'rubrique' + (actif === s.id ? ' actif' : '')}>{s.emoji} {s.nom}</Link>
      ))}
    </nav>
  )
}
