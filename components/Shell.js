'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'
import Logo from '@/components/Logo'
import Appel from '@/components/Appel'
import Icone from '@/components/Icones'
import { jouer } from '@/lib/sons'

// Barre du haut (ordinateur) et barre du bas (téléphone)
const PRINCIPAL = [
  ['/', 'Fil', 'accueil'], ['/amis', 'Amis', 'amis'], ['/defi', 'Défi', 'flamme'],
  ['/marketplace', 'Marché', 'boutique'], ['/jeux', 'Jeux', 'jeux'],
]
// Menu « Plus »
const PLUS = [
  ['/actualites', 'Actualités', 'journal'], ['/opportunites', 'Opportunités', 'mallette'], ['/sports', 'Sports', 'ballon'],
  ['/groupes', 'Groupes', 'groupe'], ['/createurs', 'Créateurs', 'etoile'], ['/proximite', 'À proximité', 'position'],
  ['/evenements', 'Événements', 'calendrier'], ['/jeux', 'Jeux', 'jeux', true], ['/recherche', 'Recherche', 'recherche'],
  ['/inviter', 'Inviter', 'cadeau'], ['/profil', 'Profil', 'profil'], ['/parametres', 'Paramètres', 'reglages'],
]
const estActif = (path, href) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'))

export default function Shell({ children }) {
  const user = useUser()
  const path = usePathname()
  const [nb, setNb] = useState(0)
  const [nbMsg, setNbMsg] = useState(0)
  const [plus, setPlus] = useState(false)
  const prev = useRef({ notif: null, msg: null })

  useEffect(() => { setPlus(false) }, [path])

  useEffect(() => {
    if (!user) return
    const maj = async () => {
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('lu', false).neq('lien', '/messages')
      const { count: cm } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('destinataire', user.id).eq('lu', false)
      const n = count || 0
      const m = cm || 0
      const p = prev.current
      if (p.notif !== null && !window.location.pathname.startsWith('/messages')) {
        if (m > p.msg) jouer('message')
        else if (n > p.notif) jouer('notification')
      }
      prev.current = { notif: n, msg: m }
      setNb(n); setNbMsg(m)
    }
    maj()
    const t = setInterval(maj, 8000)
    return () => clearInterval(t)
  }, [user, path])

  useEffect(() => {
    if (!user) return
    const ping = async () => { await supabase.from('profiles').update({ derniere_activite: new Date().toISOString() }).eq('id', user.id) }
    ping()
    const t = setInterval(ping, 60000)
    return () => clearInterval(t)
  }, [user])

  if (!user) return <div className="wrap">Chargement…</div>
  const badge = n => (n > 0 ? <span className="pastille">{n > 99 ? '99+' : n}</span> : null)

  return (
    <>
      <header className="entete-app">
        <Link href="/" className="logo-lien" aria-label="Accueil"><Logo /></Link>
        <nav className="nav-principal" aria-label="Navigation principale">
          {PRINCIPAL.map(([href, nom, ic]) => (
            <Link key={href} href={href} aria-current={estActif(path, href) ? 'page' : undefined}><Icone nom={ic} /><span>{nom}</span></Link>
          ))}
        </nav>
        <div className="actions-haut">
          <Link href="/recherche" className="btn-rond" aria-label="Recherche"><Icone nom="recherche" /></Link>
          <Link href="/messages" className="btn-rond msg-haut" aria-label="Messages"><Icone nom="message" />{badge(nbMsg)}</Link>
          <Link href="/notifications" className="btn-rond" aria-label="Notifications"><Icone nom="cloche" />{badge(nb)}</Link>
          <button className="btn-rond" onClick={() => setPlus(!plus)} aria-label="Menu" aria-expanded={plus}><Icone nom="grille" /></button>
        </div>
      </header>

      {plus && (
        <div className="feuille" onClick={() => setPlus(false)}>
          <div className="feuille-contenu" onClick={e => e.stopPropagation()} role="dialog" aria-label="Menu">
            <div className="grille-plus">
              {PLUS.map(([href, nom, ic, mobile]) => (
                <Link key={href} href={href} className={(mobile ? 'seulement-mobile ' : '') + (estActif(path, href) ? 'actif' : '')}><Icone nom={ic} taille={26} /><span>{nom}</span></Link>
              ))}
            </div>
            <button className="alt deconnexion" onClick={() => supabase.auth.signOut()}><Icone nom="sortie" /> Se déconnecter</button>
          </div>
        </div>
      )}

      <Appel user={user} />
      <main className="page">{children(user)}</main>

      <nav className="barre-bas" aria-label="Navigation">
        {PRINCIPAL.slice(0, 4).map(([href, nom, ic]) => (
          <Link key={href} href={href} aria-current={estActif(path, href) ? 'page' : undefined}><Icone nom={ic} /><span>{nom}</span></Link>
        ))}
        <button onClick={() => setPlus(!plus)} aria-label="Plus"><Icone nom="grille" /><span>Plus</span></button>
      </nav>

      {!path.startsWith('/messages') && (
        <Link href="/messages" className="fab-messages" aria-label="Messages"><Icone nom="message" taille={26} />{badge(nbMsg)}</Link>
      )}
    </>
  )
}
