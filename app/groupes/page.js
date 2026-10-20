'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'

function Groupes({ user }) {
  const [groupes, setGroupes] = useState([])
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [prive, setPrive] = useState(false)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const { data } = await supabase.from('groups')
      .select('id, nom, description, prive, group_members(user_id)').order('created_at', { ascending: false })
    setGroupes(data || [])
  }, [])
  useEffect(() => { charger() }, [charger])

  async function creer(e) {
    e.preventDefault()
    if (!nom.trim()) return
    const { data: g, error } = await supabase.from('groups')
      .insert({ nom: nom.trim(), description: description.trim(), prive, createur: user.id }).select('id').single()
    if (error) return setErreur('Création impossible.')
    await supabase.from('group_members').insert({ group_id: g.id, user_id: user.id, role: 'admin' })
    setNom(''); setDescription(''); setPrive(false); setErreur(''); charger()
  }
  async function rejoindre(id) { await supabase.from('group_members').insert({ group_id: id, user_id: user.id }); charger() }
  async function quitter(id) { await supabase.from('group_members').delete().match({ group_id: id, user_id: user.id }); charger() }

  return (
    <>
      <form className="box" onSubmit={creer}>
        <h2>Créer un groupe</h2>
        <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom du groupe" aria-label="Nom du groupe" />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" aria-label="Description" />
        <label className="check"><input type="checkbox" checked={prive} onChange={e => setPrive(e.target.checked)} /> Groupe privé</label>
        <button>Créer</button>
        {erreur && <p className="msg err" role="status">{erreur}</p>}
      </form>
      {!groupes.length && <p className="muted">Aucun groupe pour le moment.</p>}
      {groupes.map(g => {
        const membre = g.group_members.some(m => m.user_id === user.id)
        return (
          <div className="box" key={g.id}>
            <b>{g.nom}</b> {g.prive && <span className="muted">· privé</span>}
            {g.description && <p className="texte">{g.description}</p>}
            <div className="muted">{g.group_members.length} membre{g.group_members.length > 1 ? 's' : ''}</div>
            <div className="actions">
              {membre ? <Link className="btnlink" href={`/groupes/${g.id}`}>Ouvrir</Link> : <button className="sm" onClick={() => rejoindre(g.id)}>Rejoindre</button>}
              {membre && <button className="alt sm" onClick={() => quitter(g.id)}>Quitter</button>}
            </div>
          </div>
        )
      })}
    </>
  )
}

export default function Page() { return <Shell>{user => <Groupes user={user} />}</Shell> }
