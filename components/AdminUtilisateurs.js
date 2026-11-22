'use client'
import { useCallback, useEffect, useState } from 'react'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'

const PAGE = 30
const ageDe = d => {
  if (!d) return null
  const n = new Date(d + 'T00:00:00'), a = new Date()
  let r = a.getFullYear() - n.getFullYear()
  const m = a.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && a.getDate() < n.getDate())) r--
  return r
}
const jour = d => (d ? new Date(d).toLocaleDateString('fr-FR') : '—')
const csv = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'

// Liste de tous les membres avec leurs informations (réservé aux administrateurs)
export default function AdminUtilisateurs() {
  const [liste, setListe] = useState([])
  const [q, setQ] = useState('')
  const [charge, setCharge] = useState(true)
  const [fin, setFin] = useState(false)
  const [erreur, setErreur] = useState('')

  const chargerPage = useCallback(async (recherche, decalage) => {
    setCharge(true); setErreur('')
    const { data, error } = await supabase.rpc('liste_utilisateurs', { recherche, limite: PAGE, decalage })
    setCharge(false)
    if (error) return setErreur('Impossible de charger les membres. As-tu lancé la requête « migration-admin-securite » dans Supabase ?')
    setFin(data.length < PAGE)
    setListe(prev => (decalage === 0 ? data : [...prev, ...data]))
  }, [])
  useEffect(() => {
    const t = setTimeout(() => chargerPage(q.trim(), 0), 300)
    return () => clearTimeout(t)
  }, [q, chargerPage])

  function exporter() {
    const colonnes = ['nom', 'email', 'inscrit_le', 'derniere_connexion', 'prenom', 'nom_famille', 'date_naissance', 'pays', 'telephone', 'nb_publications', 'nb_signalements']
    const lignes = [colonnes.join(',')].concat(liste.map(u => colonnes.map(c => csv(u[c])).join(',')))
    const lien = document.createElement('a')
    lien.href = URL.createObjectURL(new Blob(['\ufeff' + lignes.join('\n')], { type: 'text/csv;charset=utf-8' }))
    lien.download = 'membres-cercle.csv'
    lien.click()
  }

  return (
    <>
      <div className="box">
        <h2>👥 Membres ({liste.length}{fin ? '' : '+'})</h2>
        <p className="muted">Informations confidentielles : ne les partage pas. Elles servent uniquement à la sécurité et à la modération.</p>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher par nom, e-mail ou téléphone" aria-label="Rechercher un membre" />
        <div className="actions"><button className="alt sm" onClick={exporter} disabled={!liste.length}>⬇ Télécharger la liste (CSV)</button></div>
        {erreur && <p className="msg err" role="status">{erreur}</p>}
      </div>
      {liste.map(u => (
        <div className="box" key={u.id}>
          <div className="entete">
            <Avatar nom={u.nom} id={u.id} taille={44} />
            <div>
              <b>{u.nom}</b>{u.verifie && ' ✓'}
              <div className="muted">Inscrit le {jour(u.inscrit_le)} · dernière connexion {jour(u.derniere_connexion)}</div>
            </div>
          </div>
          <div>✉️ {u.email || '—'}</div>
          <div>📞 {u.telephone || '—'}</div>
          <div>🌍 {u.pays || '—'}</div>
          <div>🎂 {u.date_naissance ? jour(u.date_naissance) + ' (' + ageDe(u.date_naissance) + ' ans)' : '—'}{(u.prenom || u.nom_famille) && <span className="muted"> · {u.prenom} {u.nom_famille}</span>}</div>
          <div className="muted">📝 {u.nb_publications} publication{u.nb_publications > 1 ? 's' : ''} · ⚠️ {u.nb_signalements} signalement{u.nb_signalements > 1 ? 's' : ''} reçu{u.nb_signalements > 1 ? 's' : ''}</div>
        </div>
      ))}
      {charge && <p className="muted">Chargement…</p>}
      {!charge && !liste.length && !erreur && <p className="muted">Aucun membre trouvé.</p>}
      {!charge && !fin && <button className="alt" onClick={() => chargerPage(q.trim(), liste.length)}>Charger plus</button>}
    </>
  )
}
