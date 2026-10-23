'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import Verifie from '@/components/Verifie'
import { supabase } from '@/lib/supabase'

const raisons = s => [
  s.amis_communs > 0 && s.amis_communs + ' ami' + (s.amis_communs > 1 ? 's' : '') + ' en commun',
  s.groupes_communs > 0 && s.groupes_communs + ' groupe' + (s.groupes_communs > 1 ? 's' : '') + ' en commun',
  s.distance_km && 'à moins de ' + s.distance_km + ' km',
].filter(Boolean).join(' · ')

function Suggestions({ user, apres }) {
  const [liste, setListe] = useState(null)
  const [masques, setMasques] = useState([])
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.rpc('suggestions_amis', { max_resultats: 20 })
    setListe(data || [])
  }, [])
  useEffect(() => {
    charger()
    try { setMasques(JSON.parse(localStorage.getItem('cercle-sugg-masquees') || '[]')) } catch {}
  }, [charger])

  async function ajouter(id) {
    const { error } = await supabase.from('friendships').insert({ demandeur: user.id, destinataire: id })
    setInfo(error ? 'Demande impossible.' : 'Demande envoyée.')
    charger(); apres()
  }
  function masquer(id) {
    const m = [...masques, id]
    setMasques(m)
    try { localStorage.setItem('cercle-sugg-masquees', JSON.stringify(m)) } catch {}
  }

  const visibles = (liste || []).filter(s => !masques.includes(s.id))
  if (!visibles.length) return null
  return (
    <section className="box">
      <h2>Personnes que tu pourrais connaître</h2>
      {visibles.map(s => (
        <div className="resultat" key={s.id}>
          <Avatar nom={s.nom} url={s.avatar_url} id={s.id} />
          <div>
            <Link className="lienmembre" href={'/membre/' + s.id}><b>{s.nom}</b></Link>{s.verifie && <Verifie />}
            <div className="muted">{raisons(s)}</div>
          </div>
          <button className="sm" onClick={() => ajouter(s.id)}>Ajouter</button>
          <button className="alt sm" onClick={() => masquer(s.id)} aria-label="Masquer cette suggestion">✕</button>
        </div>
      ))}
      {info && <p className="msg ok" role="status">{info}</p>}
    </section>
  )
}

function Amis({ user }) {
  const [liens, setLiens] = useState([])      // amitiés me concernant
  const [noms, setNoms] = useState({})        // id -> prénom
  const [recherche, setRecherche] = useState('')
  const [trouves, setTrouves] = useState([])
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.from('friendships').select('id, demandeur, destinataire, statut')
    const l = data || []
    setLiens(l)
    const ids = [...new Set(l.flatMap(x => [x.demandeur, x.destinataire]))]
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, nom').in('id', ids)
      setNoms(Object.fromEntries((ps || []).map(p => [p.id, p.nom])))
    }
  }, [])
  useEffect(() => { charger() }, [charger])

  async function chercher(e) {
    const q = e.target.value
    setRecherche(q)
    if (q.trim().length < 2) return setTrouves([])
    const { data } = await supabase.from('profiles').select('id, nom').ilike('nom', `%${q.trim()}%`).neq('id', user.id).limit(10)
    setTrouves(data || [])
  }
  const lien = id => liens.find(l => [l.demandeur, l.destinataire].includes(id))

  async function ajouter(id) {
    const { error } = await supabase.from('friendships').insert({ demandeur: user.id, destinataire: id })
    setInfo(error ? 'Demande impossible.' : 'Demande envoyée.'); charger()
  }
  async function accepter(id) { await supabase.from('friendships').update({ statut: 'accepte' }).eq('id', id); charger() }
  async function retirer(id) { await supabase.from('friendships').delete().eq('id', id); charger() }

  const recues = liens.filter(l => l.destinataire === user.id && l.statut === 'en_attente')
  const amis = liens.filter(l => l.statut === 'accepte')
  const autre = l => (l.demandeur === user.id ? l.destinataire : l.demandeur)

  return (
    <>
      <Suggestions user={user} apres={charger} />
      <section className="box">
        <h2>Trouver des amis</h2>
        <input value={recherche} onChange={chercher} placeholder="Rechercher par prénom" aria-label="Rechercher un membre" />
        {trouves.map(p => {
          const l = lien(p.id)
          return (
            <div className="ligne" key={p.id}>
              <span>{p.nom}</span>
              {l ? <span className="muted">{l.statut === 'accepte' ? 'Ami' : 'En attente'}</span>
                 : <button className="sm" onClick={() => ajouter(p.id)}>Ajouter</button>}
            </div>
          )
        })}
        {info && <p className="msg ok" role="status">{info}</p>}
      </section>
      <section className="box">
        <h2>Demandes reçues ({recues.length})</h2>
        {recues.map(l => (
          <div className="ligne" key={l.id}>
            <span>{noms[l.demandeur] || 'Membre'}</span>
            <span><button className="sm" onClick={() => accepter(l.id)}>Accepter</button> <button className="alt sm" onClick={() => retirer(l.id)}>Refuser</button></span>
          </div>
        ))}
      </section>
      <section className="box">
        <h2>Mes amis ({amis.length})</h2>
        {amis.map(l => (
          <div className="ligne" key={l.id}>
            <span>{noms[autre(l)] || 'Membre'}</span>
            <button className="alt sm" onClick={() => retirer(l.id)}>Retirer</button>
          </div>
        ))}
      </section>
    </>
  )
}

export default function Page() { return <Shell>{user => <Amis user={user} />}</Shell> }
