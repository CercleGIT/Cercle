'use client'
import { useState } from 'react'
import { FONDS } from '@/lib/fonds'

// Bouton 🎨 qui ouvre le choix du fond d'écran des messages
export default function ChoixFond({ valeur, onChoisir }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <>
      <button type="button" className="btn-rond" onClick={() => setOuvert(true)} aria-label="Changer le fond des messages" title="Fond des messages">🎨</button>
      {ouvert && (
        <div className="feuille" onClick={() => setOuvert(false)}>
          <div className="feuille-contenu" onClick={e => e.stopPropagation()} role="dialog" aria-label="Fond des messages">
            <h3 style={{ margin: '0 0 10px' }}>Fond des messages</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxHeight: '55vh', overflowY: 'auto' }}>
              {FONDS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { onChoisir(f.id); setOuvert(false) }}
                  aria-label={f.nom}
                  aria-pressed={valeur === f.id}
                  style={{
                    height: 78, margin: 0, padding: 6, display: 'flex', alignItems: 'flex-end',
                    border: valeur === f.id ? '3px solid var(--brand)' : '1px solid var(--line)', borderRadius: 12,
                    background: f.css || 'var(--bg)', color: f.sombre ? '#fff' : 'var(--ink)',
                    fontSize: 12, fontWeight: 700, textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  {f.nom}
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
