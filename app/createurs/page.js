'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import Verifie from '@/components/Verifie'
import { supabase } from '@/lib/supabase'
import { PAYS } from '@/lib/marche'
import { CATEGORIES_CREATEURS, nomCategorieCreateur } from '@/lib/createurs'

function Annuaire({ user }) {
  const [liste, setListe] = useState(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [pays, setPays] = useState('')
  const [aProfil, setAProfil] = useState(null)

  useEffect(() => {
    supabase.from('createurs').select('user_id').eq('user_id', user.id).maybeSingle().then(({ data }) => setAProfil(!!data))
  }, [user.id])

  useEffect(() => {
    const t = setTimeout(async () => {
      let req = supabase.from('createurs')
        .select('user_id, activite, categorie, ville, pays, profiles(nom, avatar_url, verifie)').eq('actif', true).limit(60)
      if (cat) req = req.eq('categorie', cat)
      if (pays) req = req.eq('pays', pays)
      const mot = q.trim().replace(/[%_,()]/g, ' ')
      if (mot.length >= 2) req = req.or(`activite.ilike.%${mot}%,description.ilike.%${mot}%`)
      const { data } = await req.order('created_at', { ascending: false })
      setListe(data || [])
    }, 250)
    return () => clearTimeout(t)
  }, [q, cat, pays])

  return (
    <>
      <div className="box">
        <div className="entete" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>🎨 Créateurs</h2>
          <Link className="btnlink" href="/createurs/modifier">{aProfil ? 'Mon profil créateur' : '+ Devenir créateur'}</Link>
        </div>
        <p className="muted">Découvre des talents, des projets et des services, et contacte-les directement.</p>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un talent ou un service" aria-label="Rechercher" />
        <div className="filtres">
          <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Catégorie">
            <option value="">Toutes les catégories</option>
            {CATEGORIES_CREATEURS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
          <select value={pays} onChange={e => setPays(e.target.value)} aria-label="Pays">
            <option value="">Tous les pays</option>
            {PAYS.map(([nom]) => <option key={nom} value={nom}>{nom}</option>)}
          </select>
        </div>
      </div>
      {liste === null && <p className="muted">Chargement…</p>}
      {liste && !liste.length && <p className="muted">Aucun créateur pour le moment. Sois le premier !</p>}
      {(liste || []).map(c => (
        <Link key={c.user_id} href={'/createurs/' + c.user_id} className="box carte-createur">
          <Avatar nom={c.profiles?.nom} url={c.profiles?.avatar_url} taille={52} />
          <div>
            <b>{c.profiles?.nom || 'Membre'}</b>{c.profiles?.verifie && <Verifie />}
            <div>{c.activite}</div>
            <div className="muted">{[nomCategorieCreateur(c.categorie), c.ville, c.pays].filter(Boolean).join(' · ')}</div>
          </div>
        </Link>
      ))}
    </>
  )
}

export default function Page() { return <Shell>{user => <Annuaire user={user} />}</Shell> }
