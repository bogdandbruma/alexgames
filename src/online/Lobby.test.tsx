import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Lobby } from "./Lobby";

const listRooms = vi.hoisted(() => vi.fn());
const createRoom = vi.hoisted(() => vi.fn());
const joinRoom = vi.hoisted(() => vi.fn());
const listMembers = vi.hoisted(() => vi.fn());

vi.mock("./rooms", async () => {
  const actual = await vi.importActual<typeof import("./rooms")>("./rooms");
  return {
    ...actual,
    listRooms,
    createRoom,
    joinRoom,
    listMembers,
  };
});

vi.mock("./WaitingRoom", () => ({
  WaitingRoom: () => <div>waiting room</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const GAME = "space-board";
const DEVICE = "11111111-2222-4333-8444-555555555555";

describe("Lobby", () => {
  test("lists rooms filtered by game_slug and can create a room", async () => {
    const user = userEvent.setup();
    listRooms.mockResolvedValue([
      {
        id: "room-1",
        gameSlug: GAME,
        name: "Alpha",
        hostDeviceId: DEVICE,
        status: "waiting",
        maxPlayers: 4,
        createdAt: "2026-08-06T10:00:00.000Z",
        updatedAt: "2026-08-06T10:00:00.000Z",
      },
    ]);
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

  test("joins an existing waiting room as player", async () => {
    const user = userEvent.setup();
    listRooms.mockResolvedValue([
      {
        id: "room-1",
        gameSlug: GAME,
        name: "Alpha",
        hostDeviceId: "other",
        status: "waiting",
        maxPlayers: 4,
        createdAt: "2026-08-06T10:00:00.000Z",
        updatedAt: "2026-08-06T10:00:00.000Z",
      },
    ]);
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

  test("host can re-enter a paused room with same device_id (no host transfer)", async () => {
    const user = userEvent.setup();
    listRooms.mockResolvedValue([
      {
        id: "room-1",
        gameSlug: GAME,
        name: "Paused",
        hostDeviceId: DEVICE,
        status: "paused",
        maxPlayers: 4,
        createdAt: "2026-08-06T10:00:00.000Z",
        updatedAt: "2026-08-06T10:00:00.000Z",
      },
    ]);
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

    await user.click(screen.getByRole("button", { name: /reintră|rejoin|reia/i }));

    await waitFor(() => {
      expect(listMembers).toHaveBeenCalledWith(expect.anything(), "room-1");
      expect(joinRoom).not.toHaveBeenCalled();
      expect(screen.getByText("waiting room")).toBeTruthy();
    });
  });
});
