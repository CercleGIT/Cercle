'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Shell from '@/components/Shell'
import { supabase } from '@/lib/supabase'
import { JEUX } from '@/lib/jeux'

function Catalogue({ user }) {
  const [scores, setScores] = useState({})
  useEffect(() => {
    supabase.from('scores_jeux').select('jeu, meilleur').eq('user_id', user.id).then(({ data }) => {
      setScores(Object.fromEntries((data || []).map(s => [s.jeu, s.meilleur])))
    })
  }, [user.id])
  return (
    <>
      <h2>🎮 Jeux</h2>
      <p className="muted">Joue, bats tes amis et grimpe dans le classement.</p>
      {JEUX.map(j => (
        <Link key={j.id} href={'/jeux/' + j.id} className="box carte-createur">
          <span className="gros-emoji">{j.emoji}</span>
          <div>
            <b>{j.nom}</b>
            <div className="muted">{j.description}</div>
            <div className="compte">{scores[j.id] !== undefined ? 'Ton meilleur score : ' + scores[j.id] : 'Pas encore joué'}</div>
          </div>
        </Link>
      ))}
      <p className="muted">D’autres jeux arrivent bientôt.</p>
    </>
  )
}

export default function Page() { return <Shell>{user => <Catalogue user={user} />}</Shell> }
