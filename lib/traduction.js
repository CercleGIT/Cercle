// Traduction gratuite via MyMemory, appelée depuis le navigateur de chaque membre
// (chaque appareil a sa propre limite quotidienne gratuite, sans clé ni carte bancaire).
export const sansLiens = t => String(t).replace(/https?:\/\/\S+/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

function decouper(texte, max = 450) {
  const phrases = texte.match(/[^.!?\n]+[.!?\n]*/g) || [texte]
  const blocs = []
  let courant = ''
  for (const p of phrases) {
    if (p.length > max) {
      if (courant) { blocs.push(courant); courant = '' }
      for (let i = 0; i < p.length; i += max) blocs.push(p.slice(i, i + max))
    } else if ((courant + p).length > max) { blocs.push(courant); courant = p }
    else courant += p
  }
  if (courant) blocs.push(courant)
  return blocs
}
function decoder(t) {
  const e = document.createElement('textarea')
  e.innerHTML = t
  return e.value
}

// Budget de la traduction automatique : on s'arrête avant la limite gratuite du jour
export function budgetAuto(n, max = 3500) {
  try {
    const jour = new Date().toISOString().slice(0, 10)
    const b = JSON.parse(localStorage.getItem('cercle-trad-budget') || '{}')
    const utilise = b.jour === jour ? b.n : 0
    if (utilise + n > max) return false
    localStorage.setItem('cercle-trad-budget', JSON.stringify({ jour, n: utilise + n }))
    return true
  } catch { return true }
}

async function traduireDirect(texte, langue, source) {
  const sorties = []
  for (const bloc of decouper(String(texte).slice(0, 1500))) {
    if (!bloc.trim()) { sorties.push(bloc); continue }
    const paire = (source || 'Autodetect') + '|' + langue
    const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(bloc) + '&langpair=' + encodeURIComponent(paire)
    let d
    try { d = await (await fetch(url)).json() } catch { throw new Error('Service de traduction injoignable. Vérifie ta connexion.') }
    const detail = String(d.responseDetails || '')
    if (Number(d.responseStatus) === 429 || /USED ALL AVAILABLE|QUOTA/i.test(detail)) throw new Error('Limite de traductions gratuites atteinte pour aujourd’hui. Réessaie demain.')
    let t = d.responseData && d.responseData.translatedText
    if (!t || /DISTINCT LANGUAGES|INVALID/i.test(t)) t = bloc
    sorties.push(decoder(t))
  }
  return sorties.join('').trim()
}

// Les traductions sont envoyées l'une après l'autre, pour ne pas surcharger le service
let file = Promise.resolve()
export function traduireTexte(texte, langue, source) {
  const tache = file.then(() => traduireDirect(texte, langue, source))
  file = tache.catch(() => {}).then(() => new Promise(r => setTimeout(r, 250)))
  return tache
}
