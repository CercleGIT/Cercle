alter table messages add column audio_path text;
alter table messages add column audio_duree int;
alter table messages add constraint messages_audio_ok check (
  audio_duree is null or (audio_duree between 1 and 300 and audio_path like expediteur::text || '/%'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vocaux', 'vocaux', false, 5242880, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/x-m4a'])
on conflict (id) do nothing;

create policy "envoyer vocaux" on storage.objects for insert to authenticated with check (
  bucket_id = 'vocaux' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ecouter vocaux" on storage.objects for select to authenticated using (
  bucket_id = 'vocaux' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.messages m where m.audio_path = name and m.destinataire = auth.uid())));
create policy "supprimer mes vocaux" on storage.objects for delete to authenticated using (
  bucket_id = 'vocaux' and (storage.foldername(name))[1] = auth.uid()::text);
