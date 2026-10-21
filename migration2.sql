create table reactions (
  post_id bigint references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  emoji text not null,
  primary key (post_id, user_id)
);
create table stories (
  id bigint generated always as identity primary key,
  auteur uuid not null references profiles(id) on delete cascade,
  image_url text not null,
  texte text,
  created_at timestamptz default now()
);
alter table posts add column partage_de bigint references posts(id) on delete set null;

alter table reactions enable row level security;
alter table stories enable row level security;

create policy "lire reactions" on reactions for select to authenticated using (exists (select 1 from posts p where p.id = post_id));
create policy "reagir" on reactions for insert to authenticated with check (user_id = auth.uid());
create policy "changer reaction" on reactions for update to authenticated using (user_id = auth.uid());
create policy "retirer reaction" on reactions for delete to authenticated using (user_id = auth.uid());

create policy "voir stories" on stories for select to authenticated using (
  created_at > now() - interval '24 hours' and (auteur = auth.uid() or exists (
    select 1 from friendships f where f.statut = 'accepte' and (
      (f.demandeur = auth.uid() and f.destinataire = stories.auteur) or
      (f.destinataire = auth.uid() and f.demandeur = stories.auteur)))));
create policy "publier story" on stories for insert to authenticated with check (auteur = auth.uid());
create policy "supprimer ma story" on stories for delete to authenticated using (auteur = auth.uid());

create function public.trg_notif_reaction() returns trigger language plpgsql security definer set search_path = public as $$
declare qui text; dest uuid;
begin
  select nom into qui from profiles where id = new.user_id;
  select auteur into dest from posts where id = new.post_id;
  if dest is not null and dest is distinct from auth.uid() then
    insert into notifications(user_id, texte, lien) values (dest, qui || ' a réagi à ta publication.', '/');
  end if;
  return new;
end $$;
create trigger notif_reaction after insert on reactions for each row execute function public.trg_notif_reaction();
