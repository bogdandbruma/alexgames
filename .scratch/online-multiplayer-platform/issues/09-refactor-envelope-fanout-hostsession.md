# 09 — Refactor: envelope fan-out only in hostSession

**What to build:** Make `storeEngine` return engine results (`uiEvents` + state) only. Single fan-out owner in `hostSession` (privacy-filtered state envelopes + ui_events). AI loop returns engine results, not envelopes. Optionally share seat↔playerId mapping between OnlinePlay and hostSession.

**Blocked by:** 08 — Refactor: extract play session runtime from OnlinePlay (recommended; can proceed carefully without)

**Status:** needs-triage

### Problem Statement
`hostSession.envelopesFromResult` and `storeEngine.pushResult` both emit UI events + N filtered state envelopes — twin broadcast paths and layer leak.

### Solution
Engine envelope-free; hostSession owns fan-out. Shared seat mapping module.

### Commits
Stop storeEngine from emitting envelopes → hostSession only → shared viewer-id helpers.

### Decision Document
Outbound privacy rules (issue 04) must remain identical.

### Testing Decisions
Visibility + hostSession tests remain source of truth for fan-out.

### Out of Scope
rooms.ts DAO hygiene (P2); WaitingRoom split.

## Comments

Created from thermo-nuclear audit after PRD issues 01–06. Deferred — not auto-queued.
