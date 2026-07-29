---
title: "Space Board: victory cinematic at room 67"
type: AFK
blocked_by:
  - docs/prds/space-board/issues/01-67-room-core-loop.md
triage: ready-for-afk
Status: done
---

## Parent

[Space Board PRD](../prd.md)

## What to build

When a player lands exactly on **finish** (67), stop the game for all players. Play a **winner cinematic**: winner avatar on a rocket from the Moon, launch, sky flight, success fireworks. Other players see the same cinematic or a spectator overlay (split view is v2). After cinematic, show game-over screen with **rematch** / return to lobby. Integrate with existing `finished` phase and persistence reset behavior.

## Acceptance criteria

- [ ] Exact win on 67 triggers global stop and blocks further turns.
- [ ] Winner sequence: rocket, moon, sky, fireworks (readable on target devices).
- [ ] Non-winners are not stuck in interactive play; they see the outcome.
- [ ] Rematch or lobby control starts a fresh game without stale trap/shop state.

## Blocked by

- [01 — 67-room core loop](01-67-room-core-loop.md)
