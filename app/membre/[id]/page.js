'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'

function Membre({ user }) {
  const { id } = useParams()
  const [p, setP] = useState(undefined)
  const [lien, setLien] = useState(null)
  const [posts, setPosts] = useState([])
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, nom, bio, avatar_url, derniere_activite').eq('id', id).maybeSingle()
    setP(data)
    const { data: l } = await supabase.from('friendships').select('demandeur, destinataire, statut')
    setLien((l || []).find(x => [x.demandeur, x.destinataire].includes(id)) || null)
    const { data: ps } = await supabase.from('posts').select('id, texte, image_url, created_at').eq('auteur', id).is('group_id', null).order('created_at', { ascending: false }).limit(20)
    setPosts(ps || [])
  }, [id])
  useEffect(() => { charger() }, [charger])

  async function ajouter() {
    const { error } = await supabase.from('friendships').insert({ demandeur: user.id, destinataire: id })
    setInfo(error ? 'Demande impossible.' : 'Demande envoyée.'); charger()
  }
  async function bloquer() {
    if (!window.confirm('Bloquer ce membre ?')) return
    const { error } = await supabase.from('blocks').insert({ blocker: user.id, blocked: id })
    setInfo(error ? 'Blocage impossible.' : 'Membre bloqué.')
  }

  if (p === undefined) return <p className="muted">Chargement…</p>
  if (!p) return <p className="muted">Membre introuvable.</p>
  const moi = id === user.id
  const enLigne = p.derniere_activite && Date.now() - new Date(p.derniere_activite).getTime() < 150000
  return (
    <>
      <div className="box">
        <div className="profil-tete">
          <Avatar nom={p.nom} url={p.avatar_url} taille={80} />
          <div>
            <h2 style={{ margin: 0 }}>{p.nom} {enLigne && <span className="point" title="En ligne" />}</h2>
            {p.bio && <p className="texte">{p.bio}</p>}
          </div>
        </div>
        <div className="actions">
          {moi && <Link className="btnlink" href="/profil">Modifier mon profil</Link>}
          {!moi && !lien && <button className="sm" onClick={ajouter}>Ajouter</button>}
          {!moi && lien?.statut === 'en_attente' && <span className="muted">Demande en attente</span>}
          {!moi && lien?.statut === 'accepte' && <Link className="btnlink" href={'/messages?ami=' + id}>Écrire un message</Link>}
          {!moi && <button className="alt sm droite" onClick={bloquer}>Bloquer</button>}
        </div>
        {info && <p className="msg ok" role="status">{info}</p>}
      </div>
      <h2>Publications</h2>
      {!posts.length && <p className="muted">Aucune publication.</p>}
      {posts.map(x => (
        <div className="box" key={x.id}>
          <div className="muted">{new Date(x.created_at).toLocaleString('fr-FR')}</div>
          {x.texte && <p className="texte">{x.texte}</p>}
          {x.image_url && <img className="photo" src={x.image_url} alt="Photo publiée" />}
        </div>
      ))}
    </>
  )
}

export default function Page() { return <Shell>{user => <Membre user={user} />}</Shell> }
