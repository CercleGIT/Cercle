'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'
import Logo from '@/components/Logo'
import Avatar from '@/components/Avatar'
import { PAYS_TEL, ageDe, normaliserTelephone, trouverPays } from '@/lib/pays'

function erreurFr(message) {
  const t = String(message || '')
  if (/token has expired|otp/i.test(t)) return 'Code incorrect ou expiré. Demande un nouveau code.'
  if (/invalid login credentials/i.test(t)) return 'E-mail ou mot de passe incorrect.'
  if (/already registered/i.test(t)) return 'Un compte existe déjà avec cet e-mail. Connecte-toi.'
  if (/rate limit|too many|after \d+ seconds|security purposes/i.test(t)) return 'Trop de demandes pour le moment. Attends une minute puis réessaie.'
  if (/not authorized|not allowed|smtp|sending .*email/i.test(t)) return 'L’envoi des e-mails n’est pas disponible pour le moment. Réessaie dans quelques minutes.'
  if (/password should be at least/i.test(t)) return 'Le mot de passe est trop court (8 caractères minimum).'
  if (/database error saving new user/i.test(t)) return 'Inscription impossible : vérifie ta date de naissance (16 ans minimum) et tes informations.'
  return 'Une erreur est survenue : ' + t
}

const AGE_MIN = 18
const aujourdhui = new Date().toISOString().slice(0, 10)

