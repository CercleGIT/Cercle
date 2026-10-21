'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'
import { redimensionner } from '@/lib/image'

function Groupes({ user }) {
  const [groupes, setGroupes] = useState([])
  const [invitations, setInvitations] = useState([])
  const [f, setF] = useState({ nom: '', description: '', prive: false, image: null })
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.from('groups')
      .select('id, nom, description, prive, image_url, group_members(user_id)').order('created_at', { ascending: false })
    setGroupes(data || [])
    const { data: inv } = await supabase.from('group_invites')
      .select('group_id, groups(nom, image_url), profiles!invitant(nom)').eq('invite', user.id)
    setInvitations(inv || [])
  }, [user.id])
  useEffect(() => { charger() }, [charger])

  async function photo(e) {
    const fic = e.target.files[0]
    if (fic) setF({ ...f, image: await redimensionner(fic, 300, 0.7) })
  }
  async function creer(e) {
    e.preventDefault()
    if (!f.nom.trim()) return setErreur('Donne un nom au groupe.')
    const { data: g, error } = await supabase.from('groups')
      .insert({ nom: f.nom.trim(), description: f.description.trim(), prive: f.prive, image_url: f.image, createur: user.id }).select('id').single()
    if (error) return setErreur('Création impossible.')
    await supabase.from('group_members').insert({ group_id: g.id, user_id: user.id, role: 'admin' })
    setF({ nom: '', description: '', prive: false, image: null }); setErreur(''); charger()
  }
  async function rejoindre(id) { await supabase.from('group_members').insert({ group_id: id, user_id: user.id }); charger() }
  async function accepter(id) {
    await supabase.from('group_members').insert({ group_id: id, user_id: user.id })
    await supabase.from('group_invites').delete().match({ group_id: id, invite: user.id })
    charger()
  }
  async function refuser(id) { await supabase.from('group_invites').delete().match({ group_id: id, invite: user.id }); charger() }

  const estMembre = g => g.group_members.some(m => m.user_id === user.id)
  const miens = groupes.filter(estMembre)
  const aDecouvrir = groupes.filter(g => !estMembre(g) && !g.prive)
  const ligne = (g, bouton) => (
    <div className="resultat" key={g.id}>
      <Avatar nom={g.nom} url={g.image_url} taille={48} />
      <div><b>{g.nom}</b>{g.prive && <span className="muted"> · privé</span>}{g.description && <div className="muted">{g.description}</div>}<div className="muted">{g.group_members.length} membre{g.group_members.length > 1 ? 's' : ''}</div></div>
      {bouton}
    </div>
  )

  return (
    <>
      {invitations.length > 0 && (
        <div className="box">
          <h2>Invitations ({invitations.length})</h2>
          {invitations.map(i => (
            <div className="resultat" key={i.group_id}>
              <Avatar nom={i.groups?.nom} url={i.groups?.image_url} taille={40} />
              <div><b>{i.groups?.nom}</b><div className="muted">Invité par {i.profiles?.nom || 'un membre'}</div></div>
              <button className="sm" onClick={() => accepter(i.group_id)}>Rejoindre</button>
              <button className="alt sm" onClick={() => refuser(i.group_id)}>Refuser</button>
            </div>
          ))}
        </div>
      )}
      <form className="box" onSubmit={creer}>
        <h2>Créer un groupe</h2>
        <div className="entete">
          <Avatar nom={f.nom || 'G'} url={f.image} taille={56} />
          <label className="alt sm bouton">Photo du groupe<input type="file" accept="image/*" hidden onChange={photo} /></label>
        </div>
        <input value={f.nom} onChange={e => setF({ ...f, nom: e.target.value })} placeholder="Nom du groupe" aria-label="Nom du groupe" maxLength={60} />
        <input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Description" aria-label="Description" maxLength={300} />
        <label className="check"><input type="checkbox" checked={f.prive} onChange={e => setF({ ...f, prive: e.target.checked })} /> Groupe privé (sur invitation)</label>
        <button>Créer</button>
        {erreur && <p className="msg err" role="status">{erreur}</p>}
      </form>
      <div className="box">
        <h2>Mes groupes</h2>
        {!miens.length && <p className="muted">Tu n’as encore rejoint aucun groupe.</p>}
        {miens.map(g => ligne(g, <Link className="btnlink" href={`/groupes/${g.id}`}>Ouvrir</Link>))}
      </div>
      <div className="box">
        <h2>À découvrir</h2>
        {!aDecouvrir.length && <p className="muted">Aucun autre groupe public pour le moment.</p>}
        {aDecouvrir.map(g => ligne(g, <button className="sm" onClick={() => rejoindre(g.id)}>Rejoindre</button>))}
      </div>
    </>
  )
}

export default function Page() { return <Shell>{user => <Groupes user={user} />}</Shell> }
