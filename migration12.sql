alter table profiles add column verifie boolean not null default false;

create function public.proteger_verifie() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verifie is distinct from old.verifie and auth.uid() is not null and not public.est_admin() then
    new.verifie := old.verifie;
  end if;
  return new;
end $$;
create trigger proteger_verifie before update on profiles for each row execute function public.proteger_verifie();

create policy "admin certifie" on profiles for update to authenticated using (public.est_admin());
