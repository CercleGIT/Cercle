// Traduction gratuite via MyMemory, appelée depuis le navigateur de chaque membre
// (chaque appareil a sa propre limite quotidienne gratuite, aucune clé ni carte bancaire nécessaire).
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

export async function traduireTexte(texte, langue) {
  const sorties = []
  for (const bloc of decouper(String(texte).slice(0, 1500))) {
    if (!bloc.trim()) { sorties.push(bloc); continue }
    const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(bloc) + '&langpair=' + encodeURIComponent('Autodetect|' + langue)
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
