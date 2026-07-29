---
title: "Space Board: shop overlay, global stock, nine items"
type: AFK
status: ready-for-human
blocked_by:
  - docs/prds/space-board/issues/01-67-room-core-loop.md
  - docs/prds/space-board/issues/02-portals-exact-landing.md
triage: ready-for-human
---

## Parent

[Space Board PRD](../prd.md)

## What to build

Shop rooms: 13, 28, 53. Active player sees a full **in shop** overlay (not toast-only): items with icon and cost from a single catalog. **Max one purchase per shop visit.** **Global stock:** each catalog item quantity 1 worldwide—first buyer removes it from all shops (empty shelf visually). Cannot buy without enough banuti or with a full inventory (**max 3**).

All nine catalog items work: claw, star, swap-arrow, dice-x2, coins-x3, trivia-cancel, bomb, pistol, cosmic-key. Movement and bomb effects re-run **portal exact landing** after position changes. **One action item per turn** (pistol, claw, star, swap-arrow, bomb) after movement where applicable. **dice-x2** arms next roll; **coins-x3** arms next `coinsOnEnter` only. **trivia-cancel** skips trivia without ±1 and does not consume the action-item slot. **cosmic-key** consumed to escape a blocked trap turn instead of 10 coins.

AI in shop: if it can afford any in-stock item and has inventory space, buy one random valid item immediately (same rules as humans).

## Acceptance criteria

- [ ] Shop overlay at 13, 28, 53; one purchase per visit; insufficient funds blocked.
- [ ] Global stock: each item sold once ever; other shops show empty slot.
- [ ] Inventory cap 3; bought items stored until used.
- [ ] All nine effects match PRD; portals re-checked after movement items.
- [ ] x2 on next dice; x3 on next coin-on-enter only.
- [ ] Trivia cancel skips question without using the per-turn action item slot.
- [ ] Cosmic key escapes trap turn when used at blocked turn start.
- [ ] AI purchases one random affordable in-stock item when rules allow.

## Blocked by

- [01 — 67-room core loop](01-67-room-core-loop.md)
- [02 — portals exact landing](02-portals-exact-landing.md)

## Comments

- 2026-07-29: Implemented shop catalog/store/UI slice. Verified global stock,
  one purchase per visit, inventory cap, all nine item effects, x2/x3 timing,
  trivia cancel, cosmic key trap escape, and AI purchase with `npm test`,
  `npm run lint`, and `npm run build`.
