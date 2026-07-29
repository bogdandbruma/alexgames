import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createDebouncedStorage } from "./debounceStorage";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createDebouncedStorage", () => {
  test("debounced storage coalesces writes", async () => {
    const base = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
    const storage = createDebouncedStorage(base as unknown as Storage, 300);
    storage.setItem("a", "1");
    storage.setItem("a", "2");
    expect(base.setItem).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(base.setItem).toHaveBeenCalledTimes(1);
    expect(base.setItem).toHaveBeenCalledWith("a", "2");
  });
});
