import { describe, expect, test, vi } from "vitest";
import {
  addAiSeat,
  closeRoom,
  createRoom,
  joinRoom,
  kickMember,
  listJoinedRoomIds,
  listRooms,
  pauseRoom,
  resumeRoom,
  saveRoomLastState,
  startRoom,
  type CreateRoomInput,
} from "./rooms";

const GAME = "space-board";
const OTHER = "other-game";
const DEVICE = "11111111-2222-4333-8444-555555555555";
const JOINER = "99999999-2222-4333-8444-555555555555";
const ROOM_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function roomRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    game_slug: GAME,
    name: "Room A",
    host_device_id: DEVICE,
    status: "waiting",
    max_players: 4,
    created_at: "2026-08-06T10:00:00.000Z",
    updated_at: "2026-08-06T10:00:00.000Z",
    ...overrides,
  };
}

describe("listRooms", () => {
  test("returns only rooms for the given game_slug", async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [roomRow()],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ eq });
    const client = { from: vi.fn().mockReturnValue({ select }) };

    const rooms = await listRooms(client as never, GAME);

    expect(client.from).toHaveBeenCalledWith("rooms");
    expect(select).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith("game_slug", GAME);
    expect(rooms).toEqual([
      expect.objectContaining({
        id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        gameSlug: GAME,
        name: "Room A",
        status: "waiting",
        hostDeviceId: DEVICE,
        maxPlayers: 4,
      }),
    ]);
    expect(rooms.every((r) => r.gameSlug === GAME)).toBe(true);
    expect(rooms.some((r) => r.gameSlug === OTHER)).toBe(false);
  });

  test("throws when list query fails", async () => {
    const eq = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const select = vi.fn().mockReturnValue({ eq });
    const client = { from: vi.fn().mockReturnValue({ select }) };

    await expect(listRooms(client as never, GAME)).rejects.toThrow(/boom/);
  });
});

describe("listJoinedRoomIds", () => {
  test("returns room ids for the given device_id", async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [
        { room_id: ROOM_ID },
        { room_id: "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee" },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ eq });
    const client = { from: vi.fn().mockReturnValue({ select }) };

    const ids = await listJoinedRoomIds(client as never, DEVICE);

    expect(client.from).toHaveBeenCalledWith("room_members");
    expect(eq).toHaveBeenCalledWith("device_id", DEVICE);
    expect(ids).toEqual(
      new Set([ROOM_ID, "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee"]),
    );
  });
});

describe("createRoom", () => {
  test("inserts room with game_slug and host member with player seat 0", async () => {
    const room = roomRow({ name: "Nova" });
    const member = {
      id: "mmmmmmmm-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      room_id: room.id,
      device_id: DEVICE,
      role: "host",
      seat: 0,
      is_ai: false,
      display_name: "Alex",
      avatar_id: "fox",
      connected: true,
    };

    const roomInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: room, error: null }),
      }),
    });
    const memberInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: member, error: null }),
      }),
    });

    const from = vi.fn((table: string) => {
      if (table === "rooms") return { insert: roomInsert };
      if (table === "room_members") return { insert: memberInsert };
      throw new Error(`unexpected table ${table}`);
    });
    const client = { from };

    const input: CreateRoomInput = {
      gameSlug: GAME,
      name: "Nova",
      hostDeviceId: DEVICE,
      displayName: "Alex",
      avatarId: "fox",
    };

    const result = await createRoom(client as never, input);

    expect(roomInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        game_slug: GAME,
        name: "Nova",
        host_device_id: DEVICE,
        status: "waiting",
        max_players: 4,
      }),
    );
    expect(memberInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        room_id: room.id,
        device_id: DEVICE,
        role: "host",
        seat: 0,
        is_ai: false,
        display_name: "Alex",
        avatar_id: "fox",
        connected: true,
      }),
    );
    expect(result.room).toEqual(
      expect.objectContaining({
        id: room.id,
        gameSlug: GAME,
        name: "Nova",
        status: "waiting",
      }),
    );
    expect(result.hostMember).toEqual(
      expect.objectContaining({
        role: "host",
        seat: 0,
        displayName: "Alex",
        avatarId: "fox",
      }),
    );
  });
});

function memberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "mmmmmmmm-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    room_id: ROOM_ID,
    device_id: DEVICE,
    role: "host",
    seat: 0,
    is_ai: false,
    display_name: "Host",
    avatar_id: null,
    connected: true,
    ...overrides,
  };
}

