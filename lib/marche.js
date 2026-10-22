export const CATEGORIES = [
  ['vehicules', 'Véhicules'], ['immobilier', 'Immobilier et maison'], ['electronique', 'Électronique'],
  ['mode', 'Mode et beauté'], ['maison', 'Maison et jardin'], ['loisirs', 'Loisirs et sport'],
  ['services', 'Services et emploi'], ['autres', 'Autres'],
]
export const DEVISES = [['EUR', '€'], ['USD', '$']]

// Pays de vente et devise proposée par défaut (modifiable par le vendeur)
export const PAYS = [
  ['France', 'EUR'], ['Belgique', 'EUR'], ['Luxembourg', 'EUR'], ['Allemagne', 'EUR'], ['Espagne', 'EUR'],
  ['Italie', 'EUR'], ['Portugal', 'EUR'], ['Pays-Bas', 'EUR'], ['Irlande', 'EUR'],
  ['Bénin', 'EUR'], ['Togo', 'EUR'], ['Côte d’Ivoire', 'EUR'], ['Sénégal', 'EUR'], ['Burkina Faso', 'EUR'],
  ['Mali', 'EUR'], ['Niger', 'EUR'], ['Cameroun', 'EUR'], ['Gabon', 'EUR'], ['Congo', 'EUR'],
  ['États-Unis', 'USD'], ['Canada', 'USD'], ['Haïti', 'USD'], ['RD Congo', 'USD'], ['Nigeria', 'USD'], ['Ghana', 'USD'],
  ['Autre pays', 'EUR'],
]
export const devisePar = pays => (PAYS.find(p => p[0] === pays) || [null, 'EUR'])[1]
export const nomCategorie = c => (CATEGORIES.find(x => x[0] === c) || [null, c])[1]

export function formatPrix(prix, devise) {
  if (prix === null || prix === undefined || prix === '') return 'Prix à débattre'
  const n = Number(prix)
  if (n === 0) return 'Gratuit'
  const sym = (DEVISES.find(d => d[0] === devise) || [null, devise])[1]
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' ' + sym
}
