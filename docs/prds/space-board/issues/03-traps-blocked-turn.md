---
title: "Space Board: traps — blocked turn and coin escape"
type: AFK
blocked_by:
  - docs/prds/space-board/issues/01-67-room-core-loop.md
triage: ready-for-afk
---

## Parent

[Space Board PRD](../prd.md)

## What to build

Trap rooms: 52, 55, 58, 65, 66. On **first entry** in a visit (not every turn while standing there), mark the player **trapped** for their **next** turn: show trap feedback (chains / gravity / hook—lightweight animation OK). On the blocked turn: no dice, no movement items. Turn is consumed automatically **or** the player escapes at **turn start** by paying **10 banuti** if balance ≥ 10, then plays a normal turn. If they cannot pay, the turn is lost. Trap does not re-fire every turn—only on a new entry onto a trap room.

Movement backward from items (later) cannot go below room 1. Cosmic key escape ships with the shop issue.

## Acceptance criteria

- [ ] Entering a trap room (listed IDs) traps the player for the following turn only once per entry.
- [ ] Blocked turn: cannot roll; escape at turn start costs 10 coins when affordable, then normal play.
- [ ] Blocked turn without 10 coins is skipped with no roll.
- [ ] Re-entering a trap room after leaving can trap again.
- [ ] Trap behavior works alongside core movement and coin rules.

## Blocked by

- [01 — 67-room core loop](01-67-room-core-loop.md)
