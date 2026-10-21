'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

export default function Reinitialiser() {
  const router = useRouter()
  const [pret, setPret] = useState(false)
  const [mdp, setMdp] = useState('')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (s) setPret(true) })
    supabase.auth.getSession().then(({ data }) => { if (data.session) setPret(true) })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function envoyer(e) {
    e.preventDefault()
    if (mdp.length < 8) return setMsg({ err: 'Le mot de passe doit contenir au moins 8 caractères.' })
    const { error } = await supabase.auth.updateUser({ password: mdp })
    if (error) return setMsg({ err: 'Changement impossible : ' + error.message })
    setMsg({ ok: 'Mot de passe changé. Redirection…' })
    setTimeout(() => router.replace('/'), 1200)
  }

  return (
    <div className="wrap">
      <form className="card" onSubmit={envoyer}>
        <Logo taille={34} />
        <p className="sub">Choisis un nouveau mot de passe</p>
        {!pret && <p className="muted">Ouvre cette page depuis le lien reçu par e-mail.</p>}
        <label htmlFor="mdp">Nouveau mot de passe</label>
        <input id="mdp" type="password" value={mdp} onChange={e => setMdp(e.target.value)} autoComplete="new-password" />
        <button disabled={!pret}>Changer le mot de passe</button>
        {msg && <p className={'msg ' + (msg.err ? 'err' : 'ok')} role="status">{msg.err || msg.ok}</p>}
      </form>
    </div>
  )
}
