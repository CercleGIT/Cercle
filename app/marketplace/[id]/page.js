'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import Verifie from '@/components/Verifie'
import { supabase } from '@/lib/supabase'
import { formatPrix, nomCategorie } from '@/lib/marche'

function Annonce({ user }) {
  const { id } = useParams()
  const router = useRouter()
  const [a, setA] = useState(undefined)
  const [favori, setFavori] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [i, setI] = useState(0)
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.from('annonces').select('*, vendeur_profil:profiles!vendeur(nom, avatar_url, verifie)').eq('id', id).maybeSingle()
    setA(data)
    const { data: f } = await supabase.from('favoris').select('annonce_id').match({ user_id: user.id, annonce_id: id }).maybeSingle()
    setFavori(!!f)
  }, [id, user.id])
  useEffect(() => {
    charger()
    supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle().then(({ data }) => setAdmin(!!data))
  }, [charger, user.id])

  if (a === undefined) return <p className="muted">Chargement…</p>
  if (!a) return <p className="muted">Annonce introuvable. <Link href="/marketplace">Retour au marché</Link></p>

  const mienne = a.vendeur === user.id
  const images = Array.isArray(a.images) ? a.images : []
  const basculerFavori = async () => {
    const q = supabase.from('favoris')
    await (favori ? q.delete().match({ user_id: user.id, annonce_id: a.id }) : q.insert({ user_id: user.id, annonce_id: a.id }))
    charger()
  }
  const statut = async s => { await supabase.from('annonces').update({ statut: s }).eq('id', a.id); charger() }
  const supprimer = async () => {
    if (!window.confirm('Supprimer définitivement cette annonce ?')) return
    if (a.video_url && mienne) {
      const c = a.video_url.split('/annonces-media/')[1]
      if (c) await supabase.storage.from('annonces-media').remove([decodeURIComponent(c)])
    }
    await supabase.from('annonces').delete().eq('id', a.id)
    router.push('/marketplace')
  }
  const signaler = async () => {
    const motif = window.prompt('Pourquoi signales-tu cette annonce ? (arnaque, objet interdit, contenu choquant, autre)', '')
    if (motif === null) return
    const { error } = await supabase.from('annonce_reports').insert({ annonce_id: a.id, auteur: user.id, motif: motif.trim() || 'non précisé' })
    setInfo(!error ? 'Merci, l’annonce a été signalée.' : error.code === '23505' ? 'Tu as déjà signalé cette annonce.' : 'Signalement impossible.')
  }

  return (
    <>
      <Link href="/marketplace" className="muted">← Retour au marché</Link>
      <div className="box" style={{ marginTop: 8 }}>
        {images.length > 0 && (
          <div className="galerie">
            <img className="grande" src={images[i] || images[0]} alt={a.titre} />
            {images.length > 1 && <div className="minis">{images.map((im, k) => <button key={k} className={k === i ? 'actif' : ''} onClick={() => setI(k)} aria-label={'Photo ' + (k + 1)}><img src={im} alt="" /></button>)}</div>}
          </div>
        )}
        {a.video_url && <video src={a.video_url} controls playsInline preload="metadata" className="video-annonce" />}
        {a.statut === 'vendue' && <p className="msg err"><b>Cette annonce est marquée comme vendue.</b></p>}
        <h2 style={{ marginTop: 12 }}>{a.titre}</h2>
        <div className="prix-grand">{formatPrix(a.prix, a.devise)}</div>
        <div className="muted">{[nomCategorie(a.categorie), a.etat === 'neuf' ? 'Neuf' : a.etat === 'occasion' ? 'Occasion' : null, [a.ville, a.pays].filter(Boolean).join(', '), new Date(a.created_at).toLocaleDateString('fr-FR')].filter(Boolean).join(' · ')}</div>
        {a.description && <p className="texte">{a.description}</p>}
        <div className="resultat">
          <Avatar nom={a.vendeur_profil?.nom} url={a.vendeur_profil?.avatar_url} taille={40} id={a.vendeur} />
          <div><Link className="lienmembre" href={'/membre/' + a.vendeur}><b>{a.vendeur_profil?.nom || 'Vendeur'}</b></Link>{a.vendeur_profil?.verifie && <Verifie />}<div className="muted">Vendeur</div></div>
        </div>
        <div className="actions">
          {!mienne && a.statut === 'active' && <Link className="btnlink" href={'/messages?ami=' + a.vendeur + '&sujet=' + encodeURIComponent(a.titre)}>💬 Contacter le vendeur</Link>}
          {!mienne && <button className="alt sm" onClick={basculerFavori}>{favori ? '♥ Retirer des favoris' : '♡ Favori'}</button>}
          {!mienne && <button className="alt sm" onClick={signaler}>Signaler</button>}
          {mienne && <button className="sm" onClick={() => statut(a.statut === 'active' ? 'vendue' : 'active')}>{a.statut === 'active' ? 'Marquer comme vendue' : 'Remettre en vente'}</button>}
          {(mienne || admin) && <button className="alt sm" onClick={supprimer}>{mienne ? 'Supprimer' : 'Supprimer (admin)'}</button>}
        </div>
        {info && <p className="msg ok" role="status">{info}</p>}
      </div>
      <p className="conseil">🔒 Conseil de sécurité : rencontre le vendeur dans un lieu public, vérifie l’objet avant de payer et ne paie jamais à l’avance à quelqu’un que tu ne connais pas. Cercle n’intervient pas dans les paiements.</p>
    </>
  )
}

export default function Page() { return <Shell>{user => <Annonce user={user} />}</Shell> }
