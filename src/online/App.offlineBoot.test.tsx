import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "../App";

const createSupabaseClient = vi.hoisted(() => vi.fn());

vi.mock("./supabaseClient", () => ({
  createSupabaseClient,
}));

afterEach(() => {
  cleanup();
});

describe("App offline without keys", () => {
  test("dashboard boots without calling supabase", () => {
    window.location.hash = "";
    render(<App />);
    expect(screen.getByRole("heading", { name: /jocurile brumix/i })).toBeTruthy();
    expect(createSupabaseClient).not.toHaveBeenCalled();
  });
});
