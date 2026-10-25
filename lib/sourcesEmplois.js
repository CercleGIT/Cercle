// type : 'emploi' ou 'opportunite' | jeunes : true = source deja destinee aux jeunes
// pays : (facultatif) pays fixe pour toute la source
export const SOURCES_EMPLOIS = [
  { nom: 'We Work Remotely', url: 'https://weworkremotely.com/remote-jobs.rss', type: 'emploi', zone: 'Télétravail (Europe / États-Unis)', jeunes: false },
  { nom: 'We Work Remotely - Marketing', url: 'https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss', type: 'emploi', zone: 'Télétravail (Europe / États-Unis)', jeunes: false },
  { nom: 'We Work Remotely - Design', url: 'https://weworkremotely.com/categories/remote-design-jobs.rss', type: 'emploi', zone: 'Télétravail (Europe / États-Unis)', jeunes: false },
  { nom: 'Remotive', url: 'https://remotive.com/remote-jobs/feed', type: 'emploi', zone: 'Télétravail (Europe / États-Unis)', jeunes: false },
  { nom: 'Opportunity Desk', url: 'https://opportunitydesk.org/feed/', type: 'opportunite', zone: 'Monde (bourses, stages, programmes)', jeunes: true },
  { nom: 'Arbeitnow Europe', url: 'https://www.arbeitnow.com/api/job-board-api', format: 'arbeitnow', type: 'emploi', zone: 'Europe', jeunes: false },
  { nom: 'Arbeitnow Royaume-Uni', url: 'https://www.arbeitnow.co.uk/api/job-board-api', format: 'arbeitnow', type: 'emploi', zone: 'Royaume-Uni', pays: 'royaume-uni', jeunes: false },
]

// Noms a utiliser dans la variable EMPLOIS_PAYS (separes par des virgules)
export const PAYS = {
  'france': /france|paris|lyon|marseille|toulouse|bordeaux|lille|nantes|nice\b/i,
  'allemagne': /german|deutschland|berlin|munich|münchen|hamburg|frankfurt|köln|cologne|stuttgart|düsseldorf|leipzig/i,
  'royaume-uni': /united kingdom|\buk\b|england|scotland|wales|london|manchester|birmingham|edinburgh|glasgow/i,
  'espagne': /spain|españa|madrid|barcelona|valencia|sevilla/i,
  'pays-bas': /netherlands|nederland|amsterdam|rotterdam|utrecht|eindhoven|the hague/i,
  'italie': /italy|italia|milan|milano|rome|roma|turin|torino/i,
  'pologne': /poland|polska|warsaw|warszawa|krak[oó]w|wroc[lł]aw|gda[nń]sk/i,
  'belgique': /belgium|belgique|brussels|bruxelles|antwerp|ghent/i,
  'suisse': /switzerland|schweiz|suisse|zurich|zürich|geneva|genève|basel|bern/i,
  'irlande': /ireland|dublin|cork|galway/i,
  'etats-unis': /\busa\b|u\.s\.|united states|north america|new york|california|texas|san francisco|seattle|boston|chicago/i,
}

// Noms a utiliser dans la variable EMPLOIS_DOMAINES (separes par des virgules)
export const DOMAINES = {
  'informatique': /software|developer|développeur|developpeur|devops|python|javascript|react|backend|back-end|frontend|front-end|full[- ]?stack|cyber|data scien|data analy|data engineer|informatique|machine learning|artificial intelligence|intelligence artificielle|entwickler/i,
  'sante': /health|nurse|nursing|medical|medicine|pharma|clinic|hospital|santé|sante|infirm|médec|medec|pflege|gesundheit/i,
  'commerce': /marketing|sales|commercial|vente|business develop|customer|account manager|vertrieb/i,
  'ingenierie': /engineer|ingénieur|ingenieur|mechanical|electrical|civil|industrial|manufactur|ingenieur/i,
  'education': /teacher|teaching|education|tutor|professeur|enseign|school|lehrer|research assistant|phd|postdoc/i,
  'design': /design|ux|ui designer|graphic|illustrat|creative|créatif|motion/i,
  'finance': /finance|account|audit|banking|bank|comptab|investment|treasury|tax/i,
  'environnement': /environment|climate|sustainab|energy|renewable|environnement|climat|durable|énergie|energie/i,
}
