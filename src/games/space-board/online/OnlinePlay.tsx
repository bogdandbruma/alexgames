import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvatarId } from "../../../game/avatars";
import { setGamePersistWritesEnabled } from "../../../game/persist/persistGate";
import { useGameStore } from "../../../game/store";
import type { PlayerSetup } from "../../../game/store/types";
import type { MysteryCardId } from "../../../game/mystery";
import type { TriviaAnswer } from "../../../game/rules";
import type { ShopItemId } from "../../../game/shop";
import type { TrapEscapeChoice } from "../../../game/store/pendingEvent";
import { createAsyncQueue } from "../../../online/asyncQueue";
import {
  createRoomEnvelope,
  parseRoomEnvelope,
  type RoomEnvelope,
} from "../../../online/envelope";
import { areGameActionsAllowed } from "../../../online/hostLifecycle";
import {
  broadcastRoomEnvelope,
  subscribeRoomEnvelopes,
  type RoomEnvelopeHandle,
} from "../../../online/roomChannel";
import {
  fetchRoomLastState,
  saveRoomLastState,
  type Room,
  type RoomMember,
} from "../../../online/rooms";
import { snapshotSpaceBoardState } from "./engineBridge";
import {
  createSpaceBoardHostSession,
  type SpaceBoardSeatMember,
} from "./hostSession";
import { hydrateGameStoreFromRemoteView } from "./hydrateStore";
import {
  isSpaceBoardStatePayload,
  SPACE_BOARD_GAME_SLUG,
  type SpaceBoardActionPayload,
  type SpaceBoardUiEventPayload,
} from "./payloads";
import {
  resolveLastStateForHydrate,
  shouldApplyStateEnvelope,
} from "./playHydrate";
import {
  applySpaceBoardRemoteEnvelope,
  createEmptyRemoteView,
} from "./remoteSession";
import { createStoreHostEngine } from "./storeEngine";
import { SpaceBoardOnlineView } from "../SpaceBoardOnlineView";

type OnlinePlayProps = {
  client: SupabaseClient;
  room: Room;
  member: RoomMember;
  members: RoomMember[];
  deviceId: string;
  onLeave: () => void;
};

function mapMembersToSetups(members: RoomMember[]): PlayerSetup[] {
  return members
    .filter((m) => m.seat !== null)
    .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0))
    .map((m) => ({
      name: m.displayName.slice(0, 10),
      avatarId: (m.avatarId as AvatarId | null) ?? "cat",
      controller: m.isAi ? ("ai" as const) : ("player" as const),
    }));
}

function toSeatMembers(
  members: RoomMember[],
  setupsStarted: boolean,
): SpaceBoardSeatMember[] {
  const seated = members
    .filter((m) => m.seat !== null)
    .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
  const players = setupsStarted ? useGameStore.getState().players : [];

  return members.map((m) => {
    const seatIndex = seated.findIndex((s) => s.id === m.id);
    return {
      deviceId: m.deviceId,
      role: m.role,
      seat: m.seat,
      isAi: m.isAi,
      playerId:
        m.seat !== null && players[seatIndex]
          ? players[seatIndex]!.id
          : m.seat !== null
            ? `pending-${m.seat}`
            : null,
    };
  });
}

function localPlayerId(
  deviceId: string,
  members: RoomMember[],
): string | null {
  const seatMembers = toSeatMembers(members, true);
  return seatMembers.find((m) => m.deviceId === deviceId)?.playerId ?? null;
}

function viewerPlayerIdsFromMembers(
  members: RoomMember[],
): Array<string | null> {
  const seatMembers = toSeatMembers(members, true);
  const ids: Array<string | null> = [];
  const seen = new Set<string>();
  for (const member of seatMembers) {
    if (member.playerId && !seen.has(member.playerId)) {
      seen.add(member.playerId);
      ids.push(member.playerId);
    }
  }
  ids.push(null);
  return ids;
}

