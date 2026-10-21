'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'

function Notifications() {
  const [liste, setListe] = useState(null)
  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('notifications').select('id, texte, lien, lu, created_at').order('created_at', { ascending: false }).limit(50)
      setListe(data || [])
      await supabase.from('notifications').update({ lu: true }).eq('lu', false)
    }
    init()
  }, [])
  if (!liste) return <p className="muted">Chargement…</p>
  return (
    <div className="box">
      <h2>Notifications</h2>
      {!liste.length && <p className="muted">Rien de nouveau pour le moment.</p>}
      {liste.map(n => (
        <Link key={n.id} href={n.lien || '/'} className={'notif ' + (n.lu ? '' : 'neuve')}>
          {n.texte}<span className="muted"> · {new Date(n.created_at).toLocaleString('fr-FR')}</span>
        </Link>
      ))}
    </div>
  )
}

export default function Page() { return <Shell>{() => <Notifications />}</Shell> }
