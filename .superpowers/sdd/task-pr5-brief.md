# PR 5 — Debounced persist

Create `src/game/persist/debounceStorage.ts` with `createDebouncedStorage(base, 300ms)`.
Wire in store.ts persist `storage: createJSONStorage(() => createDebouncedStorage(localStorage, 300))`.
Test debounce coalesces writes in `debounceStorage.test.ts`.
Commit: `perf: debounce zustand persist writes`
npm test, build, lint.
