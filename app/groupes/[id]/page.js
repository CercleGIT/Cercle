'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Shell from '@/components/Shell'
import Fil from '@/components/Fil'
import { supabase } from '@/lib/supabase'

function Groupe({ user }) {
  const { id } = useParams()
  const [groupe, setGroupe] = useState(null)
  useEffect(() => {
    supabase.from('groups').select('id, nom, description').eq('id', id).single().then(({ data }) => setGroupe(data))
  }, [id])
  if (!groupe) return <p className="muted">Groupe introuvable ou privé.</p>
  return (
    <>
      <Link href="/groupes" className="muted">← Tous les groupes</Link>
      <h2>{groupe.nom}</h2>
      {groupe.description && <p className="muted">{groupe.description}</p>}
      <Fil user={user} groupId={Number(id)} />
    </>
  )
}

export default function Page() { return <Shell>{user => <Groupe user={user} />}</Shell> }
