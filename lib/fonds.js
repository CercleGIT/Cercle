// Fonds d'écran des conversations. Chaque membre choisit le sien (il est gardé sur son appareil).
export const FONDS = [
  { id: 'defaut', nom: 'Classique', css: null, sombre: false },
  { id: 'aurore', nom: 'Aurore', css: 'linear-gradient(135deg, #c7d2fe 0%, #ddd6fe 50%, #fbcfe8 100%)', sombre: false },
  { id: 'coucher', nom: 'Coucher de soleil', css: 'linear-gradient(160deg, #fde68a 0%, #fb923c 55%, #f472b6 100%)', sombre: false },
  { id: 'ocean', nom: 'Océan', css: 'linear-gradient(160deg, #a5f3fc 0%, #38bdf8 55%, #6366f1 100%)', sombre: false },
  { id: 'foret', nom: 'Forêt', css: 'linear-gradient(160deg, #bbf7d0 0%, #4ade80 55%, #0d9488 100%)', sombre: false },
  { id: 'bonbon', nom: 'Bonbon', css: 'linear-gradient(160deg, #fce7f3 0%, #fbcfe8 100%)', sombre: false },
  { id: 'papier', nom: 'Papier', css: 'repeating-linear-gradient(0deg, rgba(0,0,0,.05) 0 1px, transparent 1px 28px), #f5efe0', sombre: false },
  { id: 'points', nom: 'Points', css: 'radial-gradient(circle, rgba(36,85,230,.22) 1.6px, transparent 1.8px) 0 0 / 22px 22px, #eef3ff', sombre: false },
  { id: 'grille', nom: 'Grille', css: 'linear-gradient(rgba(15,27,51,.07) 1px, transparent 1px) 0 0 / 26px 26px, linear-gradient(90deg, rgba(15,27,51,.07) 1px, transparent 1px) 0 0 / 26px 26px, #f8fafc', sombre: false },
  { id: 'nuit', nom: 'Nuit étoilée', css: 'radial-gradient(circle, rgba(255,255,255,.6) 1px, transparent 1.3px) 0 0 / 38px 38px, radial-gradient(circle, rgba(255,255,255,.3) 1px, transparent 1.3px) 19px 19px / 38px 38px, #0b1220', sombre: true },
  { id: 'minuit', nom: 'Minuit', css: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)', sombre: true },
  { id: 'braise', nom: 'Braise', css: 'linear-gradient(160deg, #1f2937 0%, #7f1d1d 100%)', sombre: true },
  { id: 'noir', nom: 'Noir', css: '#000000', sombre: true },
]

const CLE = 'cercle-fond-messages'
export const lireFond = () => { try { return localStorage.getItem(CLE) || 'defaut' } catch { return 'defaut' } }
export const ecrireFond = id => { try { localStorage.setItem(CLE, id) } catch {} }

// Style à appliquer à la zone des messages
export function styleFond(id) {
  const f = FONDS.find(x => x.id === id) || FONDS[0]
  if (!f.css) return undefined
  return f.sombre ? { background: f.css, '--mute': '#cbd5e1' } : { background: f.css }
}
