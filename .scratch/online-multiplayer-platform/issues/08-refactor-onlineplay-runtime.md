# 08 — Refactor: extract play session runtime from OnlinePlay

**What to build:** Pull hydrate/subscribe/host-session/publish/pause-bootstrap out of `OnlinePlay.tsx` into a pure host/remote play runtime. Collapse triplicated hydrate paths into one policy. Keep React as a thin shell for ready/error/controls. Prefer stable host session (avoid recreating engine per action).

**Blocked by:** None

**Status:** needs-triage

### Problem Statement
`OnlinePlay.tsx` (~475 LOC) is a mount-once god orchestrator with three near-identical hydrate paths plus pause→playing bootstrap.

### Solution
One runtime owner: subscribe → handle → publish → hydrate. React shell only.

### Commits
Extract hydrate policy → extract session runtime → thin OnlinePlay → delete duplicate bootstrap branches.

### Decision Document
No behavior change for envelopes, visibility, or host pause.

### Testing Decisions
Move orchestration tests to runtime module; OnlinePlay becomes smoke/wiring tests.

### Out of Scope
Overlay dispatcher (see 07); WaitingRoom split (see 09).

## Comments

Created from thermo-nuclear audit after PRD issues 01–06. Deferred — not auto-queued.
