'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'

const raison = s => [
  s.amis_communs > 0 && s.amis_communs + ' ami' + (s.amis_communs > 1 ? 's' : '') + ' en commun',
  s.groupes_communs > 0 && s.groupes_communs + ' groupe' + (s.groupes_communs > 1 ? 's' : '') + ' en commun',
  s.distance_km && 'à moins de ' + s.distance_km + ' km',
].filter(Boolean).join(' · ')

// Bandeau « Personnes que tu pourrais connaître » en haut du Fil
export default function SuggestionsFil({ user }) {
  const [liste, setListe] = useState([])
  const [masques, setMasques] = useState([])

  const charger = useCallback(async () => {
    const { data, error } = await supabase.rpc('suggestions_amis', { max_resultats: 12 })
    if (error || !data) return setListe([])
    let officiels = []
    if (data.length) {
      const { data: o } = await supabase.from('profiles').select('id, officiel').in('id', data.map(s => s.id))
      officiels = (o || []).filter(x => x.officiel).map(x => x.id)
    }
    setListe(data.filter(s => !officiels.includes(s.id)))
  }, [])
  useEffect(() => {
    charger()
    try { setMasques(JSON.parse(localStorage.getItem('cercle-sugg-masquees') || '[]')) } catch {}
  }, [charger])

  async function ajouter(id) {
    await supabase.from('friendships').insert({ demandeur: user.id, destinataire: id })
    charger()
  }
  function masquer(id) {
    const m = [...masques, id]
    setMasques(m)
    try { localStorage.setItem('cercle-sugg-masquees', JSON.stringify(m)) } catch {}
  }
  const visibles = liste.filter(s => !masques.includes(s.id)).slice(0, 8)
  if (!visibles.length) return null

  return (
    <section className="suggestions-fil">
      <h3>Personnes que tu pourrais connaître</h3>
      <div className="defile">
        {visibles.map(s => (
          <div className="sugg-carte" key={s.id}>
            <button className="sugg-x" onClick={() => masquer(s.id)} aria-label="Masquer cette suggestion">✕</button>
            <Avatar nom={s.nom} url={s.avatar_url} taille={56} id={s.id} />
            <Link className="lienmembre" href={'/membre/' + s.id}><b>{s.nom}</b></Link>
            <div className="muted sugg-raison">{raison(s)}</div>
            <button className="sm" onClick={() => ajouter(s.id)}>Ajouter</button>
          </div>
        ))}
      </div>
    </section>
  )
}
