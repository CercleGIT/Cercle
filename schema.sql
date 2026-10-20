-- Cercle : schéma Supabase (à coller dans SQL Editor)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nom text not null, avatar_url text, created_at timestamptz default now()
);
create table friendships (
  id bigint generated always as identity primary key,
  demandeur uuid not null references profiles(id) on delete cascade,
  destinataire uuid not null references profiles(id) on delete cascade,
  statut text not null default 'en_attente' check (statut in ('en_attente','accepte')),
  created_at timestamptz default now(),
  unique (demandeur, destinataire), check (demandeur <> destinataire)
);
create table groups (
  id bigint generated always as identity primary key,
  nom text not null, description text, prive boolean default false,
  createur uuid not null references profiles(id), created_at timestamptz default now()
);
create table group_members (
  group_id bigint references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'membre' check (role in ('admin','membre')),
  primary key (group_id, user_id)
);
create table posts (
  id bigint generated always as identity primary key,
  auteur uuid not null references profiles(id) on delete cascade,
  group_id bigint references groups(id) on delete cascade,
  texte text, image_url text, created_at timestamptz default now()
);
create table likes (
  post_id bigint references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (post_id, user_id)
);
create table reports (
  id bigint generated always as identity primary key,
  post_id bigint references posts(id) on delete cascade,
  auteur uuid references profiles(id), motif text, created_at timestamptz default now()
);

-- Profil créé automatiquement à l'inscription
create function handle_new_user() returns trigger language plpgsql security definer as $$
begin insert into profiles(id, nom) values (new.id, coalesce(new.raw_user_meta_data->>'nom', split_part(new.email,'@',1))); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Sécurité (Row Level Security) : indispensable
alter table profiles enable row level security;
alter table friendships enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table reports enable row level security;

create policy "profils lisibles par les membres" on profiles for select to authenticated using (true);
create policy "je modifie mon profil" on profiles for update to authenticated using (id = auth.uid());

create policy "mes amitiés" on friendships for select to authenticated using (auth.uid() in (demandeur, destinataire));
create policy "j'envoie une demande" on friendships for insert to authenticated with check (demandeur = auth.uid());
create policy "j'accepte une demande" on friendships for update to authenticated using (destinataire = auth.uid());
create policy "je supprime mes amitiés" on friendships for delete to authenticated using (auth.uid() in (demandeur, destinataire));

create policy "groupes publics ou les miens" on groups for select to authenticated
  using (not prive or createur = auth.uid() or exists (select 1 from group_members m where m.group_id = id and m.user_id = auth.uid()));
create policy "je crée un groupe" on groups for insert to authenticated with check (createur = auth.uid());
create policy "admin modifie le groupe" on groups for update to authenticated
  using (exists (select 1 from group_members m where m.group_id = id and m.user_id = auth.uid() and m.role = 'admin'));

create policy "membres visibles" on group_members for select to authenticated using (true);
create policy "je rejoins un groupe" on group_members for insert to authenticated with check (user_id = auth.uid() and (role = 'membre' or exists (select 1 from groups g where g.id = group_id and g.createur = auth.uid())));
create policy "je quitte un groupe" on group_members for delete to authenticated using (user_id = auth.uid());

create policy "lire les posts" on posts for select to authenticated using (
  group_id is null or exists (select 1 from group_members m where m.group_id = posts.group_id and m.user_id = auth.uid()));
create policy "publier" on posts for insert to authenticated with check (auteur = auth.uid());
create policy "supprimer mes posts" on posts for delete to authenticated using (auteur = auth.uid());

create policy "lire les likes" on likes for select to authenticated using (true);
create policy "liker" on likes for insert to authenticated with check (user_id = auth.uid());
create policy "retirer mon like" on likes for delete to authenticated using (user_id = auth.uid());
create policy "signaler un post" on reports for insert to authenticated with check (auteur = auth.uid());
