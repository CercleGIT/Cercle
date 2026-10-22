'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { CATEGORIES, PAYS, formatPrix, nomCategorie } from '@/lib/marche'

function Marche({ user }) {
  const [annonces, setAnnonces] = useState(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [tri, setTri] = useState('recent')
  const [pays, setPays] = useState('')
  const [onglet, setOnglet] = useState('toutes')

  useEffect(() => {
    const t = setTimeout(async () => {
      let req = supabase.from('annonces')
        .select('id, titre, prix, devise, ville, pays, categorie, statut, created_at, vignette, video_url').limit(60)
      if (onglet === 'mes') req = req.eq('vendeur', user.id)
      else if (onglet === 'favoris') {
        const { data: f } = await supabase.from('favoris').select('annonce_id').eq('user_id', user.id)
        const ids = (f || []).map(x => x.annonce_id)
        if (!ids.length) return setAnnonces([])
        req = req.in('id', ids)
      } else req = req.eq('statut', 'active')
      if (cat) req = req.eq('categorie', cat)
      if (pays) req = req.eq('pays', pays)
      const mot = q.trim().replace(/[%_,()]/g, ' ')
      if (mot.length >= 2) req = req.ilike('titre', `%${mot}%`)
      if (tri === 'prix_asc') req = req.order('prix', { ascending: true, nullsFirst: false })
      else if (tri === 'prix_desc') req = req.order('prix', { ascending: false, nullsFirst: false })
      else req = req.order('created_at', { ascending: false })
      const { data } = await req
      setAnnonces(data || [])
    }, 250)
    return () => clearTimeout(t)
  }, [q, cat, pays, tri, onglet, user.id])

  return (
    <>
      <div className="box">
        <div className="entete" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>🛍️ Marché</h2>
          <Link className="btnlink" href="/marketplace/nouvelle">+ Publier une annonce</Link>
        </div>
        <div className="onglets" style={{ margin: '10px 0' }}>
          {[['toutes', 'Toutes'], ['mes', 'Mes annonces'], ['favoris', 'Favoris']].map(([k, n]) => (
            <button key={k} className={onglet === k ? '' : 'alt'} onClick={() => setOnglet(k)}>{n}</button>
          ))}
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une annonce" aria-label="Rechercher une annonce" />
        <div className="filtres">
          <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Catégorie">
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
          <select value={pays} onChange={e => setPays(e.target.value)} aria-label="Pays">
            <option value="">Tous les pays</option>
            {PAYS.map(([nom]) => <option key={nom} value={nom}>{nom}</option>)}
          </select>
          <select value={tri} onChange={e => setTri(e.target.value)} aria-label="Tri">
            <option value="recent">Plus récentes</option>
            <option value="prix_asc">Prix croissant</option>
            <option value="prix_desc">Prix décroissant</option>
          </select>
        </div>
      </div>
      {annonces === null && <p className="muted">Chargement…</p>}
      {annonces && !annonces.length && <p className="muted">Aucune annonce pour le moment.</p>}
      <div className="grille">
        {(annonces || []).map(a => (
          <Link key={a.id} href={'/marketplace/' + a.id} className="carte">
            {a.vignette ? <img src={a.vignette} alt="" /> : <div className="sans-photo">🛍️</div>}
            {a.statut === 'vendue' && <span className="badge-vendue">Vendue</span>}
            {a.video_url && <span className="badge-video">🎥</span>}
            <div className="infos">
              <div className="prix">{formatPrix(a.prix, a.devise)}</div>
              <div>{a.titre}</div>
              <div className="muted">{[nomCategorie(a.categorie), a.ville, a.pays].filter(Boolean).join(' · ')}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}

export default function Page() { return <Shell>{user => <Marche user={user} />}</Shell> }
