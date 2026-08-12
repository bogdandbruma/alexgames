import type { RoomStatus } from "./rooms";

/** Wait for the same host `device_id` to reclaim before closing. */
export const HOST_RECLAIM_TIMEOUT_MS = 90_000;

export type HostLifecycleDecision =
  | { type: "pause" }
  | { type: "resume" }
  | { type: "close" }
  | { type: "none" };

export type DecideHostLifecycleInput = {
  roomStatus: RoomStatus;
  hostDeviceId: string;
  hostPresent: boolean;
  /** Client-local ms when pause was observed; null if not paused. */
  pausedAtMs: number | null;
  /**
   * Client-local ms when host absence was first observed while waiting;
   * null if host is present or timer not started.
   */
  hostAbsentSinceMs: number | null;
  nowMs: number;
};

export function isHostInPresence(
  hostDeviceId: string,
  presence: ReadonlyArray<{ deviceId: string }>,
): boolean {
  return presence.some((m) => m.deviceId === hostDeviceId);
}

/** Track when host first disappeared; clear when they return. */
export function nextHostAbsentSinceMs(
  hostPresent: boolean,
  previous: number | null,
  nowMs: number,
): number | null {
  if (hostPresent) {
    return null;
  }
  return previous ?? nowMs;
}

export function areGameActionsAllowed(status: RoomStatus): boolean {
  return status === "playing";
}

/**
 * Pure host-disconnect lifecycle. Uses only room status + host presence —
 * no game-specific fields. Never transfers host.
 */
export function decideHostLifecycle(
  input: DecideHostLifecycleInput,
): HostLifecycleDecision {
  const { roomStatus, hostPresent, pausedAtMs, hostAbsentSinceMs, nowMs } =
    input;

  switch (roomStatus) {
    case "waiting": {
      if (hostPresent || hostAbsentSinceMs === null) {
        return { type: "none" };
      }
      const expired = nowMs - hostAbsentSinceMs >= HOST_RECLAIM_TIMEOUT_MS;
      return expired ? { type: "close" } : { type: "none" };
    }
    case "closed":
      return { type: "none" };
    case "playing":
      return hostPresent ? { type: "none" } : { type: "pause" };
    case "paused": {
      if (pausedAtMs === null) {
        return { type: "none" };
      }
      const expired = nowMs - pausedAtMs >= HOST_RECLAIM_TIMEOUT_MS;
      if (expired) {
        return { type: "close" };
      }
      if (hostPresent) {
        return { type: "resume" };
      }
      return { type: "none" };
    }
    default: {
      const exhaustive: never = roomStatus;
      return exhaustive;
    }
  }
}

export type HostLifecycleCommands = {
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  close: () => Promise<void>;
};

/**
 * Executes a lifecycle decision. Resume is host-only (same device_id reclaim);
 * pause/close may be performed by any connected client (first writer wins).
 */
export async function applyHostLifecycleDecision(
  decision: HostLifecycleDecision,
  commands: HostLifecycleCommands,
  options: { isHost: boolean },
): Promise<void> {
  switch (decision.type) {
    case "none":
      return;
    case "pause":
      await commands.pause();
      return;
    case "resume":
      if (options.isHost) {
        await commands.resume();
      }
      return;
    case "close":
      await commands.close();
      return;
    default: {
      const exhaustive: never = decision;
      return exhaustive;
    }
  }
}
