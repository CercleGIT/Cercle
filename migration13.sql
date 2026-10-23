create table participations (
  id bigint generated always as identity primary key,
  jour date not null,
  auteur uuid not null references profiles(id) on delete cascade,
  texte text check (char_length(coalesce(texte, '')) <= 500),
  image_url text check (char_length(coalesce(image_url, '')) <= 700000),
  video_url text,
  created_at timestamptz default now(),
  unique (jour, auteur)
);
create table participation_votes (
  participation_id bigint not null references participations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (participation_id, user_id)
);
alter table participations enable row level security;
alter table participation_votes enable row level security;

create policy "voir participations" on participations for select to authenticated using (true);
create policy "participer au defi" on participations for insert to authenticated with check (auteur = auth.uid() and jour = (now() at time zone 'utc')::date);
create policy "supprimer participation" on participations for delete to authenticated using (auteur = auth.uid() or public.est_admin());
create policy "masquer participations bloquees" on participations as restrictive for select to authenticated using (not public.est_bloque(auth.uid(), auteur));

create policy "voir votes" on participation_votes for select to authenticated using (true);
create policy "voter" on participation_votes for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from participations p where p.id = participation_id and p.auteur <> auth.uid()));
create policy "retirer vote" on participation_votes for delete to authenticated using (user_id = auth.uid());

create function public.trg_notif_vote() returns trigger language plpgsql security definer set search_path = public as $$
declare qui text; dest uuid;
begin
  select nom into qui from profiles where id = new.user_id;
  select auteur into dest from participations where id = new.participation_id;
  if dest is not null and dest is distinct from auth.uid() then
    insert into notifications(user_id, texte, lien) values (dest, qui || ' a voté pour ta participation au défi.', '/defi');
  end if;
  return new;
end $$;
create trigger notif_vote after insert on participation_votes for each row execute function public.trg_notif_vote();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('defis-media', 'defis-media', true, 31457280, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;
create policy "lire media defis" on storage.objects for select using (bucket_id = 'defis-media');
create policy "envoyer media defis" on storage.objects for insert to authenticated with check (bucket_id = 'defis-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "supprimer mes media defis" on storage.objects for delete to authenticated using (bucket_id = 'defis-media' and (storage.foldername(name))[1] = auth.uid()::text);
