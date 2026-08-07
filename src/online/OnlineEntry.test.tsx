import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { OnlineEntry } from "./OnlineEntry";

const createSupabaseClient = vi.hoisted(() => vi.fn());
const verifyOnlineConnection = vi.hoisted(() => vi.fn());
const upsertProfile = vi.hoisted(() => vi.fn());
const listRooms = vi.hoisted(() => vi.fn());

vi.mock("./supabaseClient", () => ({ createSupabaseClient }));
vi.mock("./profiles", () => ({
  verifyOnlineConnection,
  upsertProfile,
}));
vi.mock("./rooms", async () => {
  const actual = await vi.importActual<typeof import("./rooms")>("./rooms");
  return {
    ...actual,
    listRooms,
  };
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe("OnlineEntry", () => {
  test("opens lobby for game_slug after successful connect", async () => {
    const user = userEvent.setup();
    createSupabaseClient.mockReturnValue({});
    verifyOnlineConnection.mockResolvedValue(undefined);
    upsertProfile.mockResolvedValue(undefined);
    listRooms.mockResolvedValue([]);

    render(<OnlineEntry gameSlug="space-board" onBack={() => {}} />);
    await user.type(screen.getByLabelText(/nume utilizator/i), "Sara");
    await user.click(screen.getByRole("button", { name: /conectează/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /lobby/i })).toBeTruthy();
    });
    expect(listRooms).toHaveBeenCalledWith({}, "space-board");
    expect(upsertProfile).toHaveBeenCalled();
  });

  test("shows clear failure when supabase is unreachable", async () => {
    const user = userEvent.setup();
    createSupabaseClient.mockReturnValue({});
    verifyOnlineConnection.mockRejectedValue(new Error("Failed to fetch"));

    render(<OnlineEntry gameSlug="space-board" onBack={() => {}} />);
    await user.type(screen.getByLabelText(/nume utilizator/i), "Sara");
    await user.click(screen.getByRole("button", { name: /conectează/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(
        /online indisponibil/i,
      );
    });
    expect(upsertProfile).not.toHaveBeenCalled();
  });
});
