import Legal from '@/components/Legal'

export const metadata = { title: 'Politique de confidentialité – Cercle' }

export default function Page() {
  return (
    <Legal titre="Politique de confidentialité">
      <h2>Qui est responsable de tes données ?</h2>
      <p><mark>[À COMPLÉTER : ton nom ou ta raison sociale]</mark>, éditeur de Cercle, <mark>[À COMPLÉTER : adresse]</mark>. Contact pour toute question sur tes données : <mark>[À COMPLÉTER : e-mail]</mark>.</p>

      <h2>Quelles données collectons-nous ?</h2>
      <ul>
        <li><b>Compte</b> : adresse e-mail, mot de passe (stocké sous forme chiffrée), prénom.</li>
        <li><b>Profil</b> : photo, texte « à propos de moi » (facultatifs).</li>
        <li><b>Contenus</b> : publications, photos, commentaires, réactions, sondages, stories, messages privés, groupes et événements.</li>
        <li><b>Relations</b> : demandes d’amis, amitiés, membres bloqués, signalements.</li>
        <li><b>Position approximative</b> (facultatif) : uniquement si tu actives la fonction « À proximité », arrondie à environ 1 km.</li>
        <li><b>Profil créateur</b> (facultatif) : activité, présentation, services, réalisations et contact public que tu choisis de publier.</li>
        <li><b>Activité</b> : date de dernière activité (pour afficher « en ligne »), notifications.</li>
        <li><b>Données techniques</b> : adresse IP et journaux de connexion conservés par nos hébergeurs pour la sécurité.</li>
      </ul>

      <h2>Pourquoi ?</h2>
      <p>Uniquement pour faire fonctionner le réseau : créer ton compte, afficher tes contenus aux personnes que tu choisis, t’envoyer des notifications, assurer la sécurité et la modération. Nous ne vendons pas tes données et nous n’affichons pas de publicité.</p>

      <h2>Qui voit tes contenus ?</h2>
      <p>Les publications du fil général sont visibles par les membres connectés. Les publications d’un groupe sont visibles par ses membres. Les messages privés ne sont visibles que par toi et ton correspondant. Les stories sont visibles par tes amis et ne s’affichent plus après 24 heures. Un membre bloqué ne voit plus tes publications.</p>

      <h2>Combien de temps ?</h2>
      <p>Tes données sont conservées tant que ton compte existe. Si tu le supprimes, elles sont effacées, sauf obligation légale de conservation.</p>

      <h2>Cookies</h2>
      <p>Cercle utilise uniquement le stockage technique nécessaire pour te garder connecté. Il n’y a aucun cookie publicitaire ni outil de mesure d’audience.</p>

      <h2>Hébergeurs et transferts</h2>
      <p>Les données sont stockées chez Supabase Inc. (serveurs en Irlande) et le site est servi par Vercel Inc. (États-Unis). Tes données peuvent donc être traitées en dehors de ton pays.</p>

      <h2>Tes droits</h2>
      <p>Tu peux à tout moment accéder à tes données, les rectifier, les supprimer, t’opposer à leur traitement et demander leur portabilité :</p>
      <ul>
        <li>depuis la page <b>Profil</b> : modifier tes informations, <b>télécharger tes données</b> et <b>supprimer ton compte</b> ;</li>
        <li>ou en écrivant à l’adresse de contact ci-dessus.</li>
      </ul>
      <p>Si tu estimes que tes droits ne sont pas respectés, tu peux saisir l’autorité de protection des données de ton pays, par exemple l’Autorité de Protection des Données à caractère Personnel (APDP) au Bénin. <mark>[À COMPLÉTER : mentionne ici l’autorité compétente selon ton pays et celui de tes membres]</mark></p>
      <p><mark>[À COMPLÉTER SI APPLICABLE : « Le traitement a fait l’objet d’une déclaration auprès de l’APDP, numéro … »]</mark></p>

      <h2>Localisation (« À proximité »)</h2>
      <p>Cette fonction est facultative et désactivée par défaut. Si tu l’actives, ton navigateur te demande l’autorisation de te localiser. Nous enregistrons une position <b>arrondie à environ 1 km</b>, jamais ta position exacte. Les autres membres voient seulement une distance approximative (« à moins de X km »), et uniquement s’ils partagent aussi leur position et que tu as choisi de leur être visible (tous les membres, ou tes amis uniquement). Tu peux te masquer ou effacer ta position à tout moment depuis la page « À proximité ». Une position qui n’a pas été mise à jour depuis 30 jours n’est plus visible.</p>

      <h2>Mineurs</h2>
      <p>Cercle est réservé aux personnes de 16 ans et plus. Si tu penses qu’un mineur de moins de 16 ans s’est inscrit, signale-le à l’adresse de contact : le compte sera supprimé.</p>

      <h2>Sécurité</h2>
      <p>Les échanges sont chiffrés (HTTPS), les mots de passe sont stockés sous forme chiffrée et l’accès aux données est restreint par des règles de sécurité sur la base de données.</p>

      <h2>Modifications</h2>
      <p>Cette politique peut évoluer. La date de mise à jour figure en haut de la page.</p>
    </Legal>
  )
}
