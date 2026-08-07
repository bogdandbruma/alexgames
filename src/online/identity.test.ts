import { afterEach, describe, expect, test } from "vitest";
import {
  getOrCreateDeviceId,
  getUsername,
  setUsername,
  USERNAME_MAX_LENGTH,
} from "./identity";

const DEVICE_ID_KEY = "brumix.online.device_id";
const USERNAME_KEY = "brumix.online.username";

afterEach(() => {
  localStorage.clear();
});

describe("getOrCreateDeviceId", () => {
  test("creates and persists a stable device_id", () => {
    const first = getOrCreateDeviceId();
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(localStorage.getItem(DEVICE_ID_KEY)).toBe(first);
    expect(getOrCreateDeviceId()).toBe(first);
  });

  test("reuses an existing device_id from storage", () => {
    const existing = "11111111-2222-4333-8444-555555555555";
    localStorage.setItem(DEVICE_ID_KEY, existing);
    expect(getOrCreateDeviceId()).toBe(existing);
  });
});

describe("username persistence", () => {
  test("setUsername persists and truncates to max length", () => {
    const saved = setUsername("AlexandruExtra");
    expect(saved).toBe("AlexandruE".slice(0, USERNAME_MAX_LENGTH));
    expect(saved.length).toBe(USERNAME_MAX_LENGTH);
    expect(localStorage.getItem(USERNAME_KEY)).toBe(saved);
    expect(getUsername()).toBe(saved);
  });

  test("getUsername returns null when unset", () => {
    expect(getUsername()).toBeNull();
  });
});
