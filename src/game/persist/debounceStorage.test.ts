import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createDebouncedStorage } from "./debounceStorage";
import { setGamePersistWritesEnabled } from "./persistGate";

beforeEach(() => {
  vi.useFakeTimers();
  setGamePersistWritesEnabled(true);
});

afterEach(() => {
  vi.useRealTimers();
  setGamePersistWritesEnabled(true);
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

  test("skips writes when persist gate is disabled", async () => {
    const base = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
    const storage = createDebouncedStorage(base as unknown as Storage, 300);
    setGamePersistWritesEnabled(false);
    storage.setItem("a", "1");
    await vi.advanceTimersByTimeAsync(300);
    expect(base.setItem).not.toHaveBeenCalled();
  });
});
