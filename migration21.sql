create table actualites_publiees (
  lien text primary key,
  source text not null,
  titre text,
  post_id bigint references posts(id) on delete set null,
  publie_le timestamptz not null default now()
);
alter table actualites_publiees enable row level security;
