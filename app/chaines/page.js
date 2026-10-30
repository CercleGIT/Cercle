'use client'
import { useState } from 'react'
import Shell from '@/components/Shell'
import Fil from '@/components/Fil'

const CHAINES = [['actualites', '📰 Actualités'], ['opportunites', '💼 Opportunités'], ['sports', '⚽ Sports'], ['videos', '🎬 Vidéos']]

function Contenu({ user }) {
  const [c, setC] = useState('actualites')
  return (
    <>
      <div className="actions" role="tablist" aria-label="Chaînes">
        {CHAINES.map(([k, nom]) => (
          <button key={k} role="tab" aria-selected={c === k} className={c === k ? '' : 'alt'} onClick={() => setC(k)}>{nom}</button>
        ))}
      </div>
      <Fil key={c} user={user} chaine={c} />
    </>
  )
}

export default function Page() {
  return <Shell>{user => <Contenu user={user} />}</Shell>
}
