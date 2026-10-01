-- The Curated Knot becomes the title sponsor. Updates the placeholder row (same id) in place,
-- and inserts it if the row is missing, so this is safe on any database.
insert into public.sponsors (id, season_id, name, tier, logo_url, url, instagram_url, tagline, placements, sort_order) values
  ('00000000-0000-4000-8000-0000000000f1', 1, 'The Curated Knot', 'title', '/sponsors/the-curated-knot.png',
   'https://thecuratedknot.com', 'https://www.instagram.com/thecuratedknot/', 'Wedding invites and RSVPs, curated.',
   '["hero", "strip", "auction_lot"]', 0)
on conflict (id) do update set
  name = excluded.name,
  tier = excluded.tier,
  logo_url = excluded.logo_url,
  url = excluded.url,
  instagram_url = excluded.instagram_url,
  tagline = excluded.tagline,
  placements = excluded.placements;
