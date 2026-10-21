'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'

const enLigne = d => d && Date.now() - new Date(d).getTime() < 150000

function Messages({ user }) {
  const [amis, setAmis] = useState([])
  const [nonLus, setNonLus] = useState({})
  const [actif, setActif] = useState(null)
  const [fil, setFil] = useState([])
  const [texte, setTexte] = useState('')
  const [photo, setPhoto] = useState(null)
  const [vide, setVide] = useState(false)
  const liste = useRef(null)

  const chargerAmis = useCallback(async () => {
    const { data: l } = await supabase.from('friendships').select('demandeur, destinataire').eq('statut', 'accepte')
    const ids = (l || []).map(x => (x.demandeur === user.id ? x.destinataire : x.demandeur))
    if (!ids.length) return setVide(true)
    const { data: ps } = await supabase.from('profiles').select('id, nom, avatar_url, derniere_activite').in('id', ids)
    setAmis(ps || [])
    const voulu = new URLSearchParams(window.location.search).get('ami')
    setActif(a => a || (ps || []).find(p => p.id === voulu) || (ps || [])[0] || null)
    const { data: nl } = await supabase.from('messages').select('expediteur').eq('destinataire', user.id).eq('lu', false)
    const c = {}
    ;(nl || []).forEach(m => { c[m.expediteur] = (c[m.expediteur] || 0) + 1 })
    setNonLus(c)
  }, [user.id])
  useEffect(() => {
    chargerAmis()
    const t = setInterval(chargerAmis, 15000)
    return () => clearInterval(t)
  }, [chargerAmis])

  const charger = useCallback(async () => {
    if (!actif) return
    const { data } = await supabase.from('messages').select('id, expediteur, texte, image_url, lu, created_at')
      .or(`and(expediteur.eq.${user.id},destinataire.eq.${actif.id}),and(expediteur.eq.${actif.id},destinataire.eq.${user.id})`)
      .order('created_at', { ascending: true }).limit(200)
    setFil(data || [])
    if ((data || []).some(m => m.expediteur === actif.id && !m.lu)) {
      await supabase.rpc('marquer_lu', { ami: actif.id })
      chargerAmis()
    }
  }, [actif, user.id, chargerAmis])
  useEffect(() => {
    charger()
    const t = setInterval(charger, 4000)
    return () => clearInterval(t)
  }, [charger])
  useEffect(() => { if (liste.current) liste.current.scrollTop = liste.current.scrollHeight }, [fil])

  async function choisir(e) {
    const f = e.target.files[0]
    if (f) setPhoto(await redimensionner(f, 700, 0.7))
    e.target.value = ''
  }
  async function envoyer(e) {
    e.preventDefault()
    if ((!texte.trim() && !photo) || !actif) return
    await supabase.from('messages').insert({ expediteur: user.id, destinataire: actif.id, texte: texte.trim(), image_url: photo })
    setTexte(''); setPhoto(null); charger()
  }

  if (vide) return <p className="muted">Ajoute d’abord des amis pour discuter. <Link href="/amis">Trouver des amis</Link></p>
  const dernierMien = [...fil].reverse().find(m => m.expediteur === user.id)
  return (
    <div className="box">
      <div className="onglets">
        {amis.map(a => (
          <button key={a.id} className={a.id === actif?.id ? '' : 'alt'} onClick={() => setActif(a)}>
            <Avatar nom={a.nom} url={a.avatar_url} taille={22} /> {a.nom}
            {enLigne(a.derniere_activite) && <span className="point" title="En ligne" />}
            {nonLus[a.id] > 0 && <span className="nonlu">{nonLus[a.id]}</span>}
          </button>
        ))}
      </div>
      <div className="conv" ref={liste}>
        {!fil.length && <p className="muted">Aucun message. Écris le premier.</p>}
        {fil.map(m => (
          <div key={m.id} className={'msgb ' + (m.expediteur === user.id ? 'moi' : '')}>
            {m.image_url && <img src={m.image_url} alt="Photo envoyée" />}
            {m.texte}
          </div>
        ))}
        {dernierMien?.lu && <span className="vu">Vu</span>}
      </div>
      {photo && <div className="apercu"><img className="photo" style={{ maxHeight: 160, width: 'auto' }} src={photo} alt="Aperçu" /><button type="button" className="alt sm" onClick={() => setPhoto(null)}>Retirer la photo</button></div>}
      <form className="saisie" onSubmit={envoyer}>
        <label className="alt sm bouton" aria-label="Joindre une photo">📷<input type="file" accept="image/*" hidden onChange={choisir} /></label>
        <input value={texte} onChange={e => setTexte(e.target.value)} placeholder="Écrire un message" aria-label="Message" />
        <button className="sm">Envoyer</button>
      </form>
    </div>
  )
}

export default function Page() { return <Shell>{user => <Messages user={user} />}</Shell> }
