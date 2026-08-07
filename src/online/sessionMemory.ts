import type { PlayMode } from "./PlaySession";

export const ONLINE_PLAY_MODE_STORAGE_PREFIX = "brumix.online.play_mode.";
export const ACTIVE_ROOM_STORAGE_PREFIX = "brumix.online.active_room.";

function resolveStorage(storage?: Storage): Storage {
  return storage ?? localStorage;
}

function playModeKey(gameSlug: string): string {
  return `${ONLINE_PLAY_MODE_STORAGE_PREFIX}${gameSlug}`;
}

function activeRoomKey(gameSlug: string): string {
  return `${ACTIVE_ROOM_STORAGE_PREFIX}${gameSlug}`;
}

export function getRememberedPlayMode(
  gameSlug: string,
  storage?: Storage,
): PlayMode {
  return resolveStorage(storage).getItem(playModeKey(gameSlug)) === "online"
    ? "online"
    : "choose";
}

export function rememberOnlinePlayMode(
  gameSlug: string,
  storage?: Storage,
): void {
  resolveStorage(storage).setItem(playModeKey(gameSlug), "online");
}

export function clearRememberedPlayMode(
  gameSlug: string,
  storage?: Storage,
): void {
  resolveStorage(storage).removeItem(playModeKey(gameSlug));
}

export function getRememberedActiveRoomId(
  gameSlug: string,
  storage?: Storage,
): string | null {
  return resolveStorage(storage).getItem(activeRoomKey(gameSlug));
}

export function rememberActiveRoomId(
  gameSlug: string,
  roomId: string,
  storage?: Storage,
): void {
  resolveStorage(storage).setItem(activeRoomKey(gameSlug), roomId);
}

export function clearRememberedActiveRoomId(
  gameSlug: string,
  storage?: Storage,
): void {
  resolveStorage(storage).removeItem(activeRoomKey(gameSlug));
}
