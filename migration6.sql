create table appels (
  id bigint generated always as identity primary key,
  de uuid not null references profiles(id) on delete cascade,
  vers uuid not null references profiles(id) on delete cascade,
  type text not null,
  payload jsonb,
  created_at timestamptz default now()
);
alter table appels enable row level security;

create policy "voir mes appels" on appels for select to authenticated using (vers = auth.uid() or de = auth.uid());
create policy "appeler un ami" on appels for insert to authenticated with check (
  de = auth.uid()
  and exists (select 1 from friendships f where f.statut = 'accepte' and (
    (f.demandeur = auth.uid() and f.destinataire = appels.vers) or
    (f.destinataire = auth.uid() and f.demandeur = appels.vers)))
  and not public.est_bloque(auth.uid(), vers));
create policy "effacer mes appels" on appels for delete to authenticated using (vers = auth.uid() or de = auth.uid());
