'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import Icone from '@/components/Icones'
import Verifie from '@/components/Verifie'
import MessageVocal from '@/components/MessageVocal'
import { jouer } from '@/lib/sons'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'

const enLigne = d => d && Date.now() - new Date(d).getTime() < 150000
const appeler = (ami, video) => window.dispatchEvent(new CustomEvent('cercle-appel', { detail: { id: ami.id, nom: ami.nom, avatar: ami.avatar_url, video } }))
const memeJour = (a, b) => new Date(a).toDateString() === new Date(b).toDateString()
const heure = d => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
function etiquetteJour(d) {
  const j = new Date(d), auj = new Date(), hier = new Date(Date.now() - 86400000)
  if (j.toDateString() === auj.toDateString()) return 'Aujourd’hui'
  if (j.toDateString() === hier.toDateString()) return 'Hier'
  return j.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function heureListe(d) {
  const j = new Date(d)
  return j.toDateString() === new Date().toDateString() ? heure(d) : j.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function resume(m, moi) {
  const base = m.audio_path ? '🎤 Message vocal' : m.image_url ? '📷 Photo' : m.texte || ''
  return (m.expediteur === moi ? 'Toi : ' : '') + base
}

function Messages({ user }) {
  const [amis, setAmis] = useState([])
  const [apercus, setApercus] = useState({})
  const [nonLus, setNonLus] = useState({})
  const [actif, setActif] = useState(null)
  const [conv, setConv] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [fil, setFil] = useState([])
  const [texte, setTexte] = useState('')
  const [photo, setPhoto] = useState(null)
  const [vide, setVide] = useState(false)
  const corps = useRef(null)
  const dernierEntrant = useRef(null)
  const dejaVoulu = useRef(false)
  const [enregistre, setEnregistre] = useState(false)
  const [duree, setDuree] = useState(0)
  const [erreurVocal, setErreurVocal] = useState('')
  const enregistreur = useRef(null)
  const morceaux = useRef([])
  const annule = useRef(false)
  const debut = useRef(0)
  const dureeRef = useRef(0)
  const minuteur = useRef(null)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const sujet = q.get('sujet')
    if (sujet) setTexte('Bonjour, ton annonce « ' + sujet.slice(0, 120) + ' » est-elle toujours disponible ?')
    const bonjour = q.get('bonjour')
    if (bonjour) setTexte(bonjour.slice(0, 300))
  }, [])

  const chargerAmis = useCallback(async () => {
    const voulu = new URLSearchParams(window.location.search).get('ami')
    const { data: l } = await supabase.from('friendships').select('demandeur, destinataire').eq('statut', 'accepte')
    const { data: ms } = await supabase.from('messages').select('id, expediteur, destinataire, texte, image_url, audio_path, created_at')
      .order('created_at', { ascending: false }).limit(400)
    const ap = {}
    ;(ms || []).forEach(m => {
      const autre = m.expediteur === user.id ? m.destinataire : m.expediteur
      if (!ap[autre]) ap[autre] = m
    })
    setApercus(ap)
    const ids = [...new Set([
      ...(l || []).map(x => (x.demandeur === user.id ? x.destinataire : x.demandeur)),
      ...Object.keys(ap),
      ...(voulu && voulu !== user.id ? [voulu] : []),
    ])]
    if (!ids.length) return setVide(true)
    const { data: ps } = await supabase.from('profiles').select('id, nom, avatar_url, derniere_activite, verifie').in('id', ids)
    setAmis(ps || [])
    if (voulu && !dejaVoulu.current) {
      const cible = (ps || []).find(p => p.id === voulu)
      if (cible) { dejaVoulu.current = true; setActif(cible); setConv(true) }
    }
    const { data: nl } = await supabase.from('messages').select('expediteur').eq('destinataire', user.id).eq('lu', false)
    const c = {}
    ;(nl || []).forEach(m => { c[m.expediteur] = (c[m.expediteur] || 0) + 1 })
    setNonLus(c)
  }, [user.id])
  useEffect(() => {
    chargerAmis()
    const t = setInterval(chargerAmis, 15000)
    return () => clearInterval(t)
  }, [chargerAmis])

  const triees = [...amis]
    .filter(a => !recherche.trim() || a.nom.toLowerCase().includes(recherche.trim().toLowerCase()))
    .sort((a, b) => (apercus[b.id]?.created_at || '').localeCompare(apercus[a.id]?.created_at || '') || a.nom.localeCompare(b.nom))

  // Sur ordinateur, on ouvre automatiquement la conversation la plus récente
  useEffect(() => {
    if (!actif && triees.length && window.innerWidth > 760) setActif(triees[0])
  }, [amis, apercus]) // eslint-disable-line

  const charger = useCallback(async () => {
    if (!actif) return
    const { data } = await supabase.from('messages').select('id, expediteur, texte, image_url, audio_path, audio_duree, lu, created_at')
      .or(`and(expediteur.eq.${user.id},destinataire.eq.${actif.id}),and(expediteur.eq.${actif.id},destinataire.eq.${user.id})`)
      .order('created_at', { ascending: true }).limit(200)
    setFil(data || [])
    const maxEntrant = (data || []).filter(m => m.expediteur === actif.id).reduce((a, m) => Math.max(a, m.id), 0)
    const pe = dernierEntrant.current
    if (pe && pe.id === actif.id && maxEntrant > pe.max) jouer('message')
    dernierEntrant.current = { id: actif.id, max: maxEntrant }
    if ((data || []).some(m => m.expediteur === actif.id && !m.lu)) {
      await supabase.rpc('marquer_lu', { ami: actif.id })
      chargerAmis()
    }
  }, [actif, user.id, chargerAmis])
  useEffect(() => {
    setFil([])
    charger()
    const t = setInterval(charger, 4000)
    return () => clearInterval(t)
  }, [charger])
  useEffect(() => { if (corps.current) corps.current.scrollTop = corps.current.scrollHeight }, [fil, conv])

  useEffect(() => () => {
    clearInterval(minuteur.current)
    annule.current = true
    if (enregistreur.current && enregistreur.current.state !== 'inactive') enregistreur.current.stop()
  }, [])

  async function envoyerVocal(blob, secondes, destinataire) {
    const type = (blob.type || 'audio/webm').split(';')[0]
    const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
    const chemin = user.id + '/' + Date.now() + '.' + ext
    const { error } = await supabase.storage.from('vocaux').upload(chemin, blob, { contentType: type })
    if (error) return setErreurVocal('Envoi du message vocal impossible : ' + error.message)
    const { error: e2 } = await supabase.from('messages').insert({ expediteur: user.id, destinataire, texte: '', audio_path: chemin, audio_duree: Math.max(1, secondes) })
    if (e2) return setErreurVocal('Envoi du message vocal impossible.')
    charger(); chargerAmis()
  }
  async function demarrerVocal() {
    if (!actif || enregistre) return
    setErreurVocal('')
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true })
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
      const type = window.MediaRecorder ? types.find(t => MediaRecorder.isTypeSupported(t)) : null
      const rec = new MediaRecorder(flux, type ? { mimeType: type } : undefined)
      const cible = actif.id
      morceaux.current = []
      annule.current = false
      rec.ondataavailable = e => { if (e.data.size) morceaux.current.push(e.data) }
      rec.onstop = () => {
        flux.getTracks().forEach(t => t.stop())
        const blob = new Blob(morceaux.current, { type: rec.mimeType || type || 'audio/webm' })
        if (!annule.current && blob.size > 0 && dureeRef.current >= 1) envoyerVocal(blob, dureeRef.current, cible)
      }
      debut.current = Date.now(); dureeRef.current = 0
      rec.start()
      enregistreur.current = rec
      setEnregistre(true); setDuree(0)
      minuteur.current = setInterval(() => {
        const s = Math.round((Date.now() - debut.current) / 1000)
        setDuree(s)
        if (s >= 120) arreterVocal(true)
      }, 500)
    } catch (e) {
      setErreurVocal('Autorise le micro pour enregistrer un message vocal.')
    }
  }
  function arreterVocal(envoyer) {
    clearInterval(minuteur.current)
    dureeRef.current = Math.round((Date.now() - debut.current) / 1000)
    annule.current = !envoyer
    if (enregistreur.current && enregistreur.current.state !== 'inactive') enregistreur.current.stop()
    setEnregistre(false); setDuree(0)
  }
  const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')

  async function choisir(e) {
    const f = e.target.files[0]
    if (f) setPhoto(await redimensionner(f, 700, 0.7))
    e.target.value = ''
  }
  async function envoyer(e) {
    e.preventDefault()
    if ((!texte.trim() && !photo) || !actif) return
    await supabase.from('messages').insert({ expediteur: user.id, destinataire: actif.id, texte: texte.trim(), image_url: photo })
    setTexte(''); setPhoto(null); charger(); chargerAmis()
  }

  if (vide) return <p className="muted">Ajoute d’abord des amis pour discuter. <Link href="/amis">Trouver des amis</Link></p>
  const dernierMien = [...fil].reverse().find(m => m.expediteur === user.id)

  return (
    <div className={'messagerie' + (conv ? ' conv-ouverte' : '')}>
      <aside className="liste-conv">
        <div className="liste-conv-tete">
          <h2>Messages</h2>
          <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher une conversation" aria-label="Rechercher une conversation" />
        </div>
        <div className="liste-conv-corps">
          {!triees.length && <p className="muted" style={{ padding: 14 }}>Aucune conversation.</p>}
          {triees.map(a => {
            const ap = apercus[a.id], n = nonLus[a.id] || 0
            return (
              <button key={a.id} className={'conv-item' + (a.id === actif?.id ? ' actif' : '') + (n ? ' nonlu-item' : '')} onClick={() => { setActif(a); setConv(true) }}>
                <span className="avatar-statut">
                  <Avatar nom={a.nom} url={a.avatar_url} taille={46} />
                  {enLigne(a.derniere_activite) && <span className="point-en-ligne" title="En ligne" />}
                </span>
                <span className="corps">
                  <span className="nom">{a.nom}{a.verifie && <Verifie />}</span>
                  <span className="apercu">{ap ? resume(ap, user.id) : 'Dis bonjour 👋'}</span>
                </span>
                <span className="droite-conv">
                  {ap && <span className="heure">{heureListe(ap.created_at)}</span>}
                  {n > 0 && <span className="nonlu">{n}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <section className="fil-conv">
        {!actif ? (
          <div className="conv-vide"><div><Icone nom="message" taille={44} /><p>Choisis une conversation pour commencer.</p></div></div>
        ) : (
          <>
            <div className="fil-tete">
              <button className="btn-rond retour-conv" onClick={() => setConv(false)} aria-label="Retour aux conversations"><Icone nom="retour" /></button>
              <span className="avatar-statut">
                <Avatar nom={actif.nom} url={actif.avatar_url} taille={42} id={actif.id} />
                {enLigne(actif.derniere_activite) && <span className="point-en-ligne" />}
              </span>
              <div className="info">
                <b>{actif.nom}</b>{actif.verifie && <Verifie />}
                <div className="muted">{enLigne(actif.derniere_activite) ? 'En ligne' : 'Hors ligne'}</div>
              </div>
              <button className="btn-rond" onClick={() => appeler(actif, false)} aria-label="Appel vocal"><Icone nom="telephone" /></button>
              <button className="btn-rond" onClick={() => appeler(actif, true)} aria-label="Appel vidéo"><Icone nom="video" /></button>
            </div>

            <div className="fil-corps" ref={corps}>
              {!fil.length && <p className="muted" style={{ textAlign: 'center', margin: 'auto' }}>Aucun message pour le moment. Écris le premier !</p>}
              {fil.map((m, i) => (
                <div key={m.id} style={{ display: 'contents' }}>
                  {(i === 0 || !memeJour(fil[i - 1].created_at, m.created_at)) && <span className="jour-sep">{etiquetteJour(m.created_at)}</span>}
                  <div className={'bulle-msg' + (m.expediteur === user.id ? ' moi' : '')}>
                    {m.image_url && <img src={m.image_url} alt="Photo envoyée" />}
                    {m.audio_path && <MessageVocal chemin={m.audio_path} />}
                    {m.texte}
                    <span className="heure-msg">{heure(m.created_at)}{m.id === dernierMien?.id && m.lu ? ' · Vu' : ''}</span>
                  </div>
                </div>
              ))}
            </div>

            {photo && <div className="apercu" style={{ padding: '8px 14px' }}><img className="photo" style={{ maxHeight: 140, width: 'auto' }} src={photo} alt="Aperçu" /><button type="button" className="alt sm" onClick={() => setPhoto(null)}>Retirer la photo</button></div>}
            {erreurVocal && <p className="msg err" role="status" style={{ padding: '0 14px' }}>{erreurVocal}</p>}
            <form className="compositeur" onSubmit={envoyer}>
              <label className="btn-rond" aria-label="Joindre une photo"><Icone nom="image" /><input type="file" accept="image/*" hidden onChange={choisir} /></label>
              {enregistre ? (
                <>
                  <span className="rec"><span className="rec-point" /> {mmss(duree)}</span>
                  <span style={{ flex: 1 }} />
                  <button type="button" className="btn-rond" onClick={() => arreterVocal(false)} aria-label="Annuler"><Icone nom="fermer" /></button>
                  <button type="button" className="btn-rond envoi" onClick={() => arreterVocal(true)} aria-label="Envoyer le message vocal"><Icone nom="envoyer" /></button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-rond" onClick={demarrerVocal} aria-label="Enregistrer un message vocal"><Icone nom="micro" /></button>
                  <input className="champ-pilule" value={texte} onChange={e => setTexte(e.target.value)} placeholder="Écrire un message" aria-label="Message" />
                  <button className="btn-rond envoi" aria-label="Envoyer"><Icone nom="envoyer" /></button>
                </>
              )}
            </form>
          </>
        )}
      </section>
    </div>
  )
}

export default function Page() { return <Shell>{user => <Messages user={user} />}</Shell> }
