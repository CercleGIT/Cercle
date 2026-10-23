'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import { jouer } from '@/lib/sons'
import Verifie from '@/components/Verifie'
import MessageVocal from '@/components/MessageVocal'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'

const enLigne = d => d && Date.now() - new Date(d).getTime() < 150000

const appeler = (ami, video) => window.dispatchEvent(new CustomEvent('cercle-appel', { detail: { id: ami.id, nom: ami.nom, avatar: ami.avatar_url, video } }))

function Messages({ user }) {
  const [amis, setAmis] = useState([])
  const [nonLus, setNonLus] = useState({})
  const [actif, setActif] = useState(null)
  const [fil, setFil] = useState([])
  const [texte, setTexte] = useState('')
  const [photo, setPhoto] = useState(null)
  const [vide, setVide] = useState(false)
  const liste = useRef(null)
  const dernierEntrant = useRef(null)
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
    const sujet = new URLSearchParams(window.location.search).get('sujet')
    if (sujet) setTexte('Bonjour, ton annonce « ' + sujet.slice(0, 120) + ' » est-elle toujours disponible ?')
    const bonjour = new URLSearchParams(window.location.search).get('bonjour')
    if (bonjour) setTexte(bonjour.slice(0, 300))
  }, [])

  const chargerAmis = useCallback(async () => {
    const voulu = new URLSearchParams(window.location.search).get('ami')
    const { data: l } = await supabase.from('friendships').select('demandeur, destinataire').eq('statut', 'accepte')
    const { data: ms } = await supabase.from('messages').select('expediteur, destinataire').order('created_at', { ascending: false }).limit(300)
    const ids = [...new Set([
      ...(l || []).map(x => (x.demandeur === user.id ? x.destinataire : x.demandeur)),
      ...(ms || []).map(x => (x.expediteur === user.id ? x.destinataire : x.expediteur)),
      ...(voulu && voulu !== user.id ? [voulu] : []),
    ])]
    if (!ids.length) return setVide(true)
    const { data: ps } = await supabase.from('profiles').select('id, nom, avatar_url, derniere_activite, verifie').in('id', ids)
    setAmis(ps || [])
    setActif(a => a || (ps || []).find(p => p.id === voulu) || (ps || [])[0] || null)
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
    charger()
    const t = setInterval(charger, 4000)
    return () => clearInterval(t)
  }, [charger])
  useEffect(() => { if (liste.current) liste.current.scrollTop = liste.current.scrollHeight }, [fil])

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
    charger()
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
    setTexte(''); setPhoto(null); charger()
  }

  if (vide) return <p className="muted">Ajoute d’abord des amis pour discuter. <Link href="/amis">Trouver des amis</Link></p>
  const dernierMien = [...fil].reverse().find(m => m.expediteur === user.id)
  return (
    <div className="box">
      <div className="onglets">
        {amis.map(a => (
          <button key={a.id} className={a.id === actif?.id ? '' : 'alt'} onClick={() => setActif(a)}>
            <Avatar nom={a.nom} url={a.avatar_url} taille={22} /> {a.nom}{a.verifie && <Verifie />}
            {enLigne(a.derniere_activite) && <span className="point" title="En ligne" />}
            {nonLus[a.id] > 0 && <span className="nonlu">{nonLus[a.id]}</span>}
          </button>
        ))}
      </div>
      {actif && (
        <div className="actions" style={{ marginTop: 10 }}>
          <button className="alt sm" onClick={() => appeler(actif, false)}>📞 Appel vocal</button>
          <button className="alt sm" onClick={() => appeler(actif, true)}>🎥 Appel vidéo</button>
        </div>
      )}
      <div className="conv" ref={liste}>
        {!fil.length && <p className="muted">Aucun message. Écris le premier.</p>}
        {fil.map(m => (
          <div key={m.id} className={'msgb ' + (m.expediteur === user.id ? 'moi' : '')}>
            {m.image_url && <img src={m.image_url} alt="Photo envoyée" />}
            {m.audio_path && <MessageVocal chemin={m.audio_path} />}
            {m.texte}
          </div>
        ))}
        {dernierMien?.lu && <span className="vu">Vu</span>}
      </div>
      {photo && <div className="apercu"><img className="photo" style={{ maxHeight: 160, width: 'auto' }} src={photo} alt="Aperçu" /><button type="button" className="alt sm" onClick={() => setPhoto(null)}>Retirer la photo</button></div>}
      {erreurVocal && <p className="msg err" role="status">{erreurVocal}</p>}
      <form className="saisie" onSubmit={envoyer}>
        <label className="alt sm bouton" aria-label="Joindre une photo">📷<input type="file" accept="image/*" hidden onChange={choisir} /></label>
        {enregistre ? (
          <>
            <span className="rec"><span className="rec-point" /> {mmss(duree)}</span>
            <button type="button" className="sm" onClick={() => arreterVocal(true)} aria-label="Envoyer le message vocal">➤ Envoyer</button>
            <button type="button" className="alt sm" onClick={() => arreterVocal(false)} aria-label="Annuler">✕</button>
          </>
        ) : (
          <button type="button" className="alt sm" onClick={demarrerVocal} aria-label="Enregistrer un message vocal">🎤</button>
        )}
        <input value={texte} onChange={e => setTexte(e.target.value)} placeholder="Écrire un message" aria-label="Message" />
        <button className="sm">Envoyer</button>
      </form>
    </div>
  )
}

export default function Page() { return <Shell>{user => <Messages user={user} />}</Shell> }
