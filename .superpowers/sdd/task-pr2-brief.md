# PR 2 — Single `players` commit per dice move

**Merge criteria:** One `rollDice` move produces one `players` array update for position (not N intermediate); `npm test` green; walk animation still plays in 3D.

## Task 2.1: movement timing helper
- Create `src/game/movementConstants.ts`: `export const AVATAR_STEP_MS = 1_560;`
- Create `src/game/movementTiming.ts`: `export function getWalkDurationMs(stepCount: number): number`
- Formula: `if (stepCount <= 0) return 0; return stepCount * AVATAR_STEP_MS + AVATAR_STEP_MS;` (matches legacy loop: N step sleeps + final extra sleep when landingIndex > startingIndex)
- Test `src/game/movementTiming.test.ts` with legacy comparison for steps=5

## Task 2.2: rollDice
- Modify `src/game/store.ts` rollDice ~1646-1663
- Remove per-step `set` loop; `await sleep(getWalkDurationMs(stepCount))` where stepCount = max(0, landingIndex - startingIndex)
- Keep ordering: wait full walk duration BEFORE applying final landing `set` with turnResult (do not emit intermediate positionIndex)
- Add test in `store.test.ts`: subscribe to store during rollDice, assert unique positionIndex values <= 2 (initial + final)

## Verify
npm test, npm run build, npm run lint

## Commit
`perf: apply board position once per dice move after walk duration`

## Global constraints
No gameplay rule changes; no localStorage reset; imports at top; exhaustive switches.
