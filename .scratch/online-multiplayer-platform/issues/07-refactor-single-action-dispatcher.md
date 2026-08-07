# 07 — Refactor: single Space Board action dispatcher

**What to build:** Remove online `if` branches from `SpaceBoardPanel` and overlays (Trivia/Mystery/Shop/Trap/Portal/Target). UI always calls one action surface; offline maps to store, online maps to envelope send. Collapse dual paths (`onlineControls` prop vs `useSpaceBoardOnlineActions` context) into one.

**Blocked by:** None

**Status:** needs-triage

### Problem Statement
Online special-cases are copy-pasted across Panel + six modals. Shared offline UI knows about online.

### Solution
One dispatcher/adapter the UI always calls. Overlays never branch on “am I online?”

### Commits
Tiny safe steps: introduce dispatcher behind existing APIs → migrate one overlay at a time → delete prop/context dual path.

### Decision Document
Preserve visible copy and behavior. Platform stays game-agnostic.

### Testing Decisions
Existing online + overlay tests; add dispatcher seam tests.

### Out of Scope
Lobby/chat/host lifecycle; envelope wire format changes.

## Comments

Created from thermo-nuclear audit after PRD issues 01–06. Deferred — not auto-queued.
