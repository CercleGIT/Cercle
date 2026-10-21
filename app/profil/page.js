'use client'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'

function Profil({ user }) {
  const [p, setP] = useState(null)
  const [info, setInfo] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('nom, bio, avatar_url').eq('id', user.id).single().then(({ data }) => setP(data))
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
    <form className="box" onSubmit={enregistrer}>
      <h2>Mon profil</h2>
      <div className="entete">
        <Avatar nom={p.nom} url={p.avatar_url} taille={72} />
        <label className="alt sm bouton">Changer la photo<input type="file" accept="image/*" hidden onChange={photo} /></label>
      </div>
      <label htmlFor="nom">Prénom</label>
      <input id="nom" value={p.nom} onChange={e => setP({ ...p, nom: e.target.value })} />
      <label htmlFor="bio">À propos de moi</label>
      <textarea id="bio" rows={3} value={p.bio || ''} onChange={e => setP({ ...p, bio: e.target.value })} />
      <button>Enregistrer</button>
      {info && <p className="msg ok" role="status">{info}</p>}
    </form>
  )
}

export default function Page() { return <Shell>{user => <Profil user={user} />}</Shell> }
