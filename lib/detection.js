// Détection simple et gratuite de la langue d'un texte (sans service extérieur).
// Renvoie un code (fr, en, pt, es, sw, ar) ou null si on n'est pas sûr.
const LISTES = {
  fr: 'le la les des du de un une et est sont que qui pour dans pas sur avec je tu il elle nous vous ils ce cette mon ma mes au aux en ne plus comme mais ou où très bien merci bonjour salut être avoir fait pays sans entre après selon aussi'.split(' '),
  en: 'the and is are of to in that it for with you this on not be have was but they we your from at by an or what so just my me i will has had been their there about which would after more'.split(' '),
  pt: 'não uma para com os as mais está são que você muito obrigado olá em do da dos das no na um por como mas ele ela também'.split(' '),
  es: 'el los las una que de y en un por con para es no se su al lo pero más muy gracias hola como está están también'.split(' '),
  sw: 'na ya wa kwa ni katika hii hiyo yetu sana asante habari kuwa za la cha vya hapa pia lakini mimi wewe sisi'.split(' '),
}
const PARTAGES = {}
for (const [l, mots] of Object.entries(LISTES)) for (const m of mots) (PARTAGES[m] = PARTAGES[m] || new Set()).add(l)

export function detecterLangue(texte) {
  const t = String(texte || '').toLowerCase()
  const lettres = (t.match(/\p{L}/gu) || []).length
  if (lettres < 8) return null
  const arabes = (t.match(/[\u0600-\u06FF]/g) || []).length
  if (arabes / lettres > 0.4) return 'ar'
  const mots = t.match(/\p{L}+/gu) || []
  const score = {}
  for (const m of mots) {
    const ls = PARTAGES[m]
    if (ls) for (const l of ls) score[l] = (score[l] || 0) + 1 / ls.size
  }
  const elisions = (t.match(/(^|\s)(l|d|j|qu|c|s|n|m)['’]\p{L}/gu) || []).length
  if (elisions) score.fr = (score.fr || 0) + elisions
  if (/[ãõ]/.test(t)) score.pt = (score.pt || 0) + 2
  if (/[ñ¿¡]/.test(t)) score.es = (score.es || 0) + 2
  if (/[àâçéèêëîïôùûœ]/.test(t)) score.fr = (score.fr || 0) + 0.7
  const tri = Object.entries(score).sort((a, b) => b[1] - a[1])
  if (!tri.length) return null
  const [meilleur, s1] = tri[0]
  const s2 = tri[1] ? tri[1][1] : 0
  return s1 >= Math.max(1.5, mots.length * 0.12) && s1 >= s2 * 1.4 ? meilleur : null
}
