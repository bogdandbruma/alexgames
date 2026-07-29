---
title: "Space Board: trivia zone (rooms 32–50)"
type: AFK
blocked_by:
  - docs/prds/space-board/issues/01-67-room-core-loop.md
triage: ready-for-afk
---

## Parent

[Space Board PRD](../prd.md)

## What to build

On entering a **trivia** room (32–50 per content), show an overlay with **one random question** and **two** answer options (correct / wrong). No coins on room entry in trivia zone. **Correct:** +1 banut. **Wrong:** −1 banut (min 0). After answer, continue the turn flow. Load questions from the space trivia content pool (Romanian, kid-friendly). Trivia cancel item is out of scope until the shop issue.

## Acceptance criteria

- [ ] Landing on trivia rooms opens a two-option question UI.
- [ ] Questions are drawn randomly from the bundled trivia content.
- [ ] Correct +1 coin, wrong −1 coin, balance never below 0.
- [ ] Trivia rooms do not grant `coinsOnEnter`.
- [ ] Flow returns to normal turn end after the question is answered.

## Blocked by

- [01 — 67-room core loop](01-67-room-core-loop.md)
