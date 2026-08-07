import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PlaySession } from "./PlaySession";

const createSupabaseClient = vi.hoisted(() => vi.fn());

vi.mock("./supabaseClient", () => ({
  createSupabaseClient,
}));

afterEach(() => {
  cleanup();
});

describe("PlaySession offline path", () => {
  test("offline path renders without calling supabase", async () => {
    const user = userEvent.setup();
    const StubGame = ({ onExit }: { onExit: () => void }) => (
      <div>
        <p>stub offline game</p>
        <button type="button" onClick={onExit}>
          exit
        </button>
      </div>
    );

    render(
      <PlaySession Game={StubGame} gameSlug="space-board" onExit={() => {}} />,
    );

    expect(screen.getByRole("button", { name: /offline/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /online/i })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /offline/i }));

    expect(screen.getByText("stub offline game")).toBeTruthy();
    expect(createSupabaseClient).not.toHaveBeenCalled();
  });
});
