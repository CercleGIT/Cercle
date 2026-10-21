alter table groups add column image_url text;
alter table posts add column sondage jsonb;

create table group_invites (
  group_id bigint not null references groups(id) on delete cascade,
  invite uuid not null references profiles(id) on delete cascade,
  invitant uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (group_id, invite)
);
create table poll_votes (
  post_id bigint references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  choix int not null,
  primary key (post_id, user_id)
);
alter table group_invites enable row level security;
alter table poll_votes enable row level security;

create function public.est_membre_groupe(gid bigint) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;
create function public.est_admin_groupe(gid bigint) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid() and role = 'admin');
$$;
create function public.peut_rejoindre(gid bigint) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from groups g where g.id = gid and (not g.prive or g.createur = auth.uid()
    or exists (select 1 from group_invites i where i.group_id = g.id and i.invite = auth.uid())));
$$;

create policy "voir invitations" on group_invites for select to authenticated using (invite = auth.uid() or invitant = auth.uid() or public.est_admin_groupe(group_id));
create policy "inviter" on group_invites for insert to authenticated with check (invitant = auth.uid() and public.est_membre_groupe(group_id));
create policy "supprimer invitation" on group_invites for delete to authenticated using (invite = auth.uid() or invitant = auth.uid());

create policy "groupe invitation" on groups for select to authenticated using (exists (select 1 from group_invites i where i.group_id = id and i.invite = auth.uid()));
create policy "admin supprime groupe" on groups for delete to authenticated using (public.est_admin_groupe(id) or createur = auth.uid());
create policy "rejoindre si autorise" on group_members as restrictive for insert to authenticated with check (public.peut_rejoindre(group_id));
create policy "admin retire membre" on group_members for delete to authenticated using (public.est_admin_groupe(group_id));
create policy "admin promeut" on group_members for update to authenticated using (public.est_admin_groupe(group_id));

create policy "lire votes" on poll_votes for select to authenticated using (exists (select 1 from posts p where p.id = post_id));
create policy "voter" on poll_votes for insert to authenticated with check (user_id = auth.uid());
create policy "changer vote" on poll_votes for update to authenticated using (user_id = auth.uid());
create policy "retirer vote" on poll_votes for delete to authenticated using (user_id = auth.uid());

create function public.trg_notif_invitation() returns trigger language plpgsql security definer set search_path = public as $$
declare qui text; nomg text;
begin
  select nom into qui from profiles where id = new.invitant;
  select nom into nomg from groups where id = new.group_id;
  insert into notifications(user_id, texte, lien) values (new.invite, qui || ' t''a invité à rejoindre le groupe ' || nomg || '.', '/groupes');
  return new;
end $$;
create trigger notif_invitation after insert on group_invites for each row execute function public.trg_notif_invitation();
