'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'
import Avatar from '@/components/Avatar'
import Stories from '@/components/Stories'
import Texte from '@/components/Texte'
import Traduire from '@/components/Traduire'
import SuggestionsFil from '@/components/SuggestionsFil'
import Verifie from '@/components/Verifie'

const REACTIONS = [['coeur', '❤️'], ['rire', '😂'], ['wow', '😮'], ['triste', '😢'], ['pouce', '👍']]
const SELECTION = 'id, texte, image_url, video_url, created_at, auteur, partage_de, sondage, poll_votes(user_id, choix), profiles!auteur(nom, avatar_url, verifie), reactions(user_id, emoji), comments(id, texte, created_at, auteur, profiles(nom, avatar_url, verifie)), original:posts!partage_de(texte, image_url, video_url, auteur, profiles!auteur(nom, verifie))'

function Commentaire({ postId, user, apres }) {
  const [t, setT] = useState('')
  async function envoyer(e) {
    e.preventDefault()
    if (!t.trim()) return
    await supabase.from('comments').insert({ post_id: postId, auteur: user.id, texte: t.trim() })
    setT(''); apres()
  }
  return (
    <form className="saisie" onSubmit={envoyer}>
      <input value={t} onChange={e => setT(e.target.value)} placeholder="Écrire un commentaire" aria-label="Commentaire" />
      <button className="sm">Envoyer</button>
    </form>
  )
}

