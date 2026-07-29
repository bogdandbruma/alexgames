---
title: "Space Board: portals on exact landing"
type: AFK
blocked_by:
  - docs/prds/space-board/issues/01-67-room-core-loop.md
triage: ready-for-afk
---

## Parent

[Space Board PRD](../prd.md)

## What to build

After **any** position change (dice for now; items later), evaluate portals: if the player’s room index **equals** a portal `from`, teleport to `to` and then resolve the **destination** room (coins on enter if applicable, then its action). Portal **source** rooms do not run shop, mystery, trivia, or their own coin grant—only the jump.

Implement all four portals: 22→28, 35→42, 45→38, 60→50. **Overshoot rule:** landing on 23+ from 21 does not trigger the 22 portal; only exact stop on 22 teleports to 28.

## Acceptance criteria

- [ ] Exact land on 22, 35, 45, 60 applies the correct jump and resolves the destination room.
- [ ] Landing on 23 when passing 22 without stopping does not activate the 22→28 portal.
- [ ] Portal source rooms do not open shop/mystery/trivia or award source-room coins.
- [ ] Destination room applies `coinsOnEnter` and action type after teleport.
- [ ] Portal check runs after dice movement in the core loop.

## Blocked by

- [01 — 67-room core loop](01-67-room-core-loop.md)
