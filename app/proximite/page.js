'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'

const RAYONS = [5, 10, 25, 50, 100]
const arrondir = n => Math.round(n * 100) / 100   // environ 1 km de précision

function Proximite({ user }) {
  const [pos, setPos] = useState(undefined)   // undefined : chargement, null : jamais activée
  const [portee, setPortee] = useState('tous')
  const [rayon, setRayon] = useState(25)
  const [membres, setMembres] = useState(null)
  const [liens, setLiens] = useState([])
  const [info, setInfo] = useState('')
  const [charge, setCharge] = useState(false)

  const chargerPos = useCallback(async () => {
    const { data } = await supabase.from('positions').select('visible, portee, maj').eq('user_id', user.id).maybeSingle()
    setPos(data || null)
    if (data) setPortee(data.portee)
  }, [user.id])
  const chargerLiens = useCallback(async () => {
    const { data } = await supabase.from('friendships').select('demandeur, destinataire, statut')
    setLiens(data || [])
  }, [])
  useEffect(() => { chargerPos(); chargerLiens() }, [chargerPos, chargerLiens])

  useEffect(() => {
    if (!pos?.visible) return setMembres(null)
    supabase.rpc('membres_proches', { rayon_km: rayon }).then(({ data, error }) => {
      if (error) setInfo('Impossible de charger les membres proches.')
      else setMembres(data || [])
    })
  }, [pos, rayon])

  function localiser(visible, porteeChoisie) {
    if (!navigator.geolocation) return setInfo('La localisation n’est pas disponible sur cet appareil.')
    setCharge(true); setInfo('')
    navigator.geolocation.getCurrentPosition(async p => {
      const { error } = await supabase.from('positions').upsert({
        user_id: user.id, lat: arrondir(p.coords.latitude), lon: arrondir(p.coords.longitude),
        visible, portee: porteeChoisie, maj: new Date().toISOString(),
      })
      setCharge(false)
      if (error) return setInfo('Enregistrement impossible.')
      setInfo('Ta position approximative a été mise à jour.')
      chargerPos()
    }, err => {
      setCharge(false)
      setInfo(err.code === 1 ? 'Localisation refusée. Autorise-la dans les réglages du navigateur pour utiliser cette fonction.' : 'Impossible de te localiser pour le moment.')
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 })
  }
  async function masquer() {
    await supabase.from('positions').update({ visible: false }).eq('user_id', user.id)
    setInfo('Tu n’es plus visible.'); chargerPos()
  }
  async function supprimer() {
    await supabase.from('positions').delete().eq('user_id', user.id)
    setInfo('Ta position a été supprimée.'); setMembres(null); chargerPos()
  }
  async function changerPortee(v) {
    setPortee(v)
    await supabase.from('positions').update({ portee: v }).eq('user_id', user.id)
  }
  async function ajouter(id) {
    const { error } = await supabase.from('friendships').insert({ demandeur: user.id, destinataire: id })
    setInfo(error ? 'Demande impossible.' : 'Demande envoyée.'); chargerLiens()
  }
  const lien = id => liens.find(l => [l.demandeur, l.destinataire].includes(id))

  if (pos === undefined) return <p className="muted">Chargement…</p>

  if (!pos || !pos.visible) {
    return (
      <div className="box">
        <h2>📍 À proximité</h2>
        <p>Retrouve les membres de Cercle qui sont près de toi. Cette fonction est <b>facultative</b> : rien n’est partagé tant que tu ne l’actives pas.</p>
        <ul className="muted">
          <li>Ta position est <b>arrondie à environ 1 km</b> avant d’être enregistrée.</li>
          <li>Les autres voient seulement une distance approximative, jamais ta position.</li>
          <li>Tu ne vois les autres que si tu partages aussi la tienne.</li>
          <li>Tu peux te masquer ou effacer ta position à tout moment.</li>
        </ul>
        <label className="check"><input type="radio" name="portee" checked={portee === 'tous'} onChange={() => setPortee('tous')} /> Visible par tous les membres</label>
        <label className="check"><input type="radio" name="portee" checked={portee === 'amis'} onChange={() => setPortee('amis')} /> Visible par mes amis uniquement</label>
        <button disabled={charge} onClick={() => localiser(true, portee)}>{charge ? 'Localisation…' : 'Activer ma localisation'}</button>
        {info && <p className="msg err" role="status">{info}</p>}
      </div>
    )
  }

  return (
    <>
      <div className="box">
        <h2>📍 À proximité</h2>
        <div className="filtres">
          <select value={rayon} onChange={e => setRayon(Number(e.target.value))} aria-label="Rayon de recherche">
            {RAYONS.map(r => <option key={r} value={r}>Dans un rayon de {r} km</option>)}
          </select>
          <select value={portee} onChange={e => changerPortee(e.target.value)} aria-label="Qui peut me voir">
            <option value="tous">Visible par tous les membres</option>
            <option value="amis">Visible par mes amis</option>
          </select>
        </div>
        <div className="actions">
          <button className="alt sm" disabled={charge} onClick={() => localiser(true, portee)}>{charge ? 'Localisation…' : '↻ Mettre à jour ma position'}</button>
          <button className="alt sm" onClick={masquer}>Me masquer</button>
          <button className="alt sm" onClick={supprimer}>Effacer ma position</button>
        </div>
        {info && <p className="msg ok" role="status">{info}</p>}
      </div>
      {membres === null && <p className="muted">Recherche en cours…</p>}
      {membres && !membres.length && <p className="muted">Personne à proximité pour le moment. Essaie un rayon plus large.</p>}
      {membres && membres.length > 0 && (
        <div className="box">
          <h2>Membres proches ({membres.length})</h2>
          {membres.map(m => {
            const l = lien(m.id)
            return (
              <div className="resultat" key={m.id}>
                <Avatar nom={m.nom} url={m.avatar_url} id={m.id} />
                <div><Link className="lienmembre" href={'/membre/' + m.id}><b>{m.nom}</b></Link><div className="muted">à moins de {m.distance_km} km</div></div>
                {l ? <span className="muted">{l.statut === 'accepte' ? 'Ami' : 'En attente'}</span> : <button className="sm" onClick={() => ajouter(m.id)}>Ajouter</button>}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

export default function Page() { return <Shell>{user => <Proximite user={user} />}</Shell> }
