alter table posts add column video_url text check (char_length(coalesce(video_url, '')) <= 500);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos-fil', 'videos-fil', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

create policy "lire videos fil" on storage.objects for select using (bucket_id = 'videos-fil');
create policy "envoyer videos fil" on storage.objects for insert to authenticated with check (bucket_id = 'videos-fil' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "supprimer mes videos fil" on storage.objects for delete to authenticated using (bucket_id = 'videos-fil' and (storage.foldername(name))[1] = auth.uid()::text);
