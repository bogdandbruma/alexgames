---
title: "Space Board: mystery cards and six effects"
type: AFK
blocked_by:
  - docs/prds/space-board/issues/01-67-room-core-loop.md
  - docs/prds/space-board/issues/02-portals-exact-landing.md
triage: ready-for-afk
Status: done
---

## Parent

[Space Board PRD](../prd.md)

## What to build

Mystery rooms: 17, 24, 41, 56. On entry, show **3–5** face-down cards, shuffle, player picks **one** → reveal and play effect immediately with a short animation. Effects from deck content:

| ID | Behavior (v1 defaults for open PRD items) |
|----|-------------------------------------------|
| car | +2 rooms forward on main/branch path |
| phone | −2 banuti (min 0) |
| card | +4 banuti |
| rocket | Move to the room index of the **nearest player ahead** (same index if tied ahead—stay if no one ahead) |
| wand | Random permutation of all players’ room indices |
| magnet | Move to the room index of the **nearest player behind**; if last, no move |

Mystery **cannot** escape traps. After effect, run portal checks where position changed. No shop/trivia on mystery room itself beyond the card flow.

## Acceptance criteria

- [ ] Mystery UI on rooms 17, 24, 41, 56 with shuffle, pick-one, reveal animation.
- [ ] All six effects implemented per table above; coins respect min 0.
- [ ] Position-changing effects trigger portal exact-landing rules.
- [ ] Mystery does not offer trap escape.
- [ ] Deck driven from bundled mystery content (weighted draw optional).

## Blocked by

- [01 — 67-room core loop](01-67-room-core-loop.md)
- [02 — portals exact landing](02-portals-exact-landing.md)
