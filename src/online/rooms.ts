import type { SupabaseClient } from "@supabase/supabase-js";

export type RoomStatus = "waiting" | "playing" | "paused" | "closed";
export type MemberRole = "host" | "player" | "spectator";

/** Romanian UI label for room.status (display only). */
export function roomStatusLabel(status: RoomStatus): string {
  switch (status) {
    case "waiting":
      return "În așteptare";
    case "playing":
      return "În joc";
    case "paused":
      return "Pauză";
    case "closed":
      return "Închisă";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export type Room = {
  id: string;
  gameSlug: string;
  name: string;
  hostDeviceId: string;
  status: RoomStatus;
  maxPlayers: number;
  createdAt: string;
  updatedAt: string;
};

export type RoomMember = {
  id: string;
  roomId: string;
  deviceId: string | null;
  role: MemberRole;
  seat: number | null;
  isAi: boolean;
  displayName: string;
  avatarId: string | null;
  connected: boolean;
};

export type CreateRoomInput = {
  gameSlug: string;
  name: string;
  hostDeviceId: string;
  displayName: string;
  avatarId?: string | null;
  maxPlayers?: number;
};

type RoomRow = {
  id: string;
  game_slug: string;
  name: string;
  host_device_id: string;
  status: RoomStatus;
  max_players: number;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  id: string;
  room_id: string;
  device_id: string | null;
  role: MemberRole;
  seat: number | null;
  is_ai: boolean;
  display_name: string;
  avatar_id: string | null;
  connected: boolean;
};

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    gameSlug: row.game_slug,
    name: row.name,
    hostDeviceId: row.host_device_id,
    status: row.status,
    maxPlayers: row.max_players,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMember(row: MemberRow): RoomMember {
  return {
    id: row.id,
    roomId: row.room_id,
    deviceId: row.device_id,
    role: row.role,
    seat: row.seat,
    isAi: row.is_ai,
    displayName: row.display_name,
    avatarId: row.avatar_id,
    connected: row.connected,
  };
}

function throwIfError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function listRooms(
  client: SupabaseClient,
  gameSlug: string,
): Promise<Room[]> {
  const { data, error } = await client
    .from("rooms")
    .select(
      "id, game_slug, name, host_device_id, status, max_players, created_at, updated_at",
    )
    .eq("game_slug", gameSlug);

  throwIfError(error);
  return ((data ?? []) as RoomRow[]).map(mapRoom);
}

/** Room ids where this device already has a membership row. */
export async function listJoinedRoomIds(
  client: SupabaseClient,
  deviceId: string,
): Promise<Set<string>> {
  const { data, error } = await client
    .from("room_members")
    .select("room_id")
    .eq("device_id", deviceId);

  throwIfError(error);
  return new Set(
    ((data ?? []) as Array<{ room_id: string }>).map((row) => row.room_id),
  );
}

export async function createRoom(
  client: SupabaseClient,
  input: CreateRoomInput,
): Promise<{ room: Room; hostMember: RoomMember }> {
  const maxPlayers = input.maxPlayers ?? 4;
  const { data: roomData, error: roomError } = await client
    .from("rooms")
    .insert({
      game_slug: input.gameSlug,
      name: input.name,
      host_device_id: input.hostDeviceId,
      status: "waiting" satisfies RoomStatus,
      max_players: maxPlayers,
    })
    .select(
      "id, game_slug, name, host_device_id, status, max_players, created_at, updated_at",
    )
    .single();

  throwIfError(roomError);
  const room = mapRoom(roomData as RoomRow);

  const { data: memberData, error: memberError } = await client
    .from("room_members")
    .insert({
      room_id: room.id,
      device_id: input.hostDeviceId,
      role: "host" satisfies MemberRole,
      seat: 0,
      is_ai: false,
      display_name: input.displayName,
      avatar_id: input.avatarId ?? null,
      connected: true,
    })
    .select(
      "id, room_id, device_id, role, seat, is_ai, display_name, avatar_id, connected",
    )
    .single();

  throwIfError(memberError);
  return { room, hostMember: mapMember(memberData as MemberRow) };
}

export type JoinAs = "player" | "spectator";

export type JoinRoomInput = {
  roomId: string;
  deviceId: string;
  displayName: string;
  avatarId?: string | null;
  as: JoinAs;
};

async function fetchRoom(
  client: SupabaseClient,
  roomId: string,
): Promise<Room> {
  const { data, error } = await client
    .from("rooms")
    .select(
      "id, game_slug, name, host_device_id, status, max_players, created_at, updated_at",
    )
    .eq("id", roomId)
    .single();

  throwIfError(error);
  return mapRoom(data as RoomRow);
}

async function listMembers(
  client: SupabaseClient,
  roomId: string,
): Promise<RoomMember[]> {
  const { data, error } = await client
    .from("room_members")
    .select(
      "id, room_id, device_id, role, seat, is_ai, display_name, avatar_id, connected",
    )
    .eq("room_id", roomId);

  throwIfError(error);
  return ((data ?? []) as MemberRow[]).map(mapMember);
}

function nextFreeSeat(members: RoomMember[], maxPlayers: number): number | null {
  const taken = new Set(
    members.filter((m) => m.seat !== null).map((m) => m.seat as number),
  );
  for (let seat = 0; seat < maxPlayers; seat++) {
    if (!taken.has(seat)) {
      return seat;
    }
  }
  return null;
}

export async function joinRoom(
  client: SupabaseClient,
  input: JoinRoomInput,
): Promise<RoomMember> {
  const room = await fetchRoom(client, input.roomId);
  const members = await listMembers(client, input.roomId);

  const existing = members.find((m) => m.deviceId === input.deviceId);
  if (existing) {
    const { data, error } = await client
      .from("room_members")
      .update({
        display_name: input.displayName,
        avatar_id: input.avatarId ?? null,
        connected: true,
      })
      .eq("id", existing.id)
      .select(
        "id, room_id, device_id, role, seat, is_ai, display_name, avatar_id, connected",
      )
      .single();

    throwIfError(error);
    return mapMember(data as MemberRow);
  }

  let role: MemberRole;
  let seat: number | null;

  switch (input.as) {
    case "spectator":
      role = "spectator";
      seat = null;
      break;
    case "player": {
      if (room.status !== "waiting") {
        throw new Error(
          "Jocul a început. Poți intra doar ca spectator.",
        );
      }
      const free = nextFreeSeat(members, room.maxPlayers);
      if (free === null) {
        throw new Error("Camera e plină; nu mai sunt locuri libere.");
      }
      role = "player";
      seat = free;
      break;
    }
    default: {
      const exhaustive: never = input.as;
      return exhaustive;
    }
  }

  const { data, error } = await client
    .from("room_members")
    .insert({
      room_id: input.roomId,
      device_id: input.deviceId,
      role,
      seat,
      is_ai: false,
      display_name: input.displayName,
      avatar_id: input.avatarId ?? null,
      connected: true,
    })
    .select(
      "id, room_id, device_id, role, seat, is_ai, display_name, avatar_id, connected",
    )
    .single();

  throwIfError(error);
  return mapMember(data as MemberRow);
}

function assertHost(room: Room, hostDeviceId: string): void {
  if (room.hostDeviceId !== hostDeviceId) {
    throw new Error("Only the host can perform this action.");
  }
}

function seatedPlayers(members: RoomMember[]): RoomMember[] {
  return members.filter((m) => m.seat !== null);
}

export type AddAiSeatInput = {
  roomId: string;
  hostDeviceId: string;
  displayName: string;
  avatarId?: string | null;
};

export async function addAiSeat(
  client: SupabaseClient,
  input: AddAiSeatInput,
): Promise<RoomMember> {
  const room = await fetchRoom(client, input.roomId);
  assertHost(room, input.hostDeviceId);
  if (room.status !== "waiting") {
    throw new Error("Cannot add AI after the room has started.");
  }
  const members = await listMembers(client, input.roomId);
  const free = nextFreeSeat(members, room.maxPlayers);
  if (free === null) {
    throw new Error("Room is full; no free player seats.");
  }

  const { data, error } = await client
    .from("room_members")
    .insert({
      room_id: input.roomId,
      device_id: null,
      role: "player" satisfies MemberRole,
      seat: free,
      is_ai: true,
      display_name: input.displayName,
      avatar_id: input.avatarId ?? null,
      connected: true,
    })
    .select(
      "id, room_id, device_id, role, seat, is_ai, display_name, avatar_id, connected",
    )
    .single();

  throwIfError(error);
  return mapMember(data as MemberRow);
}

export type KickMemberInput = {
  roomId: string;
  hostDeviceId: string;
  memberId: string;
};

export async function kickMember(
  client: SupabaseClient,
  input: KickMemberInput,
): Promise<void> {
  const room = await fetchRoom(client, input.roomId);
  assertHost(room, input.hostDeviceId);

  const { error } = await client
    .from("room_members")
    .delete()
    .eq("id", input.memberId);

  throwIfError(error);
}

export type StartRoomInput = {
  roomId: string;
  hostDeviceId: string;
};

export async function startRoom(
  client: SupabaseClient,
  input: StartRoomInput,
): Promise<void> {
  const room = await fetchRoom(client, input.roomId);
  assertHost(room, input.hostDeviceId);
  const members = await listMembers(client, input.roomId);
  const players = seatedPlayers(members);
  if (players.length < 2) {
    throw new Error("Need at least 2 players (humans or AI) to start.");
  }

  const { error } = await client
    .from("rooms")
    .update({
      status: "playing" satisfies RoomStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.roomId);

  throwIfError(error);
}

export type PauseRoomInput = {
  roomId: string;
};

/** Any connected client may pause when host presence drops during play. */
export async function pauseRoom(
  client: SupabaseClient,
  input: PauseRoomInput,
): Promise<void> {
  const room = await fetchRoom(client, input.roomId);
  if (room.status !== "playing") {
    throw new Error("Only a playing room can be paused.");
  }

  const { error } = await client
    .from("rooms")
    .update({
      status: "paused" satisfies RoomStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.roomId);

  throwIfError(error);
}

export type ResumeRoomInput = {
  roomId: string;
  hostDeviceId: string;
};

/**
 * Same host `device_id` reclaims a paused room → playing.
 * Never transfers host_device_id.
 */
export async function resumeRoom(
  client: SupabaseClient,
  input: ResumeRoomInput,
): Promise<void> {
  const room = await fetchRoom(client, input.roomId);
  assertHost(room, input.hostDeviceId);
  if (room.status !== "paused") {
    throw new Error("Only a paused room can be resumed.");
  }

  const { error } = await client
    .from("rooms")
    .update({
      status: "playing" satisfies RoomStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.roomId);

  throwIfError(error);
}

export type CloseRoomInput = {
  roomId: string;
};

/**
 * Any connected client may close after host reclaim timeout (playing/paused),
 * or after waiting-host absence timeout. First writer wins; does not transfer host.
 */
export async function closeRoom(
  client: SupabaseClient,
  input: CloseRoomInput,
): Promise<void> {
  const room = await fetchRoom(client, input.roomId);
  if (
    room.status !== "paused" &&
    room.status !== "playing" &&
    room.status !== "waiting"
  ) {
    throw new Error("Only a waiting, paused, or playing room can be closed.");
  }

  const { error } = await client
    .from("rooms")
    .update({
      status: "closed" satisfies RoomStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.roomId);

  throwIfError(error);
}

export type SaveRoomLastStateInput = {
  roomId: string;
  /** Opaque JSON (typically a state RoomEnvelope or its payload). */
  lastState: unknown;
};

export async function fetchRoomLastState(
  client: SupabaseClient,
  roomId: string,
): Promise<unknown | null> {
  const { data, error } = await client
    .from("rooms")
    .select("last_state")
    .eq("id", roomId)
    .single();

  throwIfError(error);
  const row = data as { last_state: unknown } | null;
  return row?.last_state ?? null;
}

/** Persists opaque last_state jsonb — no game-specific column mapping. */
export async function saveRoomLastState(
  client: SupabaseClient,
  input: SaveRoomLastStateInput,
): Promise<void> {
  const { error } = await client
    .from("rooms")
    .update({
      last_state: input.lastState,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.roomId);

  throwIfError(error);
}

export { fetchRoom, listMembers };
