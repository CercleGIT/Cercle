alter table messages add column video_path text;
alter table messages add constraint messages_video_ok check (video_path is null or video_path like expediteur::text || '/%');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos-messages', 'videos-messages', false, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

create policy "envoyer videos messages" on storage.objects for insert to authenticated with check (
  bucket_id = 'videos-messages' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "voir videos messages" on storage.objects for select to authenticated using (
  bucket_id = 'videos-messages' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.messages m where m.video_path = name and m.destinataire = auth.uid())));
create policy "supprimer mes videos messages" on storage.objects for delete to authenticated using (
  bucket_id = 'videos-messages' and (storage.foldername(name))[1] = auth.uid()::text);
