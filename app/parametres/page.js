'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { appliquerTheme, getTheme } from '@/lib/theme'
import { ecrireSons, lireSons, tester } from '@/lib/sons'

const THEMES = [['auto', 'Automatique'], ['clair', 'Clair'], ['sombre', 'Sombre']]

function Sons() {
  const [s, setS] = useState(null)
  useEffect(() => { setS(lireSons()) }, [])
  if (!s) return null
  const maj = (k, v) => { const n = { ...s, [k]: v }; setS(n); ecrireSons(n) }
  const LIGNES = [['message', 'Messages'], ['notification', 'Notifications'], ['appel', 'Appels (sonnerie)']]
  return (
    <div className="box">
      <h2>Sons</h2>
      <label className="check"><input type="checkbox" checked={s.actifs} onChange={e => maj('actifs', e.target.checked)} /> Activer les sons</label>
      {LIGNES.map(([k, nom]) => (
        <div className="lien-ligne" key={k}>
          <label className="check"><input type="checkbox" checked={s[k]} disabled={!s.actifs} onChange={e => maj(k, e.target.checked)} /> {nom}</label>
          <button type="button" className="alt sm" onClick={() => tester(k)}>▶ Tester</button>
        </div>
      ))}
      <label htmlFor="vol">Volume</label>
      <input id="vol" type="range" min="0.1" max="1" step="0.1" value={s.volume} onChange={e => maj('volume', Number(e.target.value))} />
      <p className="muted">Les sons ne jouent que lorsque Cercle est ouvert. Le navigateur exige d’avoir touché la page une première fois.</p>
    </div>
  )
}

function ZoneSensible() {
  const [info, setInfo] = useState('')
  async function supprimer() {
    const saisie = window.prompt('Action définitive : ton compte et tes publications seront supprimés. Tape SUPPRIMER pour confirmer.')
    if (saisie !== 'SUPPRIMER') return
    const { error } = await supabase.rpc('supprimer_mon_compte')
    if (error) return setInfo('Suppression impossible.')
    await supabase.auth.signOut()
  }
  return (
    <div className="box">
      <h2>Zone sensible</h2>
      <p className="muted">Supprime définitivement ton compte et toutes tes données.</p>
      <button className="alt sm" onClick={supprimer}>Supprimer mon compte</button>
      {info && <p className="msg err" role="status">{info}</p>}
    </div>
  )
}

function Parametres({ user }) {
  const [theme, setTheme] = useState('auto')
  const [mdp, setMdp] = useState('')
  const [msg, setMsg] = useState(null)
  useEffect(() => { setTheme(getTheme()) }, [])

  async function changerMdp(e) {
    e.preventDefault()
    if (mdp.length < 8) return setMsg({ err: 'Le mot de passe doit contenir au moins 8 caractères.' })
    const { error } = await supabase.auth.updateUser({ password: mdp })
    if (error) return setMsg({ err: 'Changement impossible : ' + error.message })
    setMdp(''); setMsg({ ok: 'Mot de passe modifié.' })
  }

  return (
    <>
      <h2>⚙️ Paramètres</h2>

      <div className="box">
        <h2>Compte et sécurité</h2>
        <p className="muted">Adresse e-mail : <b>{user.email}</b></p>
        <form onSubmit={changerMdp}>
          <label htmlFor="mdp">Nouveau mot de passe</label>
          <input id="mdp" type="password" value={mdp} onChange={e => setMdp(e.target.value)} autoComplete="new-password" placeholder="8 caractères minimum" />
          <button className="sm" style={{ marginTop: 10 }}>Changer le mot de passe</button>
        </form>
        {msg && <p className={'msg ' + (msg.err ? 'err' : 'ok')} role="status">{msg.err || msg.ok}</p>}
        <Link className="lien-ligne" href="/profil"><span>Modifier mon profil, voir mes membres bloqués ou télécharger mes données</span><span>›</span></Link>
      </div>

      <div className="box">
        <h2>Inviter des amis</h2>
        <Link className="lien-ligne" href="/inviter"><span>Partager mon lien d’invitation et voir mes invités</span><span>›</span></Link>
      </div>

      <div className="box">
        <h2>Apparence</h2>
        <div className="onglets">
          {THEMES.map(([k, n]) => (
            <button key={k} className={theme === k ? '' : 'alt'} onClick={() => { setTheme(k); appliquerTheme(k) }}>{n}</button>
          ))}
        </div>
      </div>

      <Sons />

      <div className="box">
        <h2>Informations légales</h2>
        <Link className="lien-ligne" href="/mentions-legales"><span>Mentions légales</span><span>›</span></Link>
        <Link className="lien-ligne" href="/cgu"><span>Conditions d’utilisation</span><span>›</span></Link>
        <Link className="lien-ligne" href="/confidentialite"><span>Politique de confidentialité</span><span>›</span></Link>
      </div>

      <div className="box">
        <h2>À propos</h2>
        <p className="muted">Cercle · retrouve tes amis, tes groupes et le marché de ta communauté.</p>
        <button className="alt sm" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
      </div>

      <ZoneSensible />
    </>
  )
}

export default function Page() { return <Shell>{user => <Parametres user={user} />}</Shell> }
