import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Lobby } from "./Lobby";
import { rememberActiveRoomId } from "./sessionMemory";

const listRooms = vi.hoisted(() => vi.fn());
const createRoom = vi.hoisted(() => vi.fn());
const joinRoom = vi.hoisted(() => vi.fn());
const listMembers = vi.hoisted(() => vi.fn());
const fetchRoom = vi.hoisted(() => vi.fn());
const listJoinedRoomIds = vi.hoisted(() => vi.fn());
const closeRoom = vi.hoisted(() => vi.fn());
const observeRoomPresence = vi.hoisted(() => vi.fn());

vi.mock("./rooms", async () => {
  const actual = await vi.importActual<typeof import("./rooms")>("./rooms");
  return {
    ...actual,
    listRooms,
    createRoom,
    joinRoom,
    listMembers,
    fetchRoom,
    listJoinedRoomIds,
    closeRoom,
  };
});

vi.mock("./presence", () => ({
  observeRoomPresence,
}));

vi.mock("./WaitingRoom", () => ({
  WaitingRoom: () => <div>waiting room</div>,
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

const GAME = "space-board";
const DEVICE = "11111111-2222-4333-8444-555555555555";

function roomFixture(
  overrides: Partial<{
    id: string;
    name: string;
    hostDeviceId: string;
    status: "waiting" | "playing" | "paused" | "closed";
  }> = {},
) {
  return {
    id: "room-1",
    gameSlug: GAME,
    name: "Alpha",
    hostDeviceId: "other-host",
    status: "waiting" as const,
    maxPlayers: 4,
    createdAt: "2026-08-06T10:00:00.000Z",
    updatedAt: "2026-08-06T10:00:00.000Z",
    ...overrides,
  };
}

/** Default: every observed room reports its host as present. */
function mockHostsPresent(
  rooms: Array<{ id: string; hostDeviceId: string }>,
) {
  observeRoomPresence.mockImplementation(
    async (
      _client: unknown,
      input: {
        roomId: string;
        onSync: (
          members: Array<{
            deviceId: string;
            displayName: string;
            role: "host";
          }>,
        ) => void;
      },
    ) => {
      const room = rooms.find((r) => r.id === input.roomId);
      input.onSync(
        room
          ? [
              {
                deviceId: room.hostDeviceId,
                displayName: "Host",
                role: "host",
              },
            ]
          : [],
      );
      return { unsubscribe: vi.fn().mockResolvedValue(undefined) };
    },
  );
}

function mockHostsAbsent() {
  observeRoomPresence.mockImplementation(
    async (
      _client: unknown,
      input: {
        roomId: string;
        onSync: (
          members: Array<{
            deviceId: string;
            displayName: string;
            role: "host";
          }>,
        ) => void;
      },
    ) => {
      input.onSync([]);
      return { unsubscribe: vi.fn().mockResolvedValue(undefined) };
    },
  );
}

describe("Lobby", () => {
  test("lists rooms filtered by game_slug and can create a room", async () => {
    const user = userEvent.setup();
    listJoinedRoomIds.mockResolvedValue(new Set());
    const listed = [
      {
        id: "room-1",
        gameSlug: GAME,
        name: "Alpha",
        hostDeviceId: DEVICE,
        status: "waiting" as const,
        maxPlayers: 4,
        createdAt: "2026-08-06T10:00:00.000Z",
        updatedAt: "2026-08-06T10:00:00.000Z",
      },
    ];
    listRooms.mockResolvedValue(listed);
    mockHostsPresent(listed);
    createRoom.mockResolvedValue({
      room: {
        id: "room-new",
        gameSlug: GAME,
        name: "Nova",
        hostDeviceId: DEVICE,
        status: "waiting",
        maxPlayers: 4,
        createdAt: "2026-08-06T10:00:00.000Z",
        updatedAt: "2026-08-06T10:00:00.000Z",
      },
      hostMember: {
        id: "m1",
        roomId: "room-new",
        deviceId: DEVICE,
        role: "host",
        seat: 0,
        isAi: false,
        displayName: "Alex",
        avatarId: null,
        connected: true,
      },
    });

    const client = {};
    render(
      <Lobby
        client={client as never}
        gameSlug={GAME}
        deviceId={DEVICE}
        username="Alex"
        onBack={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeTruthy();
    });
    expect(listRooms).toHaveBeenCalledWith(client, GAME);

    await user.type(screen.getByLabelText(/nume cameră|room name/i), "Nova");
    await user.click(screen.getByRole("button", { name: /creează|create/i }));

    await waitFor(() => {
      expect(createRoom).toHaveBeenCalledWith(
        client,
        expect.objectContaining({
          gameSlug: GAME,
          name: "Nova",
          hostDeviceId: DEVICE,
          displayName: "Alex",
        }),
      );
    });
  });

  test("hides rooms whose host is not in live presence", async () => {
    listJoinedRoomIds.mockResolvedValue(new Set());
    const listed = [roomFixture({ name: "Orphan", hostDeviceId: "gone" })];
    listRooms.mockResolvedValue(listed);
    mockHostsAbsent();

    render(
      <Lobby
        client={{} as never}
        gameSlug={GAME}
        deviceId={DEVICE}
        username="Alex"
        onBack={() => {}}
      />,
    );

    await waitFor(() => {
      expect(listRooms).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.queryByText("Orphan")).toBeNull();
      expect(screen.getByText(/nicio cameră încă/i)).toBeTruthy();
    });
  });

  test("joins an existing waiting room as player", async () => {
    const user = userEvent.setup();
    listJoinedRoomIds.mockResolvedValue(new Set());
    const listed = [roomFixture({ hostDeviceId: "other" })];
    listRooms.mockResolvedValue(listed);
    mockHostsPresent(listed);
    joinRoom.mockResolvedValue({
      id: "m2",
      roomId: "room-1",
      deviceId: DEVICE,
      role: "player",
      seat: 1,
      isAi: false,
      displayName: "Alex",
      avatarId: null,
      connected: true,
    });

    render(
      <Lobby
        client={{} as never}
        gameSlug={GAME}
        deviceId={DEVICE}
        username="Alex"
        onBack={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: /intră jucător|join player/i }));

    await waitFor(() => {
      expect(joinRoom).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          roomId: "room-1",
          as: "player",
          displayName: "Alex",
        }),
      );
    });
  });

  test("playing room for non-member shows only Spectator (no Reintră, no player join)", async () => {
    const user = userEvent.setup();
    listJoinedRoomIds.mockResolvedValue(new Set());
    const listed = [roomFixture({ name: "În curs", status: "playing" })];
    listRooms.mockResolvedValue(listed);
    mockHostsPresent(listed);
    joinRoom.mockResolvedValue({
      id: "m-spec",
      roomId: "room-1",
      deviceId: DEVICE,
      role: "spectator",
      seat: null,
      isAi: false,
      displayName: "Alex",
      avatarId: null,
      connected: true,
    });

    render(
      <Lobby
        client={{} as never}
        gameSlug={GAME}
        deviceId={DEVICE}
        username="Alex"
        onBack={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("În curs")).toBeTruthy();
    });

    expect(
      screen.queryByRole("button", { name: /reintră|rejoin|reia/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /intră jucător|join player/i }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: /spectator/i }));

    await waitFor(() => {
      expect(joinRoom).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          roomId: "room-1",
          as: "spectator",
          displayName: "Alex",
        }),
      );
      expect(screen.getByText("waiting room")).toBeTruthy();
    });
  });

  test("host can re-enter a paused room with same device_id (no host transfer)", async () => {
    const user = userEvent.setup();
    listJoinedRoomIds.mockResolvedValue(new Set(["room-1"]));
    const listed = [
      roomFixture({
        name: "Paused",
        hostDeviceId: DEVICE,
        status: "paused",
      }),
    ];
    listRooms.mockResolvedValue(listed);
    mockHostsPresent(listed);
    listMembers.mockResolvedValue([
      {
        id: "m-host",
        roomId: "room-1",
        deviceId: DEVICE,
        role: "host",
        seat: 0,
        isAi: false,
        displayName: "Alex",
        avatarId: null,
        connected: true,
      },
    ]);

    render(
      <Lobby
        client={{} as never}
        gameSlug={GAME}
        deviceId={DEVICE}
        username="Alex"
        onBack={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Paused")).toBeTruthy();
    });

    expect(
      screen.queryByRole("button", { name: /spectator/i }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: /reintră|rejoin|reia/i }));

    await waitFor(() => {
      expect(listMembers).toHaveBeenCalledWith(expect.anything(), "room-1");
      expect(joinRoom).not.toHaveBeenCalled();
      expect(screen.getByText("waiting room")).toBeTruthy();
    });
  });

  test("re-enters the remembered active room after refresh", async () => {
    const room = roomFixture({
      name: "Running",
      hostDeviceId: DEVICE,
      status: "playing",
    });
    const member = {
      id: "m-host",
      roomId: "room-1",
      deviceId: DEVICE,
      role: "host",
      seat: 0,
      isAi: false,
      displayName: "Alex",
      avatarId: null,
      connected: true,
    };
    rememberActiveRoomId(GAME, room.id);
    listJoinedRoomIds.mockResolvedValue(new Set(["room-1"]));
    listRooms.mockResolvedValue([room]);
    mockHostsPresent([room]);
    fetchRoom.mockResolvedValue(room);
    listMembers.mockResolvedValue([member]);

    render(
      <Lobby
        client={{} as never}
        gameSlug={GAME}
        deviceId={DEVICE}
        username="Alex"
        onBack={() => {}}
      />,
    );

    await waitFor(() => {
      expect(fetchRoom).toHaveBeenCalledWith(expect.anything(), "room-1");
      expect(screen.getByText("waiting room")).toBeTruthy();
    });
  });

  test("re-enters the active room from the URL after refresh", async () => {
    const room = roomFixture({
      id: "room-from-url",
      name: "URL Room",
      hostDeviceId: DEVICE,
      status: "playing",
    });
    const member = {
      id: "m-host",
      roomId: "room-from-url",
      deviceId: DEVICE,
      role: "host",
      seat: 0,
      isAi: false,
      displayName: "Alex",
      avatarId: null,
      connected: true,
    };
    listJoinedRoomIds.mockResolvedValue(new Set(["room-from-url"]));
    listRooms.mockResolvedValue([room]);
    mockHostsPresent([room]);
    fetchRoom.mockResolvedValue(room);
    listMembers.mockResolvedValue([member]);

    render(
      <Lobby
        client={{} as never}
        gameSlug={GAME}
        deviceId={DEVICE}
        username="Alex"
        initialRoomId="room-from-url"
        onBack={() => {}}
      />,
    );

    await waitFor(() => {
      expect(fetchRoom).toHaveBeenCalledWith(
        expect.anything(),
        "room-from-url",
      );
      expect(window.location.hash).toBe(
        "#space-board/online/rooms/room-from-url",
      );
      expect(screen.getByText("waiting room")).toBeTruthy();
    });
  });
});
