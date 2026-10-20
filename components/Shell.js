'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'

const LIENS = [['/', 'Fil'], ['/amis', 'Amis'], ['/groupes', 'Groupes']]

// Enveloppe commune : protège la page, affiche le menu, passe l'utilisateur aux enfants
export default function Shell({ children }) {
  const user = useUser()
  const path = usePathname()
  if (!user) return <div className="wrap">Chargement…</div>
  return (
    <>
      <header className="top">
        <b className="logo">Cercle</b>
        <nav>
          {LIENS.map(([href, nom]) => (
            <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{nom}</Link>
          ))}
          <button className="plain" onClick={() => supabase.auth.signOut()}>Quitter</button>
        </nav>
      </header>
      <main className="page">{children(user)}</main>
    </>
  )
}
