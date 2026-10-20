'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Fil de publications : général (groupId = null) ou d'un groupe
export default function Fil({ user, groupId = null }) {
  const [posts, setPosts] = useState([])
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    let q = supabase.from('posts')
      .select('id, texte, created_at, auteur, profiles(nom), likes(user_id)')
      .order('created_at', { ascending: false }).limit(50)
    q = groupId ? q.eq('group_id', groupId) : q.is('group_id', null)
    const { data, error } = await q
    if (error) setErreur('Impossible de charger les publications.')
    else setPosts(data)
  }, [groupId])

  useEffect(() => { charger() }, [charger])

  async function publier(e) {
    e.preventDefault()
    if (!texte.trim()) return
    const { error } = await supabase.from('posts').insert({ auteur: user.id, texte: texte.trim(), group_id: groupId })
    if (error) return setErreur('Publication impossible.')
    setTexte(''); setErreur(''); charger()
  }
  async function aimer(p) {
    const aime = p.likes.some(l => l.user_id === user.id)
    const q = supabase.from('likes')
    await (aime ? q.delete().match({ post_id: p.id, user_id: user.id }) : q.insert({ post_id: p.id, user_id: user.id }))
    charger()
  }
  async function supprimer(id) { await supabase.from('posts').delete().eq('id', id); charger() }
  async function signaler(id) {
    const { error } = await supabase.from('reports').insert({ post_id: id, auteur: user.id, motif: 'signalement' })
    setErreur(error ? 'Signalement impossible.' : 'Merci, la publication a été signalée.')
  }

  return (
    <>
      <form className="box" onSubmit={publier}>
        <textarea rows={3} value={texte} onChange={e => setTexte(e.target.value)} placeholder="Quoi de neuf ?" aria-label="Nouvelle publication" />
        <button>Publier</button>
      </form>
      {erreur && <p className="msg err" role="status">{erreur}</p>}
      {!posts.length && <p className="muted">Aucune publication pour le moment.</p>}
      {posts.map(p => {
        const aime = p.likes.some(l => l.user_id === user.id)
        return (
          <article className="box" key={p.id}>
            <b>{p.profiles?.nom || 'Membre'}</b>
            <div className="muted">{new Date(p.created_at).toLocaleString('fr-FR')}</div>
            <p className="texte">{p.texte}</p>
            <div className="actions">
              <button className="alt sm" onClick={() => aimer(p)}>{aime ? '♥' : '♡'} {p.likes.length}</button>
              {p.auteur === user.id
                ? <button className="alt sm" onClick={() => supprimer(p.id)}>Supprimer</button>
                : <button className="alt sm" onClick={() => signaler(p.id)}>Signaler</button>}
            </div>
          </article>
        )
      })}
    </>
  )
}
