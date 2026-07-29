# PR 1 — Trivia timer isolation (Task 1.1)

**Merge criteria:** During active trivia, only the trivia/timer subtree should re-render frequently—not the parent that also mounts `GameScene`.

## Files
- Create: `src/games/space-board/modals/TriviaOverlay.tsx`
- Modify: `src/games/space-board/SpaceBoardGame.tsx` (remove trivia block + `useTriviaCountdown` from root)
- Modify: `src/games/space-board/TriviaAnswerTimer.tsx`
- Test: `src/games/space-board/TriviaAnswerTimer.test.tsx`

## Interfaces
- `TriviaOverlay` uses `useGameStore` for `pendingTrivia`, `answerTrivia`
- Export `export function TriviaOverlay()`

## Steps (TDD)

1. Add test file (see plan for Probe component test). If `@testing-library/react` / `jsdom` missing, add devDependencies and configure Vitest environment in `vite.config.ts` minimally.

2. Run `npm test -- src/games/space-board/TriviaAnswerTimer.test.tsx` — expect fail before throttle.

3. Throttle `useTriviaCountdown`: rAF loop but `setProgress` only when delta ≥ 1/120; `setSecondsLeft` only when second changes. On expire still call `onExpire`.

4. Test passes.

5. Move trivia JSX from `SpaceBoardGame.tsx` (~1062–1154) into `TriviaOverlay` with hook inside overlay.

6. Wire `<TriviaOverlay />` in `SpaceBoardGame` — prefer sibling under `main` next to scene section (not inside a component that forces GameScene to re-render with trivia state). Remove unused imports from SpaceBoardGame.

7. `npm test`, `npm run build`, `npm run lint`

8. Single commit: `perf: isolate trivia countdown and throttle timer state updates`

## Global constraints
- No gameplay rule changes
- Imports at top of file
- Exhaustive switch with never in default where applicable
