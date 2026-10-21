'use client'
import { useCallback, useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'

function Moderation({ user }) {
  const [admin, setAdmin] = useState(null)
  const [liste, setListe] = useState([])

  const charger = useCallback(async () => {
    const { data } = await supabase.from('reports')
      .select('id, motif, created_at, post_id, reporter:profiles!auteur(nom), posts(id, texte, image_url, created_at, profiles!auteur(nom))')
      .order('created_at', { ascending: false }).limit(50)
    setListe(data || [])
  }, [])

  useEffect(() => {
    supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      setAdmin(!!data)
      if (data) charger()
    })
  }, [user.id, charger])

  async function supprimerPost(postId) {
    if (!window.confirm('Supprimer définitivement cette publication ?')) return
    await supabase.from('posts').delete().eq('id', postId)
    charger()
  }
  async function ignorer(id) { await supabase.from('reports').delete().eq('id', id); charger() }

  if (admin === null) return <p className="muted">Chargement…</p>
  if (!admin) return <p className="muted">Accès réservé aux administrateurs.</p>
  return (
    <>
      <h2>Signalements ({liste.length})</h2>
      {!liste.length && <p className="muted">Aucun signalement à traiter.</p>}
      {liste.map(r => (
        <div className="box" key={r.id}>
          <div className="muted">Signalé par {r.reporter?.nom || 'un membre'} · {new Date(r.created_at).toLocaleString('fr-FR')}</div>
          <p><b>Motif :</b> {r.motif}</p>
          {r.posts ? (
            <div className="partage">
              <b>{r.posts.profiles?.nom || 'Membre'}</b>
              {r.posts.texte && <p className="texte">{r.posts.texte}</p>}
              {r.posts.image_url && <img className="photo" src={r.posts.image_url} alt="Photo signalée" />}
            </div>
          ) : <p className="muted">Publication introuvable.</p>}
          <div className="actions">
            <button className="sm" onClick={() => supprimerPost(r.post_id)}>Supprimer la publication</button>
            <button className="alt sm" onClick={() => ignorer(r.id)}>Ignorer le signalement</button>
          </div>
        </div>
      ))}
    </>
  )
}

export default function Page() { return <Shell>{user => <Moderation user={user} />}</Shell> }
