'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import Fil from '@/components/Fil'
import DefisGroupe from '@/components/DefisGroupe'
import Avatar from '@/components/Avatar'
import Verifie from '@/components/Verifie'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'

function Groupe({ user }) {
  const { id } = useParams()
  const router = useRouter()
  const gid = Number(id)
  const [g, setG] = useState(undefined)
  const [membres, setMembres] = useState([])
  const [amis, setAmis] = useState([])
  const [invites, setInvites] = useState([])
  const [onglet, setOnglet] = useState('fil')
  const [edition, setEdition] = useState(null)
  const [info, setInfo] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.from('groups').select('id, nom, description, prive, image_url, createur').eq('id', gid).maybeSingle()
    setG(data)
    if (!data) return
    const { data: m } = await supabase.from('group_members').select('user_id, role, profiles(nom, avatar_url, verifie)').eq('group_id', gid)
    setMembres(m || [])
    const { data: inv } = await supabase.from('group_invites').select('invite').eq('group_id', gid)
    setInvites((inv || []).map(x => x.invite))
    const { data: l } = await supabase.from('friendships').select('demandeur, destinataire').eq('statut', 'accepte')
    const ids = (l || []).map(x => (x.demandeur === user.id ? x.destinataire : x.demandeur))
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, nom, avatar_url').in('id', ids)
      setAmis(ps || [])
    }
  }, [gid, user.id])
  useEffect(() => { charger() }, [charger])

  if (g === undefined) return <p className="muted">Chargement…</p>
  if (!g) return <p className="muted">Groupe introuvable ou privé. <Link href="/groupes">Retour aux groupes</Link></p>

  const moi = membres.find(m => m.user_id === user.id)
  const admin = moi?.role === 'admin'
  const candidats = amis.filter(a => !membres.some(m => m.user_id === a.id) && !invites.includes(a.id))

  const rejoindre = async () => { await supabase.from('group_members').insert({ group_id: gid, user_id: user.id }); charger() }
  const quitter = async () => {
    if (!window.confirm('Quitter ce groupe ?')) return
    await supabase.from('group_members').delete().match({ group_id: gid, user_id: user.id })
    router.push('/groupes')
  }
  const promouvoir = async uid => { await supabase.from('group_members').update({ role: 'admin' }).match({ group_id: gid, user_id: uid }); charger() }
  const retirer = async uid => {
    if (!window.confirm('Retirer ce membre du groupe ?')) return
    await supabase.from('group_members').delete().match({ group_id: gid, user_id: uid }); charger()
  }
  const inviter = async uid => {
    const { error } = await supabase.from('group_invites').insert({ group_id: gid, invite: uid, invitant: user.id })
    setInfo(error ? 'Invitation impossible.' : 'Invitation envoyée.'); charger()
  }
  const supprimerGroupe = async () => {
    if (!window.confirm('Supprimer définitivement ce groupe et ses publications ?')) return
    await supabase.from('groups').delete().eq('id', gid)
    router.push('/groupes')
  }
  const photo = async e => {
    const fic = e.target.files[0]
    if (fic) setEdition({ ...edition, image_url: await redimensionner(fic, 300, 0.7) })
  }
  const enregistrer = async e => {
    e.preventDefault()
    if (!edition.nom.trim()) return
    const { error } = await supabase.from('groups').update({ nom: edition.nom.trim(), description: edition.description.trim(), image_url: edition.image_url }).eq('id', gid)
    setInfo(error ? 'Enregistrement impossible.' : 'Groupe mis à jour.')
    setEdition(null); charger()
  }

  return (
    <>
      <div className="box">
        <div className="groupe-tete">
          <Avatar nom={g.nom} url={g.image_url} taille={64} />
          <div>
            <h2 style={{ margin: 0 }}>{g.nom}</h2>
            {g.prive && <span className="muted">Groupe privé</span>}
            {g.description && <p className="texte">{g.description}</p>}
          </div>
        </div>
        <div className="actions">
          <Link href="/groupes" className="muted">← Tous les groupes</Link>
          {!moi && <button className="sm droite" onClick={rejoindre}>Rejoindre</button>}
          {moi && <button className="alt sm droite" onClick={quitter}>Quitter</button>}
          {admin && <button className="alt sm" onClick={() => setEdition({ nom: g.nom, description: g.description || '', image_url: g.image_url })}>Modifier</button>}
          {admin && <button className="alt sm" onClick={supprimerGroupe}>Supprimer le groupe</button>}
        </div>
        {info && <p className="msg ok" role="status">{info}</p>}
      </div>

      {edition && (
        <form className="box" onSubmit={enregistrer}>
          <h2>Modifier le groupe</h2>
          <div className="entete"><Avatar nom={edition.nom} url={edition.image_url} taille={56} /><label className="alt sm bouton">Changer la photo<input type="file" accept="image/*" hidden onChange={photo} /></label></div>
          <input value={edition.nom} maxLength={60} onChange={e => setEdition({ ...edition, nom: e.target.value })} aria-label="Nom" />
          <input value={edition.description} maxLength={300} onChange={e => setEdition({ ...edition, description: e.target.value })} aria-label="Description" />
          <div className="actions"><button>Enregistrer</button><button type="button" className="alt" onClick={() => setEdition(null)}>Annuler</button></div>
        </form>
      )}

      {moi && (
        <>
          <div className="onglets" style={{ marginBottom: 12 }}>
            <button className={onglet === 'fil' ? '' : 'alt'} onClick={() => setOnglet('fil')}>Publications</button>
            <button className={onglet === 'membres' ? '' : 'alt'} onClick={() => setOnglet('membres')}>Membres ({membres.length})</button>
            <button className={onglet === 'defis' ? '' : 'alt'} onClick={() => setOnglet('defis')}>🔥 Défis</button>
          </div>
          {onglet === 'fil' && <Fil user={user} groupId={gid} />}
          {onglet === 'defis' && <DefisGroupe user={user} gid={gid} admin={admin} />}
          {onglet === 'membres' && (
            <>
              <div className="box">
                <h2>Membres</h2>
                {membres.map(m => (
                  <div className="resultat" key={m.user_id}>
                    <Avatar nom={m.profiles?.nom} url={m.profiles?.avatar_url} taille={36} id={m.user_id} />
                    <div><Link className="lienmembre" href={'/membre/' + m.user_id}><b>{m.profiles?.nom || 'Membre'}</b></Link>{m.profiles?.verifie && <Verifie />} {m.role === 'admin' && <span className="etiquette-role">admin</span>}</div>
                    {admin && m.user_id !== user.id && m.role !== 'admin' && <button className="alt sm" onClick={() => promouvoir(m.user_id)}>Nommer admin</button>}
                    {admin && m.user_id !== user.id && <button className="alt sm" onClick={() => retirer(m.user_id)}>Retirer</button>}
                  </div>
                ))}
              </div>
              <div className="box">
                <h2>Inviter un ami</h2>
                {!candidats.length && <p className="muted">Aucun ami à inviter pour le moment.</p>}
                {candidats.map(a => (
                  <div className="resultat" key={a.id}>
                    <Avatar nom={a.nom} url={a.avatar_url} taille={36} id={a.id} />
                    <div>{a.nom}</div>
                    <button className="sm" onClick={() => inviter(a.id)}>Inviter</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {!moi && <p className="muted">Rejoins le groupe pour voir ses publications.</p>}
    </>
  )
}

export default function Page() { return <Shell>{user => <Groupe user={user} />}</Shell> }
