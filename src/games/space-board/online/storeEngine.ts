import type { RoomEnvelope } from "../../../online/envelope";
import { createRoomEnvelope } from "../../../online/envelope";
import type { MysteryCardId } from "../../../game/mystery";
import type { TriviaAnswer } from "../../../game/rules";
import type { ShopItemId } from "../../../game/shop";
import type { TrapEscapeChoice } from "../../../game/store/pendingEvent";
import type { GameState } from "../../../game/store/types";
import {
  collectUiEventsDuring,
  snapshotSpaceBoardState,
} from "./engineBridge";
import type {
  SpaceBoardEngineResult,
  SpaceBoardHostEngine,
} from "./hostSession";
import {
  SPACE_BOARD_GAME_SLUG,
  type SpaceBoardStatePayload,
  type SpaceBoardUiEventPayload,
} from "./payloads";
import { filterSpaceBoardStateForViewer } from "./visibility";

export type GameStoreLike = {
  getState: () => GameState;
  subscribe: (listener: (state: GameState) => void) => () => void;
};

async function runStoreAction(
  store: GameStoreLike,
  action: () => void | Promise<void>,
  options?: {
    onUiEventLive?: (
      event: SpaceBoardUiEventPayload,
    ) => void | Promise<void>;
    onStateLive?: (state: SpaceBoardStatePayload) => void | Promise<void>;
  },
): Promise<SpaceBoardEngineResult> {
  const uiEvents = await collectUiEventsDuring(
    store,
    async () => {
      await action();
    },
    {
      ...(options?.onUiEventLive ? { onUiEvent: options.onUiEventLive } : {}),
      ...(options?.onStateLive ? { onState: options.onStateLive } : {}),
    },
  );
  return {
    uiEvents,
    state: snapshotSpaceBoardState(store.getState()),
  };
}

export function createStoreHostEngine(
  store: GameStoreLike,
  options: {
    roomId: string;
    hostDeviceId: string;
    viewerPlayerIds?: Array<string | null>;
    aiRollDelayMs?: number;
    /** Stream ui_events to remotes while the host action is still running. */
    onUiEventLive?: (
      event: SpaceBoardUiEventPayload,
    ) => void | Promise<void>;
    /** Stream state snapshots so remotes follow modal open/close mid-action. */
    onStateLive?: (state: SpaceBoardStatePayload) => void | Promise<void>;
  },
): SpaceBoardHostEngine {
  const aiRollDelayMs = options.aiRollDelayMs ?? 1_700;
  const viewerPlayerIds = options.viewerPlayerIds ?? [null];
  const onUiEventLive = options.onUiEventLive;
  const onStateLive = options.onStateLive;
  const liveStreaming = Boolean(onUiEventLive);
  const actionOptions = {
    ...(onUiEventLive ? { onUiEventLive } : {}),
    ...(onStateLive ? { onStateLive } : {}),
  };

  const pushResult = (
    outbound: RoomEnvelope[],
    result: SpaceBoardEngineResult,
  ) => {
    if (!liveStreaming) {
      for (const payload of result.uiEvents) {
        outbound.push(
          createRoomEnvelope({
            gameSlug: SPACE_BOARD_GAME_SLUG,
            kind: "ui_event",
            roomId: options.roomId,
            senderDeviceId: options.hostDeviceId,
            payload,
          }),
        );
      }
    }
    // Always include final state for AI follow-ups; live mid-action snapshots are additive.
    for (const viewerPlayerId of viewerPlayerIds) {
      outbound.push(
        createRoomEnvelope({
          gameSlug: SPACE_BOARD_GAME_SLUG,
          kind: "state",
          roomId: options.roomId,
          senderDeviceId: options.hostDeviceId,
          payload: filterSpaceBoardStateForViewer(result.state, viewerPlayerId),
        }),
      );
    }
  };

  const engine: SpaceBoardHostEngine = {
    getState: () => snapshotSpaceBoardState(store.getState()),
    roll: () =>
      runStoreAction(store, () => store.getState().rollDice(), actionOptions),
    move: async () => ({
      uiEvents: [],
      state: snapshotSpaceBoardState(store.getState()),
    }),
    endTurn: () =>
      runStoreAction(
        store,
        () => {
          store.getState().endTurn();
        },
        actionOptions,
      ),
    answerTrivia: (answer: TriviaAnswer) =>
      runStoreAction(
        store,
        () => store.getState().answerTrivia(answer),
        actionOptions,
      ),
    pickMystery: (cardId: MysteryCardId) =>
      runStoreAction(
        store,
        () => {
          store.getState().pickMysteryCard(cardId);
        },
        actionOptions,
      ),
    acknowledgeMystery: () =>
      runStoreAction(
        store,
        () => store.getState().acknowledgeMystery(),
        actionOptions,
      ),
    buyShopItem: (itemId: ShopItemId) =>
      runStoreAction(
        store,
        () => {
          store.getState().buyShopItem(itemId);
        },
        actionOptions,
      ),
    closeShop: () =>
      runStoreAction(
        store,
        () => {
          store.getState().closeShop();
        },
        actionOptions,
      ),
    useInventoryItem: (itemId, targetPlayerId) =>
      runStoreAction(
        store,
        () => store.getState().useInventoryItem(itemId, targetPlayerId),
        actionOptions,
      ),
    resolveTrap: (choice: TrapEscapeChoice) =>
      runStoreAction(
        store,
        () => {
          store.getState().resolveTrap(choice);
        },
        actionOptions,
      ),
    acknowledgePortal: () =>
      runStoreAction(
        store,
        () => {
          store.getState().acknowledgePortalTransition();
        },
        actionOptions,
      ),
    runAiTurnIfNeeded: async () => {
      const outbound: RoomEnvelope[] = [];
      for (let guard = 0; guard < 8; guard += 1) {
        const state = store.getState();
        const current = state.players[state.currentPlayerIndex];
        if (
          state.phase !== "playing" ||
          !current ||
          current.controller !== "ai" ||
          state.rolling ||
          state.pendingEvent !== null ||
          state.diceValue !== null
        ) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, aiRollDelayMs));
        const result = await engine.roll();
        pushResult(outbound, result);
        const after = store.getState();
        const afterPlayer = after.players[after.currentPlayerIndex];
        if (
          after.phase === "playing" &&
          afterPlayer?.controller === "ai" &&
          after.diceValue !== null &&
          after.pendingEvent === null &&
          !after.rolling
        ) {
          const endResult = await engine.endTurn();
          pushResult(outbound, endResult);
        }
      }
      return outbound;
    },
  };

  return engine;
}
