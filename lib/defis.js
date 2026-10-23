// Un défi mondial par jour, le même pour tout le monde (jour UTC).
export const DEFIS = [
  ['🎤', 'Chante 15 secondes', 'Chante un extrait de ta chanson préférée.'],
  ['💃', 'Un pas de danse', 'Montre un pas de danse, simple ou spectaculaire.'],
  ['🍳', 'Ma recette express', 'Montre un plat préparé en moins de 15 minutes.'],
  ['✏️', 'Dessine ton quartier', 'Un dessin de ta rue, de ta maison ou de ton coin préféré.'],
  ['😂', 'Fais rire en 10 secondes', 'Une blague, une grimace, une mini-scène drôle.'],
  ['⚽', 'Jongle ou dribble', 'Montre ta technique avec un ballon (ou ce que tu as sous la main).'],
  ['📷', 'Ta plus belle photo du jour', 'Une photo que tu as prise aujourd’hui.'],
  ['🎸', 'Joue d’un instrument', 'Quelques notes suffisent. Même une casserole fait l’affaire.'],
  ['🗣️', 'Un mot de ta langue', 'Apprends à la communauté un mot ou une expression de chez toi.'],
  ['🌍', 'Montre ta ville', 'Fais découvrir un lieu de ta ville ou de ton village.'],
  ['🧶', 'Fait main', 'Présente une création que tu as faite de tes mains.'],
  ['💪', 'Ta routine sportive', 'Montre un exercice que tu aimes faire.'],
  ['📚', 'Un livre ou une idée', 'Recommande un livre, un film ou une idée qui t’a marqué.'],
  ['👗', 'Ta tenue du jour', 'Montre ton style, traditionnel ou moderne.'],
  ['🎨', 'Couleur du jour', 'Une peinture, un objet ou un décor autour d’une seule couleur.'],
  ['🧩', 'Une astuce que tu maîtrises', 'Partage une astuce utile en moins d’une minute.'],
  ['🐾', 'Mon compagnon', 'Présente ton animal (ou celui du quartier !).'],
  ['🌅', 'Le ciel d’aujourd’hui', 'Une photo ou une vidéo du ciel là où tu es.'],
  ['🎬', 'Mini-scène', 'Joue une courte scène de théâtre ou de film.'],
  ['🍲', 'Un plat de chez toi', 'Fais découvrir un plat traditionnel de ta région.'],
  ['🎶', 'Rythme et beatbox', 'Fais un rythme avec ta bouche, tes mains ou des objets.'],
  ['🛠️', 'Répare ou invente', 'Montre quelque chose que tu as réparé ou inventé.'],
  ['🤝', 'Dis merci', 'Remercie publiquement quelqu’un qui t’a aidé.'],
  ['🏠', 'Ton coin préféré', 'Montre l’endroit où tu te sens le mieux chez toi.'],
  ['🌱', 'Ta plante ou ton jardin', 'Présente ce qui pousse autour de toi.'],
  ['🧠', 'Un fait surprenant', 'Partage quelque chose d’étonnant que tu as appris.'],
  ['🎭', 'Imite quelqu’un', 'Une voix, une démarche, un personnage célèbre.'],
  ['🚀', 'Ton projet, ton rêve', 'Présente ce que tu construis ou ce que tu veux réaliser.'],
  ['💼', 'Présente ton métier ou ton service', 'Montre ce que tu sais faire et comment te contacter.'],
  ['🏆', 'Ton talent caché', 'Surprends-nous avec un talent que personne ne connaît.'],
]

export const jourUTC = (d = new Date()) => d.toISOString().slice(0, 10)
export const jourPrecedent = (jour, n = 1) => new Date(new Date(jour + 'T00:00:00Z').getTime() - n * 86400000).toISOString().slice(0, 10)
export function defiDuJour(jour = jourUTC()) {
  const n = Math.floor(new Date(jour + 'T00:00:00Z').getTime() / 86400000)
  const [emoji, titre, description] = DEFIS[((n % DEFIS.length) + DEFIS.length) % DEFIS.length]
  return { emoji, titre, description, jour }
}
export function tempsRestant() {
  const fin = new Date(jourUTC() + 'T00:00:00Z').getTime() + 86400000
  const m = Math.max(0, Math.floor((fin - Date.now()) / 60000))
  return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'
}
