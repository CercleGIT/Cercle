'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'

function Bloques({ user }) {
  const [liste, setListe] = useState([])
  const charger = useCallback(async () => {
    const { data: b } = await supabase.from('blocks').select('blocked')
    const ids = (b || []).map(x => x.blocked)
    if (!ids.length) return setListe([])
    const { data } = await supabase.from('profiles').select('id, nom, avatar_url').in('id', ids)
    setListe(data || [])
  }, [])
  useEffect(() => { charger() }, [charger])
  async function debloquer(id) {
    await supabase.from('blocks').delete().match({ blocker: user.id, blocked: id })
    charger()
  }
  return (
    <div className="box">
      <h2>Membres bloqués</h2>
      {!liste.length && <p className="muted">Tu n’as bloqué personne.</p>}
      {liste.map(m => (
        <div className="resultat" key={m.id}>
          <Avatar nom={m.nom} url={m.avatar_url} taille={32} />
          <div>{m.nom}</div>
          <button className="alt sm" onClick={() => debloquer(m.id)}>Débloquer</button>
        </div>
      ))}
    </div>
  )
}

function Compte() {
  const [info, setInfo] = useState('')
  async function supprimer() {
    const saisie = window.prompt('Action définitive : ton compte et tes publications seront supprimés. Tape SUPPRIMER pour confirmer.')
    if (saisie !== 'SUPPRIMER') return
    const { error } = await supabase.rpc('supprimer_mon_compte')
    if (error) return setInfo('Suppression impossible.')
    await supabase.auth.signOut()
  }
  return (
    <div className="box">
      <h2>Zone sensible</h2>
      <p className="muted">Supprime définitivement ton compte et toutes tes données.</p>
      <button className="alt sm" onClick={supprimer}>Supprimer mon compte</button>
      {info && <p className="msg err" role="status">{info}</p>}
    </div>
  )
}

function Profil({ user }) {
  const [p, setP] = useState(null)
  const [info, setInfo] = useState('')
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('nom, bio, avatar_url').eq('id', user.id).single().then(({ data }) => setP(data))
    supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle().then(({ data }) => setAdmin(!!data))
  }, [user.id])
  if (!p) return <p className="muted">Chargement…</p>

  async function photo(e) {
    const f = e.target.files[0]
    if (f) setP({ ...p, avatar_url: await redimensionner(f, 160, 0.8) })
  }
  async function enregistrer(e) {
    e.preventDefault()
    if (p.nom.trim().length < 2) return setInfo('Indique ton prénom.')
    const { error } = await supabase.from('profiles').update({ nom: p.nom.trim(), bio: p.bio, avatar_url: p.avatar_url }).eq('id', user.id)
    setInfo(error ? 'Enregistrement impossible.' : 'Profil enregistré.')
  }

  return (
    <>
      <form className="box" onSubmit={enregistrer}>
        <h2>Mon profil</h2>
        <div className="entete">
          <Avatar nom={p.nom} url={p.avatar_url} taille={72} />
          <label className="alt sm bouton">Changer la photo<input type="file" accept="image/*" hidden onChange={photo} /></label>
        </div>
        <label htmlFor="nom">Prénom</label>
        <input id="nom" value={p.nom} onChange={e => setP({ ...p, nom: e.target.value })} />
        <label htmlFor="bio">À propos de moi</label>
        <textarea id="bio" rows={3} maxLength={500} value={p.bio || ''} onChange={e => setP({ ...p, bio: e.target.value })} />
        <button>Enregistrer</button>
        {info && <p className="msg ok" role="status">{info}</p>}
      </form>
      <Bloques user={user} />
      <Compte />
      {admin && <div className="box"><h2>Administration</h2><Link className="btnlink" href="/moderation">Ouvrir la modération</Link></div>}
    </>
  )
}

export default function Page() { return <Shell>{user => <Profil user={user} />}</Shell> }
