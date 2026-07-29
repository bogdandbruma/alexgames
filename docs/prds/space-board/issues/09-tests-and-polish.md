---
title: "Space Board: unit tests and polish"
type: AFK
blocked_by:
  - docs/prds/space-board/issues/02-portals-exact-landing.md
  - docs/prds/space-board/issues/03-traps-blocked-turn.md
  - docs/prds/space-board/issues/04-trivia-zone.md
  - docs/prds/space-board/issues/05-shop-catalog-and-items.md
  - docs/prds/space-board/issues/06-mystery-cards.md
  - docs/prds/space-board/issues/07-3d-labyrinth-minimap.md
  - docs/prds/space-board/issues/08-victory-cinematic.md
triage: ready-for-afk
Status: done
---

## Parent

[Space Board PRD](../prd.md)

## What to build

Harden the shipped rules with **unit tests** for pure game logic: portal exact landing (including 22 vs overshoot to 23), trap escape timing and coin cost, x2 dice and x3 coins-on-enter arming/consumption, movement clamp at room 1. Update the Playwright **browser-check** script to match **Romanian** UI strings and a smoke path on the 67-room flow. Polish: Romanian toasts where missing, sensible sound hooks if the project already has audio patterns (optional if no audio system exists).

## Acceptance criteria

- [ ] Unit tests cover portals, overshoot past 22, trap escape at 10 coins, x2/x3 timing.
- [ ] `browser-check` passes against current Romanian UI and core play path.
- [ ] No known regressions in turn order, global stock, or win-at-67 from test suite.
- [ ] User-facing messages for key events are Romanian where the rest of the game is RO.

## Blocked by

- [02 — portals](02-portals-exact-landing.md)
- [03 — traps](03-traps-blocked-turn.md)
- [04 — trivia](04-trivia-zone.md)
- [05 — shop](05-shop-catalog-and-items.md)
- [06 — mystery](06-mystery-cards.md)
- [07 — 3D / minimap](07-3d-labyrinth-minimap.md)
- [08 — victory cinematic](08-victory-cinematic.md)
