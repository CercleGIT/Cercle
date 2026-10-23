export const CATEGORIES_CREATEURS = [
  ['musique', '🎵 Musique'], ['danse', '💃 Danse'], ['arts', '🎨 Arts visuels'], ['photo', '📷 Photo et vidéo'],
  ['cuisine', '🍳 Cuisine'], ['mode', '👗 Mode et beauté'], ['sport', '💪 Sport et coaching'], ['spectacle', '🎭 Humour et spectacle'],
  ['artisanat', '🧶 Artisanat'], ['ecriture', '✍️ Écriture'], ['tech', '💻 Tech et numérique'], ['education', '📚 Éducation'],
  ['business', '💼 Services et business'], ['autre', '✨ Autre'],
]
export const nomCategorieCreateur = c => (CATEGORIES_CREATEURS.find(x => x[0] === c) || [null, c])[1]
