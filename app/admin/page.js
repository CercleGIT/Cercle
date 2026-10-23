'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'

const CARTES = [
  ['membres', 'Membres'], ['nouveaux_7j', 'Nouveaux (7 jours)'], ['actifs_7j', 'Actifs (7 jours)'], ['parrainages', 'Invitations réussies'],
  ['publications', 'Publications'], ['publications_7j', 'Publications (7 jours)'], ['participations_defi_7j', 'Participations aux défis (7 jours)'],
  ['groupes', 'Groupes'], ['annonces_actives', 'Annonces actives'], ['createurs', 'Créateurs'], ['signalements', 'Signalements à traiter'],
]

function Tableau() {
  const [s, setS] = useState(undefined)
  useEffect(() => {
    supabase.rpc('statistiques_admin').then(({ data, error }) => setS(error ? null : data))
  }, [])
  if (s === undefined) return <p className="muted">Chargement…</p>
  if (!s) return <p className="muted">Accès réservé aux administrateurs.</p>
  const jours = s.inscriptions_par_jour || []
  const max = Math.max(1, ...jours.map(j => j.n))
  return (
    <>
      <h2>📊 Tableau de bord</h2>
      <div className="grille">
        {CARTES.map(([k, nom]) => (
          <div className="box stat" key={k}><div className="stat-n">{s[k] ?? 0}</div><div className="muted">{nom}</div></div>
        ))}
      </div>
      <div className="box">
        <h2>Inscriptions des 14 derniers jours</h2>
        {!jours.length && <p className="muted">Aucune inscription récente.</p>}
        {jours.map(j => (
          <div className="barre-ligne" key={j.jour}>
            <span className="muted">{new Date(j.jour + 'T00:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</span>
            <span className="barre-fond"><span className="barre-val" style={{ width: (100 * j.n / max) + '%' }} /></span>
            <b>{j.n}</b>
          </div>
        ))}
      </div>
      <Link className="btnlink" href="/moderation">Ouvrir la modération</Link>
    </>
  )
}

export default function Page() { return <Shell>{() => <Tableau />}</Shell> }
