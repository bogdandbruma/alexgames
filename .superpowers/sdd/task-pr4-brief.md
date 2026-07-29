# PR 4 — 3D layer subscriptions + room render stability

## Tasks
1. Create `BoardRooms.tsx` (memo) — props `{ activeRoomId: number }`, maps rooms to SpaceRoom
2. Create `BoardAvatars.tsx` — props players, currentPlayerIndex, phase, portalTransition, winnerId
3. Create `CameraRig.tsx` — move SceneControls from GameScene
4. Slim `GameScene.tsx` to compose Moon + BoardRooms + BoardAvatars + CameraRig
5. Remove `useGameStore(phase)` from Avatar.tsx — pass `showNameLabel` from BoardAvatars
6. Optional: Canvas `frameloop="demand"` when camera idle + invalidate on move (CameraRig)

## Verify
npm test, build, lint

## Commit
`perf: narrow R3F subscriptions and memoize board rooms`

Optional second: `perf: use demand frameloop when camera idle`