export default function Login() {
  const router = useRouter()
  const [inscription, setInscription] = useState(false)
  const [etape, setEtape] = useState('identite')   // identite, residence, compte, code, photo
  const [viaInscription, setViaInscription] = useState(false)
  const [prenom, setPrenom] = useState('')
  const [nomFamille, setNomFamille] = useState('')
  const [naissance, setNaissance] = useState('')
  const [paysCode, setPaysCode] = useState('')
  const [tel, setTel] = useState('')
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [accepte, setAccepte] = useState(false)
  const [code, setCode] = useState('')
  const [photo, setPhoto] = useState(null)
  const [msg, setMsg] = useState(null)
  const [charge, setCharge] = useState(false)
  const [attente, setAttente] = useState(0)

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) { try { localStorage.setItem('cercle-ref', ref) } catch {} setInscription(true) }
  }, [])
  useEffect(() => {
    if (attente <= 0) return
    const t = setTimeout(() => setAttente(a => a - 1), 1000)
    return () => clearTimeout(t)
  }, [attente])

  const adresse = email.trim().toLowerCase()
  const pays = trouverPays(paysCode)
  const erreur = t => setMsg({ err: t })

  async function terminer() {
    try {
      const ref = localStorage.getItem('cercle-ref')
      if (ref) { await supabase.rpc('enregistrer_parrain', { parrain_id: ref }); localStorage.removeItem('cercle-ref') }
    } catch {}
    router.replace('/')
  }
  async function apresConnexion() {
    if (viaInscription) { setMsg(null); setEtape('photo') } else await terminer()
  }

  function etapeIdentite(e) {
    e.preventDefault(); setMsg(null)
    if (prenom.trim().length < 2) return erreur('Indique ton prénom.')
    if (nomFamille.trim().length < 2) return erreur('Indique ton nom.')
    const age = ageDe(naissance)
    if (age === null) return erreur('Indique ta date de naissance.')
    if (age < AGE_MIN) return erreur('Tu dois avoir au moins ' + AGE_MIN + ' ans pour t’inscrire.')
    if (age > 110) return erreur('Vérifie ta date de naissance.')
    setEtape('residence')
  }
  function etapeResidence(e) {
    e.preventDefault(); setMsg(null)
    if (!pays) return erreur('Choisis ton pays de résidence.')
    if (!normaliserTelephone(paysCode, tel)) return erreur('Numéro de téléphone invalide. Saisis-le tel que tu le composes dans ton pays.')
    setEtape('compte')
  }

  async function creerCompte(e) {
    e.preventDefault(); setMsg(null)
    if (mdp.length < 8) return erreur('Le mot de passe doit contenir au moins 8 caractères.')
    if (!accepte) return erreur('Accepte les conditions d’utilisation pour créer ton compte.')
    setCharge(true)
    const telephone = normaliserTelephone(paysCode, tel)
    const { data, error } = await supabase.auth.signUp({
      email: adresse, password: mdp,
      options: { data: { nom: prenom.trim() + ' ' + nomFamille.trim(), prenom: prenom.trim(), nom_famille: nomFamille.trim(), date_naissance: naissance, pays: pays.nom, telephone } },
    })
    setCharge(false)
    if (error) return erreur(erreurFr(error.message))
    setViaInscription(true)
    if (!data.session) {
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return erreur('Un compte existe déjà avec cet e-mail. Connecte-toi.')
      setEtape('code'); setAttente(60)
      return setMsg({ ok: 'Un code vient d’être envoyé à ' + adresse + '. Regarde aussi dans les courriers indésirables.' })
    }
    setEtape('photo')
  }

  async function seConnecter(e) {
    e.preventDefault(); setMsg(null)
    if (mdp.length < 8) return erreur('Le mot de passe doit contenir au moins 8 caractères.')
    setCharge(true)
    const { error } = await supabase.auth.signInWithPassword({ email: adresse, password: mdp })
    if (error) {
      if (/email not confirmed/i.test(error.message)) {
        const r = await supabase.auth.resend({ type: 'signup', email: adresse })
        setCharge(false)
        if (r.error) return erreur(erreurFr(r.error.message))
        setEtape('code'); setAttente(60)
        return setMsg({ ok: 'Ton compte n’est pas encore confirmé. Un code vient d’être envoyé à ' + adresse + '.' })
      }
      setCharge(false)
      return erreur(erreurFr(error.message))
    }
    setCharge(false)
    await terminer()
  }

  async function verifier(e) {
    e.preventDefault(); setMsg(null)
    const token = code.replace(/\s/g, '')
    if (token.length < 6) return erreur('Saisis le code reçu par e-mail.')
    setCharge(true)
    const { error } = await supabase.auth.verifyOtp({ email: adresse, token, type: 'signup' })
    setCharge(false)
    if (error) return erreur(erreurFr(error.message))
    await apresConnexion()
  }
  async function renvoyer() {
    if (attente > 0) return
    setMsg(null)
    const { error } = await supabase.auth.resend({ type: 'signup', email: adresse })
    if (error) return erreur(erreurFr(error.message))
    setAttente(60); setMsg({ ok: 'Nouveau code envoyé. Regarde aussi dans les courriers indésirables.' })
  }

  async function choisirPhoto(e) {
    const f = e.target.files[0]
    e.target.value = ''
    if (f) setPhoto(await redimensionner(f, 160, 0.8))
  }
  async function enregistrerPhoto() {
    if (!photo) return terminer()
    setCharge(true); setMsg(null)
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      const { error } = await supabase.from('profiles').update({ avatar_url: photo }).eq('id', data.user.id)
      if (error) { setCharge(false); return erreur('Enregistrement de la photo impossible. Tu pourras la changer dans ton profil.') }
    }
    setCharge(false)
    await terminer()
  }

  async function oubli() {
    if (!adresse) return erreur('Saisis ton e-mail ci-dessus, puis clique sur « Mot de passe oublié ».')
    const { error } = await supabase.auth.resetPasswordForEmail(adresse, { redirectTo: window.location.origin + '/reinitialiser' })
    setMsg(error ? { err: erreurFr(error.message) } : { ok: 'Un e-mail de réinitialisation vient de t’être envoyé.' })
  }
  async function google() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }
  function changerMode() {
    setInscription(!inscription); setEtape('identite'); setMsg(null)
  }

  const message = msg && <p className={'msg ' + (msg.err ? 'err' : 'ok')} role="status">{msg.err || msg.ok}</p>
  const numeroEtape = { identite: 1, residence: 2, compte: 3 }[etape]
  const Etapes = () => numeroEtape ? <p className="muted" style={{ margin: '0 0 6px' }}>Étape {numeroEtape} sur 3</p> : null

  // ----- Étape : photo de profil -----
  if (etape === 'photo') {
    return (
      <div className="wrap">
        <div className="card" style={{ textAlign: 'center' }}>
          <Logo taille={34} />
          <p className="sub">Dernière étape : ta photo de profil</p>
          <p className="muted">Ajoute une photo pour que tes amis te reconnaissent.</p>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
            <Avatar nom={prenom || '?'} url={photo} taille={120} />
          </div>
          <label className="alt bouton" style={{ display: 'inline-block' }}>
            {photo ? 'Changer la photo' : '📷 Choisir une photo'}
            <input type="file" accept="image/*" hidden onChange={choisirPhoto} />
          </label>
          <button disabled={charge} onClick={enregistrerPhoto}>{charge ? 'Enregistrement…' : photo ? 'Enregistrer et entrer' : 'Entrer dans Cercle'}</button>
          {!photo && <button type="button" className="link" onClick={terminer}>Passer pour l’instant</button>}
          {message}
        </div>
      </div>
    )
  }

  // ----- Étape : code de confirmation -----
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
          <button disabled={charge}>{charge ? 'Vérification…' : 'Valider mon compte'}</button>
          <button type="button" className="alt" disabled={attente > 0} onClick={renvoyer}>{attente > 0 ? 'Renvoyer le code (' + attente + ' s)' : 'Renvoyer le code'}</button>
          {message}
          <button type="button" className="link" onClick={() => { setEtape(viaInscription ? 'compte' : 'identite'); setCode(''); setMsg(null) }}>Changer d’adresse e-mail</button>
        </form>
      </div>
    )
  }

  // ----- Connexion -----
  if (!inscription) {
    return (
      <div className="wrap">
        <form className="card" onSubmit={seConnecter}>
          <Logo taille={34} />
          <p className="sub">Connecte-toi pour retrouver tes amis</p>
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" />
          <label htmlFor="mdp">Mot de passe</label>
          <input id="mdp" type="password" required value={mdp} onChange={e => setMdp(e.target.value)} autoComplete="current-password" />
          <button disabled={charge}>{charge ? 'Un instant…' : 'Se connecter'}</button>
          <button type="button" className="alt" onClick={google}>Continuer avec Google</button>
          <button type="button" className="link" onClick={oubli}>Mot de passe oublié ?</button>
          {message}
          <button type="button" className="link" onClick={changerMode}>Pas encore de compte ? Inscris-toi</button>
        </form>
      </div>
    )
  }

  // ----- Inscription : étape 1, identité -----
  if (etape === 'identite') {
    return (
      <div className="wrap">
        <form className="card" onSubmit={etapeIdentite}>
          <Logo taille={34} />
          <p className="sub">Crée ton compte</p>
          <Etapes />
          <label htmlFor="prenom">Prénom</label>
          <input id="prenom" value={prenom} onChange={e => setPrenom(e.target.value)} autoComplete="given-name" maxLength={40} />
          <label htmlFor="nomf">Nom</label>
          <input id="nomf" value={nomFamille} onChange={e => setNomFamille(e.target.value)} autoComplete="family-name" maxLength={40} />
          <label htmlFor="naissance">Date de naissance</label>
          <input id="naissance" type="date" value={naissance} onChange={e => setNaissance(e.target.value)} max={aujourdhui} min="1900-01-01" autoComplete="bday" />
          <p className="muted">Ta date de naissance reste privée : elle sert à vérifier ton âge ({AGE_MIN} ans minimum).</p>
          <button>Continuer</button>
          {message}
          <button type="button" className="link" onClick={changerMode}>J’ai déjà un compte</button>
        </form>
      </div>
    )
  }

  // ----- Inscription : étape 2, pays et téléphone -----
  if (etape === 'residence') {
    return (
      <div className="wrap">
        <form className="card" onSubmit={etapeResidence}>
          <Logo taille={34} />
          <p className="sub">Où habites-tu ?</p>
          <Etapes />
          <label htmlFor="pays">Pays de résidence</label>
          <select id="pays" value={paysCode} onChange={e => setPaysCode(e.target.value)}>
            <option value="">Choisir…</option>
            {PAYS_TEL.map(p => <option key={p.code} value={p.code}>{p.nom}{p.indicatif ? ' (+' + p.indicatif + ')' : ''}</option>)}
          </select>
          <label htmlFor="tel">Numéro de téléphone</label>
          <div className="saisie">
            {pays && pays.indicatif && <span className="devise-fixe" style={{ whiteSpace: 'nowrap' }}>+{pays.indicatif}</span>}
            <input id="tel" type="tel" value={tel} onChange={e => setTel(e.target.value)} autoComplete="tel-national" inputMode="tel"
              placeholder={pays && pays.indicatif ? 'Ton numéro' : '+ indicatif et numéro'} />
          </div>
          <p className="muted">Saisis ton numéro tel que tu le composes dans ton pays. Il reste privé : il sert à sécuriser ton compte.</p>
          <button>Continuer</button>
          {message}
          <button type="button" className="link" onClick={() => { setEtape('identite'); setMsg(null) }}>← Retour</button>
        </form>
      </div>
    )
  }

  // ----- Inscription : étape 3, compte -----
  return (
    <div className="wrap">
      <form className="card" onSubmit={creerCompte}>
        <Logo taille={34} />
        <p className="sub">Ton compte</p>
        <Etapes />
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" />
        <label htmlFor="mdp">Mot de passe</label>
        <input id="mdp" type="password" required value={mdp} onChange={e => setMdp(e.target.value)} autoComplete="new-password" />
        <p className="muted">8 caractères minimum. Un code de confirmation sera envoyé à ton e-mail.</p>
        <label className="check" style={{ marginTop: 6 }}>
          <input type="checkbox" checked={accepte} onChange={e => setAccepte(e.target.checked)} />
          <span>J’ai au moins {AGE_MIN} ans et j’accepte les <Link href="/cgu">conditions d’utilisation</Link> et la <Link href="/confidentialite">politique de confidentialité</Link>.</span>
        </label>
        <button disabled={charge}>{charge ? 'Création…' : 'Créer mon compte'}</button>
        {message}
        <button type="button" className="link" onClick={() => { setEtape('residence'); setMsg(null) }}>← Retour</button>
      </form>
    </div>
  )
}
