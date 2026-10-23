create function public.suggestions_amis(max_resultats int default 20)
returns table (id uuid, nom text, avatar_url text, verifie boolean, amis_communs int, groupes_communs int, distance_km int)
language sql stable security definer set search_path = public as $$
  with mes_amis as (
    select case when f.demandeur = auth.uid() then f.destinataire else f.demandeur end as ami
    from friendships f
    where f.statut = 'accepte' and auth.uid() in (f.demandeur, f.destinataire)
  ),
  deja as (
    select case when f.demandeur = auth.uid() then f.destinataire else f.demandeur end as autre
    from friendships f
    where auth.uid() in (f.demandeur, f.destinataire)
  ),
  amis_communs as (
    select case when f.demandeur = ma.ami then f.destinataire else f.demandeur end as cand, count(*)::int as n
    from mes_amis ma
    join friendships f on f.statut = 'accepte' and ma.ami in (f.demandeur, f.destinataire)
    group by 1
  ),
  groupes_communs as (
    select gm2.user_id as cand, count(*)::int as n
    from group_members gm1
    join group_members gm2 on gm2.group_id = gm1.group_id and gm2.user_id <> gm1.user_id
    where gm1.user_id = auth.uid()
    group by 1
  ),
  proches as (
    select q.user_id as cand,
      greatest(1, ceil(6371 * 2 * asin(sqrt(
        power(sin(radians(q.lat - m.lat) / 2), 2) +
        cos(radians(m.lat)) * cos(radians(q.lat)) * power(sin(radians(q.lon - m.lon) / 2), 2)
      ))))::int as km
    from positions m
    join positions q on q.user_id <> m.user_id
    where m.user_id = auth.uid() and m.visible and q.visible and q.portee = 'tous' and q.maj > now() - interval '30 days'
  ),
  candidats as (
    select cand from amis_communs
    union select cand from groupes_communs
    union select cand from proches where km <= 50
  )
  select p.id, p.nom, p.avatar_url, p.verifie,
    coalesce(ac.n, 0), coalesce(gc.n, 0), pr.km
  from candidats c
  join profiles p on p.id = c.cand
  left join amis_communs ac on ac.cand = c.cand
  left join groupes_communs gc on gc.cand = c.cand
  left join proches pr on pr.cand = c.cand
  where c.cand <> auth.uid()
    and c.cand not in (select autre from deja)
    and not public.est_bloque(auth.uid(), c.cand)
  order by (coalesce(ac.n, 0) * 3 + coalesce(gc.n, 0) * 2 + case when pr.km is not null then 1 else 0 end) desc, p.nom
  limit least(max_resultats, 50);
$$;
