-- Gameplay loops for Studio preview + ffmpeg stack on export.
-- Upload minecraft.mp4, gta.mp4, subway.mp4 into this bucket (Storage UI).
-- Royalty-free / your own captures only — do not upload ripped game footage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gameplay',
  'gameplay',
  true,
  104857600,
  array['video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gameplay_public_read" on storage.objects;
create policy "gameplay_public_read" on storage.objects
  for select using (bucket_id = 'gameplay');
