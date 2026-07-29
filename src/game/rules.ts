import {
  finishRoomId,
  getRoomById,
  type GameplayRoom,
  type RoomAction,
} from "./rooms";

export type DiceMoveInput = {
  positionId: number;
  dice: number;
};

export type PositionChangeInput = {
  positionId: number;
  steps: number;
};

export type DiceMoveResult = {
  positionId: number;
  outcome: "finished" | "moved" | "overshot";
};

export type PortalResolution = {
  from: number;
  to: number;
};

export type TrapResolution = {
  roomId: number;
};

export type TriviaAnswer = "correct" | "wrong";

export type DiceTurnResult = {
  positionId: number;
  outcome: DiceMoveResult["outcome"];
  coins: number;
  action: RoomAction | null;
  portal?: PortalResolution;
  trap?: TrapResolution;
};

export function resolveDiceMove({
  positionId,
  dice,
}: DiceMoveInput): DiceMoveResult {
  const nextPositionId = positionId + dice;

  if (nextPositionId > finishRoomId) {
    return {
      positionId,
      outcome: "overshot",
    };
  }

  if (nextPositionId === finishRoomId) {
    return {
      positionId: nextPositionId,
      outcome: "finished",
    };
  }

  return {
    positionId: nextPositionId,
    outcome: "moved",
  };
}

export function applyCoinsOnEnter({
  coins,
  multiplier = 1,
  room,
}: {
  coins: number;
  multiplier?: number;
  room: GameplayRoom;
}): number {
  return Math.max(0, coins + room.coinsOnEnter * multiplier);
}

export function resolveTriviaAnswer({
  answer,
  coins,
}: {
  answer: TriviaAnswer;
  coins: number;
}): number {
  switch (answer) {
    case "correct":
      return coins + 1;
    case "wrong":
      return Math.max(0, coins - 1);
    default: {
      const exhaustiveCheck: never = answer;
      return exhaustiveCheck;
    }
  }
}

function resolveRoomEntry({
  coinsOnEnterMultiplier = 1,
  coins,
  room,
}: {
  coinsOnEnterMultiplier?: number;
  coins: number;
  room: GameplayRoom;
}): Pick<DiceTurnResult, "action" | "coins" | "trap"> {
  switch (room.action) {
    case "coins":
      return {
        action: room.action,
        coins: applyCoinsOnEnter({
          coins,
          multiplier: coinsOnEnterMultiplier,
          room,
        }),
      };
    case "finish":
    case "mystery":
    case "portal":
    case "shop":
    case "trivia":
      return {
        action: room.action,
        coins,
      };
    case "trap":
      return {
        action: room.action,
        coins,
        trap: {
          roomId: room.id,
        },
      };
    default: {
      const exhaustiveCheck: never = room.action;
      return exhaustiveCheck;
    }
  }
}

export function resolveDiceTurn({
  coinsOnEnterMultiplier = 1,
  positionId,
  dice,
  coins,
}: DiceMoveInput & {
  coins: number;
  coinsOnEnterMultiplier?: number;
}): DiceTurnResult {
  const moveResult = resolveDiceMove({ positionId, dice });

  if (moveResult.outcome === "overshot") {
    return {
      ...moveResult,
      coins,
      action: null,
    };
  }

  const landingRoom = getRoomById(moveResult.positionId);

  if (landingRoom.action === "portal" && landingRoom.portalTo !== undefined) {
    const destinationRoom = getRoomById(landingRoom.portalTo);
    const destinationEntry = resolveRoomEntry({
      coins,
      coinsOnEnterMultiplier,
      room: destinationRoom,
    });

    return {
      positionId: destinationRoom.id,
      outcome: moveResult.outcome,
      ...destinationEntry,
      portal: {
        from: landingRoom.id,
        to: destinationRoom.id,
      },
    };
  }

  return {
    ...moveResult,
    ...resolveRoomEntry({
      coins,
      coinsOnEnterMultiplier,
      room: landingRoom,
    }),
  };
}

export function resolvePositionChange({
  coins,
  coinsOnEnterMultiplier = 1,
  positionId,
  steps,
}: PositionChangeInput & {
  coins: number;
  coinsOnEnterMultiplier?: number;
}): DiceTurnResult {
  const nextPositionId = positionId + steps;
  const moveResult: DiceMoveResult =
    nextPositionId > finishRoomId
      ? { positionId, outcome: "overshot" }
      : nextPositionId === finishRoomId
        ? { positionId: nextPositionId, outcome: "finished" }
        : {
            positionId: Math.max(1, nextPositionId),
            outcome: "moved",
          };

  if (moveResult.outcome === "overshot") {
    return {
      ...moveResult,
      coins,
      action: null,
    };
  }

  const landingRoom = getRoomById(moveResult.positionId);

  if (landingRoom.action === "portal" && landingRoom.portalTo !== undefined) {
    const destinationRoom = getRoomById(landingRoom.portalTo);
    const destinationEntry = resolveRoomEntry({
      coins,
      coinsOnEnterMultiplier,
      room: destinationRoom,
    });

    return {
      positionId: destinationRoom.id,
      outcome: moveResult.outcome,
      ...destinationEntry,
      portal: {
        from: landingRoom.id,
        to: destinationRoom.id,
      },
    };
  }

  return {
    ...moveResult,
    ...resolveRoomEntry({
      coins,
      coinsOnEnterMultiplier,
      room: landingRoom,
    }),
  };
}
