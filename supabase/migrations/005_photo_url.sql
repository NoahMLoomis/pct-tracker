alter table trail_updates add column photo_url text;

-- Create public storage bucket for update photos
insert into storage.buckets (id, name, public)
values ('update-photos', 'update-photos', true)
on conflict (id) do nothing;

-- Allow anyone to read photos (bucket is public)
create policy "Public read update photos"
on storage.objects for select
using (bucket_id = 'update-photos');