type JoinMockOptions = {
  room: ReturnType<typeof roomRow>;
  members: ReturnType<typeof memberRow>[];
  inserted?: ReturnType<typeof memberRow>;
  updated?: ReturnType<typeof memberRow>;
};

function mockJoinClient({ room, members, inserted, updated }: JoinMockOptions) {
  const memberInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: inserted ?? null,
        error: null,
      }),
    }),
  });
  const memberUpdateEq = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: updated ?? null,
        error: null,
      }),
    }),
  });
  const memberUpdate = vi.fn().mockReturnValue({
    eq: memberUpdateEq,
  });

  const from = vi.fn((table: string) => {
    if (table === "rooms") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: room, error: null }),
          }),
        }),
      };
    }
    if (table === "room_members") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: members, error: null }),
        }),
        insert: memberInsert,
        update: memberUpdate,
      };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { from, memberInsert, memberUpdate, memberUpdateEq };
}

describe("joinRoom", () => {
  test("joins as player with next free seat while room is waiting", async () => {
    const inserted = memberRow({
      id: "jjjjjjjj-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      device_id: JOINER,
      role: "player",
      seat: 1,
      display_name: "Jo",
      avatar_id: "owl",
    });
    const client = mockJoinClient({
      room: roomRow(),
      members: [memberRow()],
      inserted,
    });

    const member = await joinRoom(client as never, {
      roomId: ROOM_ID,
      deviceId: JOINER,
      displayName: "Jo",
      avatarId: "owl",
      as: "player",
    });

    expect(client.memberInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        room_id: ROOM_ID,
        device_id: JOINER,
        role: "player",
        seat: 1,
        is_ai: false,
        display_name: "Jo",
        avatar_id: "owl",
      }),
    );
    expect(member).toEqual(
      expect.objectContaining({ role: "player", seat: 1, displayName: "Jo" }),
    );
  });

  test("joins as spectator with null seat", async () => {
    const inserted = memberRow({
      device_id: JOINER,
      role: "spectator",
      seat: null,
      display_name: "Watch",
    });
    const client = mockJoinClient({
      room: roomRow({ status: "playing" }),
      members: [memberRow()],
      inserted,
    });

    const member = await joinRoom(client as never, {
      roomId: ROOM_ID,
      deviceId: JOINER,
      displayName: "Watch",
      as: "spectator",
    });

    expect(client.memberInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "spectator",
        seat: null,
        device_id: JOINER,
      }),
    );
    expect(member.role).toBe("spectator");
    expect(member.seat).toBeNull();
  });

  test("rejects player join when room is already playing", async () => {
    const client = mockJoinClient({
      room: roomRow({ status: "playing" }),
      members: [memberRow(), memberRow({ seat: 1, role: "player" })],
    });

    await expect(
      joinRoom(client as never, {
        roomId: ROOM_ID,
        deviceId: JOINER,
        displayName: "Late",
        as: "player",
      }),
    ).rejects.toThrow(/spectator/i);
    expect(client.memberInsert).not.toHaveBeenCalled();
  });

  test("rejects player join when no free seats remain", async () => {
    const fullSeats = [0, 1, 2, 3].map((seat) =>
      memberRow({
        id: `seat-${seat}`,
        seat,
        role: seat === 0 ? "host" : "player",
        device_id: `device-${seat}`,
      }),
    );
    const client = mockJoinClient({
      room: roomRow(),
      members: fullSeats,
    });

    await expect(
      joinRoom(client as never, {
        roomId: ROOM_ID,
        deviceId: JOINER,
        displayName: "Full",
        as: "player",
      }),
    ).rejects.toThrow(/plină|full|seat/i);
    expect(client.memberInsert).not.toHaveBeenCalled();
  });

  test("rejoins existing membership by device_id instead of inserting a duplicate", async () => {
    const existing = memberRow({
      id: "jjjjjjjj-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      device_id: JOINER,
      role: "player",
      seat: 1,
      display_name: "Old",
      avatar_id: "cat",
      connected: false,
    });
    const updated = memberRow({
      id: "jjjjjjjj-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      device_id: JOINER,
      role: "player",
      seat: 1,
      display_name: "Jo",
      avatar_id: "owl",
      connected: true,
    });
    const client = mockJoinClient({
      room: roomRow(),
      members: [memberRow(), existing],
      updated,
    });

    const member = await joinRoom(client as never, {
      roomId: ROOM_ID,
      deviceId: JOINER,
      displayName: "Jo",
      avatarId: "owl",
      as: "player",
    });

    expect(client.memberInsert).not.toHaveBeenCalled();
    expect(client.memberUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: "Jo",
        avatar_id: "owl",
        connected: true,
      }),
    );
    expect(member).toEqual(
      expect.objectContaining({
        id: existing.id,
        role: "player",
        seat: 1,
        displayName: "Jo",
        connected: true,
      }),
    );
  });

  test("spectator rejoin updates existing row without new insert", async () => {
    const existing = memberRow({
      id: "ssssssss-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      device_id: JOINER,
      role: "spectator",
      seat: null,
      display_name: "Watch",
      connected: false,
    });
    const client = mockJoinClient({
      room: roomRow({ status: "playing" }),
      members: [memberRow(), existing],
      updated: memberRow({
        id: "ssssssss-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        device_id: JOINER,
        role: "spectator",
        seat: null,
        display_name: "Watch2",
        connected: true,
      }),
    });

    const member = await joinRoom(client as never, {
      roomId: ROOM_ID,
      deviceId: JOINER,
      displayName: "Watch2",
      as: "spectator",
    });

    expect(client.memberInsert).not.toHaveBeenCalled();
    expect(client.memberUpdate).toHaveBeenCalled();
    expect(member.role).toBe("spectator");
    expect(member.seat).toBeNull();
  });
});

