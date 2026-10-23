create table parrainages (
  filleul uuid primary key references profiles(id) on delete cascade,
  parrain uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  check (filleul <> parrain)
);
alter table parrainages enable row level security;
create policy "voir mes parrainages" on parrainages for select to authenticated using (parrain = auth.uid() or filleul = auth.uid());

create function public.enregistrer_parrain(parrain_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if parrain_id is null or parrain_id = auth.uid() then return; end if;
  if not exists (select 1 from profiles where id = parrain_id) then return; end if;
  if (select created_at from profiles where id = auth.uid()) < now() - interval '7 days' then return; end if;
  insert into parrainages(filleul, parrain) values (auth.uid(), parrain_id) on conflict do nothing;
end $$;

create function public.trg_notif_parrain() returns trigger language plpgsql security definer set search_path = public as $$
declare qui text;
begin
  select nom into qui from profiles where id = new.filleul;
  insert into notifications(user_id, texte, lien) values (new.parrain, qui || ' a rejoint Cercle grâce à ton invitation.', '/inviter');
  return new;
end $$;
create trigger notif_parrain after insert on parrainages for each row execute function public.trg_notif_parrain();

create function public.statistiques_admin() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.est_admin() then
    raise exception 'acces refuse';
  end if;
  return jsonb_build_object(
    'membres', (select count(*) from profiles),
    'nouveaux_7j', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'actifs_7j', (select count(*) from profiles where derniere_activite > now() - interval '7 days'),
    'parrainages', (select count(*) from parrainages),
    'publications', (select count(*) from posts),
    'publications_7j', (select count(*) from posts where created_at > now() - interval '7 days'),
    'participations_defi_7j', (select count(*) from participations where created_at > now() - interval '7 days'),
    'groupes', (select count(*) from groups),
    'annonces_actives', (select count(*) from annonces where statut = 'active'),
    'createurs', (select count(*) from createurs where actif),
    'signalements', (select count(*) from reports) + (select count(*) from annonce_reports),
    'inscriptions_par_jour', (
      select coalesce(jsonb_agg(jsonb_build_object('jour', j.jour, 'n', j.n) order by j.jour), '[]'::jsonb)
      from (select created_at::date as jour, count(*)::int as n from profiles where created_at > now() - interval '14 days' group by 1) j)
  );
end $$;
