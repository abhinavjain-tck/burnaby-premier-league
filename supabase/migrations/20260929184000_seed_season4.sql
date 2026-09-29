-- Season 4 starter data. Run after the migrations and policies.sql. Safe to re-run.

insert into public.seasons (id, name, year, status, purse_lakhs)
values (1, 'BPL Season 4', 2026, 'registration', 30000)
on conflict (id) do nothing;

-- We set id 1 by hand, so move the sequence past it.
select setval(pg_get_serial_sequence('public.seasons', 'id'), (select max(id) from public.seasons));

-- Placeholder teams. Rename and recolour once owners confirm.
insert into public.teams (id, season_id, name, short, colour) values
  ('00000000-0000-4000-8000-00000000000a', 1, 'Team A', 'TMA', '#1d4ed8'),
  ('00000000-0000-4000-8000-00000000000b', 1, 'Team B', 'TMB', '#b91c1c'),
  ('00000000-0000-4000-8000-00000000000c', 1, 'Team C', 'TMC', '#15803d'),
  ('00000000-0000-4000-8000-00000000000d', 1, 'Team D', 'TMD', '#6d28d9')
on conflict (id) do nothing;

-- Placeholder title sponsor. Replace name, logo_url and url with the real one.
insert into public.sponsors (id, season_id, name, tier, logo_url, url, placements, sort_order) values
  ('00000000-0000-4000-8000-0000000000f1', 1, 'Title Sponsor (placeholder)', 'title', null, null, '["hero", "strip"]', 0)
on conflict (id) do nothing;

-- Admins. SUPER_ADMIN_EMAILS covers the first sign-in; add rows here so is_admin() in RLS knows them too.
-- insert into public.user_roles (email, role) values ('organiser@gmail.com', 'super_admin') on conflict (email) do nothing;
