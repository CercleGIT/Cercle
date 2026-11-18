// Pays, indicatifs téléphoniques et outils pour l'inscription
const RETIRE0 = ['FR', 'BE', 'CH', 'LU', 'DE', 'GB', 'IE', 'NL', 'MA', 'DZ', 'TN']
const LISTE = [
  ['BJ', 'Bénin', '229'], ['TG', 'Togo', '228'], ['CI', 'Côte d’Ivoire', '225'], ['SN', 'Sénégal', '221'], ['BF', 'Burkina Faso', '226'],
  ['ML', 'Mali', '223'], ['NE', 'Niger', '227'], ['GN', 'Guinée', '224'], ['CM', 'Cameroun', '237'], ['GA', 'Gabon', '241'],
  ['CG', 'Congo', '242'], ['CD', 'RD Congo', '243'], ['NG', 'Nigeria', '234'], ['GH', 'Ghana', '233'], ['MA', 'Maroc', '212'],
  ['DZ', 'Algérie', '213'], ['TN', 'Tunisie', '216'], ['EG', 'Égypte', '20'], ['KE', 'Kenya', '254'], ['TZ', 'Tanzanie', '255'],
  ['RW', 'Rwanda', '250'], ['BI', 'Burundi', '257'], ['MG', 'Madagascar', '261'], ['MU', 'Maurice', '230'], ['TD', 'Tchad', '235'],
  ['CF', 'Centrafrique', '236'], ['MR', 'Mauritanie', '222'], ['ZA', 'Afrique du Sud', '27'], ['ET', 'Éthiopie', '251'], ['AO', 'Angola', '244'],
  ['HT', 'Haïti', '509'], ['FR', 'France', '33'], ['BE', 'Belgique', '32'], ['CH', 'Suisse', '41'], ['LU', 'Luxembourg', '352'],
  ['DE', 'Allemagne', '49'], ['ES', 'Espagne', '34'], ['IT', 'Italie', '39'], ['PT', 'Portugal', '351'], ['NL', 'Pays-Bas', '31'],
  ['GB', 'Royaume-Uni', '44'], ['IE', 'Irlande', '353'], ['CA', 'Canada', '1'], ['US', 'États-Unis', '1'], ['BR', 'Brésil', '55'],
  ['MX', 'Mexique', '52'], ['CN', 'Chine', '86'], ['IN', 'Inde', '91'], ['JP', 'Japon', '81'], ['TR', 'Turquie', '90'],
  ['LB', 'Liban', '961'], ['SA', 'Arabie saoudite', '966'], ['AE', 'Émirats arabes unis', '971'],
].map(([code, nom, indicatif]) => ({ code, nom, indicatif }))

export const PAYS_TEL = [...LISTE].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).concat([{ code: 'XX', nom: 'Autre pays', indicatif: '' }])
export const trouverPays = code => PAYS_TEL.find(p => p.code === code) || null

// Âge en années à partir d'une date « AAAA-MM-JJ » (null si la date est invalide)
export function ageDe(dateTexte) {
  const d = new Date(dateTexte + 'T00:00:00')
  if (!dateTexte || isNaN(d.getTime())) return null
  const auj = new Date()
  let age = auj.getFullYear() - d.getFullYear()
  const m = auj.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && auj.getDate() < d.getDate())) age--
  return age
}

// Compose un numéro international (+indicatif…) ; renvoie null s'il est invalide
export function normaliserTelephone(codePays, saisie) {
  const p = trouverPays(codePays)
  const brut = String(saisie || '').trim()
  if (!p) return null
  let chiffres = brut.replace(/\D/g, '')
  if (brut.startsWith('+') || !p.indicatif) {
    // Numéro déjà saisi en format international
  } else {
    if (RETIRE0.includes(p.code)) chiffres = chiffres.replace(/^0/, '')
    chiffres = p.indicatif + chiffres
  }
  return chiffres.length >= 8 && chiffres.length <= 15 ? '+' + chiffres : null
}
