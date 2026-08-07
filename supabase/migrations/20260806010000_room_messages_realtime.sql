-- Enable Realtime for room chat inserts (session-ephemeral UI still never SELECTs history).
-- Idempotent: safe if table already in publication.

do $$
begin
  alter publication supabase_realtime add table public.room_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
  when others then
    -- Local/dev without supabase_realtime publication: ignore.
    null;
end $$;
