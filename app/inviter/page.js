'use client'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'

function Inviter({ user }) {
  const [filleuls, setFilleuls] = useState(null)
  const [info, setInfo] = useState('')
  const lien = typeof window !== 'undefined' ? window.location.origin + '/login?ref=' + user.id : ''

  useEffect(() => {
    supabase.from('parrainages').select('filleul, created_at, profiles!filleul(nom, avatar_url)').eq('parrain', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setFilleuls(data || []))
  }, [user.id])

  async function partager() {
    const message = 'Rejoins-moi sur Cercle : défis du jour, talents, groupes et marché de ta communauté !'
    if (navigator.share) { try { await navigator.share({ title: 'Cercle', text: message, url: lien }) } catch {} }
    else copier(message + ' ' + lien)
  }
  async function copier(texte = lien) {
    try { await navigator.clipboard.writeText(texte); setInfo('Lien copié : colle-le dans une conversation.') } catch { setInfo(lien) }
  }
  const n = filleuls ? filleuls.length : 0

  return (
    <>
      <div className="box defi-tete">
        <div className="gros">🎁</div>
        <h2 style={{ margin: '4px 0' }}>Invite tes amis sur Cercle</h2>
        <p className="muted">Chaque personne qui s’inscrit avec ton lien est comptée comme ton invitée.</p>
        <input readOnly value={lien} onFocus={e => e.target.select()} aria-label="Ton lien d’invitation" />
        <div className="actions" style={{ justifyContent: 'center' }}>
          <button onClick={partager}>↗ Partager mon lien</button>
          <button className="alt" onClick={() => copier()}>Copier le lien</button>
        </div>
        {info && <p className="msg ok" role="status">{info}</p>}
      </div>
      <div className="box">
        <h2>Mes invités ({n}) {n >= 5 && '🏅 Ambassadeur'}</h2>
        {filleuls === null && <p className="muted">Chargement…</p>}
        {filleuls && !filleuls.length && <p className="muted">Personne pour le moment. Partage ton lien !</p>}
        {(filleuls || []).map(f => (
          <div className="resultat" key={f.filleul}>
            <Avatar nom={f.profiles?.nom} url={f.profiles?.avatar_url} taille={36} />
            <div><b>{f.profiles?.nom || 'Membre'}</b><div className="muted">Inscrit le {new Date(f.created_at).toLocaleDateString('fr-FR')}</div></div>
          </div>
        ))}
      </div>
    </>
  )
}

export default function Page() { return <Shell>{user => <Inviter user={user} />}</Shell> }