function localPlayerCanAct(
  deviceId: string,
  member: RoomMember,
  seatMembers: SpaceBoardSeatMember[],
): boolean {
  if (member.role === "spectator") {
    return false;
  }
  const state = useGameStore.getState();
  const current = state.players[state.currentPlayerIndex];
  if (!current || current.controller === "ai" || state.phase !== "playing") {
    return false;
  }
  const seat = seatMembers.find((m) => m.deviceId === deviceId);
  return seat?.playerId === current.id;
}

function playerIdForDeviceFromState(
  deviceId: string,
  members: RoomMember[],
  players: ReadonlyArray<{ id: string }>,
): string | null {
  const seated = members
    .filter((m) => m.seat !== null)
    .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
  const seatIndex = seated.findIndex((m) => m.deviceId === deviceId);
  if (seatIndex < 0) {
    return null;
  }
  return players[seatIndex]?.id ?? null;
}

function applyHydratedLastState(
  lastState: unknown,
  opts: {
    isHost: boolean;
    role: RoomMember["role"];
    deviceId: string;
    members: RoomMember[];
    remoteViewRef: { current: ReturnType<typeof createEmptyRemoteView> };
  },
): boolean {
  const envelope = parseRoomEnvelope(lastState);
  if (!envelope || !isSpaceBoardStatePayload(envelope.payload)) {
    return false;
  }
  const myPlayerId = playerIdForDeviceFromState(
    opts.deviceId,
    opts.members,
    envelope.payload.players,
  );
  const resolved = resolveLastStateForHydrate(envelope.payload, {
    isHost: opts.isHost,
    role: opts.role,
    myPlayerId,
  });
  if (!resolved) {
    return false;
  }
  const filteredEnvelope: RoomEnvelope = {
    ...envelope,
    payload: resolved,
  };
  opts.remoteViewRef.current = applySpaceBoardRemoteEnvelope(
    createEmptyRemoteView(),
    filteredEnvelope,
  );
  hydrateGameStoreFromRemoteView(opts.remoteViewRef.current);
  return true;
}

