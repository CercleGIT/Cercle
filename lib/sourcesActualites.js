// Flux RSS utilisés par le robot d'actualités. Chaque flux a une rubrique : 'actualites' ou 'sports'.
// Vérifie toujours les conditions d'utilisation de chaque média avant de publier à grande échelle.
export const SOURCES = [
  { nom: 'RFI Afrique', url: 'https://www.rfi.fr/fr/afrique/rss', categorie: 'actualites' },
  { nom: 'France 24', url: 'https://www.france24.com/fr/rss', categorie: 'actualites' },
  { nom: 'Le Monde Afrique', url: 'https://www.lemonde.fr/afrique/rss_full.xml', categorie: 'actualites' },
  { nom: 'BBC Afrique (anglais)', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', categorie: 'actualites' },
  { nom: 'France 24 Sport', url: 'https://www.france24.com/fr/sports/rss', categorie: 'sports' },
  { nom: 'L’Équipe', url: 'https://www.lequipe.fr/rss/actu_rss.xml', categorie: 'sports' },
]
