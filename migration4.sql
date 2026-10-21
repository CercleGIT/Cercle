alter table messages add column lu boolean default false;
alter table messages add column image_url text;
alter table profiles add column derniere_activite timestamptz;

create policy "modifier mes posts" on posts for update to authenticated using (auteur = auth.uid()) with check (auteur = auth.uid());
alter table messages add constraint messages_image_legere check (char_length(coalesce(image_url, '')) <= 600000);

create function public.marquer_lu(ami uuid) returns void language sql security definer set search_path = public as $$
  update messages set lu = true where destinataire = auth.uid() and expediteur = ami and lu = false;
$$;
create function public.supprimer_mon_compte() returns void language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;
