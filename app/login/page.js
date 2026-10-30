'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

const CLE_CAPTCHA = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

// Vérification anti-robot (Cloudflare Turnstile). Si la clé n'est pas configurée, rien ne s'affiche.
function Captcha({ onToken, resetKey }) {
  const zone = useRef(null)
  const idWidget = useRef(null)

  useEffect(() => {
    if (!CLE_CAPTCHA) return
    let annule = false
    function afficher() {
      if (annule || !zone.current || !window.turnstile || idWidget.current !== null) return
      idWidget.current = window.turnstile.render(zone.current, {
        sitekey: CLE_CAPTCHA,
        language: 'fr',
        callback: t => onToken(t),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      })
    }
    if (window.turnstile) afficher()
    else {
      let s = document.querySelector('script[data-turnstile]')
      if (!s) {
        s = document.createElement('script')
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        s.async = true
        s.setAttribute('data-turnstile', '1')
        document.head.appendChild(s)
      }
      s.addEventListener('load', afficher)
    }
    return () => {
      annule = true
      if (idWidget.current !== null && window.turnstile) { try { window.turnstile.remove(idWidget.current) } catch {} }
      idWidget.current = null
    }
  }, [])

  useEffect(() => {
    if (resetKey && idWidget.current !== null && window.turnstile) { try { window.turnstile.reset(idWidget.current) } catch {} }
  }, [resetKey])

  if (!CLE_CAPTCHA) return null
  return <div ref={zone} style={{ margin: '12px 0', minHeight: 65 }} />
}

function erreurFr(message) {
  const t = String(message || '')
  if (/token has expired|otp/i.test(t)) return 'Code incorrect ou expiré. Demande un nouveau code.'
  if (/invalid login credentials/i.test(t)) return 'E-mail ou mot de passe incorrect.'
  if (/already registered/i.test(t)) return 'Un compte existe déjà avec cet e-mail. Connecte-toi.'
  if (/captcha/i.test(t)) return 'La vérification anti-robot a échoué. Réessaie.'
  if (/rate limit|too many|after \d+ seconds|security purposes/i.test(t)) return 'Trop de demandes pour le moment. Attends une minute puis réessaie.'
  if (/not authorized|not allowed|smtp|sending .*email/i.test(t)) return 'L’envoi des e-mails n’est pas disponible pour le moment. Réessaie dans quelques minutes.'
  if (/password should be at least/i.test(t)) return 'Le mot de passe est trop court (8 caractères minimum).'
  return 'Une erreur est survenue : ' + t
}

