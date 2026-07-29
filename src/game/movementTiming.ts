import { AVATAR_STEP_MS } from "./movementConstants";

export function getWalkDurationMs(stepCount: number): number {
  if (stepCount <= 0) {
    return 0;
  }

  return stepCount * AVATAR_STEP_MS + AVATAR_STEP_MS;
}
