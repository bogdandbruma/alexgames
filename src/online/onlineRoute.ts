export type AppRoute = {
  gameId: string | null;
  onlineRoomId: string | null;
};

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function hashSegments(hash: string): string[] {
  return hash
    .replace(/^#\/?/, "")
    .split("/")
    .filter(Boolean)
    .map(decodeSegment);
}

export function parseAppRouteFromHash(hash = window.location.hash): AppRoute {
  const segments = hashSegments(hash);
  const gameId = segments[0] ?? null;
  const onlineRoomId =
    segments[1] === "online" && segments[2] === "rooms"
      ? (segments[3] ?? null)
      : null;

  return { gameId, onlineRoomId };
}

export function setGameHash(gameSlug: string): void {
  window.location.hash = encodeURIComponent(gameSlug);
}

export function setOnlineRoomHash(gameSlug: string, roomId: string): void {
  window.location.hash = `${encodeURIComponent(gameSlug)}/online/rooms/${encodeURIComponent(roomId)}`;
}
