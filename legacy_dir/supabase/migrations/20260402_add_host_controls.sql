-- ============================================================
-- HOST CONTROLS & MODERATION SCHEMA
-- Created: 2026-04-02
-- ============================================================

-- Add host controls fields to rooms
alter table public.rooms
  add column is_private boolean default false,
  add column game_mode text default 'classic' check (game_mode in ('classic','chaos','fast')),
  add column description text;

-- Create player_kicks table for moderation history
create table public.player_kicks (
  id        uuid default uuid_generate_v4() primary key,
  room_id   uuid references public.rooms(id) on delete cascade not null,
  player_id uuid references public.profiles(id) on delete cascade not null,
  kicked_by uuid references public.profiles(id) on delete set null,
  reason    text,
  is_banned boolean default false,
  kicked_at timestamptz default now(),
  unique(room_id, player_id)
);

-- Extend room_players to support kick flags
alter table public.room_players
  add column is_kicked boolean default false,
  add column kicked_reason text;

-- RLS for player_kicks (host can view/create, player can view their own)
alter table public.player_kicks enable row level security;
create policy "Hosts manage kicks" on public.player_kicks
  for all using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.host_id = auth.uid()
    )
  );
create policy "Players see own kicks" on public.player_kicks
  for select using (auth.uid() = player_id);

-- Update room_players RLS to allow host to kick
create policy "Host can update players" on public.room_players
  for update using (
    auth.uid() = player_id or
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.host_id = auth.uid()
    )
  );

-- Indexes for performance
create index on public.player_kicks(room_id);
create index on public.player_kicks(player_id);
create index on public.rooms(game_mode);

-- Realtime for moderation
alter publication supabase_realtime add table public.player_kicks;
