create table createurs (
  user_id uuid primary key references profiles(id) on delete cascade,
  activite text not null check (char_length(activite) between 3 and 80),
  categorie text not null,
  description text check (char_length(coalesce(description, '')) <= 1500),
  ville text,
  pays text,
  contact_public text check (char_length(coalesce(contact_public, '')) <= 200),
  services jsonb not null default '[]' check (jsonb_typeof(services) = 'array' and char_length(services::text) <= 3000),
  actif boolean not null default true,
  created_at timestamptz default now()
);
create table realisations (
  id bigint generated always as identity primary key,
  auteur uuid not null references profiles(id) on delete cascade,
  titre text not null check (char_length(titre) between 2 and 100),
  description text check (char_length(coalesce(description, '')) <= 500),
  image_url text check (char_length(coalesce(image_url, '')) <= 700000),
  created_at timestamptz default now()
);
alter table createurs enable row level security;
alter table realisations enable row level security;

create policy "voir createurs" on createurs for select to authenticated using (actif or user_id = auth.uid());
create policy "creer mon profil createur" on createurs for insert to authenticated with check (user_id = auth.uid());
create policy "modifier mon profil createur" on createurs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "supprimer profil createur" on createurs for delete to authenticated using (user_id = auth.uid() or public.est_admin());
create policy "masquer createurs bloques" on createurs as restrictive for select to authenticated using (not public.est_bloque(auth.uid(), user_id));

create policy "voir realisations" on realisations for select to authenticated using (true);
create policy "ajouter realisation" on realisations for insert to authenticated with check (
  auteur = auth.uid() and (select count(*) from realisations r where r.auteur = auth.uid()) < 12);
create policy "supprimer realisation" on realisations for delete to authenticated using (auteur = auth.uid() or public.est_admin());
create policy "masquer realisations bloquees" on realisations as restrictive for select to authenticated using (not public.est_bloque(auth.uid(), auteur));

create function public.est_createur(dest uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from createurs where user_id = dest and actif);
$$;
create policy "ecrire a un createur" on messages for insert to authenticated with check (expediteur = auth.uid() and public.est_createur(destinataire));
