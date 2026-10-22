alter table annonces add column video_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('annonces-media', 'annonces-media', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

create policy "lire media annonces" on storage.objects for select using (bucket_id = 'annonces-media');
create policy "envoyer media annonces" on storage.objects for insert to authenticated with check (bucket_id = 'annonces-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "supprimer mes media annonces" on storage.objects for delete to authenticated using (bucket_id = 'annonces-media' and (storage.foldername(name))[1] = auth.uid()::text);
