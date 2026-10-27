// Rubriques du réseau : chacune a son propre fil, séparé du fil général
export const SECTIONS = {
  actualites: { id: 'actualites', nom: 'Actualités', emoji: '📰', route: '/actualites', description: 'Les informations du jour, publiées par Cercle Officiel et par les membres.', placeholder: 'Partage une information (avec la source si possible)' },
  opportunites: { id: 'opportunites', nom: 'Opportunités', emoji: '💼', route: '/opportunites', description: 'Emplois, stages, bourses, appels à projets, partenariats, clients : publie ou trouve une opportunité.', placeholder: 'Décris l’opportunité : poste, contact, date limite…' },
  sports: { id: 'sports', nom: 'Sports', emoji: '⚽', route: '/sports', description: 'Résultats, matchs, actualités et talents du sport.', placeholder: 'Partage un résultat, un match, une performance…' },
}
