import Legal from '@/components/Legal'

export const metadata = { title: 'Mentions légales – Cercle' }

export default function Page() {
  return (
    <Legal titre="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>Le site Cercle est édité par <mark>[À COMPLÉTER : ton nom complet ou la raison sociale de ta structure]</mark>, <mark>[À COMPLÉTER : adresse postale, ville, pays]</mark>.</p>
      <p>Contact : <mark>[À COMPLÉTER : adresse e-mail de contact]</mark></p>
      <p>Directeur de la publication : <mark>[À COMPLÉTER : ton nom]</mark></p>
      <p><mark>[À COMPLÉTER SI TU ES UNE ENTREPRISE : numéro d’immatriculation (RCCM, IFU ou équivalent)]</mark></p>

      <h2>Hébergement</h2>
      <p>Le site est hébergé par Vercel Inc. (États-Unis). Les données du réseau (comptes, publications, messages, images) sont stockées par Supabase Inc., sur des serveurs situés en Irlande (région AWS eu-west-1).</p>

      <h2>Propriété intellectuelle</h2>
      <p>Le nom Cercle, son logo et le code du site sont la propriété de l’éditeur. Les contenus publiés par les membres (textes, photos, messages) restent la propriété de leurs auteurs, qui en assument la responsabilité.</p>

      <h2>Signaler un contenu</h2>
      <p>Tout membre peut signaler une publication depuis le bouton « Signaler ». Pour toute demande de retrait d’un contenu illicite, écris à l’adresse de contact ci-dessus.</p>

      <h2>Données personnelles</h2>
      <p>Le traitement de tes données est décrit dans la <a href="/confidentialite">politique de confidentialité</a>.</p>
    </Legal>
  )
}