type HostMockOptions = {
  room: ReturnType<typeof roomRow>;
  members: ReturnType<typeof memberRow>[];
  inserted?: ReturnType<typeof memberRow>;
  updateResult?: { error: { message: string } | null };
  deleteResult?: { error: { message: string } | null };
};

function mockHostClient({
  room,
  members,
  inserted,
  updateResult = { error: null },
  deleteResult = { error: null },
}: HostMockOptions) {
  const memberInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: inserted ?? null,
        error: null,
      }),
    }),
  });
  const roomUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue(updateResult),
  });
  const memberDelete = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue(deleteResult),
  });

  const from = vi.fn((table: string) => {
    if (table === "rooms") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: room, error: null }),
          }),
        }),
        update: roomUpdate,
      };
    }
    if (table === "room_members") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: members, error: null }),
        }),
        insert: memberInsert,
        delete: memberDelete,
      };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { from, memberInsert, roomUpdate, memberDelete };
}

describe("addAiSeat", () => {
  test("host adds AI player on next free seat", async () => {
    const inserted = memberRow({
      id: "ai-member",
      device_id: null,
      role: "player",
      seat: 1,
      is_ai: true,
      display_name: "Bot",
    });
    const client = mockHostClient({
      room: roomRow(),
      members: [memberRow()],
      inserted,
    });

    const member = await addAiSeat(client as never, {
      roomId: ROOM_ID,
      hostDeviceId: DEVICE,
      displayName: "Bot",
    });

    expect(client.memberInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        device_id: null,
        role: "player",
        seat: 1,
        is_ai: true,
        display_name: "Bot",
      }),
    );
    expect(member.isAi).toBe(true);
    expect(member.seat).toBe(1);
  });

  test("rejects add AI when caller is not host", async () => {
    const client = mockHostClient({
      room: roomRow(),
      members: [memberRow()],
    });

    await expect(
      addAiSeat(client as never, {
        roomId: ROOM_ID,
        hostDeviceId: JOINER,
        displayName: "Bot",
      }),
    ).rejects.toThrow(/host/i);
    expect(client.memberInsert).not.toHaveBeenCalled();
  });
});

describe("kickMember", () => {
  test("host deletes a member by id", async () => {
    const targetId = "kick-me";
    const client = mockHostClient({
      room: roomRow(),
      members: [
        memberRow(),
        memberRow({ id: targetId, device_id: JOINER, role: "player", seat: 1 }),
      ],
    });

    await kickMember(client as never, {
      roomId: ROOM_ID,
      hostDeviceId: DEVICE,
      memberId: targetId,
    });

    expect(client.memberDelete).toHaveBeenCalled();
  });

  test("rejects kick when caller is not host", async () => {
    const client = mockHostClient({
      room: roomRow(),
      members: [memberRow()],
    });

    await expect(
      kickMember(client as never, {
        roomId: ROOM_ID,
        hostDeviceId: JOINER,
        memberId: "x",
      }),
    ).rejects.toThrow(/host/i);
  });
});

