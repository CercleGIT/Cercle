'use client'
import { useCallback, useEffect, useState } from 'react'
import { budgetAuto, sansLiens, traduireTexte } from '@/lib/traduction'
import { LANGUES, langueCible, traductionAutoActive } from '@/lib/langue'
import { detecterLangue } from '@/lib/detection'

const cle = (l, t) => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return 'tr:' + l + ':' + h + ':' + t.length }
const nom = c => (LANGUES.find(x => x[0] === c) || [null, c])[1]

// Traduction d'un texte. Avec "auto", il est traduit tout seul s'il est écrit dans une autre langue que la tienne.
export default function Traduire({ texte, auto = false }) {
  const [res, setRes] = useState(null)
  const [src, setSrc] = useState(null)
  const [cache, setCache] = useState(false)
  const [automatique, setAutomatique] = useState(false)
  const [charge, setCharge] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState({ propre: '', detecte: null, cible: 'fr' })

  useEffect(() => {
    const propre = sansLiens(texte)
    setInfo({ propre, detecte: detecterLangue(propre), cible: langueCible() })
  }, [texte])

  const lancer = useCallback(async modeAuto => {
    const { propre, detecte, cible } = info
    if (!propre) return
    const k = cle(cible, propre)
    try { const c = localStorage.getItem(k); if (c) { setRes(c); setSrc(detecte); setAutomatique(modeAuto); return } } catch {}
    if (modeAuto && !budgetAuto(propre.length)) return
    setCharge(true); setErr('')
    try {
      const t = await traduireTexte(propre, cible, detecte)
      setRes(t); setSrc(detecte); setAutomatique(modeAuto)
      try { localStorage.setItem(k, t) } catch {}
    } catch (e) { if (!modeAuto) setErr(e.message) }
    setCharge(false)
  }, [info])

  useEffect(() => {
    if (!auto || !info.propre || !traductionAutoActive()) return
    if (info.detecte && info.detecte !== info.cible) lancer(true)
  }, [auto, info, lancer])

  if (!info.propre) return null
  // Texte déjà dans ta langue : rien à proposer
  if (info.detecte && info.detecte === info.cible && !res) return null

  const affiche = res && !cache
  if (automatique && res) {
    return (
      <span className="trad">
        {affiche && <span className="trad-res">{res}</span>}
        <button type="button" className="lien-trad" onClick={() => setCache(!cache)}>
          {cache ? '🌐 Voir la traduction' : '🌐 Traduit automatiquement' + (src ? ' depuis ' + nom(src) : '') + ' · Voir l’original'}
        </button>
      </span>
    )
  }
  return (
    <span className="trad">
      <button type="button" className="lien-trad" onClick={() => (res ? setCache(!cache) : lancer(false))} disabled={charge}>
        {charge ? '🌐 Traduction…' : res && !cache ? 'Voir l’original' : res ? 'Voir la traduction' : 'Traduire'}
      </button>
      {affiche && <span className="trad-res">{res}</span>}
      {err && <span className="msg err">{err}</span>}
    </span>
  )
}
