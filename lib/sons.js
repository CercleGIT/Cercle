// Sons de Cercle générés par le navigateur (aucun fichier audio à envoyer)
const CLE = 'cercle-sons'
const DEFAUTS = { actifs: true, message: true, notification: true, appel: true, volume: 0.7 }

export function lireSons() {
  try { return { ...DEFAUTS, ...JSON.parse(localStorage.getItem(CLE) || '{}') } } catch { return { ...DEFAUTS } }
}
export function ecrireSons(s) { try { localStorage.setItem(CLE, JSON.stringify(s)) } catch {} }

let ctx = null
function contexte() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}
// Les navigateurs n'autorisent le son qu'après un premier geste (toucher, clic, touche)
export function debloquerAudio() {
  const f = () => { contexte(); window.removeEventListener('pointerdown', f); window.removeEventListener('keydown', f) }
  window.addEventListener('pointerdown', f)
  window.addEventListener('keydown', f)
}

function note(freq, debut, duree, volume, type = 'sine') {
  const c = contexte()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  const t0 = c.currentTime + debut
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree)
  o.connect(g); g.connect(c.destination)
  o.start(t0); o.stop(t0 + duree + 0.05)
}

const SONS = {
  message: v => { note(880, 0, 0.18, v * 0.5); note(1320, 0.12, 0.28, v * 0.5) },
  notification: v => { note(660, 0, 0.22, v * 0.45, 'triangle'); note(990, 0.16, 0.32, v * 0.45, 'triangle') },
  appel: v => { for (const d of [0, 0.6]) { note(440, d, 0.4, v * 0.5); note(480, d, 0.4, v * 0.5) } },
  sortant: v => { note(425, 0, 0.9, v * 0.25) },
}

export function jouer(type) {
  const s = lireSons()
  if (!s.actifs || !s[type === 'sortant' ? 'appel' : type]) return
  if (SONS[type]) SONS[type](s.volume)
}
export function tester(type) { if (SONS[type]) SONS[type](lireSons().volume) }

let boucle = null
export function demarrerSonnerie(type) {
  arreterSonnerie()
  jouer(type)
  boucle = setInterval(() => jouer(type), 3000)
  if (type === 'appel' && navigator.vibrate) navigator.vibrate([400, 200, 400])
}
export function arreterSonnerie() {
  if (boucle) clearInterval(boucle)
  boucle = null
}
