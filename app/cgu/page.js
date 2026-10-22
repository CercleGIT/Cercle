import Legal from '@/components/Legal'

export const metadata = { title: 'Conditions d’utilisation – Cercle' }

export default function Page() {
  return (
    <Legal titre="Conditions d’utilisation">
      <h2>1. Objet</h2>
      <p>Cercle est un réseau social qui permet de retrouver ses amis, de publier, de discuter, de créer des groupes et des événements. En créant un compte, tu acceptes les présentes conditions.</p>

      <h2>2. Accès et compte</h2>
      <p>Tu dois avoir au moins 16 ans. Tu t’engages à donner des informations exactes, à garder ton mot de passe secret et à ne pas créer de compte au nom d’une autre personne. Tu es responsable de l’activité de ton compte.</p>

      <h2>3. Règles de conduite</h2>
      <p>Il est interdit de publier ou d’envoyer :</p>
      <ul>
        <li>des contenus illégaux, ou qui portent atteinte aux droits d’autrui ;</li>
        <li>des propos haineux, des menaces, du harcèlement ou des insultes ;</li>
        <li>des contenus à caractère sexuel impliquant des mineurs, ou toute exploitation des mineurs ;</li>
        <li>des arnaques, du spam, des logiciels malveillants ou de la publicité non autorisée ;</li>
        <li>des informations privées sur d’autres personnes sans leur accord.</li>
      </ul>

      <h2>4. Tes contenus</h2>
      <p>Tu restes propriétaire de ce que tu publies. Tu autorises Cercle à les héberger et à les afficher aux personnes que tu choisis, uniquement pour faire fonctionner le service. Tu garantis avoir le droit de publier ces contenus.</p>

      <h2>5. Signalement et modération</h2>
      <p>Chaque membre peut signaler un contenu et bloquer un autre membre. L’éditeur peut supprimer un contenu qui enfreint ces règles, suspendre ou supprimer un compte, sans préavis en cas de manquement grave.</p>

      <h2>6. Suppression du compte</h2>
      <p>Tu peux supprimer ton compte à tout moment depuis la page Profil. Tes données sont alors effacées, sauf obligation légale de conservation.</p>

      <h2>7. Responsabilité</h2>
      <p>Le service est fourni « en l’état », sans garantie de disponibilité permanente. L’éditeur n’est pas responsable des contenus publiés par les membres, mais agit pour retirer promptement ceux qui lui sont signalés comme illicites.</p>

      <h2>Annonces et ventes entre membres (Cercle Marketplace)</h2>
      <p>Les membres peuvent publier des annonces. Cercle met seulement en relation vendeurs et acheteurs : Cercle n’est pas partie à la vente, ne garantit pas les objets ou services proposés et n’intervient pas dans les paiements. Il est interdit de proposer des armes, des drogues, des produits contrefaits ou volés, des animaux protégés, des contenus à caractère sexuel ou tout objet dont la vente est illégale. Les annonces trompeuses ou frauduleuses seront supprimées et les comptes concernés pourront être suspendus.</p>

      <h2>8. Modification des conditions</h2>
      <p>Ces conditions peuvent évoluer. En cas de changement important, les membres en seront informés sur le site.</p>

      <h2>9. Droit applicable</h2>
      <p>Les présentes conditions sont soumises au droit de <mark>[À COMPLÉTER : pays de l’éditeur, par exemple la République du Bénin]</mark>. En cas de litige, les tribunaux de <mark>[À COMPLÉTER : ville]</mark> sont compétents, sous réserve des droits dont tu disposes en tant que consommateur.</p>

      <h2>10. Contact</h2>
      <p><mark>[À COMPLÉTER : adresse e-mail de contact]</mark></p>
    </Legal>
  )
}
