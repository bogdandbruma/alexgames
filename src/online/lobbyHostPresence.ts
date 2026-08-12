/** Known host-live flags keyed by room id. Missing key = not synced yet. */
export type RoomHostPresence = Record<string, boolean>;

/**
 * Lobby list: rooms whose host is in Realtime presence, plus rooms the
 * viewer already belongs to (so Reintră stays available during host reclaim).
 */
export function filterRoomsWithLiveHost<T extends { id: string }>(
  rooms: readonly T[],
  hostPresentByRoomId: RoomHostPresence,
  options?: { alwaysIncludeIds?: ReadonlySet<string> },
): T[] {
  const always = options?.alwaysIncludeIds;
  return rooms.filter(
    (room) =>
      hostPresentByRoomId[room.id] === true || always?.has(room.id) === true,
  );
}
