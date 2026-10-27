alter table posts add column categorie text check (categorie in ('actualites', 'opportunites', 'sports'));
create index posts_categorie_idx on posts (categorie, created_at desc);
update posts set categorie = 'actualites' where categorie is null and texte like '📰 %' and auteur in (select id from profiles where officiel);
