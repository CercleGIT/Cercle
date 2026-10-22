select
  (select count(*) from information_schema.columns where table_name = 'annonces' and column_name = 'pays') as colonne_pays,
  (select count(*) from pg_policies where tablename = 'annonces') as regles_annonces,
  (select count(*) from pg_policies where policyname = 'ecrire acheteur vendeur') as regle_messages;
