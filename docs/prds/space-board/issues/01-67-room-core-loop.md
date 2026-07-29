---
title: "Space Board: 67-room core loop (content path, banuti, win at 67)"
type: AFK
blocked_by: []
triage: ready-for-afk
---

## Parent

[Space Board PRD](../prd.md)

## What to build

Replace the 20-room demo path with the full **1–67** room index from gameplay content. Players roll 1–6, advance on the **main path** with the **23–27 branch** only when overshooting past room 22 (e.g. 21 + 2 → 23). After room 27, movement reconnects to 28 on the main route.

On landing a **coins** room, grant `coinsOnEnter` (balance never below 0). **Finish** is room 67: exact landing only—if a roll or effect would pass 67, the move does not apply; exact landing on 67 ends the game for everyone (`gameOver`). Turn order stays 2–4 players, human and optional AI as today.

Wire room gameplay from the shared content pack (67 rows, zones, actions). For this slice, only **coins** and **finish** need full resolution; other action types may no-op or defer UI until later issues, but positions and coin rooms must match the PRD table.

Expose coins and room index in the play UI. 3D may use a minimal path follow (full labyrinth is a later issue).

## Acceptance criteria

- [ ] Gameplay loads 67 room definitions from project content (not hardcoded 20-room board).
- [ ] Dice movement follows main path and branch 23–27 rules; 27 → 28 rejoin works.
- [ ] `coinsOnEnter` applies on coin rooms; coin balance is clamped at minimum 0.
- [ ] Exact landing on 67 sets global game over; overshoot past 67 does not move the player.
- [ ] 2–4 players, turns in order, AI can roll and move on the new path.
- [ ] Play session shows each player’s room index and banuti.

## Blocked by

None — can start immediately.
