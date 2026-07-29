# PR 4 Report — 3D layer subscriptions + room render stability

## Status
**Complete.** Merge criteria met.

## Summary
Split the 3D scene into focused components with narrower Zustand coupling: memoized `BoardRooms` keyed by `activeRoomId`, prop-driven `BoardAvatars`, extracted `CameraRig` (formerly inline `SceneControls`), and slim `GameScene` composition. `Avatar` no longer subscribes to `phase` for name labels; `showNameLabel` is passed from `BoardAvatars`. Optional demand `frameloop` when the camera is idle and dice are not rolling.

## Changes

### `BoardRooms.tsx` (new)
- `React.memo` wrapper mapping `rooms` → `SpaceRoom`.
- Props: `{ activeRoomId: number }` — skips re-renders when only unrelated store fields change while the focused room id is unchanged.

### `BoardAvatars.tsx` (new)
- Props: `players`, `currentPlayerIndex`, `phase`, `portalTransition`, `winnerId`.
- Computes `showNameLabel` from phase and renders player `Avatar` list + `VictoryCinematic` when finished.

### `VictoryCinematic.tsx` (new)
- Extracted from `GameScene.tsx` (rocket / fireworks / winner avatar).

### `CameraRig.tsx` (new)
- `MapControls` + camera focus lerp logic moved from `GameScene`.
- Reports camera idle state and calls `invalidate()` during camera motion and map interaction (second commit).

### `GameScene.tsx`
- Composes Moon sky/surface, hallways, `BoardRooms`, `BoardAvatars`, shadow plane, `CameraRig`.
- Store selectors unchanged at this layer; room highlight stability comes from `BoardRooms` memo + `activeRoomId` only.
- Canvas `frameloop="demand"` when camera settled, not rolling, and not in victory phase.

### `Avatar.tsx`
- Removed `useGameStore(phase)`.
- Added required prop `showNameLabel: boolean`.
- Calls `invalidate()` during walk/portal animations so movement still renders under demand frameloop.

## Verification
| Command | Result |
|---------|--------|
| `npm test` | 63/63 passed (11 files) |
| `npm run build` | Success |
| `npm run lint` | Success (pre-existing warning in `TriviaAnswerTimer.tsx`) |

## Merge criteria
- Room list remapped through memoized `BoardRooms` with minimal `activeRoomId` prop — not re-derived on every unrelated store tick when active room unchanged.
- `Avatar` label visibility driven by props, not a global phase subscription.

## Commits (not pushed)
| SHA | Message |
|-----|---------|
| `9a21a55` | `perf: narrow R3F subscriptions and memoize board rooms` |
| `8e9479b` | `perf: use demand frameloop when camera idle` |

## Notes
- Idle avatar beacon pulse pauses under demand frameloop until the camera moves or a walk/portal animation runs (which triggers `invalidate()`).
- Victory phase keeps `frameloop="always"` for continuous cinematic animation.
