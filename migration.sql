create table comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references posts(id) on delete cascade,
  auteur uuid not null references profiles(id) on delete cascade,
  texte text not null,
  created_at timestamptz default now()
);
create table messages (
  id bigint generated always as identity primary key,
  expediteur uuid not null references profiles(id) on delete cascade,
  destinataire uuid not null references profiles(id) on delete cascade,
  texte text not null,
  created_at timestamptz default now()
);
create table events (
  id bigint generated always as identity primary key,
  titre text not null, description text, lieu text,
  date_event timestamptz not null,
  createur uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now()
);
create table event_participants (
  event_id bigint references events(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (event_id, user_id)
);
create table notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  texte text not null, lien text, lu boolean default false,
  created_at timestamptz default now()
);
alter table profiles add column bio text;

alter table comments enable row level security;
alter table messages enable row level security;
alter table events enable row level security;
alter table event_participants enable row level security;
alter table notifications enable row level security;

create policy "lire commentaires" on comments for select to authenticated using (exists (select 1 from posts p where p.id = post_id));
create policy "commenter" on comments for insert to authenticated with check (auteur = auth.uid());
create policy "supprimer mon commentaire" on comments for delete to authenticated using (auteur = auth.uid());

create policy "mes messages" on messages for select to authenticated using (auth.uid() in (expediteur, destinataire));
create policy "écrire a un ami" on messages for insert to authenticated with check (
  expediteur = auth.uid() and exists (select 1 from friendships f where f.statut = 'accepte' and (
    (f.demandeur = auth.uid() and f.destinataire = messages.destinataire) or
    (f.destinataire = auth.uid() and f.demandeur = messages.destinataire))));

create policy "lire evenements" on events for select to authenticated using (true);
create policy "creer evenement" on events for insert to authenticated with check (createur = auth.uid());
create policy "supprimer mon evenement" on events for delete to authenticated using (createur = auth.uid());
create policy "lire participants" on event_participants for select to authenticated using (true);
create policy "je participe" on event_participants for insert to authenticated with check (user_id = auth.uid());
create policy "je ne participe plus" on event_participants for delete to authenticated using (user_id = auth.uid());

create policy "mes notifications" on notifications for select to authenticated using (user_id = auth.uid());
create policy "marquer comme lue" on notifications for update to authenticated using (user_id = auth.uid());

create function public.trg_notif() returns trigger language plpgsql security definer set search_path = public as $$
declare qui text; dest uuid; msg text; lien text;
begin
  if tg_table_name = 'friendships' then
    if tg_op = 'INSERT' then
      select nom into qui from profiles where id = new.demandeur;
      dest := new.destinataire; msg := qui || ' t''a envoyé une demande d''ami.'; lien := '/amis';
    elsif new.statut = 'accepte' and old.statut <> 'accepte' then
      select nom into qui from profiles where id = new.destinataire;
      dest := new.demandeur; msg := qui || ' a accepté ta demande d''ami.'; lien := '/amis';
    end if;
  elsif tg_table_name = 'comments' then
    select nom into qui from profiles where id = new.auteur;
    select auteur into dest from posts where id = new.post_id;
    msg := qui || ' a commenté ta publication.'; lien := '/';
  elsif tg_table_name = 'likes' then
    select nom into qui from profiles where id = new.user_id;
    select auteur into dest from posts where id = new.post_id;
    msg := qui || ' a aimé ta publication.'; lien := '/';
  elsif tg_table_name = 'messages' then
    select nom into qui from profiles where id = new.expediteur;
    dest := new.destinataire; msg := qui || ' t''a envoyé un message.'; lien := '/messages';
  end if;
  if dest is not null and dest is distinct from auth.uid() then
    insert into notifications(user_id, texte, lien) values (dest, msg, lien);
  end if;
  return new;
end $$;

create trigger notif_amis after insert or update on friendships for each row execute function public.trg_notif();
create trigger notif_comment after insert on comments for each row execute function public.trg_notif();
create trigger notif_like after insert on likes for each row execute function public.trg_notif();
create trigger notif_message after insert on messages for each row execute function public.trg_notif();
