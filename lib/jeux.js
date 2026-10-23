// Catalogue des jeux. Pour ajouter un jeu : déposer son fichier HTML dans public/jeux/ et l'ajouter ici.
export const JEUX = [
  {
    id: 'cyber-arena',
    nom: 'Cyber Arena',
    emoji: '🚀',
    description: 'Détruis les drones ennemis avant qu’ils ne t’atteignent. Clavier (flèches + espace) ou boutons tactiles.',
    fichier: '/jeux/cyber-arena.html',
  },
]
export const trouverJeu = id => JEUX.find(j => j.id === id)
