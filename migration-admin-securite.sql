create table mots_interdits (
  id bigint generated always as identity primary key,
  mot text not null unique check (char_length(mot) between 3 and 80),
  categorie text not null default 'autre',
  actif boolean not null default true
);
create table alertes (
  id bigint generated always as identity primary key,
  type text not null,
  cible_id bigint,
  auteur uuid references profiles(id) on delete cascade,
  extrait text,
  motif text,
  categorie text,
  traitee boolean not null default false,
  created_at timestamptz not null default now()
);
alter table mots_interdits enable row level security;
alter table alertes enable row level security;

create policy "admin gere les mots" on mots_interdits for all to authenticated using (public.est_admin()) with check (public.est_admin());
create policy "admin voit les alertes" on alertes for select to authenticated using (public.est_admin());
create policy "admin traite les alertes" on alertes for update to authenticated using (public.est_admin());
create policy "admin supprime les alertes" on alertes for delete to authenticated using (public.est_admin());

insert into mots_interdits (mot, categorie) values
  ('je vais te tuer', 'menace'), ('je vais vous tuer', 'menace'), ('tu vas mourir', 'menace'), ('on va te tuer', 'menace'), ('je vais te frapper', 'menace'),
  ('mort aux', 'haine'), ('sale race', 'haine'),
  ('western union', 'arnaque'), ('moneygram', 'arnaque'), ('investissement garanti', 'arnaque'), ('doublez votre argent', 'arnaque'),
  ('gagner de l''argent facilement', 'arnaque'), ('envoyez de l''argent', 'arnaque'), ('envoie ton code', 'arnaque'), ('paiement à l''avance', 'arnaque'),
  ('cocaïne', 'drogue'), ('héroïne', 'drogue'), ('vente de drogue', 'drogue'), ('cannabis à vendre', 'drogue'), ('méthamphétamine', 'drogue'),
  ('arme à vendre', 'arme'), ('vente d''armes', 'arme'), ('pistolet à vendre', 'arme'), ('kalachnikov', 'arme'),
  ('escort', 'sexuel'), ('sexe contre', 'sexuel'), ('vidéo porno', 'sexuel'),
  ('pédopornographie', 'mineurs')
on conflict (mot) do nothing;

create function public.alerter_contenu() returns trigger language plpgsql security definer set search_path = public as $$
declare t text; aut uuid; kind text; m record; liste text := ''; cat text;
begin
  begin
    if tg_table_name = 'posts' then
      t := coalesce(new.texte, ''); aut := new.auteur; kind := 'publication';
    elsif tg_table_name = 'comments' then
      t := coalesce(new.texte, ''); aut := new.auteur; kind := 'commentaire';
    else
      t := coalesce(new.titre, '') || ' ' || coalesce(new.description, ''); aut := new.vendeur; kind := 'annonce';
    end if;
    if length(t) >= 3 and not exists (select 1 from admins where user_id = aut) then
      for m in select mot, categorie from mots_interdits where actif and position(lower(mot) in lower(t)) > 0 limit 5 loop
        liste := liste || case when liste = '' then '' else ', ' end || m.mot;
        cat := m.categorie;
      end loop;
      if liste <> '' then
        insert into alertes(type, cible_id, auteur, extrait, motif, categorie) values (kind, new.id, aut, left(t, 300), liste, cat);
        insert into notifications(user_id, texte, lien) select user_id, '⚠️ Contenu suspect détecté (' || cat || ')', '/admin' from admins;
      end if;
    end if;
  exception when others then
    null;
  end;
  return new;
end $$;
create trigger alerte_posts after insert on posts for each row execute function public.alerter_contenu();
create trigger alerte_comments after insert on comments for each row execute function public.alerter_contenu();
create trigger alerte_annonces after insert on annonces for each row execute function public.alerter_contenu();

create function public.liste_utilisateurs(recherche text default '', limite int default 30, decalage int default 0)
returns table (id uuid, nom text, email text, inscrit_le timestamptz, derniere_connexion timestamptz, prenom text, nom_famille text,
  date_naissance date, pays text, telephone text, nb_publications bigint, nb_signalements bigint, verifie boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.est_admin() then
    raise exception 'acces refuse';
  end if;
  return query
  select p.id, p.nom, u.email::text, u.created_at, u.last_sign_in_at, i.prenom, i.nom_famille, i.date_naissance, i.pays, i.telephone,
    (select count(*) from posts x where x.auteur = p.id),
    (select count(*) from reports r join posts x on x.id = r.post_id where x.auteur = p.id),
    p.verifie
  from profiles p
  join auth.users u on u.id = p.id
  left join infos_privees i on i.user_id = p.id
  where recherche = '' or p.nom ilike '%' || recherche || '%' or u.email ilike '%' || recherche || '%' or i.telephone like '%' || recherche || '%'
  order by u.created_at desc
  limit least(limite, 100) offset decalage;
end $$;
