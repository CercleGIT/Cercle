'use client'
import { useCallback, useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'

function Evenements({ user }) {
  const [liste, setListe] = useState([])
  const [f, setF] = useState({ titre: '', lieu: '', date: '', description: '' })
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.from('events')
      .select('id, titre, description, lieu, date_event, createur, profiles!createur(nom), event_participants(user_id)')
      .order('date_event', { ascending: true })
    setListe(data || [])
  }, [])
  useEffect(() => { charger() }, [charger])

  async function creer(e) {
    e.preventDefault()
    if (!f.titre.trim() || !f.date) return setErreur('Indique un titre et une date.')
    const { error } = await supabase.from('events').insert({
      titre: f.titre.trim(), lieu: f.lieu.trim(), description: f.description.trim(),
      date_event: new Date(f.date).toISOString(), createur: user.id,
    })
    if (error) return setErreur('Création impossible.')
    setF({ titre: '', lieu: '', date: '', description: '' }); setErreur(''); charger()
  }
  async function basculer(ev, vient) {
    const q = supabase.from('event_participants')
    await (vient ? q.delete().match({ event_id: ev.id, user_id: user.id }) : q.insert({ event_id: ev.id, user_id: user.id }))
    charger()
  }
  async function supprimer(id) { await supabase.from('events').delete().eq('id', id); charger() }
  const maj = k => e => setF({ ...f, [k]: e.target.value })

  return (
    <>
      <form className="box" onSubmit={creer}>
        <h2>Créer un événement</h2>
        <input value={f.titre} onChange={maj('titre')} placeholder="Titre" aria-label="Titre" />
        <input type="datetime-local" value={f.date} onChange={maj('date')} aria-label="Date et heure" />
        <input value={f.lieu} onChange={maj('lieu')} placeholder="Lieu" aria-label="Lieu" />
        <input value={f.description} onChange={maj('description')} placeholder="Description" aria-label="Description" />
        <button>Créer</button>
        {erreur && <p className="msg err" role="status">{erreur}</p>}
      </form>
      {!liste.length && <p className="muted">Aucun événement pour le moment.</p>}
      {liste.map(ev => {
        const vient = ev.event_participants.some(p => p.user_id === user.id)
        const n = ev.event_participants.length
        return (
          <div className="box" key={ev.id}>
            <b>{ev.titre}</b>
            <div className="muted">{new Date(ev.date_event).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}{ev.lieu && ' · ' + ev.lieu}</div>
            {ev.description && <p className="texte">{ev.description}</p>}
            <div className="muted">Organisé par {ev.profiles?.nom || 'un membre'} · {n} participant{n > 1 ? 's' : ''}</div>
            <div className="actions">
              <button className={vient ? 'alt sm' : 'sm'} onClick={() => basculer(ev, vient)}>{vient ? 'Je ne viens plus' : 'Je participe'}</button>
              {ev.createur === user.id && <button className="alt sm" onClick={() => supprimer(ev.id)}>Supprimer</button>}
            </div>
          </div>
        )
      })}
    </>
  )
}

export default function Page() { return <Shell>{user => <Evenements user={user} />}</Shell> }
