# Cercle : mise en ligne pas à pas

## 1. Créer la base (15 min, gratuit)
1. Crée un compte sur supabase.com, puis un projet (région Europe).
2. Ouvre **SQL Editor**, colle le contenu de `schema.sql`, clique sur **Run**.
3. Dans **Authentication > Providers**, active E-mail (et Google si tu veux).
4. Dans **Project Settings > API**, note l'URL du projet et la clé `anon`.

## 2. Lancer l'application (le projet est complet)
```bash
npm install
cp .env.example .env.local   # puis colle ton URL et ta clé anon
npm run dev
```
Ouvre http://localhost:3000. Inscris-toi, puis utilise Fil, Amis et Groupes.

Contenu : `app/login` (inscription, connexion), `app/page.js` (fil), `app/amis`, `app/groupes` et `app/groupes/[id]` (fil du groupe), `components/` (menu, publications), `schema.sql` (base et sécurité).

## 3. Requêtes clés (déjà utilisées dans le code)
- Chercher un membre : `supabase.from('profiles').select('id,nom').ilike('nom', '%texte%')`
- Demander en ami : `supabase.from('friendships').insert({ demandeur: userId, destinataire: id })`
- Accepter : `supabase.from('friendships').update({ statut: 'accepte' }).eq('id', demandeId)`
- Créer un groupe : insérer dans `groups`, puis dans `group_members` avec `role: 'admin'`
- Fil d'un groupe : `supabase.from('posts').select('*, profiles(nom)').eq('group_id', id).order('created_at', { ascending: false })`

## 4. Mettre en ligne
1. Pousse le code sur GitHub.
2. Sur vercel.com, importe le dépôt et ajoute les deux variables d'environnement.
3. Clique sur **Deploy** : tu obtiens une adresse publique.

## 5. Avant d'ouvrir au public (France / UE)
- Mentions légales, CGU et politique de confidentialité (RGPD).
- Bouton de signalement (table `reports` prête) et modération des contenus.
- Interdire l'inscription aux moins de 15 ans, sauf accord parental.
- Sauvegardes régulières de la base.
