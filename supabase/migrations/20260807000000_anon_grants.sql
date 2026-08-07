-- Grants for client (anon) access. Raw CREATE TABLE does not grant anon by default.
-- Safe to re-run.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.profiles to anon, authenticated;
grant select, insert, update, delete on table public.rooms to anon, authenticated;
grant select, insert, update, delete on table public.room_members to anon, authenticated;
grant select, insert, update, delete on table public.room_messages to anon, authenticated;

-- Ensure open v1 policies exist (RLS was enabled in the base migration).
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
