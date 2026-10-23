'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import Verifie from '@/components/Verifie'
import { supabase } from '@/lib/supabase'
import { formatPrix } from '@/lib/marche'
import { nomCategorieCreateur } from '@/lib/createurs'

function Createur({ user }) {
  const { id } = useParams()
  const [c, setC] = useState(undefined)
  const [oeuvres, setOeuvres] = useState([])

  useEffect(() => {
    supabase.from('createurs').select('*, profiles(nom, avatar_url, verifie)').eq('user_id', id).maybeSingle().then(({ data }) => setC(data))
    supabase.from('realisations').select('id, titre, description, image_url').eq('auteur', id).order('created_at', { ascending: false })
      .then(({ data }) => setOeuvres(data || []))
  }, [id])

  if (c === undefined) return <p className="muted">Chargement…</p>
  if (!c) return <p className="muted">Profil créateur introuvable. <Link href="/createurs">Retour aux créateurs</Link></p>
  const moi = id === user.id
  const services = Array.isArray(c.services) ? c.services : []
  const bonjour = 'Bonjour, j’ai vu ton profil créateur sur Cercle et je suis intéressé(e) par ton travail.'

  return (
    <>
      <Link href="/createurs" className="muted">← Tous les créateurs</Link>
      <div className="box" style={{ marginTop: 8 }}>
        <div className="profil-tete">
          <Avatar nom={c.profiles?.nom} url={c.profiles?.avatar_url} taille={80} />
          <div>
            <h2 style={{ margin: 0 }}>{c.profiles?.nom} {c.profiles?.verifie && <Verifie />}</h2>
            <div><b>{c.activite}</b></div>
            <div className="muted">{[nomCategorieCreateur(c.categorie), c.ville, c.pays].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
        {c.description && <p className="texte">{c.description}</p>}
        {c.contact_public && <p><b>Contact :</b> {c.contact_public}</p>}
        <div className="actions">
          {!moi && <Link className="btnlink" href={'/messages?ami=' + id + '&bonjour=' + encodeURIComponent(bonjour)}>💬 Contacter</Link>}
          <Link className="alt sm bouton" href={'/membre/' + id}>Voir le profil</Link>
          {moi && <Link className="btnlink" href="/createurs/modifier">Modifier</Link>}
        </div>
      </div>

      {services.length > 0 && (
        <div className="box">
          <h2>Services</h2>
          {services.map((s, i) => (
            <div className="lien-ligne" key={i}><span>{s.titre}</span><b>{s.prix !== '' && s.prix !== null && s.prix !== undefined ? formatPrix(s.prix, s.devise) : 'Sur devis'}</b></div>
          ))}
        </div>
      )}

      <h2>Réalisations ({oeuvres.length})</h2>
      {!oeuvres.length && <p className="muted">Aucune réalisation pour le moment.</p>}
      <div className="grille">
        {oeuvres.map(o => (
          <div key={o.id} className="carte">
            {o.image_url ? <img src={o.image_url} alt={o.titre} /> : <div className="sans-photo">🎨</div>}
            <div className="infos"><b>{o.titre}</b>{o.description && <div className="muted">{o.description}</div>}</div>
          </div>
        ))}
      </div>
    </>
  )
}

export default function Page() { return <Shell>{user => <Createur user={user} />}</Shell> }
