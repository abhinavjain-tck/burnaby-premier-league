-- Storage buckets. photos is public (player cards); payment-proofs is private (admin-only signed links).
-- Uploads happen through signed upload URLs minted by the server, so no anon insert policy is needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('photos', 'photos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png']),
  ('payment-proofs', 'payment-proofs', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can read player photos.
drop policy if exists "public read photos" on storage.objects;
create policy "public read photos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'photos');
