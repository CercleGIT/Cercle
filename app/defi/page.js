'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'
import { defiDuJour, jourPrecedent, jourUTC, tempsRestant } from '@/lib/defis'

const SELECTION = 'id, jour, texte, image_url, video_url, created_at, auteur, profiles!auteur(nom, avatar_url), participation_votes(user_id)'

function serie(jours, aujourdhui) {
  const s = new Set(jours)
  let j = s.has(aujourdhui) ? aujourdhui : jourPrecedent(aujourdhui)
  let n = 0
  while (s.has(j)) { n++; j = jourPrecedent(j) }
  return n
}

function Defi({ user }) {
  const aujourdhui = jourUTC()
  const defi = defiDuJour(aujourdhui)
  const [onglet, setOnglet] = useState('aujourdhui')
  const [liste, setListe] = useState(null)
  const [mesJours, setMesJours] = useState([])
  const [texte, setTexte] = useState('')
  const [photo, setPhoto] = useState(null)
  const [video, setVideo] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [info, setInfo] = useState('')
  const [reste, setReste] = useState(tempsRestant())
  const [admin, setAdmin] = useState(false)

  const jourAffiche = onglet === 'hier' ? jourPrecedent(aujourdhui) : aujourdhui
  const charger = useCallback(async () => {
    const { data } = await supabase.from('participations').select(SELECTION).eq('jour', jourAffiche).limit(100)
    const tri = (data || []).sort((a, b) => b.participation_votes.length - a.participation_votes.length || a.created_at.localeCompare(b.created_at))
    setListe(tri)
    const { data: m } = await supabase.from('participations').select('jour').eq('auteur', user.id).order('jour', { ascending: false }).limit(90)
    setMesJours((m || []).map(x => x.jour))
  }, [jourAffiche, user.id])
  useEffect(() => { charger() }, [charger])
  useEffect(() => {
    supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle().then(({ data }) => setAdmin(!!data))
    const t = setInterval(() => setReste(tempsRestant()), 30000)
    return () => clearInterval(t)
  }, [user.id])

  const dejaParticipe = mesJours.includes(aujourdhui)
  const maSerie = serie(mesJours, aujourdhui)

  function choisirVideo(e) {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 30 * 1024 * 1024) return setInfo('La vidéo dépasse 30 Mo. Choisis une vidéo plus courte.')
    setInfo(''); setVideo(f)
  }
  async function participer(e) {
    e.preventDefault()
    if (!texte.trim() && !photo && !video) return setInfo('Ajoute un texte, une photo ou une vidéo.')
    setEnvoi(true); setInfo('')
    let videoUrl = null
    if (video) {
      const ext = (video.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '')
      const chemin = user.id + '/' + Date.now() + '.' + ext
      const { error: ev } = await supabase.storage.from('defis-media').upload(chemin, video, { contentType: video.type || 'video/mp4' })
      if (ev) { setEnvoi(false); return setInfo('Envoi de la vidéo impossible : ' + ev.message) }
      videoUrl = supabase.storage.from('defis-media').getPublicUrl(chemin).data.publicUrl
    }
    const { error } = await supabase.from('participations').insert({ jour: aujourdhui, auteur: user.id, texte: texte.trim(), image_url: photo, video_url: videoUrl })
    setEnvoi(false)
    if (error) return setInfo(error.code === '23505' ? 'Tu as déjà participé aujourd’hui. Reviens demain !' : 'Participation impossible.')
    setTexte(''); setPhoto(null); setVideo(null); setInfo('Bravo, ta participation est publiée !')
    charger()
  }
  async function voter(p) {
    const aVote = p.participation_votes.some(v => v.user_id === user.id)
    const q = supabase.from('participation_votes')
    await (aVote ? q.delete().match({ participation_id: p.id, user_id: user.id }) : q.insert({ participation_id: p.id, user_id: user.id }))
    charger()
  }
  async function supprimer(p) {
    if (!window.confirm('Supprimer cette participation ?')) return
    await supabase.from('participations').delete().eq('id', p.id)
    charger()
  }
  async function inviter() {
    const url = window.location.origin + '/defi'
    const message = 'Relève le défi du jour sur Cercle : ' + defi.emoji + ' ' + defi.titre + ' !'
    if (navigator.share) { try { await navigator.share({ title: 'Défi Cercle', text: message, url }) } catch {} }
    else { try { await navigator.clipboard.writeText(message + ' ' + url); setInfo('Lien copié : colle-le dans une conversation.') } catch { setInfo(url) } }
  }

  return (
    <>
      <div className="box defi-tete">
        <div className="gros">{defi.emoji}</div>
        <h2 style={{ margin: '4px 0' }}>Défi du jour : {defi.titre}</h2>
        <p className="muted">{defi.description}</p>
        <p className="compte">Il reste {reste} · {maSerie > 0 ? '🔥 Série : ' + maSerie + ' jour' + (maSerie > 1 ? 's' : '') : 'Commence ta série !'}</p>
        <button className="alt sm" onClick={inviter}>↗ Inviter mes amis au défi</button>
      </div>

      {onglet === 'aujourdhui' && !dejaParticipe && (
        <form className="box" onSubmit={participer}>
          <h2>Je participe</h2>
          <textarea rows={3} value={texte} onChange={e => setTexte(e.target.value)} maxLength={500} placeholder="Raconte ou présente ta participation" aria-label="Texte" />
          {photo && <img className="photo" src={photo} alt="Aperçu" />}
          {video && <p className="muted">🎥 {video.name}</p>}
          <div className="actions">
            <label className="alt sm bouton">📷 Photo<input type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files[0]; if (f) setPhoto(await redimensionner(f, 700, 0.65)) }} /></label>
            <label className="alt sm bouton">🎥 Vidéo (30 Mo max)<input type="file" accept="video/*" hidden onChange={choisirVideo} /></label>
            <button disabled={envoi}>{envoi ? 'Envoi…' : 'Publier'}</button>
          </div>
          {info && <p className="msg err" role="status">{info}</p>}
        </form>
      )}
      {dejaParticipe && onglet === 'aujourdhui' && <p className="msg ok" role="status">{info || '✅ Tu as participé aujourd’hui. Reviens demain pour continuer ta série !'}</p>}

      <div className="onglets" style={{ margin: '12px 0' }}>
        <button className={onglet === 'aujourdhui' ? '' : 'alt'} onClick={() => setOnglet('aujourdhui')}>Aujourd’hui</button>
        <button className={onglet === 'hier' ? '' : 'alt'} onClick={() => setOnglet('hier')}>Hier (gagnant)</button>
      </div>

      {liste === null && <p className="muted">Chargement…</p>}
      {liste && !liste.length && <p className="muted">{onglet === 'aujourdhui' ? 'Personne n’a encore participé. Sois le premier !' : 'Aucune participation hier.'}</p>}
      {(liste || []).map((p, i) => {
        const aVote = p.participation_votes.some(v => v.user_id === user.id)
        return (
          <article className="box" key={p.id}>
            <div className="entete">
              <Avatar nom={p.profiles?.nom} url={p.profiles?.avatar_url} />
              <div>
                <Link className="lienmembre" href={'/membre/' + p.auteur}><b>{p.profiles?.nom || 'Membre'}</b></Link>
                {onglet === 'hier' && i === 0 && <span> 👑 Gagnant</span>}
                <div className="muted">{new Date(p.created_at).toLocaleString('fr-FR')}</div>
              </div>
            </div>
            {p.texte && <p className="texte">{p.texte}</p>}
            {p.image_url && <img className="photo" src={p.image_url} alt="Participation" />}
            {p.video_url && <video className="video-defi" src={p.video_url} controls playsInline preload="metadata" />}
            <div className="actions">
              {p.auteur !== user.id && <button className={aVote ? 'sm' : 'alt sm'} onClick={() => voter(p)}>{aVote ? '❤️' : '🤍'} Voter</button>}
              <span className="muted">{p.participation_votes.length} vote{p.participation_votes.length > 1 ? 's' : ''}</span>
              {(p.auteur === user.id || admin) && <button className="alt sm droite" onClick={() => supprimer(p)}>{p.auteur === user.id ? 'Supprimer' : 'Supprimer (admin)'}</button>}
            </div>
          </article>
        )
      })}
    </>
  )
}

export default function Page() { return <Shell>{user => <Defi user={user} />}</Shell> }
