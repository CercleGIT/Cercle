'use client'
import { useState } from 'react'
import Sticker from '@/components/Sticker'
import { STICKERS } from '@/lib/stickers'

// Bouton 😊 qui ouvre la grille des autocollants ; un appui sur l'un d'eux l'envoie
export default function ChoixSticker({ onChoisir }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <>
      <button type="button" className="btn-rond" onClick={() => setOuvert(true)} aria-label="Envoyer un autocollant" title="Autocollants">😊</button>
      {ouvert && (
        <div className="feuille" onClick={() => setOuvert(false)}>
          <div className="feuille-contenu" onClick={e => e.stopPropagation()} role="dialog" aria-label="Autocollants">
            <h3 style={{ margin: '0 0 10px' }}>Autocollants</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, justifyItems: 'center', maxHeight: '58vh', overflowY: 'auto' }}>
              {STICKERS.map(s => (
                <button key={s.id} type="button" onClick={() => { onChoisir(s.id); setOuvert(false) }} aria-label={s.texte}
                  style={{ margin: 0, padding: 0, border: 0, background: 'none', cursor: 'pointer', borderRadius: 18 }}>
                  <Sticker id={s.id} taille={86} />
                </button>
              ))}
            </div>
            <button type="button" className="alt" style={{ marginTop: 10 }} onClick={() => setOuvert(false)}>Fermer</button>
          </div>
        </div>
      )}
    </>
  )
}
