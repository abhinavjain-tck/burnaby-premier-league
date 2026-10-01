-- Season 4 real data from the organiser: the four teams, their captains, the purse,
-- the fee, the 36 players registered so far and 8 placeholders. Safe to re-run.
--
-- * Teams: the four placeholder rows from 20260929184000_seed_season4.sql are renamed in place.
-- * Players: skipped when someone with the same name (trimmed, any case) is already in season 1,
--   since players may have registered on the site themselves. Phone is a 'pending-NN' placeholder
--   until an admin fills the real number in. The organiser's list is everyone who paid, so all
--   seeded players are confirmed and marked paid.
-- * Placeholders: 8 made-up players so the pool is 40 (10 buys per team + captain = 11).
--   Phone 'placeholder-NN'; the admin list flags them. Withdraw them as real players pay.
-- * Captains: linked to their team by name. Their role is unknown, so it stays null.

update public.teams t
set name = v.name, short = v.short, colour = v.colour, logo_url = v.logo_url
from (values
  ('00000000-0000-4000-8000-00000000000a'::uuid, 'Burnaby Hawks',    'HWK', '#8a6100', '/teams/hawks.webp'),
  ('00000000-0000-4000-8000-00000000000b'::uuid, 'Burnaby Panthers', 'PNT', '#262626', '/teams/panthers.webp'),
  ('00000000-0000-4000-8000-00000000000c'::uuid, 'Burnaby Tigers',   'TGR', '#c2410c', '/teams/tigers.webp'),
  ('00000000-0000-4000-8000-00000000000d'::uuid, 'Burnaby Hunters',  'HNT', '#7c2d12', '/teams/hunters.webp')
) as v(id, name, short, colour, logo_url)
where t.id = v.id;

-- 250 cr per team. Also in config so the rules on /auction show it before an auction exists.
update public.seasons
set purse_lakhs = 25000,
    config = config || jsonb_build_object(
      'purseLakhs', 25000,
      'fee_text', '30 CAD per player',
      'etransfer_email', 'burnabyfalcons@gmail.com'
    )
where id = 1;

insert into public.player_registrations
  (season_id, edit_token, status, full_name, phone, role, batting_style, bio, paid_at, paid_marked_by, created_at)
select
  1,
  -- Same shape as lib/registration/token.ts: 15 random bytes as 20 URL-safe characters.
  translate(encode(extensions.gen_random_bytes(15), 'base64'), '+/', '-_'),
  'confirmed',
  v.full_name,
  'pending-' || lpad(v.n::text, 2, '0'),
  v.role::public.player_role,
  v.batting_style,
  v.bio,
  now(),
  'seed (organiser list 30 Sep)',
  -- Keep the organiser's order: player 1 is the oldest.
  now() - make_interval(secs => 100 - v.n)
