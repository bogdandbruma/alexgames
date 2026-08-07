import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CHAT_BODY_MAX_LENGTH, CHAT_EMOJI } from "./chat";
import { RoomChat } from "./RoomChat";

const subscribeRoomMessages = vi.hoisted(() => vi.fn());
const sendRoomMessage = vi.hoisted(() => vi.fn());

vi.mock("./chat", async () => {
  const actual = await vi.importActual<typeof import("./chat")>("./chat");
  return {
    ...actual,
    subscribeRoomMessages,
    sendRoomMessage,
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RoomChat", () => {
  test("is collapsible and starts collapsed", async () => {
    const user = userEvent.setup();
    subscribeRoomMessages.mockResolvedValue({ unsubscribe: vi.fn() });

    render(
      <RoomChat
        client={{} as never}
        roomId="room-1"
        deviceId="dev-1"
        username="Alex"
      />,
    );

    expect(screen.queryByLabelText(/mesaj chat/i)).toBeNull();
    await user.click(screen.getByRole("button", { name: /chat/i }));
    expect(screen.getByLabelText(/mesaj chat/i)).toBeTruthy();
  });

  test("shows only live messages after subscribe; never dumps history", async () => {
    type LiveMessage = {
      id: string;
      roomId: string;
      deviceId: string;
      username: string;
      body: string;
      createdAt: string;
    };
    let onMessage: ((msg: LiveMessage) => void) | undefined;

    subscribeRoomMessages.mockImplementation(
      async (
        _client: unknown,
        input: {
          onMessage: (msg: LiveMessage) => void;
        },
      ) => {
        onMessage = input.onMessage;
        return { unsubscribe: vi.fn() };
      },
    );

    const user = userEvent.setup();
    render(
      <RoomChat
        client={{} as never}
        roomId="room-1"
        deviceId="dev-1"
        username="Alex"
      />,
    );

    await user.click(screen.getByRole("button", { name: /chat/i }));

    await waitFor(() => {
      expect(subscribeRoomMessages).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ roomId: "room-1" }),
      );
    });

    expect(screen.queryByText("old history")).toBeNull();

    onMessage?.({
      id: "live-1",
      roomId: "room-1",
      deviceId: "guest",
      username: "Guest",
      body: "hello live",
      createdAt: "2026-08-06T12:00:00.000Z",
    });

    await waitFor(() => {
      expect(screen.getByText("hello live")).toBeTruthy();
    });
    expect(screen.getByText("Guest")).toBeTruthy();
  });

  test("sends text and fixed emoji; input respects body max length", async () => {
    const user = userEvent.setup();
    subscribeRoomMessages.mockResolvedValue({ unsubscribe: vi.fn() });
    sendRoomMessage.mockResolvedValue({
      id: "msg-1",
      roomId: "room-1",
      deviceId: "dev-1",
      username: "Alex",
      body: "hi",
      createdAt: "2026-08-06T12:00:00.000Z",
    });

    render(
      <RoomChat
        client={{} as never}
        roomId="room-1"
        deviceId="dev-1"
        username="Alex"
      />,
    );

    await user.click(screen.getByRole("button", { name: /chat/i }));
    const input = screen.getByLabelText(/mesaj chat/i);
    expect(input.getAttribute("maxLength")).toBe(String(CHAT_BODY_MAX_LENGTH));

    await user.type(input, "hi");
    await user.click(screen.getByRole("button", { name: /trimite/i }));

    await waitFor(() => {
      expect(sendRoomMessage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          roomId: "room-1",
          deviceId: "dev-1",
          username: "Alex",
          body: "hi",
        }),
      );
    });

    const emoji = CHAT_EMOJI[0]!;
    await user.click(screen.getByRole("button", { name: emoji }));
    await waitFor(() => {
      expect(sendRoomMessage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ body: emoji }),
      );
    });
  });
});
