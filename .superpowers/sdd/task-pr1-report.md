# PR 1 — Trivia timer isolation — implementation report

## Status
**DONE**

## Summary
Moved trivia UI and `useTriviaCountdown` from `SpaceBoardGame` into `TriviaOverlay`, mounted as a sibling of the 3D scene section so countdown state updates no longer re-render the shell that owns `GameScene`. Throttled timer React updates: progress at most ~120 steps over the countdown, seconds only when the displayed second changes.

## Changes

### `TriviaAnswerTimer.tsx`
- Kept `requestAnimationFrame` loop for timing accuracy.
- Added `lastProgress` / `lastSecond` guards: `setProgress` only when `|Δprogress| ≥ 1/120`, `setSecondsLeft` only when ceiling second changes.
- Expire behavior unchanged: `onExpire` when `remaining <= 0`.

### `modals/TriviaOverlay.tsx` (new)
- Subscribes to `pendingTrivia` and `answerTrivia` via `useGameStore`.
- Hosts trivia modal markup moved from `SpaceBoardGame`.
- Local `CoinAmount` helper (same markup as shell; avoids unrelated refactor).

### `SpaceBoardGame.tsx`
- Removed root `useTriviaCountdown` and inline trivia JSX.
- Renders `<TriviaOverlay />` after `scene-container`, still under `main`.
- Dropped unused lucide imports and `answerTrivia` selector.

### `TriviaAnswerTimer.test.tsx` (new)
- Probe component counts renders while countdown runs ~496ms (31 × 16ms frames).
- Requires faking `performance.now`, stubbing `requestAnimationFrame` via `setTimeout`, and one `act` + `runOnlyPendingTimersAsync` per frame so Vitest/jsdom actually drives the loop (plain `advanceTimersByTimeAsync(500)` did not advance `performance.now` or flush rAF enough).
- Asserts `< 12` render delta over ~30 frames after warmup (unthrottled implementation measured ~30).

### Tooling
- Added devDependencies: `@testing-library/react`, `jsdom`.
- `vite.config.ts`: `defineConfig` from `vitest/config`, `test.environment: "jsdom"`.

## Verification
| Command | Result |
|---------|--------|
| `npm test` | 59 passed (9 files) |
| `npm run build` | pass |
| `npm run lint` | pass (existing warning: `TriviaAnswerTimer.tsx` exports hook + components) |

## Self-review

**Strengths**
- Meets merge criterion: countdown hook no longer lives on `SpaceBoardGame` root.
- Throttle is localized; no gameplay rule changes.
- Test fails (~30 renders) without throttle, passes (~6–8 renders) with throttle.

**Risks / notes**
- `TriviaOverlay` duplicates `CoinAmount`; acceptable for PR scope; extract later if desired.
- Overlay DOM moved from inside `scene-container` to `main` sibling; `.trivia-overlay` is `position: fixed` so layout should be equivalent—manual smoke on trivia room recommended.
- On expire, final `setProgress(0)` / `setSecondsLeft(0)` may be skipped if last tick already throttled; expire still fires `answerTrivia("wrong")` as before.

**Not done**
- No push to remote (per instructions).

## Commit
Message: `perf: isolate trivia countdown and throttle timer state updates`
