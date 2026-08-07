import { createRoomEnvelope, type RoomEnvelope } from "../../../online/envelope";
import type { MemberRole } from "../../../online/rooms";
import type { MysteryCardId } from "../../../game/mystery";
import type { TriviaAnswer } from "../../../game/rules";
import type { ShopItemId } from "../../../game/shop";
import type { TrapEscapeChoice } from "../../../game/store/pendingEvent";
import {
  parseSpaceBoardAction,
  SPACE_BOARD_GAME_SLUG,
  type SpaceBoardActionPayload,
  type SpaceBoardStatePayload,
  type SpaceBoardUiEventPayload,
} from "./payloads";
import { filterSpaceBoardStateForViewer } from "./visibility";

export type SpaceBoardSeatMember = {
  deviceId: string | null;
  role: MemberRole;
  seat: number | null;
  isAi: boolean;
  playerId: string | null;
};

export type SpaceBoardEngineResult = {
  uiEvents: SpaceBoardUiEventPayload[];
  state: SpaceBoardStatePayload;
};

export type SpaceBoardHostEngine = {
  getState: () => SpaceBoardStatePayload;
  roll: () => Promise<SpaceBoardEngineResult>;
  move: () => Promise<SpaceBoardEngineResult>;
  endTurn: () => Promise<SpaceBoardEngineResult>;
  answerTrivia: (answer: TriviaAnswer) => Promise<SpaceBoardEngineResult>;
  pickMystery: (cardId: MysteryCardId) => Promise<SpaceBoardEngineResult>;
  acknowledgeMystery: () => Promise<SpaceBoardEngineResult>;
  buyShopItem: (itemId: ShopItemId) => Promise<SpaceBoardEngineResult>;
  closeShop: () => Promise<SpaceBoardEngineResult>;
  useInventoryItem: (
    itemId: ShopItemId,
    targetPlayerId?: string,
  ) => Promise<SpaceBoardEngineResult>;
  resolveTrap: (choice: TrapEscapeChoice) => Promise<SpaceBoardEngineResult>;
  acknowledgePortal: () => Promise<SpaceBoardEngineResult>;
  runAiTurnIfNeeded: () => Promise<RoomEnvelope[]>;
};

export type CreateSpaceBoardHostSessionInput = {
  roomId: string;
  hostDeviceId: string;
  members: SpaceBoardSeatMember[];
  engine: SpaceBoardHostEngine;
};

export type SpaceBoardHostSession = {
  handleEnvelope: (envelope: RoomEnvelope) => Promise<RoomEnvelope[]>;
  bootstrapState: () => RoomEnvelope[];
};

function viewerIdsForMembers(members: SpaceBoardSeatMember[]): Array<string | null> {
  const ids: Array<string | null> = [];
  const seen = new Set<string>();
  for (const member of members) {
    if (member.playerId && !seen.has(member.playerId)) {
      seen.add(member.playerId);
      ids.push(member.playerId);
    }
  }
  // Always include a public/spectator view for honest UI privacy.
  ids.push(null);
  return ids;
}

function envelopesFromResult(
  roomId: string,
  hostDeviceId: string,
  members: SpaceBoardSeatMember[],
  result: SpaceBoardEngineResult,
): RoomEnvelope[] {
  const ui = result.uiEvents.map((payload) =>
    createRoomEnvelope({
      gameSlug: SPACE_BOARD_GAME_SLUG,
      kind: "ui_event",
      roomId,
      senderDeviceId: hostDeviceId,
      payload,
    }),
  );
  const states = viewerIdsForMembers(members).map((viewerPlayerId) =>
    createRoomEnvelope({
      gameSlug: SPACE_BOARD_GAME_SLUG,
      kind: "state",
      roomId,
      senderDeviceId: hostDeviceId,
      payload: filterSpaceBoardStateForViewer(result.state, viewerPlayerId),
    }),
  );
  return [...ui, ...states];
}

async function runEngineAction(
  engine: SpaceBoardHostEngine,
  action: SpaceBoardActionPayload,
): Promise<SpaceBoardEngineResult> {
  switch (action.type) {
    case "roll":
      return engine.roll();
    case "move":
      return engine.move();
    case "endTurn":
      return engine.endTurn();
    case "answerTrivia":
      return engine.answerTrivia(action.answer);
    case "pickMystery":
      return engine.pickMystery(action.cardId);
    case "acknowledgeMystery":
      return engine.acknowledgeMystery();
    case "buyShopItem":
      return engine.buyShopItem(action.itemId);
    case "closeShop":
      return engine.closeShop();
    case "useInventoryItem":
      return engine.useInventoryItem(action.itemId, action.targetPlayerId);
    case "resolveTrap":
      return engine.resolveTrap(action.choice);
    case "acknowledgePortal":
      return engine.acknowledgePortal();
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function createSpaceBoardHostSession(
  input: CreateSpaceBoardHostSessionInput,
): SpaceBoardHostSession {
  const { roomId, hostDeviceId, members, engine } = input;

  const memberByDevice = (deviceId: string | undefined) =>
    members.find((m) => m.deviceId !== null && m.deviceId === deviceId);

  const canAct = (deviceId: string | undefined): boolean => {
    const member = memberByDevice(deviceId);
    if (!member || member.role === "spectator" || member.seat === null) {
      return false;
    }
    const state = engine.getState();
    const current = state.players[state.currentPlayerIndex];
    if (!current || current.controller === "ai") {
      return false;
    }
    return member.playerId === current.id;
  };

  const runAction = async (
    action: SpaceBoardActionPayload,
  ): Promise<RoomEnvelope[]> => {
    const result = await runEngineAction(engine, action);
    const outbound = envelopesFromResult(roomId, hostDeviceId, members, result);
    const aiFollowUp = await engine.runAiTurnIfNeeded();
    return [...outbound, ...aiFollowUp];
  };

  return {
    bootstrapState: () =>
      envelopesFromResult(roomId, hostDeviceId, members, {
        uiEvents: [],
        state: engine.getState(),
      }),
    handleEnvelope: async (envelope) => {
      if (
        envelope.game_slug !== SPACE_BOARD_GAME_SLUG ||
        envelope.room_id !== roomId ||
        envelope.kind !== "action"
      ) {
        return [];
      }
      const action = parseSpaceBoardAction(envelope.payload);
      if (!action || !canAct(envelope.sender_device_id)) {
        return [];
      }
      return runAction(action);
    },
  };
}
