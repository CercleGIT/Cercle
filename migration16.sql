create table defis_groupe (
  id bigint generated always as identity primary key,
  group_id bigint not null references groups(id) on delete cascade,
  createur uuid not null references profiles(id) on delete cascade,
  titre text not null check (char_length(titre) between 3 and 100),
  description text check (char_length(coalesce(description, '')) <= 500),
  fin date not null,
  created_at timestamptz default now()
);
create table participations_groupe (
  id bigint generated always as identity primary key,
  defi_id bigint not null references defis_groupe(id) on delete cascade,
  auteur uuid not null references profiles(id) on delete cascade,
  texte text check (char_length(coalesce(texte, '')) <= 500),
  image_url text check (char_length(coalesce(image_url, '')) <= 700000),
  video_url text,
  created_at timestamptz default now(),
  unique (defi_id, auteur)
);
create table votes_groupe (
  participation_id bigint not null references participations_groupe(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (participation_id, user_id)
);
alter table defis_groupe enable row level security;
alter table participations_groupe enable row level security;
alter table votes_groupe enable row level security;

create function public.groupe_du_defi(did bigint) returns bigint language sql stable security definer set search_path = public as $$
  select group_id from defis_groupe where id = did;
$$;
create function public.groupe_de_participation(pid bigint) returns bigint language sql stable security definer set search_path = public as $$
  select d.group_id from participations_groupe p join defis_groupe d on d.id = p.defi_id where p.id = pid;
$$;
create function public.defi_ouvert(did bigint) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select fin >= (now() at time zone 'utc')::date from defis_groupe where id = did), false);
$$;

create policy "voir defis de groupe" on defis_groupe for select to authenticated using (public.est_membre_groupe(group_id));
create policy "lancer defi de groupe" on defis_groupe for insert to authenticated with check (createur = auth.uid() and public.est_admin_groupe(group_id));
create policy "supprimer defi de groupe" on defis_groupe for delete to authenticated using (public.est_admin_groupe(group_id));

create policy "voir participations de groupe" on participations_groupe for select to authenticated using (public.est_membre_groupe(public.groupe_du_defi(defi_id)));
create policy "participer au defi de groupe" on participations_groupe for insert to authenticated with check (
  auteur = auth.uid() and public.est_membre_groupe(public.groupe_du_defi(defi_id)) and public.defi_ouvert(defi_id));
create policy "supprimer participation de groupe" on participations_groupe for delete to authenticated using (
  auteur = auth.uid() or public.est_admin_groupe(public.groupe_du_defi(defi_id)));

create policy "voir votes de groupe" on votes_groupe for select to authenticated using (public.est_membre_groupe(public.groupe_de_participation(participation_id)));
create policy "voter dans le groupe" on votes_groupe for insert to authenticated with check (
  user_id = auth.uid() and public.est_membre_groupe(public.groupe_de_participation(participation_id))
  and not exists (select 1 from participations_groupe p where p.id = participation_id and p.auteur = auth.uid()));
create policy "retirer vote de groupe" on votes_groupe for delete to authenticated using (user_id = auth.uid());

create function public.trg_notif_defi_groupe() returns trigger language plpgsql security definer set search_path = public as $$
declare nomg text;
begin
  select nom into nomg from groups where id = new.group_id;
  insert into notifications(user_id, texte, lien)
  select m.user_id, 'Nouveau défi dans le groupe ' || nomg || ' : ' || new.titre, '/groupes/' || new.group_id
  from group_members m where m.group_id = new.group_id and m.user_id <> new.createur;
  return new;
end $$;
create trigger notif_defi_groupe after insert on defis_groupe for each row execute function public.trg_notif_defi_groupe();
