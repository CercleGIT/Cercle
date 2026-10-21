create table blocks (
  blocker uuid not null references profiles(id) on delete cascade,
  blocked uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create table admins (
  user_id uuid primary key references profiles(id) on delete cascade
);
alter table blocks enable row level security;
alter table admins enable row level security;

create policy "voir mes blocages" on blocks for select to authenticated using (blocker = auth.uid());
create policy "bloquer" on blocks for insert to authenticated with check (blocker = auth.uid());
create policy "debloquer" on blocks for delete to authenticated using (blocker = auth.uid());
create policy "suis-je admin" on admins for select to authenticated using (user_id = auth.uid());

create function public.est_bloque(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;
create function public.est_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create policy "admin lit les posts" on posts for select to authenticated using (public.est_admin());
create policy "admin supprime les posts" on posts for delete to authenticated using (public.est_admin());
create policy "admin supprime les commentaires" on comments for delete to authenticated using (public.est_admin());
create policy "admin lit les signalements" on reports for select to authenticated using (public.est_admin());
create policy "admin traite les signalements" on reports for delete to authenticated using (public.est_admin());

create policy "masquer posts bloques" on posts as restrictive for select to authenticated using (not public.est_bloque(auth.uid(), auteur));
create policy "masquer commentaires bloques" on comments as restrictive for select to authenticated using (not public.est_bloque(auth.uid(), auteur));
create policy "masquer stories bloquees" on stories as restrictive for select to authenticated using (not public.est_bloque(auth.uid(), auteur));
create policy "pas de message a un bloque" on messages as restrictive for insert to authenticated with check (not public.est_bloque(auth.uid(), destinataire));
create policy "pas de demande a un bloque" on friendships as restrictive for insert to authenticated with check (not public.est_bloque(auth.uid(), destinataire));

alter table posts add constraint posts_texte_court check (char_length(coalesce(texte, '')) <= 5000);
alter table posts add constraint posts_image_legere check (char_length(coalesce(image_url, '')) <= 700000);
alter table comments add constraint comments_texte_court check (char_length(texte) <= 1000);
alter table messages add constraint messages_texte_court check (char_length(texte) <= 2000);
alter table stories add constraint stories_image_legere check (char_length(image_url) <= 600000);
alter table profiles add constraint profiles_bio_courte check (char_length(coalesce(bio, '')) <= 500);
alter table profiles add constraint profiles_avatar_leger check (char_length(coalesce(avatar_url, '')) <= 100000);
create unique index reports_un_par_membre on reports(post_id, auteur);
