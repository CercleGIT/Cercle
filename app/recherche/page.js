'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import Verifie from '@/components/Verifie'
import { supabase } from '@/lib/supabase'

function Recherche({ user }) {
  const [q, setQ] = useState('')
  const [membres, setMembres] = useState([])
  const [posts, setPosts] = useState([])
  const [liens, setLiens] = useState([])
  const [fait, setFait] = useState(false)

  const chargerLiens = () => supabase.from('friendships').select('demandeur, destinataire, statut').then(({ data }) => setLiens(data || []))
  useEffect(() => { chargerLiens() }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      const mot = q.trim()
      if (mot.length < 2) { setMembres([]); setPosts([]); setFait(false); return }
      const motif = `%${mot.replace(/[%_,()]/g, ' ')}%`
      const [m, p] = await Promise.all([
        supabase.from('profiles').select('id, nom, bio, avatar_url, verifie, officiel').ilike('nom', motif).neq('id', user.id).limit(10),
        supabase.from('posts').select('id, texte, created_at, auteur, profiles!auteur(nom, avatar_url)').ilike('texte', motif).is('group_id', null).order('created_at', { ascending: false }).limit(20),
      ])
      setMembres(m.data || []); setPosts(p.data || []); setFait(true)
    }, 300)
    return () => clearTimeout(t)
  }, [q, user.id])

  const lien = id => liens.find(l => [l.demandeur, l.destinataire].includes(id))
  async function ajouter(id) {
    await supabase.from('friendships').insert({ demandeur: user.id, destinataire: id })
    chargerLiens()
  }

  return (
    <>
      <div className="box">
        <h2>Recherche</h2>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Un prénom ou un mot d’une publication" aria-label="Recherche" />
      </div>
      {fait && !membres.length && !posts.length && <p className="muted">Aucun résultat.</p>}
      {membres.length > 0 && (
        <div className="box">
          <h2>Membres</h2>
          {membres.map(m => {
            const l = lien(m.id)
            return (
              <div className="resultat" key={m.id}>
                <Avatar nom={m.nom} url={m.avatar_url} id={m.id} />
                <div><Link className="lienmembre" href={'/membre/' + m.id}><b>{m.nom}</b></Link>{m.verifie && <Verifie />}{m.bio && <div className="muted">{m.bio}</div>}</div>
                {m.officiel ? <Link className="alt sm bouton" href={'/membre/' + m.id}>S’abonner</Link> : l ? <span className="muted">{l.statut === 'accepte' ? 'Ami' : 'En attente'}</span> : <button className="sm" onClick={() => ajouter(m.id)}>Ajouter</button>}
              </div>
            )
          })}
        </div>
      )}
      {posts.length > 0 && (
        <div className="box">
          <h2>Publications</h2>
          {posts.map(p => (
            <div className="resultat" key={p.id}>
              <Avatar nom={p.profiles?.nom} url={p.profiles?.avatar_url} id={p.auteur} />
              <div><Link className="lienmembre" href={'/membre/' + p.auteur}><b>{p.profiles?.nom || 'Membre'}</b></Link><div>{p.texte}</div><div className="muted">{new Date(p.created_at).toLocaleString('fr-FR')}</div></div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default function Page() { return <Shell>{user => <Recherche user={user} />}</Shell> }