export default function Login() {
  const router = useRouter()
  const [inscription, setInscription] = useState(false)
  const [etape, setEtape] = useState('formulaire')   // 'formulaire' ou 'code'
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState(null)
  const [charge, setCharge] = useState(false)
  const [accepte, setAccepte] = useState(false)
  const [attente, setAttente] = useState(0)
  const [jeton, setJeton] = useState(null)
  const [razKey, setRazKey] = useState(0)

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) { try { localStorage.setItem('cercle-ref', ref) } catch {} setInscription(true) }
  }, [])
  useEffect(() => {
    if (attente <= 0) return
    const t = setTimeout(() => setAttente(a => a - 1), 1000)
    return () => clearTimeout(t)
  }, [attente])

  useEffect(() => { setJeton(null) }, [etape])

  const adresse = email.trim().toLowerCase()

  // Un jeton anti-robot ne sert qu'une fois : on en demande un nouveau après chaque envoi.
  function renouveler() { setJeton(null); setRazKey(k => k + 1) }
  const optsCaptcha = jeton ? { captchaToken: jeton } : {}

  async function terminer() {
    try {
      const ref = localStorage.getItem('cercle-ref')
      if (ref) { await supabase.rpc('enregistrer_parrain', { parrain_id: ref }); localStorage.removeItem('cercle-ref') }
    } catch {}
    router.replace('/')
  }

  async function envoyer(e) {
    e.preventDefault()
    setMsg(null)
    if (inscription && nom.trim().length < 2) return setMsg({ err: 'Indique ton prénom.' })
    if (inscription && !accepte) return setMsg({ err: 'Accepte les conditions d’utilisation pour créer ton compte.' })
    if (mdp.length < 8) return setMsg({ err: 'Le mot de passe doit contenir au moins 8 caractères.' })
    if (CLE_CAPTCHA && !jeton) return setMsg({ err: 'Patiente une seconde : la vérification anti-robot n’est pas terminée.' })
    setCharge(true)
    const { data, error } = inscription
      ? await supabase.auth.signUp({ email: adresse, password: mdp, options: { data: { nom: nom.trim() }, ...optsCaptcha } })
      : await supabase.auth.signInWithPassword({ email: adresse, password: mdp, options: optsCaptcha })
    renouveler()
    if (error) {
      // Compte créé mais pas encore confirmé : on renvoie un code
      if (/email not confirmed/i.test(error.message)) {
        setCharge(false)
        setEtape('code')
        if (CLE_CAPTCHA) return setMsg({ ok: 'Ton compte n’est pas encore confirmé. Clique sur « Renvoyer le code » pour recevoir un code à ' + adresse + '.' })
        const r = await supabase.auth.resend({ type: 'signup', email: adresse })
        if (r.error) return setMsg({ err: erreurFr(r.error.message) })
        setAttente(60)
        return setMsg({ ok: 'Ton compte n’est pas encore confirmé. Un code vient d’être envoyé à ' + adresse + '.' })
      }
      setCharge(false)
      return setMsg({ err: erreurFr(error.message) })
    }
    setCharge(false)
    if (inscription && !data.session) {
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return setMsg({ err: 'Un compte existe déjà avec cet e-mail. Connecte-toi.' })
      setEtape('code'); setAttente(60)
      return setMsg({ ok: 'Un code vient d’être envoyé à ' + adresse + '. Regarde aussi dans les courriers indésirables.' })
    }
    await terminer()
  }

  async function verifier(e) {
    e.preventDefault()
    setMsg(null)
    const token = code.replace(/\s/g, '')
    if (token.length < 6) return setMsg({ err: 'Saisis le code reçu par e-mail.' })
    setCharge(true)
    const { error } = await supabase.auth.verifyOtp({ email: adresse, token, type: 'signup' })
    setCharge(false)
    if (error) return setMsg({ err: erreurFr(error.message) })
    await terminer()
  }

  async function renvoyer() {
    if (attente > 0) return
    setMsg(null)
    if (CLE_CAPTCHA && !jeton) return setMsg({ err: 'Patiente une seconde : la vérification anti-robot n’est pas terminée.' })
    const { error } = await supabase.auth.resend({ type: 'signup', email: adresse, options: optsCaptcha })
    renouveler()
    if (error) return setMsg({ err: erreurFr(error.message) })
    setAttente(60); setMsg({ ok: 'Nouveau code envoyé. Regarde aussi dans les courriers indésirables.' })
  }

  async function oubli() {
    if (!adresse) return setMsg({ err: 'Saisis ton e-mail ci-dessus, puis clique sur « Mot de passe oublié ».' })
    if (CLE_CAPTCHA && !jeton) return setMsg({ err: 'Patiente une seconde : la vérification anti-robot n’est pas terminée.' })
    const { error } = await supabase.auth.resetPasswordForEmail(adresse, { redirectTo: window.location.origin + '/reinitialiser', ...optsCaptcha })
    renouveler()
    setMsg(error ? { err: erreurFr(error.message) } : { ok: 'Un e-mail de réinitialisation vient de t’être envoyé.' })
  }

  async function google() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }

  const message = msg && <p className={'msg ' + (msg.err ? 'err' : 'ok')} role="status">{msg.err || msg.ok}</p>

  if (etape === 'code') {
    return (
      <div className="wrap">
        <form className="card" onSubmit={verifier}>
          <Logo taille={34} />
          <p className="sub">Entre le code reçu par e-mail</p>
          <p className="muted">Nous avons envoyé un code à <b>{adresse}</b>.</p>
          <label htmlFor="code">Code de confirmation</label>
          <input id="code" className="champ-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" autoFocus placeholder="000000" />
          <Captcha onToken={setJeton} resetKey={razKey} />
          <button disabled={charge}>{charge ? 'Vérification…' : 'Valider mon compte'}</button>
          <button type="button" className="alt" disabled={attente > 0 || (CLE_CAPTCHA && !jeton)} onClick={renvoyer}>{attente > 0 ? 'Renvoyer le code (' + attente + ' s)' : 'Renvoyer le code'}</button>
          {message}
          <button type="button" className="link" onClick={() => { setEtape('formulaire'); setCode(''); setMsg(null) }}>Changer d’adresse e-mail</button>
        </form>
      </div>
    )
  }

  return (
    <div className="wrap">
      <form className="card" onSubmit={envoyer}>
        <Logo taille={34} />
        <p className="sub">{inscription ? 'Crée ton compte et retrouve tes amis' : 'Connecte-toi pour retrouver tes amis'}</p>
        {inscription && (<><label htmlFor="nom">Prénom</label><input id="nom" value={nom} onChange={e => setNom(e.target.value)} autoComplete="given-name" /></>)}
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" />
        <label htmlFor="mdp">Mot de passe</label>
        <input id="mdp" type="password" required value={mdp} onChange={e => setMdp(e.target.value)} autoComplete={inscription ? 'new-password' : 'current-password'} />
        {inscription && (
          <label className="check" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={accepte} onChange={e => setAccepte(e.target.checked)} />
            <span>J’ai au moins 16 ans et j’accepte les <Link href="/cgu">conditions d’utilisation</Link> et la <Link href="/confidentialite">politique de confidentialité</Link>.</span>
          </label>
        )}
        <Captcha onToken={setJeton} resetKey={razKey} />
        <button disabled={charge}>{charge ? 'Un instant…' : inscription ? 'Créer mon compte' : 'Se connecter'}</button>
        <button type="button" className="alt" onClick={google}>Continuer avec Google</button>
        {!inscription && <button type="button" className="link" onClick={oubli}>Mot de passe oublié ?</button>}
        {message}
        <button type="button" className="link" onClick={() => { setInscription(!inscription); setMsg(null) }}>
          {inscription ? 'J’ai déjà un compte' : 'Pas encore de compte ? Inscris-toi'}
        </button>
      </form>
    </div>
  )
}
