create function public.verifier_age_18() returns trigger language plpgsql security definer set search_path = public as $$
declare d date;
begin
  if new.raw_user_meta_data->>'date_naissance' is not null then
    begin
      d := (new.raw_user_meta_data->>'date_naissance')::date;
    exception when others then
      raise exception 'Date de naissance invalide';
    end;
    if d > (current_date - interval '18 years')::date then
      raise exception 'Age minimum : 18 ans';
    end if;
  end if;
  return new;
end $$;
create trigger verifier_age_18 before insert on auth.users for each row execute function public.verifier_age_18();
