# PR 3 — UI shell split

**Merge criteria:** Updating `message` alone does not re-render `BoardViewport` / `GameScene` wrapper.

## Task 3.1
- Create `SpaceBoardPanel.tsx` — left panel (setup + playing HUD), own store selectors
- Create `BoardViewport.tsx` — `memo`, contains `scene-container`, `GameScene`, `DiceTray`, `BigDiceRollOverlay`, `SceneToast`, map FAB, minimap overlay
- `SpaceBoardGame.tsx` — thin: layout `main`, `onExit`, render Panel + Viewport + modals as siblings
- Modals: at minimum move trivia already done; extract others optional in 3.1 OR create files for shop/mystery/portal/target/victory/minimap if quick—priority is Panel/Viewport split and modals NOT inside component that subscribes to `message` AND wraps GameScene together

Actually per plan:
- `TriviaOverlay` already sibling
- Extract panel vs viewport so `message` updates only re-render panel

## Task 3.2 (same PR)
- Create `src/games/space-board/dice/` — move DiceTray, BigDiceRollOverlay, dice pip helpers from SpaceBoardGame
- Second commit OR same commit if small: `refactor: extract dice overlay components`

## Verify
npm test, build, lint

## Commits
1. `refactor: split space board panel, viewport, and modals`
2. optional `refactor: extract dice overlay components`

Global constraints unchanged.
