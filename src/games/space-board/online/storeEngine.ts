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
  onUiEventLive?: (
    event: SpaceBoardUiEventPayload,
  ) => void | Promise<void>,
): Promise<SpaceBoardEngineResult> {
  const uiEvents = await collectUiEventsDuring(
    store,
    async () => {
      await action();
    },
    onUiEventLive ? { onUiEvent: onUiEventLive } : undefined,
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
  },
): SpaceBoardHostEngine {
  const aiRollDelayMs = options.aiRollDelayMs ?? 1_700;
  const viewerPlayerIds = options.viewerPlayerIds ?? [null];
  const onUiEventLive = options.onUiEventLive;
  const liveStreaming = Boolean(onUiEventLive);

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
      runStoreAction(store, () => store.getState().rollDice(), onUiEventLive),
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
        onUiEventLive,
      ),
    answerTrivia: (answer: TriviaAnswer) =>
      runStoreAction(
        store,
        () => {
          store.getState().answerTrivia(answer);
        },
        onUiEventLive,
      ),
    pickMystery: (cardId: MysteryCardId) =>
      runStoreAction(
        store,
        () => {
          store.getState().pickMysteryCard(cardId);
        },
        onUiEventLive,
      ),
    acknowledgeMystery: () =>
      runStoreAction(
        store,
        () => store.getState().acknowledgeMystery(),
        onUiEventLive,
      ),
    buyShopItem: (itemId: ShopItemId) =>
      runStoreAction(
        store,
        () => {
          store.getState().buyShopItem(itemId);
        },
        onUiEventLive,
      ),
    closeShop: () =>
      runStoreAction(
        store,
        () => {
          store.getState().closeShop();
        },
        onUiEventLive,
      ),
    useInventoryItem: (itemId, targetPlayerId) =>
      runStoreAction(
        store,
        () => {
          store.getState().useInventoryItem(itemId, targetPlayerId);
        },
        onUiEventLive,
      ),
    resolveTrap: (choice: TrapEscapeChoice) =>
      runStoreAction(
        store,
        () => {
          store.getState().resolveTrap(choice);
        },
        onUiEventLive,
      ),
    acknowledgePortal: () =>
      runStoreAction(
        store,
        () => {
          store.getState().acknowledgePortalTransition();
        },
        onUiEventLive,
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
