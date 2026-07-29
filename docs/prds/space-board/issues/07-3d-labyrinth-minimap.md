---
title: "Space Board: 3D labyrinth, minimap, portal tunnels"
type: AFK
blocked_by:
  - docs/prds/space-board/issues/01-67-room-core-loop.md
triage: ready-for-afk
Status: done
---

## Parent

[Space Board PRD](../prd.md)

## What to build

Present the board as a **maze-like 3D layout**: three islands (start 1–21 + branch 23–27, mid 28–50, moon 51–67) connected by bridges—not a single straight snake. All **67** rooms have distinct placements; decor/accent can follow zone. Add a **2D minimap**: main route, branch, all player tokens, icons for shop / mystery / portal / trap / trivia. Portal moves use a **short tunnel** visual instead of an instant pop (gameplay timing unchanged).

Gameplay logic from earlier issues stays authoritative; this slice is the visual layer aligned to room indices.

## Acceptance criteria

- [ ] 3D scene shows 67 rooms in three-island layout with connections matching the logical path.
- [ ] Player tokens and camera follow logical room index on the 3D board.
- [ ] Minimap shows route, branch, players, and room-type icons per PRD.
- [ ] Portal transitions play a brief tunnel animation between rooms.
- [ ] No regression to dice, coins, or turn flow from the core loop.

## Blocked by

- [01 — 67-room core loop](01-67-room-core-loop.md)
