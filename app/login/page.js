'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ERREURS = {
  'Invalid login credentials': 'E-mail ou mot de passe incorrect.',
  'User already registered': 'Un compte existe déjà avec cet e-mail.',
  'Email not confirmed': 'Confirme ton e-mail avant de te connecter.',
}

export default function Login() {
  const router = useRouter()
  const [inscription, setInscription] = useState(false)
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [msg, setMsg] = useState(null)
  const [charge, setCharge] = useState(false)

  async function envoyer(e) {
    e.preventDefault()
    setMsg(null)
    if (inscription && nom.trim().length < 2) return setMsg({ err: 'Indique ton prénom.' })
    if (mdp.length < 8) return setMsg({ err: 'Le mot de passe doit contenir au moins 8 caractères.' })
    setCharge(true)
    const { data, error } = inscription
      ? await supabase.auth.signUp({ email, password: mdp, options: { data: { nom: nom.trim() } } })
      : await supabase.auth.signInWithPassword({ email, password: mdp })
    setCharge(false)
    if (error) return setMsg({ err: ERREURS[error.message] || 'Une erreur est survenue. Réessaie.' })
    if (inscription && !data.session) return setMsg({ ok: 'Compte créé. Vérifie ta boîte mail pour confirmer ton adresse.' })
    router.replace('/')
  }

  async function google() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }

  return (
    <div className="wrap">
      <form className="card" onSubmit={envoyer}>
        <h1>Cercle</h1>
        <p className="sub">{inscription ? 'Crée ton compte' : 'Connecte-toi pour retrouver tes amis'}</p>
        {inscription && (<><label htmlFor="nom">Prénom</label><input id="nom" value={nom} onChange={e => setNom(e.target.value)} autoComplete="given-name" /></>)}
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        <label htmlFor="mdp">Mot de passe</label>
        <input id="mdp" type="password" required value={mdp} onChange={e => setMdp(e.target.value)} autoComplete={inscription ? 'new-password' : 'current-password'} />
        <button disabled={charge}>{inscription ? 'Créer mon compte' : 'Se connecter'}</button>
        <button type="button" className="alt" onClick={google}>Continuer avec Google</button>
        {msg && <p className={'msg ' + (msg.err ? 'err' : 'ok')} role="status">{msg.err || msg.ok}</p>}
        <button type="button" className="link" onClick={() => { setInscription(!inscription); setMsg(null) }}>
          {inscription ? 'J’ai déjà un compte' : 'Pas encore de compte ? Inscris-toi'}
        </button>
      </form>
    </div>
  )
}