describe("startRoom", () => {
  test("host sets status to playing when at least 2 seated players", async () => {
    const client = mockHostClient({
      room: roomRow(),
      members: [
        memberRow(),
        memberRow({
          id: "p2",
          device_id: JOINER,
          role: "player",
          seat: 1,
        }),
      ],
    });

    await startRoom(client as never, {
      roomId: ROOM_ID,
      hostDeviceId: DEVICE,
    });

    expect(client.roomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "playing" }),
    );
  });

  test("rejects start with fewer than 2 seated players", async () => {
    const client = mockHostClient({
      room: roomRow(),
      members: [memberRow()],
    });

    await expect(
      startRoom(client as never, {
        roomId: ROOM_ID,
        hostDeviceId: DEVICE,
      }),
    ).rejects.toThrow(/2/);
    expect(client.roomUpdate).not.toHaveBeenCalled();
  });

  test("counts AI seats toward the player minimum", async () => {
    const client = mockHostClient({
      room: roomRow(),
      members: [
        memberRow(),
        memberRow({
          id: "ai",
          device_id: null,
          role: "player",
          seat: 1,
          is_ai: true,
          display_name: "Bot",
        }),
      ],
    });

    await startRoom(client as never, {
      roomId: ROOM_ID,
      hostDeviceId: DEVICE,
    });

    expect(client.roomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "playing" }),
    );
  });
});

describe("pauseRoom", () => {
  test("sets status to paused from playing — no host_device_id change", async () => {
    const client = mockHostClient({
      room: roomRow({ status: "playing" }),
      members: [memberRow()],
    });

    await pauseRoom(client as never, { roomId: ROOM_ID });

    expect(client.roomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paused" }),
    );
    const written = client.roomUpdate.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(written).not.toHaveProperty("host_device_id");
  });

  test("rejects pause when room is not playing", async () => {
    const client = mockHostClient({
      room: roomRow({ status: "waiting" }),
      members: [memberRow()],
    });

    await expect(
      pauseRoom(client as never, { roomId: ROOM_ID }),
    ).rejects.toThrow(/playing/i);
    expect(client.roomUpdate).not.toHaveBeenCalled();
  });
});

describe("resumeRoom", () => {
  test("same host_device_id resumes paused → playing (no host transfer)", async () => {
    const client = mockHostClient({
      room: roomRow({ status: "paused" }),
      members: [memberRow()],
    });

    await resumeRoom(client as never, {
      roomId: ROOM_ID,
      hostDeviceId: DEVICE,
    });

    expect(client.roomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "playing" }),
    );
    const written = client.roomUpdate.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(written).not.toHaveProperty("host_device_id");
  });

  test("rejects resume from a different device_id (no host transfer)", async () => {
    const client = mockHostClient({
      room: roomRow({ status: "paused" }),
      members: [memberRow()],
    });

    await expect(
      resumeRoom(client as never, {
        roomId: ROOM_ID,
        hostDeviceId: JOINER,
      }),
    ).rejects.toThrow(/host/i);
    expect(client.roomUpdate).not.toHaveBeenCalled();
  });

  test("rejects resume when room is not paused", async () => {
    const client = mockHostClient({
      room: roomRow({ status: "playing" }),
      members: [memberRow()],
    });

    await expect(
      resumeRoom(client as never, {
        roomId: ROOM_ID,
        hostDeviceId: DEVICE,
      }),
    ).rejects.toThrow(/paused/i);
    expect(client.roomUpdate).not.toHaveBeenCalled();
  });
});

describe("closeRoom", () => {
  test("any client may set paused room to closed (first writer wins)", async () => {
    const client = mockHostClient({
      room: roomRow({ status: "paused" }),
      members: [memberRow()],
    });

    await closeRoom(client as never, { roomId: ROOM_ID });

    expect(client.roomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "closed" }),
    );
    const written = client.roomUpdate.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(written).not.toHaveProperty("host_device_id");
  });

  test("rejects close when room is waiting", async () => {
    const client = mockHostClient({
      room: roomRow({ status: "waiting" }),
      members: [memberRow()],
    });

    await expect(
      closeRoom(client as never, { roomId: ROOM_ID }),
    ).rejects.toThrow(/paused|playing/i);
    expect(client.roomUpdate).not.toHaveBeenCalled();
  });
});

describe("saveRoomLastState", () => {
  test("writes opaque last_state jsonb without game-specific columns", async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const client = {
      from: vi.fn().mockReturnValue({ update }),
    };
    const opaque = {
      v: 1,
      kind: "state",
      payload: { whatever_the_game_wants: true },
    };

    await saveRoomLastState(client as never, {
      roomId: ROOM_ID,
      lastState: opaque,
    });

    expect(client.from).toHaveBeenCalledWith("rooms");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_state: opaque,
      }),
    );
    const written = update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(written).not.toHaveProperty("positionIndex");
    expect(written).not.toHaveProperty("diceValue");
    expect(written).not.toHaveProperty("pendingEvent");
  });
});
