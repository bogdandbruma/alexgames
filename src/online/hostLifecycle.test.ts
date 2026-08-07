import { describe, expect, test, vi } from "vitest";
import {
  HOST_RECLAIM_TIMEOUT_MS,
  applyHostLifecycleDecision,
  areGameActionsAllowed,
  decideHostLifecycle,
  isHostInPresence,
} from "./hostLifecycle";

const HOST = "host-device";
const GUEST = "guest-device";

describe("HOST_RECLAIM_TIMEOUT_MS", () => {
  test("is ~90 seconds", () => {
    expect(HOST_RECLAIM_TIMEOUT_MS).toBe(90_000);
  });
});

describe("isHostInPresence", () => {
  test("true when host device_id is among presence members", () => {
    expect(
      isHostInPresence(HOST, [
        { deviceId: GUEST },
        { deviceId: HOST },
      ]),
    ).toBe(true);
  });

  test("false when host device_id is absent", () => {
    expect(isHostInPresence(HOST, [{ deviceId: GUEST }])).toBe(false);
  });
});

describe("areGameActionsAllowed", () => {
  test("only playing allows actions — paused and others block", () => {
    expect(areGameActionsAllowed("playing")).toBe(true);
    expect(areGameActionsAllowed("paused")).toBe(false);
    expect(areGameActionsAllowed("waiting")).toBe(false);
    expect(areGameActionsAllowed("closed")).toBe(false);
  });
});

describe("decideHostLifecycle", () => {
  test("playing + host absent → pause (no host transfer)", () => {
    expect(
      decideHostLifecycle({
        roomStatus: "playing",
        hostDeviceId: HOST,
        hostPresent: false,
        pausedAtMs: null,
        nowMs: 1_000,
      }),
    ).toEqual({ type: "pause" });
  });

  test("playing + host present → none", () => {
    expect(
      decideHostLifecycle({
        roomStatus: "playing",
        hostDeviceId: HOST,
        hostPresent: true,
        pausedAtMs: null,
        nowMs: 1_000,
      }),
    ).toEqual({ type: "none" });
  });

  test("paused + same host returns within timeout → resume", () => {
    expect(
      decideHostLifecycle({
        roomStatus: "paused",
        hostDeviceId: HOST,
        hostPresent: true,
        pausedAtMs: 10_000,
        nowMs: 10_000 + HOST_RECLAIM_TIMEOUT_MS - 1,
      }),
    ).toEqual({ type: "resume" });
  });

  test("paused + host still absent within timeout → none", () => {
    expect(
      decideHostLifecycle({
        roomStatus: "paused",
        hostDeviceId: HOST,
        hostPresent: false,
        pausedAtMs: 10_000,
        nowMs: 10_000 + 30_000,
      }),
    ).toEqual({ type: "none" });
  });

  test("paused + timeout expired → close (any client may act)", () => {
    expect(
      decideHostLifecycle({
        roomStatus: "paused",
        hostDeviceId: HOST,
        hostPresent: false,
        pausedAtMs: 10_000,
        nowMs: 10_000 + HOST_RECLAIM_TIMEOUT_MS,
      }),
    ).toEqual({ type: "close" });
  });

  test("paused + host returns after timeout → close (no late reclaim)", () => {
    expect(
      decideHostLifecycle({
        roomStatus: "paused",
        hostDeviceId: HOST,
        hostPresent: true,
        pausedAtMs: 10_000,
        nowMs: 10_000 + HOST_RECLAIM_TIMEOUT_MS + 1,
      }),
    ).toEqual({ type: "close" });
  });

  test("waiting and closed never pause or transfer host", () => {
    expect(
      decideHostLifecycle({
        roomStatus: "waiting",
        hostDeviceId: HOST,
        hostPresent: false,
        pausedAtMs: null,
        nowMs: 1_000,
      }),
    ).toEqual({ type: "none" });

    expect(
      decideHostLifecycle({
        roomStatus: "closed",
        hostDeviceId: HOST,
        hostPresent: false,
        pausedAtMs: null,
        nowMs: 1_000,
      }),
    ).toEqual({ type: "none" });
  });
});

describe("applyHostLifecycleDecision", () => {
  test("pause and close run for any client; resume only for host", async () => {
    const pause = vi.fn().mockResolvedValue(undefined);
    const resume = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);

    await applyHostLifecycleDecision(
      { type: "pause" },
      { pause, resume, close },
      { isHost: false },
    );
    expect(pause).toHaveBeenCalledOnce();
    expect(resume).not.toHaveBeenCalled();

    await applyHostLifecycleDecision(
      { type: "resume" },
      { pause, resume, close },
      { isHost: false },
    );
    expect(resume).not.toHaveBeenCalled();

    await applyHostLifecycleDecision(
      { type: "resume" },
      { pause, resume, close },
      { isHost: true },
    );
    expect(resume).toHaveBeenCalledOnce();

    await applyHostLifecycleDecision(
      { type: "close" },
      { pause, resume, close },
      { isHost: false },
    );
    expect(close).toHaveBeenCalledOnce();
  });

  test("none is a no-op", async () => {
    const pause = vi.fn();
    const resume = vi.fn();
    const close = vi.fn();
    await applyHostLifecycleDecision(
      { type: "none" },
      { pause, resume, close },
      { isHost: true },
    );
    expect(pause).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
});
