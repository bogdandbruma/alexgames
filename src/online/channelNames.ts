import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/** Presence topic — who is connected in the room. */
export function roomPresenceChannelName(roomId: string): string {
  return `room:${roomId}`;
}

/**
 * Play envelope broadcast topic — separate from presence so WaitingRoom
 * presence and OnlinePlay sync never share one subscribed channel.
 */
export function roomSyncChannelName(roomId: string): string {
  return `room-sync:${roomId}`;
}

/** Chat postgres_changes topic — separate from presence / play sync. */
export function roomMessagesChannelName(roomId: string): string {
  return `room-messages:${roomId}`;
}

function topicMatches(channelTopic: string, name: string): boolean {
  return (
    channelTopic === name ||
    channelTopic === `realtime:${name}` ||
    channelTopic.endsWith(`:${name}`)
  );
}

/** Drop prior channels with this name (Strict Mode remount / stale join). */
export async function removeChannelsByName(
  client: SupabaseClient,
  name: string,
): Promise<void> {
  const existing = client
    .getChannels()
    .filter((ch) => topicMatches(ch.topic, name));
  await Promise.all(existing.map((ch) => client.removeChannel(ch)));
}

/** Serialize remove→create→on→subscribe per topic (Supabase reuses by topic). */
const channelLocks = new Map<string, Promise<unknown>>();

async function withChannelLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const previous = channelLocks.get(name) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = () => {
      resolve();
    };
  });
  const tail = previous.then(
    () => gate,
    () => gate,
  );
  channelLocks.set(name, tail);
  await previous.then(
    () => undefined,
    () => undefined,
  );
  try {
    return await fn();
  } finally {
    release();
    if (channelLocks.get(name) === tail) {
      channelLocks.delete(name);
    }
  }
}

/**
 * Atomically replace any existing channel for `name`, run `setup` (`.on` +
 * `subscribe`) before releasing the lock so a concurrent caller cannot get a
 * half-subscribed channel back from `client.channel(name)`.
 */
export async function openFreshChannel(
  client: SupabaseClient,
  name: string,
  opts: Parameters<SupabaseClient["channel"]>[1] | undefined,
  setup: (channel: RealtimeChannel) => void | Promise<void>,
): Promise<RealtimeChannel> {
  return withChannelLock(name, async () => {
    await removeChannelsByName(client, name);
    const channel =
      opts === undefined ? client.channel(name) : client.channel(name, opts);
    await setup(channel);
    return channel;
  });
}

/** @deprecated Prefer openFreshChannel so .on/subscribe stay under the lock. */
export async function createFreshChannel(
  client: SupabaseClient,
  name: string,
  opts?: Parameters<SupabaseClient["channel"]>[1],
): Promise<RealtimeChannel> {
  return openFreshChannel(client, name, opts, () => undefined);
}
