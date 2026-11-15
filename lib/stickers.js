// Autocollants animés (dessinés avec des emojis et des animations, sans aucune image à envoyer).
// Un autocollant est envoyé comme un message dont le texte est ::sticker:identifiant::
export const STICKERS = [
  { id: 'bonjour', emoji: '👋', texte: 'Bonjour !', anim: 'wave', de: '#60a5fa', a: '#2563eb' },
  { id: 'salut', emoji: '😄', texte: 'Salut !', anim: 'bounce', de: '#fbbf24', a: '#f97316' },
  { id: 'merci', emoji: '🙏', texte: 'Merci !', anim: 'pulse', de: '#34d399', a: '#059669' },
  { id: 'bravo', emoji: '👏', texte: 'Bravo !', anim: 'pop', de: '#f472b6', a: '#db2777' },
  { id: 'coeur', emoji: '❤️', texte: 'Je t’aime', anim: 'pulse', de: '#fb7185', a: '#e11d48' },
  { id: 'mdr', emoji: '😂', texte: 'MDR', anim: 'shake', de: '#fde047', a: '#f59e0b' },
  { id: 'wow', emoji: '😮', texte: 'Wow !', anim: 'pop', de: '#a78bfa', a: '#7c3aed' },
  { id: 'top', emoji: '👍', texte: 'Top !', anim: 'bounce', de: '#4ade80', a: '#16a34a' },
  { id: 'fete', emoji: '🥳', texte: 'On fête ça !', anim: 'spin', de: '#f0abfc', a: '#c026d3' },
  { id: 'feu', emoji: '🔥', texte: 'En feu !', anim: 'flicker', de: '#fb923c', a: '#dc2626' },
  { id: 'triste', emoji: '😢', texte: 'Triste', anim: 'float', de: '#93c5fd', a: '#3b82f6' },
  { id: 'colere', emoji: '😡', texte: 'Grrr', anim: 'shake', de: '#f87171', a: '#b91c1c' },
  { id: 'cool', emoji: '😎', texte: 'Cool', anim: 'bounce', de: '#22d3ee', a: '#0891b2' },
  { id: 'bisou', emoji: '😘', texte: 'Bisou', anim: 'pulse', de: '#f9a8d4', a: '#ec4899' },
  { id: 'nuit', emoji: '😴', texte: 'Bonne nuit', anim: 'float', de: '#6366f1', a: '#312e81' },
  { id: 'courage', emoji: '💪', texte: 'Courage !', anim: 'pop', de: '#fdba74', a: '#ea580c' },
  { id: 'oui', emoji: '✅', texte: 'Oui !', anim: 'pop', de: '#86efac', a: '#15803d' },
  { id: 'non', emoji: '❌', texte: 'Non', anim: 'shake', de: '#fca5a5', a: '#b91c1c' },
  { id: 'fusee', emoji: '🚀', texte: 'C’est parti !', anim: 'float', de: '#818cf8', a: '#4338ca' },
  { id: 'champion', emoji: '🏆', texte: 'Champion !', anim: 'bounce', de: '#fcd34d', a: '#d97706' },
  { id: 'allez', emoji: '⚽', texte: 'Allez !', anim: 'spin', de: '#6ee7b7', a: '#047857' },
  { id: 'surprise', emoji: '🎁', texte: 'Surprise !', anim: 'shake', de: '#c084fc', a: '#9333ea' },
  { id: 'argent', emoji: '💰', texte: 'Cha-ching', anim: 'bounce', de: '#bef264', a: '#65a30d' },
  { id: 'hmm', emoji: '🤔', texte: 'Hmm…', anim: 'float', de: '#cbd5e1', a: '#64748b' },
]

export const codeSticker = id => '::sticker:' + id + '::'

// Renvoie l'identifiant si le texte est un autocollant, sinon null
export function idSticker(texte) {
  const m = /^::sticker:([a-z0-9_]+)::$/.exec(String(texte || '').trim())
  return m && STICKERS.some(s => s.id === m[1]) ? m[1] : null
}
