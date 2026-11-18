create table infos_privees (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prenom text,
  nom_famille text,
  date_naissance date,
  pays text,
  telephone text,
  telephone_verifie boolean not null default false,
  created_at timestamptz default now()
);
alter table infos_privees enable row level security;
create policy "voir mes infos privees" on infos_privees for select to authenticated using (user_id = auth.uid() or public.est_admin());
create policy "modifier mes infos privees" on infos_privees for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create function public.copier_infos_privees() returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb; d date;
begin
  m := new.raw_user_meta_data;
  if m->>'date_naissance' is not null then
    begin
      d := (m->>'date_naissance')::date;
    exception when others then
      raise exception 'Date de naissance invalide';
    end;
    if d > (current_date - interval '16 years')::date then
      raise exception 'Age minimum : 16 ans';
    end if;
    insert into infos_privees(user_id, prenom, nom_famille, date_naissance, pays, telephone)
    values (new.id, left(m->>'prenom', 60), left(m->>'nom_famille', 60), d, left(m->>'pays', 60), left(m->>'telephone', 20))
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created_infos after insert on auth.users for each row execute function public.copier_infos_privees();
