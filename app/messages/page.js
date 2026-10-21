'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'

function Messages({ user }) {
  const [amis, setAmis] = useState([])
  const [actif, setActif] = useState(null)
  const [fil, setFil] = useState([])
  const [texte, setTexte] = useState('')
  const [vide, setVide] = useState(false)
  const liste = useRef(null)

  useEffect(() => {
    async function init() {
      const { data: l } = await supabase.from('friendships').select('demandeur, destinataire').eq('statut', 'accepte')
      const ids = (l || []).map(x => (x.demandeur === user.id ? x.destinataire : x.demandeur))
      if (!ids.length) return setVide(true)
      const { data: ps } = await supabase.from('profiles').select('id, nom, avatar_url').in('id', ids)
      setAmis(ps || [])
      setActif((ps || [])[0] || null)
    }
    init()
  }, [user.id])

  const charger = useCallback(async () => {
    if (!actif) return
    const { data } = await supabase.from('messages').select('id, expediteur, texte, created_at')
      .or(`and(expediteur.eq.${user.id},destinataire.eq.${actif.id}),and(expediteur.eq.${actif.id},destinataire.eq.${user.id})`)
      .order('created_at', { ascending: true }).limit(200)
    setFil(data || [])
  }, [actif, user.id])

  useEffect(() => {
    charger()
    const t = setInterval(charger, 4000)
    return () => clearInterval(t)
  }, [charger])
  useEffect(() => { if (liste.current) liste.current.scrollTop = liste.current.scrollHeight }, [fil])

  async function envoyer(e) {
    e.preventDefault()
    if (!texte.trim() || !actif) return
    await supabase.from('messages').insert({ expediteur: user.id, destinataire: actif.id, texte: texte.trim() })
    setTexte(''); charger()
  }

  if (vide) return <p className="muted">Ajoute d’abord des amis pour discuter. <Link href="/amis">Trouver des amis</Link></p>
  return (
    <div className="box">
      <div className="onglets">
        {amis.map(a => (
          <button key={a.id} className={a.id === actif?.id ? '' : 'alt'} onClick={() => setActif(a)}>
            <Avatar nom={a.nom} url={a.avatar_url} taille={22} /> {a.nom}
          </button>
        ))}
      </div>
      <div className="conv" ref={liste}>
        {!fil.length && <p className="muted">Aucun message. Écris le premier.</p>}
        {fil.map(m => <div key={m.id} className={'msgb ' + (m.expediteur === user.id ? 'moi' : '')}>{m.texte}</div>)}
      </div>
      <form className="saisie" onSubmit={envoyer}>
        <input value={texte} onChange={e => setTexte(e.target.value)} placeholder="Écrire un message" aria-label="Message" />
        <button className="sm">Envoyer</button>
      </form>
    </div>
  )
}

export default function Page() { return <Shell>{user => <Messages user={user} />}</Shell> }
