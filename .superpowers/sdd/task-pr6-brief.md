# PR 6 — GPU budget toggles

Create `src/three/sceneQuality.ts` with shadows, dpr, antialias defaults.
GameScene reads from sceneQuality for Canvas props.
Optional VITE_SCENE_SHADOWS=0 env in vite.config or import.meta.env.
Commit: `chore: centralize scene quality toggles`
npm test, build, lint.
