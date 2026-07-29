import mysteryDeckContent from "../../content/space-mystery-deck.json";
import { finishRoomId } from "./rooms";

export type MysteryCardId =
  | "car"
  | "phone"
  | "card"
  | "rocket"
  | "wand"
  | "magnet";

export type MysteryCard = {
  id: MysteryCardId;
  icon: string;
  title: string;
  description: string;
  effectKey: MysteryCardId;
  steps?: number;
  coinsDelta?: number;
};

export type MysteryPlayerState = {
  id: string;
  positionId: number;
  coins: number;
};

export type MysteryEffectResult = {
  players: MysteryPlayerState[];
  changedPositionPlayerIds: string[];
};

type MysteryDeckContent = {
  ui: {
    cardCountMin: number;
    cardCountMax: number;
  };
  effects: MysteryCard[];
};

const deckContent = mysteryDeckContent as MysteryDeckContent;

export const mysteryCards: MysteryCard[] = deckContent.effects;

export function getMysteryCardById(cardId: MysteryCardId): MysteryCard {
  const card = mysteryCards.find(({ id }) => id === cardId);

  if (!card) {
    throw new Error(`Unknown mystery card id: ${cardId}`);
  }

  return card;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  return items
    .map((item, index) => ({ item, index, sort: random() }))
    .sort((left, right) => right.sort - left.sort || right.index - left.index)
    .map(({ item }) => item);
}

export function createMysteryOffer({
  random = Math.random,
}: {
  random?: () => number;
} = {}): { cards: MysteryCard[] } {
  const minCount = deckContent.ui.cardCountMin;
  const maxCount = deckContent.ui.cardCountMax;
  const spread = maxCount - minCount + 1;
  const cardCount = minCount + Math.floor(random() * spread);

  return {
    cards: shuffled(mysteryCards, random).slice(0, cardCount),
  };
}

function moveActivePlayer(
  players: MysteryPlayerState[],
  activePlayerId: string,
  positionId: number,
): MysteryEffectResult {
  const changedPositionPlayerIds: string[] = [];
  const nextPlayers = players.map((player) => {
    if (player.id !== activePlayerId || player.positionId === positionId) {
      return player;
    }

    changedPositionPlayerIds.push(player.id);

    return {
      ...player,
      positionId,
    };
  });

  return {
    players: nextPlayers,
    changedPositionPlayerIds,
  };
}

function findActivePlayer(
  players: MysteryPlayerState[],
  activePlayerId: string,
): MysteryPlayerState {
  const activePlayer = players.find(({ id }) => id === activePlayerId);

  if (!activePlayer) {
    throw new Error(`Unknown mystery player id: ${activePlayerId}`);
  }

  return activePlayer;
}

function getNearestPosition({
  activePositionId,
  direction,
  players,
}: {
  activePositionId: number;
  direction: "ahead" | "behind";
  players: MysteryPlayerState[];
}): number | null {
  const candidates = players
    .map(({ positionId }) => positionId)
    .filter((positionId) =>
      direction === "ahead"
        ? positionId > activePositionId
        : positionId < activePositionId,
    )
    .sort((left, right) =>
      direction === "ahead" ? left - right : right - left,
    );

  return candidates[0] ?? null;
}

export function applyMysteryEffect({
  activePlayerId,
  cardId,
  players,
  random = Math.random,
}: {
  activePlayerId: string;
  cardId: MysteryCardId;
  players: MysteryPlayerState[];
  random?: () => number;
}): MysteryEffectResult {
  const card = getMysteryCardById(cardId);
  const activePlayer = findActivePlayer(players, activePlayerId);

  switch (card.effectKey) {
    case "car":
      return moveActivePlayer(
        players,
        activePlayerId,
        Math.min(
          finishRoomId,
          activePlayer.positionId + (card.steps ?? 2),
        ),
      );
    case "phone":
      return {
        changedPositionPlayerIds: [],
        players: players.map((player) =>
          player.id === activePlayerId
            ? {
                ...player,
                coins: Math.max(0, player.coins + (card.coinsDelta ?? -2)),
              }
            : player,
        ),
      };
    case "card":
      return {
        changedPositionPlayerIds: [],
        players: players.map((player) =>
          player.id === activePlayerId
            ? { ...player, coins: player.coins + (card.coinsDelta ?? 5) }
            : player,
        ),
      };
    case "rocket": {
      const nearestAhead = getNearestPosition({
        activePositionId: activePlayer.positionId,
        direction: "ahead",
        players,
      });

      return nearestAhead === null
        ? { players, changedPositionPlayerIds: [] }
        : moveActivePlayer(players, activePlayerId, nearestAhead);
    }
    case "wand": {
      const positions = shuffled(
        players.map(({ positionId }) => positionId),
        random,
      );
      const changedPositionPlayerIds: string[] = [];

      return {
        changedPositionPlayerIds,
        players: players.map((player, index) => {
          const positionId = positions[index];

          if (player.positionId !== positionId) {
            changedPositionPlayerIds.push(player.id);
          }

          return {
            ...player,
            positionId,
          };
        }),
      };
    }
    case "magnet": {
      const nearestBehind = getNearestPosition({
        activePositionId: activePlayer.positionId,
        direction: "behind",
        players,
      });

      return nearestBehind === null
        ? { players, changedPositionPlayerIds: [] }
        : moveActivePlayer(players, activePlayerId, nearestBehind);
    }
    default: {
      const exhaustiveCheck: never = card.effectKey;
      return exhaustiveCheck;
    }
  }
}
