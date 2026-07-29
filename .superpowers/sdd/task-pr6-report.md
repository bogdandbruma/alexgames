# PR 6 Report — GPU budget toggles

## Status
**Complete.** Merge criteria met.

## Summary
Centralized R3F Canvas quality settings (shadows, device pixel ratio, antialiasing) in `sceneQuality.ts`. `GameScene` reads those values for Canvas props. QA can disable shadows with `VITE_SCENE_SHADOWS=0` (or `false`) without code changes.

## Changes

### `src/three/sceneQuality.ts` (new)
- Exports `sceneQuality` with defaults: `shadows: true`, `dpr: [1, 1.75]`, `antialias: true`.
- `VITE_SCENE_SHADOWS=0` or `false` sets `shadows` to false; unset env keeps shadows enabled.

### `src/three/GameScene.tsx`
- Canvas uses `sceneQuality.shadows`, `sceneQuality.dpr`, and `sceneQuality.antialias`.
- PCF shadow map setup in `onCreated` runs only when shadows are enabled.

## Verification
| Command | Result |
|---------|--------|
| `npm test` | 64/64 passed (12 files) |
| `npm run build` | Success |
| `npm run lint` | Success (pre-existing warning in `TriviaAnswerTimer.tsx`) |

## Merge criteria
- Documented toggles live in one module; defaults match prior behavior.
- Optional env override for shadows for QA.

## Commits (not pushed)
| SHA | Message |
|-----|---------|
| `f3f7b76` | `chore: centralize scene quality toggles` |

## Notes
- Follow-up (separate PR): lower `dpr` cap and default `shadows: false` after visual sign-off per refactor plan.
