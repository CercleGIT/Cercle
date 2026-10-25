export const LANGUES = [
  ['fr', 'Français'], ['en', 'English'], ['pt', 'Português'], ['es', 'Español'],
  ['ar', 'العربية (arabe)'], ['sw', 'Kiswahili'], ['yo', 'Yorùbá (bêta)'],
]
const CODES = LANGUES.map(l => l[0])

// Langue de l'appareil (elle reflète en général le pays de l'utilisateur) ; anglais si elle n'est pas gérée
export function langueAppareil() {
  try {
    for (const l of navigator.languages || [navigator.language]) {
      const c = String(l).slice(0, 2).toLowerCase()
      if (CODES.includes(c)) return c
    }
  } catch {}
  return 'en'
}
export const getLangueChoisie = () => { try { return localStorage.getItem('cercle-langue') || 'auto' } catch { return 'auto' } }
export const setLangue = l => { try { localStorage.setItem('cercle-langue', l) } catch {} }
// Langue vers laquelle on traduit
export function langueCible() { const c = getLangueChoisie(); return c === 'auto' ? langueAppareil() : c }
export const getLangue = langueCible

export const traductionAutoActive = () => { try { return localStorage.getItem('cercle-trad-auto') !== 'non' } catch { return true } }
export const setTraductionAuto = v => { try { localStorage.setItem('cercle-trad-auto', v ? 'oui' : 'non') } catch {} }
