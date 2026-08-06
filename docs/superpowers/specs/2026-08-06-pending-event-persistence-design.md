# Pending event persistence (refresh + online-ready)

**Date:** 2026-08-06  
**Status:** implemented

## Problem

Interactive room overlays (`shop`, `trivia`, `mystery`, `portal`) lived only in memory. After refresh, players stayed on the room with `diceValue` set but no overlay — stuck (e.g. Alex in shop).

## Design

Single serializable `pendingEvent` discriminated union on `PersistedState`:

- `shop` | `trivia` | `mystery` | `portal` | `null`
- Also persist `actionItemUsedThisTurn` (+ existing `diceValue`)
- Do **not** persist animations (`rolling`, walks, toasts)

On load: if `pendingEvent != null`, UI reopens that overlay.  
Portal after refresh (no in-flight `rollDice` waiter): `resolveOrphanedPortalLanding` completes destination + next room event.

## Online note

`pendingEvent` is the wire-ready “current interaction” payload to sync to other clients later.