export default function Fil({ user, groupId = null, chaine = null }) {
  const [posts, setPosts] = useState([])
  const [texte, setTexte] = useState('')
  const [image, setImage] = useState(null)
  const [sondage, setSondage] = useState(null)
  const [video, setVideo] = useState(null)
  const [videoApercu, setVideoApercu] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [info, setInfo] = useState('')
  const [lives, setLives] = useState([])

  const charger = useCallback(async () => {
    let q = supabase.from('posts').select(SELECTION).order('created_at', { ascending: false }).limit(50)
    if (chaine) q = q.eq('chaine', chaine)
    else if (groupId) q = q.eq('group_id', groupId)
    else q = q.is('group_id', null).is('chaine', null)
    const { data, error } = await q
    if (error) setInfo('Impossible de charger les publications.')
    else setPosts(data)
  }, [groupId, chaine])
  useEffect(() => { charger() }, [charger])

  const chargerLives = useCallback(async () => {
    if (groupId || chaine) return
    const depuis = new Date(Date.now() - 4 * 3600 * 1000).toISOString()
    const { data } = await supabase
      .from('lives')
      .select('id, user_id, titre, room, debut')
      .eq('en_cours', true)
      .gte('debut', depuis)
      .neq('user_id', user.id)
      .order('debut', { ascending: false })
      .limit(10)
    if (!data || !data.length) return setLives([])
    const ids = [...new Set(data.map(l => l.user_id))]
    const { data: profs } = await supabase.from('profiles').select('id, nom').in('id', ids)
    const noms = {}
    ;(profs || []).forEach(x => { noms[x.id] = x.nom })
    setLives(data.map(l => ({ ...l, nom: noms[l.user_id] || 'Un membre' })))
  }, [groupId, chaine, user.id])
  useEffect(() => {
    chargerLives()
    const t = setInterval(chargerLives, 30000)
    return () => clearInterval(t)
  }, [chargerLives])

  function retirerVideo() {
    if (videoApercu) URL.revokeObjectURL(videoApercu)
    setVideo(null); setVideoApercu('')
  }
  async function choisir(e) {
    const f = e.target.files[0]
    e.target.value = ''
    if (f) { setImage(await redimensionner(f)); retirerVideo() }
  }
  function choisirVideo(e) {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 50 * 1024 * 1024) return setInfo('La vidéo dépasse 50 Mo. Choisis une vidéo plus courte (environ 1 minute).')
    setInfo(''); setImage(null)
    if (videoApercu) URL.revokeObjectURL(videoApercu)
    setVideo(f); setVideoApercu(URL.createObjectURL(f))
  }
  async function publier(e) {
    e.preventDefault()
    if (envoi) return
    const options = sondage ? sondage.map(o => o.trim()).filter(Boolean) : null
    if (options && options.length < 2) return setInfo('Un sondage a besoin d’au moins 2 choix.')
    if (!texte.trim() && !image && !options && !video) return
    setEnvoi(true); setInfo('')
    let videoUrl = null
    let chemin = null
    if (video) {
      const ext = (video.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '')
      chemin = user.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext
      const { error: ev } = await supabase.storage.from('videos-fil').upload(chemin, video, { contentType: video.type || 'video/mp4' })
      if (ev) { setEnvoi(false); return setInfo('Envoi de la vidéo impossible : ' + ev.message) }
      videoUrl = supabase.storage.from('videos-fil').getPublicUrl(chemin).data.publicUrl
    }
    const { error } = await supabase.from('posts').insert({ auteur: user.id, texte: texte.trim(), image_url: image, video_url: videoUrl, sondage: options, group_id: groupId })
    setEnvoi(false)
    if (error) {
      if (chemin) await supabase.storage.from('videos-fil').remove([chemin])
      return setInfo('Publication impossible.')
    }
    setTexte(''); setImage(null); setSondage(null); retirerVideo(); setInfo(''); charger()
  }
  async function reagir(p, cle) {
    const ma = p.reactions.find(r => r.user_id === user.id)
    if (ma && ma.emoji === cle) await supabase.from('reactions').delete().match({ post_id: p.id, user_id: user.id })
    else await supabase.from('reactions').upsert({ post_id: p.id, user_id: user.id, emoji: cle })
    charger()
  }
  async function voter(p, i) {
    const mien = p.poll_votes.find(v => v.user_id === user.id)
    if (mien && mien.choix === i) await supabase.from('poll_votes').delete().match({ post_id: p.id, user_id: user.id })
    else await supabase.from('poll_votes').upsert({ post_id: p.id, user_id: user.id, choix: i })
    charger()
  }
  async function partager(p) {
    const t = window.prompt('Ajoute un commentaire (facultatif) :', '')
    if (t === null) return
    const { error } = await supabase.from('posts').insert({ auteur: user.id, texte: t.trim(), partage_de: p.partage_de || p.id })
    setInfo(error ? 'Partage impossible.' : 'Publication partagée sur ton fil.')
    charger()
  }
  async function modifier(p) {
    const t = window.prompt('Modifier ta publication :', p.texte || '')
    if (t === null) return
    const { error } = await supabase.from('posts').update({ texte: t.trim() }).eq('id', p.id)
    setInfo(error ? 'Modification impossible.' : 'Publication modifiée.')
    charger()
  }
  async function supprimer(id) {
    const p = posts.find(x => x.id === id)
    if (p && p.video_url && p.auteur === user.id) {
      const c = p.video_url.split('/videos-fil/')[1]
      if (c) await supabase.storage.from('videos-fil').remove([decodeURIComponent(c)])
    }
    await supabase.from('posts').delete().eq('id', id)
    charger()
  }
  async function signaler(id) {
    const motif = window.prompt('Pourquoi signales-tu cette publication ? (spam, harcèlement, contenu inapproprié, autre)', '')
    if (motif === null) return
    const { error } = await supabase.from('reports').insert({ post_id: id, auteur: user.id, motif: motif.trim() || 'non précisé' })
    setInfo(!error ? 'Merci, la publication a été signalée.' : error.code === '23505' ? 'Tu as déjà signalé cette publication.' : 'Signalement impossible.')
  }
  async function bloquer(p) {
    if (!window.confirm('Bloquer ' + (p.profiles?.nom || 'ce membre') + ' ? Vous ne verrez plus vos publications et ne pourrez plus vous écrire.')) return
    const { error } = await supabase.from('blocks').insert({ blocker: user.id, blocked: p.auteur })
    setInfo(error ? 'Blocage impossible.' : 'Membre bloqué.')
    charger()
  }

  return (
    <>
      {!groupId && !chaine && <Stories user={user} />}
      {!groupId && !chaine && <SuggestionsFil user={user} />}
      {!groupId && !chaine && lives.length > 0 && (
        <div className="box">
          {lives.map((l, i) => (
            <p key={l.id} style={{ margin: i === 0 ? 0 : '10px 0 0' }}>
              🔴 <b>{l.nom}</b> est en direct : <Link href={'/live/' + l.room}>{l.titre || 'Regarder le live'}</Link>
            </p>
          ))}
        </div>
      )}
      <form className="box" onSubmit={publier} style={chaine ? { display: 'none' } : undefined}>
        <textarea rows={3} value={texte} onChange={e => setTexte(e.target.value)} placeholder="Quoi de neuf ?" aria-label="Nouvelle publication" />
        {image && <div className="apercu"><img className="photo" src={image} alt="Aperçu" /><button type="button" className="alt sm" onClick={() => setImage(null)}>Retirer la photo</button></div>}
        {video && (
          <div className="apercu">
            <video src={videoApercu} controls playsInline style={{ display: 'block', width: '100%', maxHeight: 320, borderRadius: 12, background: '#000' }} />
            <button type="button" className="alt sm" style={{ marginTop: 8 }} onClick={retirerVideo}>Retirer la vidéo</button>
          </div>
        )}
        {sondage && (
          <div className="sondage">
            {sondage.map((o, i) => (
              <input key={i} value={o} maxLength={80} placeholder={'Choix ' + (i + 1)} aria-label={'Choix ' + (i + 1)} onChange={e => setSondage(sondage.map((x, k) => (k === i ? e.target.value : x)))} />
            ))}
            {sondage.length < 4 && <button type="button" className="alt sm" onClick={() => setSondage([...sondage, ''])}>+ Ajouter un choix</button>}
          </div>
        )}
        <div className="actions">
          <label className="alt sm bouton">📷 Photo<input type="file" accept="image/*" hidden onChange={choisir} /></label>
          <label className="alt sm bouton">🎥 Vidéo<input type="file" accept="video/*" hidden onChange={choisirVideo} /></label>
          <button type="button" className="alt sm" onClick={() => setSondage(sondage ? null : ['', ''])}>📊 Sondage</button>
          <button disabled={envoi}>{envoi ? (video ? 'Envoi de la vidéo…' : 'Publication…') : 'Publier'}</button>
        </div>
      </form>
      {info && <p className="msg err" role="status">{info}</p>}
      {!posts.length && <p className="muted">Aucune publication pour le moment.</p>}
      {posts.map(p => {
        const ma = p.reactions.find(r => r.user_id === user.id)
        const coms = [...p.comments].sort((a, b) => a.created_at.localeCompare(b.created_at))
        return (
          <article className="box" key={p.id}>
            <div className="entete">
              <Avatar nom={p.profiles?.nom} url={p.profiles?.avatar_url} id={p.auteur} />
              <div><Link className="lienmembre" href={'/membre/' + p.auteur}><b>{p.profiles?.nom || 'Membre'}</b></Link>{p.profiles?.verifie && <Verifie />}{p.partage_de && <span className="muted"> a partagé</span>}<div className="muted">{new Date(p.created_at).toLocaleString('fr-FR')}</div></div>
            </div>
            {p.texte && <p className="texte"><Texte t={p.texte} /></p>}
            {p.texte && <Traduire texte={p.texte} auto />}
            {p.image_url && <img className="photo" src={p.image_url} alt="Photo publiée" />}
            {p.video_url && <video src={p.video_url} controls playsInline preload="metadata" style={{ display: 'block', width: '100%', maxHeight: 460, borderRadius: 12, background: '#000', marginTop: 8 }} />}
            {p.partage_de && (
              <div className="partage">
                {p.original ? (<><Link className="lienmembre" href={'/membre/' + p.original.auteur}><b>{p.original.profiles?.nom || 'Membre'}</b></Link>{p.original.profiles?.verifie && <Verifie />}{p.original.texte && <p className="texte">{p.original.texte}</p>}{p.original.image_url && <img className="photo" src={p.original.image_url} alt="Photo partagée" />}{p.original.video_url && <video src={p.original.video_url} controls playsInline preload="metadata" style={{ display: 'block', width: '100%', maxHeight: 360, borderRadius: 12, background: '#000', marginTop: 8 }} />}</>)
                  : <span className="muted">Publication indisponible.</span>}
              </div>
            )}
            {p.sondage && (
              <div className="sondage">
                {p.sondage.map((o, i) => {
                  const n = p.poll_votes.filter(v => v.choix === i).length
                  const total = p.poll_votes.length || 1
                  const mien = p.poll_votes.some(v => v.user_id === user.id && v.choix === i)
                  return (
                    <button type="button" key={i} className={'choix' + (mien ? ' moi' : '')} onClick={() => voter(p, i)}>
                      <i className="barre" style={{ width: (100 * n / total) + '%' }} />
                      <span>{o}</span><span>{n}</span>
                    </button>
                  )
                })}
                <span className="muted">{p.poll_votes.length} vote{p.poll_votes.length > 1 ? 's' : ''}</span>
              </div>
            )}
            <div className="bilan">
              {REACTIONS.map(([k, e]) => { const n = p.reactions.filter(r => r.emoji === k).length; return n > 0 && <span key={k}>{e} {n}</span> })}
              <span>{coms.length} commentaire{coms.length > 1 ? 's' : ''}</span>
            </div>
            <div className="reactions" role="group" aria-label="Réagir">
              {REACTIONS.map(([k, e]) => <button key={k} className={ma?.emoji === k ? 'moi' : ''} onClick={() => reagir(p, k)} aria-label={'Réagir ' + k}>{e}</button>)}
            </div>
            <div className="actions">
              {!groupId && <button className="alt sm" onClick={() => partager(p)}>↗ Partager</button>}
              {p.auteur === user.id
                ? <><button className="alt sm droite" onClick={() => modifier(p)}>Modifier</button><button className="alt sm" onClick={() => supprimer(p.id)}>Supprimer</button></>
                : <><button className="alt sm droite" onClick={() => signaler(p.id)}>Signaler</button><button className="alt sm" onClick={() => bloquer(p)}>Bloquer</button></>}
            </div>
            {coms.map(c => (
              <div className="com" key={c.id}>
                <Avatar nom={c.profiles?.nom} url={c.profiles?.avatar_url} taille={30} id={c.auteur} />
                <div className="bulle"><Link className="lienmembre" href={'/membre/' + c.auteur}><b>{c.profiles?.nom || 'Membre'}</b></Link>{c.profiles?.verifie && <Verifie />} {c.texte}{c.texte && <Traduire texte={c.texte} auto />}</div>
              </div>
            ))}
            <Commentaire postId={p.id} user={user} apres={charger} />
          </article>
        )
      })}
    </>
  )
}
