'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import { arreterSonnerie, demarrerSonnerie } from '@/lib/sons'

const STUN = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]

// Serveurs TURN (relais) : facultatifs, utiles quand le Wi-Fi ou la 4G bloquent la connexion directe
async function serveursIce() {
  const url = process.env.NEXT_PUBLIC_TURN_URL
  const user = process.env.NEXT_PUBLIC_TURN_USER
  const pass = process.env.NEXT_PUBLIC_TURN_PASS
  if (user && pass) {
    const relais = (urls) => ({ urls, username: user, credential: pass })
    return [
      { urls: 'stun:stun.relay.metered.ca:80' },
      relais('turn:global.relay.metered.ca:80'),
      relais('turn:global.relay.metered.ca:80?transport=tcp'),
      relais('turn:global.relay.metered.ca:443'),
      relais('turns:global.relay.metered.ca:443?transport=tcp'),
      ...STUN,
    ]
  }
  if (!url) return STUN
  try {
    const liste = await (await fetch(url)).json()
    return [...STUN, ...(Array.isArray(liste) ? liste : [])]
  } catch { return STUN }
}
const formatDuree = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')

// Appels vocaux et vidéo entre amis (WebRTC). La signalisation passe par la table "appels".
export default function Appel({ user }) {
  const [etat, setEtat] = useState(null)
  const [duree, setDuree] = useState(0)
  const [micro, setMicro] = useState(true)
  const [camera, setCamera] = useState(true)
  const [erreur, setErreur] = useState('')
  const [diag, setDiag] = useState('')
  const [sonBloque, setSonBloque] = useState(false)
  const stats = useRef({ env: 0, rec: 0 })
  const etatRef = useRef(null)
  const pc = useRef(null)
  const flux = useRef(null)
  const distant = useRef(null)
  const sid = useRef(null)
  const pair = useRef(null)
  const offre = useRef(null)
  const iceAttente = useRef({})
  const remoteSet = useRef(false)
  const dernier = useRef(0)
  const occupe = useRef(false)
  const delai = useRef(null)
  const videoLocale = useRef(null)
  const videoDistante = useRef(null)
  const audioDistant = useRef(null)

  const majEtat = e => { etatRef.current = e; setEtat(e) }
  const attacher = () => {
    if (videoLocale.current && flux.current && videoLocale.current.srcObject !== flux.current) videoLocale.current.srcObject = flux.current
    const d = videoDistante.current
    if (d && distant.current && d.srcObject !== distant.current) {
      d.srcObject = distant.current
      d.play().catch(() => {})
    }
    const au = audioDistant.current
    if (au && distant.current && au.srcObject !== distant.current) {
      au.srcObject = distant.current
      au.play().catch(() => setSonBloque(true))
    }
  }
  const majDiag = p => setDiag('Connexion : ' + p.connectionState + ' · ICE : ' + p.iceConnectionState + ' · échanges ' + stats.current.env + '/' + stats.current.rec + ' · ' + (process.env.NEXT_PUBLIC_TURN_USER ? 'relais configuré' : 'sans relais'))
  // IMPORTANT : une requête Supabase ne part que si on l'attend (await). L'ancienne version n'envoyait donc jamais les candidats ICE.
  const envoyer = async (type, payload) => {
    const res = await supabase.from('appels').insert({ de: user.id, vers: pair.current, type, payload: { sid: sid.current, ...payload } })
    if (res.error && type !== 'ice') setErreur('Signal impossible : ' + res.error.message)
    return res
  }

  const terminer = useCallback(async (notifier = true) => {
    clearTimeout(delai.current)
    if (notifier && pair.current && sid.current) {
      await supabase.from('appels').insert({ de: user.id, vers: pair.current, type: 'fin', payload: { sid: sid.current } })
    }
    if (pc.current) pc.current.close()
    if (flux.current) flux.current.getTracks().forEach(t => t.stop())
    pc.current = null; flux.current = null; distant.current = null
    stats.current = { env: 0, rec: 0 }; setDiag(''); setSonBloque(false)
    sid.current = null; pair.current = null; offre.current = null; remoteSet.current = false
    majEtat(null); setDuree(0); setMicro(true); setCamera(true)
  }, [user.id])

  async function ouvrirMedia(video) {
    flux.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: 'user' } : false })
    attacher()
  }
  async function creerPc() {
    const p = new RTCPeerConnection({ iceServers: await serveursIce() })
    flux.current.getTracks().forEach(t => p.addTrack(t, flux.current))
    p.onicecandidate = e => { if (e.candidate) { stats.current.env++; envoyer('ice', { c: e.candidate.toJSON() }); majDiag(p) } }
    p.ontrack = e => {
      if (!distant.current) distant.current = e.streams[0] || new MediaStream()
      if (!e.streams[0]) distant.current.addTrack(e.track)
      attacher(); majDiag(p)
    }
    p.oniceconnectionstatechange = () => majDiag(p)
    p.onconnectionstatechange = () => {
      majDiag(p)
      if (p.connectionState === 'connected' && etatRef.current) majEtat({ ...etatRef.current, phase: 'encours' })
      if (p.connectionState === 'failed') { setErreur('La connexion a échoué.'); terminer(false) }
    }
    pc.current = p
  }
  const viderIce = s => {
    ;(iceAttente.current[s] || []).forEach(c => pc.current && pc.current.addIceCandidate(c).catch(() => {}))
    iceAttente.current[s] = []
  }

  const appeler = useCallback(async ({ id, nom, avatar, video }) => {
    if (etatRef.current) return
    setErreur('')
    try {
      sid.current = Math.random().toString(36).slice(2)
      pair.current = id
      majEtat({ phase: 'sortant', pair: id, nom, avatar, video })
      await supabase.from('appels').delete().eq('de', user.id)
      await ouvrirMedia(video)
      await creerPc()
      const o = await pc.current.createOffer()
      await pc.current.setLocalDescription(o)
      const { error } = await envoyer('offer', { sdp: o.sdp, video })
      if (error) throw new Error('envoi')
      delai.current = setTimeout(() => {
        if (etatRef.current?.phase === 'sortant') { terminer(true); setErreur('Pas de réponse.') }
      }, 45000)
    } catch (e) {
      setErreur(e.name === 'NotAllowedError' ? 'Autorise le micro (et la caméra) pour appeler.' : 'Appel impossible.')
      terminer(false)
    }
  }, [user.id, terminer])

  async function accepter() {
    const o = offre.current
    if (!o) return
    try {
      sid.current = o.sid; pair.current = o.de
      await ouvrirMedia(o.video)
      await creerPc()
      await pc.current.setRemoteDescription({ type: 'offer', sdp: o.sdp })
      remoteSet.current = true
      viderIce(o.sid)
      const a = await pc.current.createAnswer()
      await pc.current.setLocalDescription(a)
      await envoyer('answer', { sdp: a.sdp })
      majEtat({ ...etatRef.current, phase: 'encours' })
    } catch (e) {
      setErreur(e.name === 'NotAllowedError' ? 'Autorise le micro (et la caméra) pour répondre.' : 'Impossible de répondre.')
      terminer(true)
    }
  }
  async function refuser() {
    const o = offre.current
    if (o) await supabase.from('appels').insert({ de: user.id, vers: o.de, type: 'refus', payload: { sid: o.sid } })
    offre.current = null; majEtat(null)
  }

  const traiter = useCallback(async r => {
    const p = r.payload || {}
    if (r.type === 'offer') {
      if (etatRef.current) { await supabase.from('appels').insert({ de: user.id, vers: r.de, type: 'refus', payload: { sid: p.sid } }); return }
      if (Date.now() - new Date(r.created_at).getTime() > 45000) return
      offre.current = { sid: p.sid, de: r.de, sdp: p.sdp, video: !!p.video }
      const { data } = await supabase.from('profiles').select('nom, avatar_url').eq('id', r.de).maybeSingle()
      majEtat({ phase: 'entrant', pair: r.de, nom: data?.nom || 'Un ami', avatar: data?.avatar_url, video: !!p.video })
      if (navigator.vibrate) navigator.vibrate([300, 150, 300])
    } else if (r.type === 'ice') {
      stats.current.rec++
      if (sid.current === p.sid && pc.current && remoteSet.current) pc.current.addIceCandidate(p.c).catch(() => {})
      else (iceAttente.current[p.sid] = iceAttente.current[p.sid] || []).push(p.c)
    } else if (r.type === 'answer') {
      if (sid.current === p.sid && pc.current) {
        await pc.current.setRemoteDescription({ type: 'answer', sdp: p.sdp })
        remoteSet.current = true
        viderIce(p.sid)
      }
    } else if (r.type === 'refus') {
      if (sid.current === p.sid) { setErreur('Appel refusé ou indisponible.'); terminer(false) }
    } else if (r.type === 'fin') {
      if (sid.current === p.sid || offre.current?.sid === p.sid) terminer(false)
    }
  }, [user.id, terminer])

  useEffect(() => {
    const ecouter = e => appeler(e.detail)
    window.addEventListener('cercle-appel', ecouter)
    return () => window.removeEventListener('cercle-appel', ecouter)
  }, [appeler])

  useEffect(() => {
    const sonder = async () => {
      if (occupe.current || (document.hidden && !etatRef.current)) return
      occupe.current = true
      try {
        const depuis = new Date(Date.now() - 60000).toISOString()
        const { data } = await supabase.from('appels').select('id, de, type, payload, created_at')
          .eq('vers', user.id).gt('id', dernier.current).gte('created_at', depuis).order('id', { ascending: true })
        if (data?.length) {
          dernier.current = data[data.length - 1].id
          await supabase.from('appels').delete().in('id', data.map(r => r.id))
          for (const r of data) await traiter(r)
        }
      } finally { occupe.current = false }
    }
    const t = setInterval(sonder, 1500)
    return () => clearInterval(t)
  }, [user.id, traiter])

  useEffect(() => {
    attacher()
    if (etat?.phase !== 'encours') return
    const t = setInterval(() => setDuree(d => d + 1), 1000)
    return () => clearInterval(t)
  }, [etat])

  useEffect(() => {
    if (etat?.phase === 'entrant') demarrerSonnerie('appel')
    else if (etat?.phase === 'sortant') demarrerSonnerie('sortant')
    else arreterSonnerie()
  }, [etat?.phase])
  useEffect(() => () => arreterSonnerie(), [])

  const basculerMicro = () => { flux.current?.getAudioTracks().forEach(t => { t.enabled = !micro }); setMicro(!micro) }
  const basculerCamera = () => { flux.current?.getVideoTracks().forEach(t => { t.enabled = !camera }); setCamera(!camera) }

  const plein = etat?.video && etat?.phase === 'encours'
  return (
    <>
      {erreur && !etat && <div className="toast-appel" role="alert" onClick={() => setErreur('')}>{erreur}</div>}
      {etat && (
        <div className="appel" role="dialog" aria-label="Appel">
          <video ref={videoDistante} autoPlay playsInline muted className={plein ? 'distante' : 'cache'} />
          <audio ref={audioDistant} autoPlay />
          {!plein && <div className="appel-id"><Avatar nom={etat.nom} url={etat.avatar} taille={96} /><h2>{etat.nom}</h2></div>}
          <p className="appel-etat">
            {etat.phase === 'entrant' ? 'Appel ' + (etat.video ? 'vidéo' : 'vocal') + ' entrant…' : etat.phase === 'sortant' ? 'Appel en cours…' : formatDuree(duree)}
          </p>
          {diag && <p className="appel-diag">{diag}</p>}
          {sonBloque && <button className="alt sm" onClick={() => { videoDistante.current?.play(); audioDistant.current?.play(); setSonBloque(false) }}>🔊 Activer le son</button>}
          {etat.video && etat.phase !== 'entrant' && <video ref={videoLocale} autoPlay playsInline muted className="locale" />}
          <div className="appel-boutons">
            {etat.phase === 'entrant' ? (
              <>
                <button className="rond vert" onClick={accepter} aria-label="Répondre">📞</button>
                <button className="rond rouge" onClick={refuser} aria-label="Refuser">✕</button>
              </>
            ) : (
              <>
                <button className={'rond ' + (micro ? 'gris' : 'rouge')} onClick={basculerMicro} aria-label="Micro">{micro ? '🎤' : '🔇'}</button>
                {etat.video && <button className={'rond ' + (camera ? 'gris' : 'rouge')} onClick={basculerCamera} aria-label="Caméra">{camera ? '📷' : '🚫'}</button>}
                <button className="rond rouge" onClick={() => terminer(true)} aria-label="Raccrocher">📵</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
