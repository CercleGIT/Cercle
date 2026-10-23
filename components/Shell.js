'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'
import Logo from '@/components/Logo'
import Appel from '@/components/Appel'

const LIENS = [['/', 'Fil'], ['/amis', 'Amis'], ['/groupes', 'Groupes'], ['/recherche', 'Recherche'], ['/proximite', 'À proximité'], ['/marketplace', 'Marché'], ['/messages', 'Messages'], ['/evenements', 'Événements'], ['/profil', 'Profil']]

export default function Shell({ children }) {
  const user = useUser()
  const path = usePathname()
  const [nb, setNb] = useState(0)

  useEffect(() => {
    if (!user) return
    const maj = async () => {
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('lu', false)
      setNb(count || 0)
    }
    maj()
    const t = setInterval(maj, 20000)
    return () => clearInterval(t)
  }, [user, path])

  useEffect(() => {
    if (!user) return
    const ping = () => supabase.from('profiles').update({ derniere_activite: new Date().toISOString() }).eq('id', user.id)
    ping()
    const t = setInterval(ping, 60000)
    return () => clearInterval(t)
  }, [user])

  if (!user) return <div className="wrap">Chargement…</div>
  return (
    <>
      <header className="top">
        <Link href="/" aria-label="Accueil"><Logo /></Link>
        <nav>
          {LIENS.map(([href, nom]) => (
            <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{nom}</Link>
          ))}
        </nav>
        <div className="outils">
          <Link href="/parametres" className="cloche" aria-label="Paramètres">⚙️</Link>
          <Link href="/notifications" className="cloche" aria-label="Notifications">🔔{nb > 0 && <span className="pastille">{nb}</span>}</Link>
          <button className="plain" onClick={() => supabase.auth.signOut()}>Quitter</button>
        </div>
      </header>
      <Appel user={user} />
      <main className="page">{children(user)}</main>
    </>
  )
}
