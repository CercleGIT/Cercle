create table positions (
  user_id uuid primary key references profiles(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  visible boolean not null default true,
  portee text not null default 'tous' check (portee in ('tous', 'amis')),
  maj timestamptz not null default now()
);
alter table positions enable row level security;

create policy "voir ma position" on positions for select to authenticated using (user_id = auth.uid());
create policy "enregistrer ma position" on positions for insert to authenticated with check (user_id = auth.uid());
create policy "modifier ma position" on positions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "supprimer ma position" on positions for delete to authenticated using (user_id = auth.uid());

create function public.membres_proches(rayon_km int default 25)
returns table (id uuid, nom text, avatar_url text, distance_km int)
language sql stable security definer set search_path = public as $$
  with moi as (
    select lat, lon from positions where user_id = auth.uid() and visible
  ),
  autres as (
    select q.user_id, q.portee,
      6371 * 2 * asin(sqrt(
        power(sin(radians(q.lat - moi.lat) / 2), 2) +
        cos(radians(moi.lat)) * cos(radians(q.lat)) * power(sin(radians(q.lon - moi.lon) / 2), 2)
      )) as d
    from positions q, moi
    where q.user_id <> auth.uid() and q.visible and q.maj > now() - interval '30 days'
  )
  select p.id, p.nom, p.avatar_url, greatest(1, ceil(a.d))::int as distance_km
  from autres a
  join profiles p on p.id = a.user_id
  where a.d <= least(rayon_km, 200)
    and not public.est_bloque(auth.uid(), a.user_id)
    and (a.portee = 'tous' or exists (
      select 1 from friendships f where f.statut = 'accepte' and (
        (f.demandeur = auth.uid() and f.destinataire = a.user_id) or
        (f.destinataire = auth.uid() and f.demandeur = a.user_id))))
  order by a.d, p.nom
  limit 100;
$$;
