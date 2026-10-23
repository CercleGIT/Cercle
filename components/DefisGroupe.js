'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'
import { jourUTC } from '@/lib/defis'

const SEL = 'id, texte, image_url, video_url, created_at, auteur, profiles!auteur(nom, avatar_url), votes_groupe(user_id)'
const dans = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

function Participations({ user, defi, admin, termine }) {
  const [liste, setListe] = useState(null)
  const [texte, setTexte] = useState('')
  const [photo, setPhoto] = useState(null)
  const [video, setVideo] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.from('participations_groupe').select(SEL).eq('defi_id', defi.id)
    setListe((data || []).sort((a, b) => b.votes_groupe.length - a.votes_groupe.length || a.created_at.localeCompare(b.created_at)))
  }, [defi.id])
  useEffect(() => { charger() }, [charger])

  const deja = (liste || []).some(p => p.auteur === user.id)

  function choisirVideo(e) {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 30 * 1024 * 1024) return setInfo('La vidéo dépasse 30 Mo.')
    setInfo(''); setVideo(f)
  }
  async function participer(e) {
    e.preventDefault()
    if (!texte.trim() && !photo && !video) return setInfo('Ajoute un texte, une photo ou une vidéo.')
    setEnvoi(true); setInfo('')
    let videoUrl = null
    if (video) {
      const ext = (video.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '')
      const chemin = user.id + '/g' + Date.now() + '.' + ext
      const { error: ev } = await supabase.storage.from('defis-media').upload(chemin, video, { contentType: video.type || 'video/mp4' })
      if (ev) { setEnvoi(false); return setInfo('Envoi de la vidéo impossible : ' + ev.message) }
      videoUrl = supabase.storage.from('defis-media').getPublicUrl(chemin).data.publicUrl
    }
    const { error } = await supabase.from('participations_groupe').insert({ defi_id: defi.id, auteur: user.id, texte: texte.trim(), image_url: photo, video_url: videoUrl })
    setEnvoi(false)
    if (error) return setInfo(error.code === '23505' ? 'Tu as déjà participé à ce défi.' : 'Participation impossible.')
    setTexte(''); setPhoto(null); setVideo(null); charger()
  }
  async function voter(p) {
    const aVote = p.votes_groupe.some(v => v.user_id === user.id)
    const q = supabase.from('votes_groupe')
    await (aVote ? q.delete().match({ participation_id: p.id, user_id: user.id }) : q.insert({ participation_id: p.id, user_id: user.id }))
    charger()
  }
  async function supprimer(p) {
    if (!window.confirm('Supprimer cette participation ?')) return
    await supabase.from('participations_groupe').delete().eq('id', p.id)
    charger()
  }

  return (
    <div style={{ marginTop: 10 }}>
      {!termine && !deja && liste !== null && (
        <form onSubmit={participer}>
          <textarea rows={3} value={texte} onChange={e => setTexte(e.target.value)} maxLength={500} placeholder="Ta participation" aria-label="Texte" />
          {photo && <img className="photo" src={photo} alt="Aperçu" />}
          {video && <p className="muted">🎥 {video.name}</p>}
          <div className="actions">
            <label className="alt sm bouton">📷 Photo<input type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files[0]; if (f) setPhoto(await redimensionner(f, 700, 0.65)) }} /></label>
            <label className="alt sm bouton">🎥 Vidéo<input type="file" accept="video/*" hidden onChange={choisirVideo} /></label>
            <button disabled={envoi}>{envoi ? 'Envoi…' : 'Participer'}</button>
          </div>
          {info && <p className="msg err" role="status">{info}</p>}
        </form>
      )}
      {liste === null && <p className="muted">Chargement…</p>}
      {liste && !liste.length && <p className="muted">Aucune participation pour le moment.</p>}
      {(liste || []).map((p, i) => {
        const aVote = p.votes_groupe.some(v => v.user_id === user.id)
        return (
          <div className="partage" key={p.id} style={{ marginTop: 10 }}>
            <div className="entete">
              <Avatar nom={p.profiles?.nom} url={p.profiles?.avatar_url} taille={34} />
              <div>
                <Link className="lienmembre" href={'/membre/' + p.auteur}><b>{p.profiles?.nom || 'Membre'}</b></Link>
                {termine && i === 0 && <span> 👑 Gagnant</span>}
              </div>
            </div>
            {p.texte && <p className="texte">{p.texte}</p>}
            {p.image_url && <img className="photo" src={p.image_url} alt="Participation" />}
            {p.video_url && <video className="video-defi" src={p.video_url} controls playsInline preload="metadata" />}
            <div className="actions">
              {p.auteur !== user.id && <button className={aVote ? 'sm' : 'alt sm'} onClick={() => voter(p)}>{aVote ? '❤️' : '🤍'} Voter</button>}
              <span className="muted">{p.votes_groupe.length} vote{p.votes_groupe.length > 1 ? 's' : ''}</span>
              {(p.auteur === user.id || admin) && <button className="alt sm droite" onClick={() => supprimer(p)}>Supprimer</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function DefisGroupe({ user, gid, admin }) {
  const [defis, setDefis] = useState(null)
  const [ouvert, setOuvert] = useState(null)
  const [f, setF] = useState({ titre: '', description: '', fin: dans(7) })
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.from('defis_groupe').select('id, titre, description, fin').eq('group_id', gid).order('fin', { ascending: false })
    setDefis(data || [])
    setOuvert(o => o || (data && data[0] && data[0].fin >= jourUTC() ? data[0].id : null))
  }, [gid])
  useEffect(() => { charger() }, [charger])

  async function lancer(e) {
    e.preventDefault()
    if (f.titre.trim().length < 3) return setInfo('Donne un titre au défi (3 caractères minimum).')
    if (f.fin < jourUTC()) return setInfo('La date de fin doit être aujourd’hui ou plus tard.')
    const { error } = await supabase.from('defis_groupe').insert({ group_id: gid, createur: user.id, titre: f.titre.trim(), description: f.description.trim(), fin: f.fin })
    if (error) return setInfo('Création impossible.')
    setF({ titre: '', description: '', fin: dans(7) }); setInfo('Défi lancé : les membres sont prévenus.'); charger()
  }
  async function supprimer(id) {
    if (!window.confirm('Supprimer ce défi et ses participations ?')) return
    await supabase.from('defis_groupe').delete().eq('id', id)
    setOuvert(null); charger()
  }
  async function inviter() {
    const url = window.location.href
    const message = 'Rejoins-nous sur Cercle pour relever des défis !'
    if (navigator.share) { try { await navigator.share({ title: 'Cercle', text: message, url }) } catch {} }
    else { try { await navigator.clipboard.writeText(message + ' ' + url); setInfo('Lien copié.') } catch { setInfo(url) } }
  }

  return (
    <>
      {admin && (
        <form className="box" onSubmit={lancer}>
          <h2>🔥 Lancer un défi</h2>
          <input value={f.titre} onChange={e => setF({ ...f, titre: e.target.value })} maxLength={100} placeholder="Ex. : Ta meilleure recette de la semaine" aria-label="Titre du défi" />
          <input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} maxLength={500} placeholder="Explique les règles (facultatif)" aria-label="Description" />
          <label htmlFor="fin">Date de fin</label>
          <input id="fin" type="date" min={jourUTC()} value={f.fin} onChange={e => setF({ ...f, fin: e.target.value })} />
          <button>Lancer le défi</button>
        </form>
      )}
      <div className="actions" style={{ marginBottom: 10 }}>
        <button className="alt sm" onClick={inviter}>↗ Inviter des amis dans le groupe</button>
        {info && <span className="muted">{info}</span>}
      </div>
      {defis === null && <p className="muted">Chargement…</p>}
      {defis && !defis.length && <p className="muted">Aucun défi pour le moment.{admin ? ' Lance le premier !' : ' Les administrateurs du groupe peuvent en lancer.'}</p>}
      {(defis || []).map(d => {
        const termine = d.fin < jourUTC()
        return (
          <div className="box" key={d.id}>
            <div className="entete" style={{ justifyContent: 'space-between' }}>
              <div><b>{d.titre}</b><div className="muted">{termine ? 'Terminé le ' : 'Se termine le '}{new Date(d.fin + 'T00:00:00Z').toLocaleDateString('fr-FR', { dateStyle: 'long', timeZone: 'UTC' })}</div></div>
              <button className="alt sm" onClick={() => setOuvert(ouvert === d.id ? null : d.id)}>{ouvert === d.id ? 'Réduire' : 'Ouvrir'}</button>
            </div>
            {d.description && <p className="texte">{d.description}</p>}
            {ouvert === d.id && <Participations user={user} defi={d} admin={admin} termine={termine} />}
            {admin && <button className="link" onClick={() => supprimer(d.id)}>Supprimer ce défi</button>}
          </div>
        )
      })}
    </>
  )
}
