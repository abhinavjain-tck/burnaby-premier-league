-- Row Level Security for BPL. Run after the migrations. Safe to re-run.
--
-- Server Actions talk to Postgres through DATABASE_URL (the postgres role, which owns
-- the tables and skips RLS). These rules guard everything that uses the anon key:
-- the browser and the Supabase REST API.
--   * anon/authenticated: read seasons, teams, sponsors and public_player_cards
--   * signed-in admins (email in user_roles): full access through is_admin()
--   * everyone else: nothing

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'seasons', 'teams', 'player_registrations', 'sponsors', 'user_roles', 'team_owners',
    'auctions', 'auction_admins', 'auction_teams', 'auction_lots', 'auction_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admin all" on public.%I', t);
    execute format(
      'create policy "admin all" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t
    );
  end loop;

  foreach t in array array['seasons', 'teams', 'sponsors'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end
$$;

-- Auction cards anyone can read: registrations minus phone, email, payment fields and the edit token.
-- The view runs with its owner's rights on purpose (no security_invoker), so anon can read
-- these columns without being able to read player_registrations itself.
create or replace view public.public_player_cards as
select
  id, season_id, status, full_name, role, batting_style, bowling_style,
  tier, bio, stats, photo_url, cricheroes_url, created_at
from public.player_registrations
where status <> 'withdrawn';

revoke all on public.public_player_cards from anon, authenticated;
grant select on public.public_player_cards to anon, authenticated;
