create table scores_jeux (
  user_id uuid not null references profiles(id) on delete cascade,
  jeu text not null check (char_length(jeu) <= 40),
  meilleur int not null check (meilleur between 0 and 30000),
  parties int not null default 1,
  maj timestamptz not null default now(),
  primary key (user_id, jeu)
);
alter table scores_jeux enable row level security;

create policy "voir les scores" on scores_jeux for select to authenticated using (true);
create policy "masquer scores bloques" on scores_jeux as restrictive for select to authenticated using (not public.est_bloque(auth.uid(), user_id));

create function public.enregistrer_score(jeu_id text, score int) returns int language plpgsql security definer set search_path = public as $$
declare best int;
begin
  if auth.uid() is null or score is null or score < 0 or score > 30000 or char_length(jeu_id) > 40 then
    raise exception 'score invalide';
  end if;
  insert into scores_jeux(user_id, jeu, meilleur, parties) values (auth.uid(), jeu_id, score, 1)
  on conflict (user_id, jeu) do update
    set meilleur = greatest(scores_jeux.meilleur, excluded.meilleur), parties = scores_jeux.parties + 1, maj = now()
  returning meilleur into best;
  return best;
end $$;
