'use client'
import { useState } from 'react'
import { traduireTexte } from '@/lib/traduction'
import { getLangue } from '@/lib/langue'

const cle = (l, t) => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return 'tr:' + l + ':' + h + ':' + t.length }

// Bouton « Traduire » sous un texte (le résultat est gardé sur l'appareil pour ne pas payer deux fois)
export default function Traduire({ texte }) {
  const [res, setRes] = useState(null)
  const [charge, setCharge] = useState(false)
  const [err, setErr] = useState('')

  async function traduire() {
    if (res) return setRes(null)
    const l = getLangue()
    const k = cle(l, texte)
    try { const c = localStorage.getItem(k); if (c) return setRes(c) } catch {}
    setCharge(true); setErr('')
    try {
      const t = await traduireTexte(texte, l)
      setRes(t)
      try { localStorage.setItem(k, t) } catch {}
    } catch (e) { setErr(e.message) }
    setCharge(false)
  }
  return (
    <span className="trad">
      <button type="button" className="lien-trad" onClick={traduire} disabled={charge}>{charge ? 'Traduction…' : res ? 'Voir l’original' : 'Traduire'}</button>
      {res && <span className="trad-res">{res}</span>}
      {err && <span className="msg err">{err}</span>}
    </span>
  )
}
