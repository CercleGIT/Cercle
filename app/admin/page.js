'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import AdminUtilisateurs from '@/components/AdminUtilisateurs'
import AdminAlertes from '@/components/AdminAlertes'
import { supabase } from '@/lib/supabase'

const CARTES = [
  ['membres', 'Membres'], ['nouveaux_7j', 'Nouveaux (7 jours)'], ['actifs_7j', 'Actifs (7 jours)'], ['parrainages', 'Invitations réussies'],
  ['publications', 'Publications'], ['publications_7j', 'Publications (7 jours)'], ['participations_defi_7j', 'Participations aux défis (7 jours)'],
  ['groupes', 'Groupes'], ['annonces_actives', 'Annonces actives'], ['createurs', 'Créateurs'], ['signalements', 'Signalements à traiter'],
]

function Tableau() {
  const [s, setS] = useState(undefined)
  useEffect(() => { supabase.rpc('statistiques_admin').then(({ data, error }) => setS(error ? null : data)) }, [])
  if (s === undefined) return <p className="muted">Chargement…</p>
  if (!s) return <p className="muted">Les statistiques ne sont pas disponibles (migrations manquantes).</p>
  const jours = s.inscriptions_par_jour || []
  const max = Math.max(1, ...jours.map(j => j.n))
  return (
    <>
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
    </>
  )
}

function Centre({ user }) {
  const [admin, setAdmin] = useState(undefined)
  const [onglet, setOnglet] = useState('tableau')
  const [nbAlertes, setNbAlertes] = useState(0)

  const compter = useCallback(async () => {
    const { count } = await supabase.from('alertes').select('id', { count: 'exact', head: true }).eq('traitee', false)
    setNbAlertes(count || 0)
  }, [])
  useEffect(() => {
    supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle().then(({ data }) => { setAdmin(!!data); if (data) compter() })
  }, [user.id, compter])

  if (admin === undefined) return <p className="muted">Chargement…</p>
  if (!admin) return <p className="muted">Accès réservé aux administrateurs.</p>
  return (
    <>
      <h2>🛡️ Administration</h2>
      <div className="onglets" style={{ marginBottom: 12 }}>
        <button className={onglet === 'tableau' ? '' : 'alt'} onClick={() => setOnglet('tableau')}>📊 Tableau de bord</button>
        <button className={onglet === 'membres' ? '' : 'alt'} onClick={() => setOnglet('membres')}>👥 Membres</button>
        <button className={onglet === 'alertes' ? '' : 'alt'} onClick={() => setOnglet('alertes')}>⚠️ Alertes{nbAlertes > 0 ? ' (' + nbAlertes + ')' : ''}</button>
        <Link className="alt bouton" href="/moderation" style={{ padding: '4px 14px', fontSize: 13, borderRadius: 20 }}>🚩 Signalements</Link>
      </div>
      {onglet === 'tableau' && <Tableau />}
      {onglet === 'membres' && <AdminUtilisateurs />}
      {onglet === 'alertes' && <AdminAlertes apres={compter} />}
    </>
  )
}

export default function Page() { return <Shell>{user => <Centre user={user} />}</Shell> }