from (values
  ( 1, 'RD Jamwal',             'all_rounder',   null,            null),
  ( 2, 'Abhishek Dangre',       'wicket_keeper', null,            null),
  ( 3, 'Bhavya Patel',          'all_rounder',   null,            null),
  ( 4, 'Sandesh',               'wicket_keeper', null,            null),
  ( 5, 'Mayur Gidwani',         'all_rounder',   null,            null),
  ( 6, 'Krunal Kumthekar',      'all_rounder',   null,            null),
  ( 7, 'Abhinav Jain',          'all_rounder',   null,            null),
  ( 8, 'Mayur Chawan',          'all_rounder',   null,            null),
  ( 9, 'Bhargav Movva',         'all_rounder',   null,            null),
  (10, 'Prit Diyora',           'wicket_keeper', null,            null),
  (11, 'Mayur Mirkar',          'bowler',        null,            null),
  (12, 'Bharatt Mistry',        'all_rounder',   null,            'Also keeps wicket.'),
  (13, 'Akshay Ambre',          'all_rounder',   null,            null),
  (14, 'Karanveer Singh',       null,            null,            null),
  (15, 'Gurseerat Singh',       'batter',        null,            null),
  (16, 'Sandeep Cheema',        'all_rounder',   null,            null),
  (17, 'Balinder Singh',        'all_rounder',   null,            null),
  (18, 'Lakhvir Singh',         'batter',        null,            null),
  (19, 'Naresh',                'all_rounder',   null,            null),
  (20, 'Divakar',               'all_rounder',   null,            null),
  (21, 'Kamal Singh',           'all_rounder',   null,            null),
  (22, 'Prasad',                null,            null,            null),
  (23, 'Vivek',                 null,            null,            null),
  (24, 'Deepak',                null,            null,            null),
  (25, 'Jerry',                 'batter',        null,            'Batter and fielder.'),
  (26, 'Axar Patel',            'batter',        'Left-hand bat', null),
  (27, 'Abhishek Bhanushali',   'wicket_keeper', null,            null),
  (28, 'Jaspreet Singh',        'all_rounder',   null,            null),
  (29, 'Hemant Gandhi',         'all_rounder',   null,            'Bowling all-rounder.'),
  (30, 'Gaurav Kamble',         'batter',        null,            'Batter and fielder.'),
  (31, 'Jeel Vakil',            'all_rounder',   null,            null),
  (32, 'Charanjit Singh Gosal', 'all_rounder',   null,            null),
  (33, 'Utsav Shah',            'all_rounder',   'Left-hand bat', null),
  (34, 'Dave',                  'batter',        null,            null),
  (35, 'Bhargav Shekhda',       'bowler',        null,            null),
  (36, 'Yuvrajsinh',            'all_rounder',   null,            null)
) as v(n, full_name, role, batting_style, bio)
where not exists (
  select 1 from public.player_registrations p
  where p.season_id = 1 and lower(btrim(p.full_name)) = lower(btrim(v.full_name))
)
on conflict (season_id, phone) do nothing;

-- ---------------------------------------------------------------------------
-- PLACEHOLDER PLAYERS. Not real people. They fill the pool to 40 until real
-- players pay. Find them by phone 'placeholder-%' (the admin list shows a
-- "Placeholder" badge) and withdraw or delete them when real players register.
-- ---------------------------------------------------------------------------
insert into public.player_registrations
  (season_id, edit_token, status, full_name, phone, role, bio, paid_at, paid_marked_by, created_at)
select
  1,
  translate(encode(extensions.gen_random_bytes(15), 'base64'), '+/', '-_'),
  'confirmed',
  v.full_name,
  'placeholder-' || lpad(v.n::text, 2, '0'),
  v.role::public.player_role,
  'Placeholder player — remove when real players register.',
  now(),
  'seed (organiser list 30 Sep)',
  now() - make_interval(secs => 50 - v.n)
from (values
  (1, 'Arjun Mehta',     'batter'),
  (2, 'Rahul Verma',     'batter'),
  (3, 'Vikram Rao',      'bowler'),
  (4, 'Sameer Khan',     'bowler'),
  (5, 'Nikhil Joshi',    'all_rounder'),
  (6, 'Karan Malhotra',  'all_rounder'),
  (7, 'Aditya Kulkarni', 'all_rounder'),
  (8, 'Rohan Desai',     'wicket_keeper')
) as v(n, full_name, role)
where not exists (
  select 1 from public.player_registrations p
  where p.season_id = 1 and lower(btrim(p.full_name)) = lower(btrim(v.full_name))
)
on conflict (season_id, phone) do nothing;

-- Link each captain. Only fills an empty link, so an admin's later change survives a re-run.
update public.teams t
set captain_registration_id = (
  select p.id from public.player_registrations p
  where p.season_id = t.season_id and lower(btrim(p.full_name)) = lower(c.captain) and p.status <> 'withdrawn'
  order by p.created_at
  limit 1
)
from (values
  ('00000000-0000-4000-8000-00000000000a'::uuid, 'deepak'),
  ('00000000-0000-4000-8000-00000000000b'::uuid, 'prasad'),
  ('00000000-0000-4000-8000-00000000000c'::uuid, 'karanveer singh'),
  ('00000000-0000-4000-8000-00000000000d'::uuid, 'vivek')
) as c(id, captain)
where t.id = c.id and t.captain_registration_id is null;
