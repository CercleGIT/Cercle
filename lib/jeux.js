// Catalogue des jeux. Pour ajouter un jeu : déposer son fichier HTML dans public/jeux/ et l'ajouter ici.
// Le jeu envoie son score à Cercle avec : window.parent.postMessage({ type: 'cercle-score', jeu: '<id>', score }, window.location.origin)
export const JEUX = [
  {
    id: 'cercle-city',
    nom: 'Cercle City',
    emoji: '🏙️',
    description: 'Monde ouvert vu de dessus : traverse la ville, conduis 3 véhicules et livre un maximum de colis en 3 minutes.',
    fichier: '/jeux/cercle-city.html',
    hauteur: 'clamp(560px, 140vw, 780px)',
  },
  {
    id: 'cyber-arena',
    nom: 'Cyber Arena',
    emoji: '🚀',
    description: 'Détruis les drones ennemis avant qu’ils ne t’atteignent. Clavier (flèches + espace) ou boutons tactiles.',
    fichier: '/jeux/cyber-arena.html',
  },
]
export const trouverJeu = id => JEUX.find(j => j.id === id)
