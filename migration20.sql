alter table profiles add column officiel boolean not null default false;

create function public.proteger_officiel() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.officiel is distinct from old.officiel and auth.uid() is not null and not public.est_admin() then
    new.officiel := old.officiel;
  end if;
  return new;
end $$;
create trigger proteger_officiel before update on profiles for each row execute function public.proteger_officiel();

create function public.est_officiel(uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select officiel from profiles where id = uid), false);
$$;

create table abonnements (
  abonne uuid not null references profiles(id) on delete cascade,
  suivi uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (abonne, suivi),
  check (abonne <> suivi)
);
alter table abonnements enable row level security;
create policy "voir abonnements" on abonnements for select to authenticated using (true);
create policy "s abonner" on abonnements for insert to authenticated with check (abonne = auth.uid());
create policy "se desabonner" on abonnements for delete to authenticated using (abonne = auth.uid());

create policy "pas de message aux comptes officiels" on messages as restrictive for insert to authenticated with check (not public.est_officiel(destinataire));
create policy "pas de demande aux comptes officiels" on friendships as restrictive for insert to authenticated with check (not public.est_officiel(destinataire));
create policy "pas d appel aux comptes officiels" on appels as restrictive for insert to authenticated with check (not public.est_officiel(vers));
create policy "pas de blocage des comptes officiels" on blocks as restrictive for insert to authenticated with check (not public.est_officiel(blocked));

create function public.trg_notif_post_officiel() returns trigger language plpgsql security definer set search_path = public as $$
declare qui text;
begin
  if new.group_id is null and public.est_officiel(new.auteur) then
    select nom into qui from profiles where id = new.auteur;
    insert into notifications(user_id, texte, lien)
    select a.abonne, qui || ' a publié une nouvelle publication.', '/' from abonnements a where a.suivi = new.auteur;
  end if;
  return new;
end $$;
create trigger notif_post_officiel after insert on posts for each row execute function public.trg_notif_post_officiel();
