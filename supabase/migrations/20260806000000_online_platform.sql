-- Generic multiplayer platform schema (no game-specific columns).
-- Apply in Supabase SQL editor or via CLI. Enable Realtime on these tables as needed.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  device_id uuid primary key,
  username text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null,
  name text not null,
  host_device_id uuid not null references public.profiles (device_id),
  status text not null check (status in ('waiting', 'playing', 'paused', 'closed')),
  max_players int not null default 4,
  last_state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_game_slug_idx on public.rooms (game_slug);
create index if not exists rooms_status_idx on public.rooms (status);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  device_id uuid references public.profiles (device_id),
  role text not null check (role in ('host', 'player', 'spectator')),
  seat int,
  is_ai boolean not null default false,
  display_name text not null,
  avatar_id text,
  connected boolean not null default false,
  constraint room_members_seat_unique unique (room_id, seat)
);

create index if not exists room_members_room_id_idx on public.room_members (room_id);

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  device_id uuid not null,
  username text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists room_messages_room_id_idx on public.room_messages (room_id);

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_messages enable row level security;

-- Client roles need explicit grants (CREATE TABLE alone is not enough).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.profiles to anon, authenticated;
grant select, insert, update, delete on table public.rooms to anon, authenticated;
grant select, insert, update, delete on table public.room_members to anon, authenticated;
grant select, insert, update, delete on table public.room_messages to anon, authenticated;

-- Private-project bootstrap: open anon access; tighten by device_id / membership later.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_anon_all'
  ) then
    create policy profiles_anon_all on public.profiles for all to anon, authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'rooms' and policyname = 'rooms_anon_all'
  ) then
    create policy rooms_anon_all on public.rooms for all to anon, authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'room_members' and policyname = 'room_members_anon_all'
  ) then
    create policy room_members_anon_all on public.room_members for all to anon, authenticated using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'room_messages' and policyname = 'room_messages_anon_all'
  ) then
    create policy room_messages_anon_all on public.room_messages for all to anon, authenticated using (true) with check (true);
  end if;
end $$;
