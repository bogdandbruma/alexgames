import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { WaitingRoom } from "./WaitingRoom";
import type { Room, RoomMember } from "./rooms";

const subscribeRoomPresence = vi.hoisted(() => vi.fn());
const listMembers = vi.hoisted(() => vi.fn());
const addAiSeat = vi.hoisted(() => vi.fn());
const kickMember = vi.hoisted(() => vi.fn());
const startRoom = vi.hoisted(() => vi.fn());
const fetchRoom = vi.hoisted(() => vi.fn());
const pauseRoom = vi.hoisted(() => vi.fn());
const resumeRoom = vi.hoisted(() => vi.fn());
const closeRoom = vi.hoisted(() => vi.fn());
const subscribeRoomMessages = vi.hoisted(() => vi.fn());

vi.mock("./presence", () => ({ subscribeRoomPresence }));
vi.mock("./chat", async () => {
  const actual = await vi.importActual<typeof import("./chat")>("./chat");
  return {
    ...actual,
    subscribeRoomMessages,
  };
});
vi.mock("./rooms", async () => {
  const actual = await vi.importActual<typeof import("./rooms")>("./rooms");
  return {
    ...actual,
    listMembers,
    addAiSeat,
    kickMember,
    startRoom,
    fetchRoom,
    pauseRoom,
    resumeRoom,
    closeRoom,
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ROOM: Room = {
  id: "room-1",
  gameSlug: "space-board",
  name: "Nova",
  hostDeviceId: "host-device",
  status: "waiting",
  maxPlayers: 4,
  createdAt: "2026-08-06T10:00:00.000Z",
  updatedAt: "2026-08-06T10:00:00.000Z",
};

const HOST_MEMBER: RoomMember = {
  id: "m-host",
  roomId: "room-1",
  deviceId: "host-device",
  role: "host",
  seat: 0,
  isAi: false,
  displayName: "Host",
  avatarId: null,
  connected: true,
};

describe("WaitingRoom", () => {
  test("shows presence members from room channel sync", async () => {
    listMembers.mockResolvedValue([HOST_MEMBER]);
    subscribeRoomMessages.mockResolvedValue({ unsubscribe: vi.fn() });
    subscribeRoomPresence.mockImplementation(
      async (
        _client: unknown,
        input: {
          onSync: (
            members: { deviceId: string; displayName: string; role: string }[],
          ) => void;
        },
      ) => {
        input.onSync([
          { deviceId: "host-device", displayName: "Host", role: "host" },
          { deviceId: "guest", displayName: "Guest", role: "player" },
        ]);
        return { unsubscribe: vi.fn() };
      },
    );

    render(
      <WaitingRoom
        client={{} as never}
        room={ROOM}
        member={HOST_MEMBER}
        deviceId="host-device"
        username="Host"
        onLeave={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Guest")).toBeTruthy();
    });
    expect(subscribeRoomPresence).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        roomId: "room-1",
        self: expect.objectContaining({ deviceId: "host-device" }),
      }),
    );
    expect(screen.getByRole("button", { name: /chat/i })).toBeTruthy();
  });

  test("host can add AI, kick, and start", async () => {
    const user = userEvent.setup();
    const player: RoomMember = {
      id: "m-player",
      roomId: "room-1",
      deviceId: "guest",
      role: "player",
      seat: 1,
      isAi: false,
      displayName: "Guest",
      avatarId: null,
      connected: true,
    };
    listMembers.mockResolvedValue([HOST_MEMBER, player]);
    subscribeRoomPresence.mockResolvedValue({ unsubscribe: vi.fn() });
    subscribeRoomMessages.mockResolvedValue({ unsubscribe: vi.fn() });
    addAiSeat.mockResolvedValue({
      id: "m-ai",
      roomId: "room-1",
      deviceId: null,
      role: "player",
      seat: 2,
      isAi: true,
      displayName: "AI-1",
      avatarId: null,
      connected: true,
    });
    kickMember.mockResolvedValue(undefined);
    startRoom.mockResolvedValue(undefined);

    render(
      <WaitingRoom
        client={{} as never}
        room={ROOM}
        member={HOST_MEMBER}
        deviceId="host-device"
        username="Host"
        onLeave={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Guest/)).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: /adaugă ai|add ai/i }));
    await waitFor(() => {
      expect(addAiSeat).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          roomId: "room-1",
          hostDeviceId: "host-device",
        }),
      );
    });

    await user.click(screen.getByRole("button", { name: /dă afară|kick/i }));
    await waitFor(() => {
      expect(kickMember).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          memberId: "m-player",
          hostDeviceId: "host-device",
        }),
      );
    });

    await user.click(screen.getByRole("button", { name: /^start$/i }));
    await waitFor(() => {
      expect(startRoom).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          roomId: "room-1",
          hostDeviceId: "host-device",
        }),
      );
    });
  });

  test("when playing, mounts OnlinePlay surface with room-scoped chat", async () => {
    listMembers.mockResolvedValue([HOST_MEMBER]);
    subscribeRoomMessages.mockResolvedValue({ unsubscribe: vi.fn() });
    fetchRoom.mockResolvedValue({ ...ROOM, status: "playing" });
    subscribeRoomPresence.mockImplementation(
      async (
        _client: unknown,
        input: {
          onSync: (
            members: { deviceId: string; displayName: string; role: string }[],
          ) => void;
        },
      ) => {
        input.onSync([
          { deviceId: "host-device", displayName: "Host", role: "host" },
        ]);
        return { unsubscribe: vi.fn() };
      },
    );
    const Play = ({ room }: { room: { status: string } }) => (
      <div>online play {room.status}</div>
    );

    render(
      <WaitingRoom
        client={{} as never}
        room={{ ...ROOM, status: "playing" }}
        member={HOST_MEMBER}
        deviceId="host-device"
        username="Host"
        OnlinePlay={Play as never}
        onLeave={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("online play playing")).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: /chat/i })).toBeTruthy();
    expect(subscribeRoomMessages).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ roomId: "room-1" }),
    );
  });

  test("playing reenter waits for members before mounting OnlinePlay", async () => {
    let resolveMembers!: (value: RoomMember[]) => void;
    listMembers.mockReturnValue(
      new Promise<RoomMember[]>((resolve) => {
        resolveMembers = resolve;
      }),
    );
    subscribeRoomPresence.mockResolvedValue({ unsubscribe: vi.fn() });
    subscribeRoomMessages.mockResolvedValue({ unsubscribe: vi.fn() });
    fetchRoom.mockResolvedValue({ ...ROOM, status: "playing" });

    const Play = ({ members }: { members: RoomMember[] }) => (
      <div>online play seats:{members.length}</div>
    );

    render(
      <WaitingRoom
        client={{} as never}
        room={{ ...ROOM, status: "playing" }}
        member={HOST_MEMBER}
        deviceId="host-device"
        username="Host"
        OnlinePlay={Play as never}
        onLeave={() => {}}
      />,
    );

    expect(screen.queryByText(/online play seats/)).toBeNull();
    expect(screen.getByText(/Se sincronizează|În așteptare|Nova/i)).toBeTruthy();

    resolveMembers([HOST_MEMBER]);

    await waitFor(() => {
      expect(screen.getByText("online play seats:1")).toBeTruthy();
    });
  });

  test("guest in waiting polls and mounts OnlinePlay when host starts", async () => {
    const guest: RoomMember = {
      id: "m-guest",
      roomId: "room-1",
      deviceId: "guest-device",
      role: "player",
      seat: 1,
      isAi: false,
      displayName: "Guest",
      avatarId: null,
      connected: true,
    };
    listMembers.mockResolvedValue([HOST_MEMBER, guest]);
    subscribeRoomPresence.mockResolvedValue({ unsubscribe: vi.fn() });
    subscribeRoomMessages.mockResolvedValue({ unsubscribe: vi.fn() });
    fetchRoom.mockResolvedValue({ ...ROOM, status: "playing" });

    const Play = ({ room }: { room: { status: string } }) => (
      <div>online play {room.status}</div>
    );

    render(
      <WaitingRoom
        client={{} as never}
        room={{ ...ROOM, status: "waiting" }}
        member={guest}
        deviceId="guest-device"
        username="Guest"
        OnlinePlay={Play as never}
        onLeave={() => {}}
      />,
    );

    await waitFor(() => {
      expect(fetchRoom).toHaveBeenCalled();
      expect(screen.getByText("online play playing")).toBeTruthy();
    });
  });

  test("host leave during play → paused + visible banner; OnlinePlay stays mounted", async () => {
    listMembers.mockResolvedValue([HOST_MEMBER]);
    subscribeRoomMessages.mockResolvedValue({ unsubscribe: vi.fn() });
    pauseRoom.mockResolvedValue(undefined);
    fetchRoom.mockResolvedValue({ ...ROOM, status: "playing" });

    const presenceSync = {
      onSync: null as null | ((
        members: { deviceId: string; displayName: string; role: string }[],
      ) => void),
    };

    subscribeRoomPresence.mockImplementation(
      async (
        _client: unknown,
        input: {
          onSync: (
            members: { deviceId: string; displayName: string; role: string }[],
          ) => void;
        },
      ) => {
        presenceSync.onSync = input.onSync;
        input.onSync([
          { deviceId: "host-device", displayName: "Host", role: "host" },
          { deviceId: "guest", displayName: "Guest", role: "player" },
        ]);
        return { unsubscribe: vi.fn() };
      },
    );

    const Play = ({ room }: { room: { status: string } }) => (
      <div>online play {room.status}</div>
    );

    render(
      <WaitingRoom
        client={{} as never}
        room={{ ...ROOM, status: "playing" }}
        member={{
          ...HOST_MEMBER,
          id: "m-guest",
          deviceId: "guest",
          role: "player",
          seat: 1,
          displayName: "Guest",
        }}
        deviceId="guest"
        username="Guest"
        OnlinePlay={Play as never}
        onLeave={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("online play playing")).toBeTruthy();
    });

    presenceSync.onSync?.([
      { deviceId: "guest", displayName: "Guest", role: "player" },
    ]);

    await waitFor(() => {
      expect(pauseRoom).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ roomId: "room-1" }),
      );
    });
    await waitFor(() => {
      expect(screen.getByRole("status", { name: /host/i })).toBeTruthy();
      expect(screen.getByText("online play paused")).toBeTruthy();
    });
  });

  test("host reclaim with same device_id resumes play", async () => {
    listMembers.mockResolvedValue([HOST_MEMBER]);
    subscribeRoomMessages.mockResolvedValue({ unsubscribe: vi.fn() });
    fetchRoom.mockResolvedValue({ ...ROOM, status: "paused" });
    resumeRoom.mockImplementation(async () => {
      fetchRoom.mockResolvedValue({ ...ROOM, status: "playing" });
    });

    const presenceSync = {
      onSync: null as null | ((
        members: { deviceId: string; displayName: string; role: string }[],
      ) => void),
    };

    subscribeRoomPresence.mockImplementation(
      async (
        _client: unknown,
        input: {
          onSync: (
            members: { deviceId: string; displayName: string; role: string }[],
          ) => void;
        },
      ) => {
        presenceSync.onSync = input.onSync;
        input.onSync([
          { deviceId: "guest", displayName: "Guest", role: "player" },
        ]);
        return { unsubscribe: vi.fn() };
      },
    );

    const Play = ({ room }: { room: { status: string } }) => (
      <div>online play {room.status}</div>
    );

    render(
      <WaitingRoom
        client={{} as never}
        room={{ ...ROOM, status: "paused" }}
        member={HOST_MEMBER}
        deviceId="host-device"
        username="Host"
        OnlinePlay={Play as never}
        onLeave={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/online play paused/i)).toBeTruthy();
    });

    presenceSync.onSync?.([
      { deviceId: "host-device", displayName: "Host", role: "host" },
      { deviceId: "guest", displayName: "Guest", role: "player" },
    ]);

    await waitFor(() => {
      expect(resumeRoom).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          roomId: "room-1",
          hostDeviceId: "host-device",
        }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText("online play playing")).toBeTruthy();
    });
  });

  test("after reclaim timeout room closes and clients exit to lobby", async () => {
    listMembers.mockResolvedValue([HOST_MEMBER]);
    subscribeRoomMessages.mockResolvedValue({ unsubscribe: vi.fn() });
    closeRoom.mockResolvedValue(undefined);
    fetchRoom.mockResolvedValue({ ...ROOM, status: "paused" });

    const presenceSync = {
      onSync: null as null | ((
        members: { deviceId: string; displayName: string; role: string }[],
      ) => void),
    };

    subscribeRoomPresence.mockImplementation(
      async (
        _client: unknown,
        input: {
          onSync: (
            members: { deviceId: string; displayName: string; role: string }[],
          ) => void;
        },
      ) => {
        presenceSync.onSync = input.onSync;
        input.onSync([
          { deviceId: "guest", displayName: "Guest", role: "player" },
        ]);
        return { unsubscribe: vi.fn() };
      },
    );

    const onLeave = vi.fn();
    const Play = ({ room }: { room: { status: string } }) => (
      <div>online play {room.status}</div>
    );

    const started = 5_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(started);

    render(
      <WaitingRoom
        client={{} as never}
        room={{ ...ROOM, status: "paused" }}
        member={{
          ...HOST_MEMBER,
          id: "m-guest",
          deviceId: "guest",
          role: "player",
          seat: 1,
          displayName: "Guest",
        }}
        deviceId="guest"
        username="Guest"
        OnlinePlay={Play as never}
        onLeave={onLeave}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/online play paused/i)).toBeTruthy();
    });

    nowSpy.mockReturnValue(started + 90_000);
    presenceSync.onSync?.([
      { deviceId: "guest", displayName: "Guest", role: "player" },
    ]);

    await waitFor(() => {
      expect(closeRoom).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ roomId: "room-1" }),
      );
      expect(onLeave).toHaveBeenCalled();
    });

    nowSpy.mockRestore();
  });
});