export function OnlinePlay({
  client,
  room,
  member,
  members,
  deviceId,
  onLeave,
}: OnlinePlayProps) {
  const isHost = room.hostDeviceId === deviceId;
  const channelRef = useRef<RoomEnvelopeHandle | null>(null);
  const remoteViewRef = useRef(createEmptyRemoteView());
  const prevStatusRef = useRef(room.status);
  const roomStatusRef = useRef(room.status);
  roomStatusRef.current = room.status;
  const hostActionQueueRef = useRef(createAsyncQueue());
  const [ready, setReady] = useState(false);
  const [canAct, setCanAct] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phase = useGameStore((state) => state.phase);
  const actionsAllowed = areGameActionsAllowed(room.status);

  const persistAuthoritativeLastState = async () => {
    const full = createRoomEnvelope({
      gameSlug: SPACE_BOARD_GAME_SLUG,
      kind: "state",
      roomId: room.id,
      senderDeviceId: deviceId,
      payload: snapshotSpaceBoardState(useGameStore.getState()),
    });
    await saveRoomLastState(client, {
      roomId: room.id,
      lastState: full,
    });
  };

  const publish = async (envelopes: RoomEnvelope[]) => {
    const handle = channelRef.current;
    if (!handle) return;
    let persisted = false;
    for (const envelope of envelopes) {
      await broadcastRoomEnvelope(handle.channel, envelope);
      if (
        !persisted &&
        envelope.kind === "state" &&
        isSpaceBoardStatePayload(envelope.payload)
      ) {
        persisted = true;
        try {
          await persistAuthoritativeLastState();
        } catch {
          /* reconnect aid; non-fatal */
        }
      }
    }
  };

  const createHostSession = () => {
    const seatMembers = toSeatMembers(members, true);
    const streamUiEvent = async (payload: SpaceBoardUiEventPayload) => {
      const handle = channelRef.current;
      if (!handle) return;
      await broadcastRoomEnvelope(
        handle.channel,
        createRoomEnvelope({
          gameSlug: SPACE_BOARD_GAME_SLUG,
          kind: "ui_event",
          roomId: room.id,
          senderDeviceId: deviceId,
          payload,
        }),
      );
    };
    return createSpaceBoardHostSession({
      roomId: room.id,
      hostDeviceId: deviceId,
      members: seatMembers,
      engine: createStoreHostEngine(useGameStore, {
        roomId: room.id,
        hostDeviceId: deviceId,
        viewerPlayerIds: viewerPlayerIdsFromMembers(members),
        aiRollDelayMs: 400,
        onUiEventLive: streamUiEvent,
      }),
    });
  };

  const runHostAction = (envelope: RoomEnvelope) =>
    hostActionQueueRef.current(async () => {
      if (!areGameActionsAllowed(roomStatusRef.current)) return;
      const seatMembers = toSeatMembers(members, true);
      const session = createHostSession();
      const outbound = await session.handleEnvelope(envelope);
      // ui_events already streamed live during the engine action.
      await publish(outbound.filter((item) => item.kind !== "ui_event"));
      setCanAct(localPlayerCanAct(deviceId, member, seatMembers));
    });

  useEffect(() => {
    let cancelled = false;
    setGamePersistWritesEnabled(false);

    void (async () => {
      try {
        useGameStore.getState().resetGame();
        if (isHost && room.status === "playing") {
          const lastState = await fetchRoomLastState(client, room.id);
          const hydrated = applyHydratedLastState(lastState, {
            isHost: true,
            role: member.role,
            deviceId,
            members,
            remoteViewRef,
          });
          if (!hydrated) {
            useGameStore.getState().startGame(mapMembersToSetups(members));
          }
        }

        const handle = await subscribeRoomEnvelopes(client, {
          roomId: room.id,
          onEnvelope: (envelope) => {
            if (cancelled) return;
            void (async () => {
              if (isHost) {
                if (envelope.kind !== "action") return;
                await runHostAction(envelope);
                return;
              }

              const myPlayerId = localPlayerId(deviceId, members);
              if (
                !shouldApplyStateEnvelope(envelope, myPlayerId, member.role, {
                  localPhase: useGameStore.getState().phase,
                })
              ) {
                return;
              }

              remoteViewRef.current = applySpaceBoardRemoteEnvelope(
                remoteViewRef.current,
                envelope,
              );
              hydrateGameStoreFromRemoteView(remoteViewRef.current);
              setCanAct(
                localPlayerCanAct(
                  deviceId,
                  member,
                  toSeatMembers(members, true),
                ),
              );
            })();
          },
        });

        if (cancelled) {
          await handle.unsubscribe();
          return;
        }
        channelRef.current = handle;

        if (isHost && room.status === "playing") {
          const seatMembers = toSeatMembers(members, true);
          const session = createHostSession();
          await publish(session.bootstrapState());
          setCanAct(localPlayerCanAct(deviceId, member, seatMembers));
        } else if (!isHost) {
          const lastState = await fetchRoomLastState(client, room.id);
          applyHydratedLastState(lastState, {
            isHost: false,
            role: member.role,
            deviceId,
            members,
            remoteViewRef,
          });
          setCanAct(
            localPlayerCanAct(
              deviceId,
              member,
              toSeatMembers(members, true),
            ),
          );
        } else {
          // Host mounted while paused — wait for resume before authoring state.
          const lastState = await fetchRoomLastState(client, room.id);
          applyHydratedLastState(lastState, {
            isHost: true,
            role: member.role,
            deviceId,
            members,
            remoteViewRef,
          });
          setCanAct(false);
        }

        if (!cancelled) {
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Jocul online a eșuat.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      void channelRef.current?.unsubscribe();
      channelRef.current = null;
      setGamePersistWritesEnabled(true);
      useGameStore.getState().resetGame();
    };
    // Intentionally mount-once for the play session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After refresh, remotes may miss the live bootstrap — keep reading last_state.
  useEffect(() => {
    if (isHost || !ready || phase !== "setup") {
      return;
    }
    let cancelled = false;
    const attempt = async () => {
      try {
        const lastState = await fetchRoomLastState(client, room.id);
        if (cancelled) return;
        const ok = applyHydratedLastState(lastState, {
          isHost: false,
          role: member.role,
          deviceId,
          members,
          remoteViewRef,
        });
        if (ok) {
          setCanAct(
            localPlayerCanAct(
              deviceId,
              member,
              toSeatMembers(members, true),
            ),
          );
        }
      } catch {
        /* keep polling */
      }
    };
    void attempt();
    const id = window.setInterval(() => void attempt(), 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isHost, ready, phase, client, room.id, member, deviceId, members]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = room.status;
    if (!isHost || !ready) return;
    if (prev === "paused" && room.status === "playing") {
      void (async () => {
        const phaseNow = useGameStore.getState().phase;
        if (phaseNow === "setup") {
          const lastState = await fetchRoomLastState(client, room.id);
          const hydrated = applyHydratedLastState(lastState, {
            isHost: true,
            role: member.role,
            deviceId,
            members,
            remoteViewRef,
          });
          if (!hydrated) {
            useGameStore.getState().startGame(mapMembersToSetups(members));
          }
        }
        const seatMembers = toSeatMembers(members, true);
        const session = createHostSession();
        await publish(session.bootstrapState());
        setCanAct(localPlayerCanAct(deviceId, member, seatMembers));
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.status, isHost, ready]);

  const sendAction = async (payload: SpaceBoardActionPayload) => {
    if (!areGameActionsAllowed(room.status)) return;
    const handle = channelRef.current;
    if (!handle) return;
    const action = createRoomEnvelope({
      gameSlug: SPACE_BOARD_GAME_SLUG,
      kind: "action",
      roomId: room.id,
      senderDeviceId: deviceId,
      payload,
    });

    if (isHost) {
      await runHostAction(action);
      return;
    }

    await broadcastRoomEnvelope(handle.channel, action);
  };

  if (error) {
    return (
      <main className="dashboard-shell online-mode-shell">
        <div className="dashboard-body online-mode-body">
          <p
            className="online-entry-status online-entry-status--error"
            role="alert"
          >
            {error}
          </p>
          <button type="button" className="secondary-button" onClick={onLeave}>
            Înapoi
          </button>
        </div>
      </main>
    );
  }

  if (!ready || phase === "setup") {
    return (
      <main className="dashboard-shell online-mode-shell">
        <div className="dashboard-body online-mode-body online-play-sync">
          <p className="online-entry-status" role="status">
            <LoaderCircle
              aria-hidden="true"
              size={20}
              className="online-entry-spinner"
            />
            <span>Se sincronizează jocul…</span>
          </p>
        </div>
      </main>
    );
  }

  return (
    <SpaceBoardOnlineView
      onExit={onLeave}
      onlineControls={{
        canAct: member.role !== "spectator" && canAct && actionsAllowed,
        onRoll: () => void sendAction({ type: "roll" }),
        onEndTurn: () => void sendAction({ type: "endTurn" }),
        onAnswerTrivia: (answer: TriviaAnswer) =>
          void sendAction({ type: "answerTrivia", answer }),
        onPickMystery: (cardId: MysteryCardId) =>
          void sendAction({ type: "pickMystery", cardId }),
        onAcknowledgeMystery: () =>
          void sendAction({ type: "acknowledgeMystery" }),
        onBuyShopItem: (itemId: ShopItemId) =>
          void sendAction({ type: "buyShopItem", itemId }),
        onCloseShop: () => void sendAction({ type: "closeShop" }),
        onUseInventoryItem: (itemId, targetPlayerId) =>
          void sendAction({
            type: "useInventoryItem",
            itemId,
            ...(targetPlayerId ? { targetPlayerId } : {}),
          }),
        onResolveTrap: (choice: TrapEscapeChoice) =>
          void sendAction({ type: "resolveTrap", choice }),
        onAcknowledgePortal: () =>
          void sendAction({ type: "acknowledgePortal" }),
      }}
    />
  );
}
