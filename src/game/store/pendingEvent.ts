import type { MysteryCard, MysteryCardId } from "../mystery";
import type { TriviaAnswer } from "../rules";
import type { TriviaQuestion } from "../trivia";

export type TriviaFeedback = {
  answer: TriviaAnswer;
  coinsDelta: number;
};

export type PendingShopEvent = {
  type: "shop";
  playerId: string;
  roomId: number;
  purchased: boolean;
};

export type PendingTriviaEvent = {
  type: "trivia";
  playerId: string;
  roomId: number;
  question: TriviaQuestion;
  result: TriviaFeedback | null;
};

export type PendingMysteryEvent = {
  type: "mystery";
  playerId: string;
  roomId: number;
  cards: MysteryCard[];
  revealedCardId: MysteryCardId | null;
};

export type PendingPortalEvent = {
  type: "portal";
  id: string;
  playerId: string;
  fromRoomId: number;
  toRoomId: number;
};

export type PendingTrapEvent = {
  type: "trap";
  playerId: string;
  roomId: number;
};

export type TrapEscapeChoice = "key" | "pay" | "stay";

export type PendingEvent =
  | PendingShopEvent
  | PendingTriviaEvent
  | PendingMysteryEvent
  | PendingPortalEvent
  | PendingTrapEvent
  | null;

export type GamePortalTransition = {
  id: string;
  playerId: string;
  fromRoomId: number;
  toRoomId: number;
};

export function getPendingShop(
  event: PendingEvent,
): PendingShopEvent | null {
  return event?.type === "shop" ? event : null;
}

export function getPendingTrivia(
  event: PendingEvent,
): PendingTriviaEvent | null {
  return event?.type === "trivia" ? event : null;
}

export function getPendingMystery(
  event: PendingEvent,
): PendingMysteryEvent | null {
  return event?.type === "mystery" ? event : null;
}

export function getPendingPortal(
  event: PendingEvent,
): PendingPortalEvent | null {
  return event?.type === "portal" ? event : null;
}

export function getPendingTrap(
  event: PendingEvent,
): PendingTrapEvent | null {
  return event?.type === "trap" ? event : null;
}

export function hasBlockingPendingEvent(event: PendingEvent): boolean {
  return event !== null;
}

export function portalEventToTransition(
  event: PendingPortalEvent,
): GamePortalTransition {
  return {
    id: event.id,
    playerId: event.playerId,
    fromRoomId: event.fromRoomId,
    toRoomId: event.toRoomId,
  };
}

export function createShopEvent(
  playerId: string,
  roomId: number,
  purchased = false,
): PendingShopEvent {
  return { type: "shop", playerId, roomId, purchased };
}

export function createTriviaEvent(
  playerId: string,
  roomId: number,
  question: TriviaQuestion,
  result: TriviaFeedback | null = null,
): PendingTriviaEvent {
  return { type: "trivia", playerId, roomId, question, result };
}

export function createMysteryEvent(
  playerId: string,
  roomId: number,
  cards: MysteryCard[],
  revealedCardId: MysteryCardId | null = null,
): PendingMysteryEvent {
  return { type: "mystery", playerId, roomId, cards, revealedCardId };
}

export function createPortalEvent(
  transition: GamePortalTransition,
): PendingPortalEvent {
  return {
    type: "portal",
    id: transition.id,
    playerId: transition.playerId,
    fromRoomId: transition.fromRoomId,
    toRoomId: transition.toRoomId,
  };
}

export function createTrapEvent(
  playerId: string,
  roomId: number,
): PendingTrapEvent {
  return { type: "trap", playerId, roomId };
}
