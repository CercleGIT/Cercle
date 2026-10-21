'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'
import Avatar from '@/components/Avatar'

const SELECTION = 'id, texte, image_url, created_at, auteur, profiles!auteur(nom, avatar_url), likes(user_id), comments(id, texte, created_at, profiles(nom, avatar_url))'

function Commentaire({ postId, user, apres }) {
  const [t, setT] = useState('')
  async function envoyer(e) {
    e.preventDefault()
    if (!t.trim()) return
    await supabase.from('comments').insert({ post_id: postId, auteur: user.id, texte: t.trim() })
    setT(''); apres()
  }
  return (
    <form className="saisie" onSubmit={envoyer}>
      <input value={t} onChange={e => setT(e.target.value)} placeholder="Écrire un commentaire" aria-label="Commentaire" />
      <button className="sm">Envoyer</button>
    </form>
  )
}

export default function Fil({ user, groupId = null }) {
  const [posts, setPosts] = useState([])
  const [texte, setTexte] = useState('')
  const [image, setImage] = useState(null)
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    let q = supabase.from('posts').select(SELECTION).order('created_at', { ascending: false }).limit(50)
    q = groupId ? q.eq('group_id', groupId) : q.is('group_id', null)
    const { data, error } = await q
    if (error) setInfo('Impossible de charger les publications.')
    else setPosts(data)
  }, [groupId])
  useEffect(() => { charger() }, [charger])

  async function choisir(e) {
    const f = e.target.files[0]
    if (f) setImage(await redimensionner(f))
  }
  async function publier(e) {
    e.preventDefault()
    if (!texte.trim() && !image) return
    const { error } = await supabase.from('posts').insert({ auteur: user.id, texte: texte.trim(), image_url: image, group_id: groupId })
    if (error) return setInfo('Publication impossible.')
    setTexte(''); setImage(null); setInfo(''); charger()
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
    setInfo(error ? 'Signalement impossible.' : 'Merci, la publication a été signalée.')
  }

  return (
    <>
      <form className="box" onSubmit={publier}>
        <textarea rows={3} value={texte} onChange={e => setTexte(e.target.value)} placeholder="Quoi de neuf ?" aria-label="Nouvelle publication" />
        {image && <div className="apercu"><img className="photo" src={image} alt="Aperçu" /><button type="button" className="alt sm" onClick={() => setImage(null)}>Retirer la photo</button></div>}
        <div className="actions">
          <label className="alt sm bouton">📷 Photo<input type="file" accept="image/*" hidden onChange={choisir} /></label>
          <button>Publier</button>
        </div>
      </form>
      {info && <p className="msg err" role="status">{info}</p>}
      {!posts.length && <p className="muted">Aucune publication pour le moment.</p>}
      {posts.map(p => {
        const aime = p.likes.some(l => l.user_id === user.id)
        const coms = [...p.comments].sort((a, b) => a.created_at.localeCompare(b.created_at))
        return (
          <article className="box" key={p.id}>
            <div className="entete">
              <Avatar nom={p.profiles?.nom} url={p.profiles?.avatar_url} />
              <div><b>{p.profiles?.nom || 'Membre'}</b><div className="muted">{new Date(p.created_at).toLocaleString('fr-FR')}</div></div>
            </div>
            {p.texte && <p className="texte">{p.texte}</p>}
            {p.image_url && <img className="photo" src={p.image_url} alt="Photo publiée" />}
            <div className="actions">
              <button className="alt sm" onClick={() => aimer(p)}>{aime ? '♥' : '♡'} {p.likes.length}</button>
              <span className="muted">{coms.length} commentaire{coms.length > 1 ? 's' : ''}</span>
              {p.auteur === user.id
                ? <button className="alt sm droite" onClick={() => supprimer(p.id)}>Supprimer</button>
                : <button className="alt sm droite" onClick={() => signaler(p.id)}>Signaler</button>}
            </div>
            {coms.map(c => (
              <div className="com" key={c.id}>
                <Avatar nom={c.profiles?.nom} url={c.profiles?.avatar_url} taille={30} />
                <div className="bulle"><b>{c.profiles?.nom || 'Membre'}</b> {c.texte}</div>
              </div>
            ))}
            <Commentaire postId={p.id} user={user} apres={charger} />
          </article>
        )
      })}
    </>
  )
}
