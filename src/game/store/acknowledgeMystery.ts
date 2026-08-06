import { applyMysteryEffect, getMysteryCardById, type MysteryCardId } from "../mystery";
import { pushPlayerCoinBursts } from "../playerCoinBurst";
import type { DiceTurnResult } from "../rules";
import {
  applyMysteryPlayersToStore,
  clearFinishedInteractiveState,
  createEndTurnState,
  createFinishedState,
  createMysteryCoinToast,
  createPendingRoomActionState,
  createPortalTransition,
  getPlayerName,
  MYSTERY_COIN_TOAST_MS,
  shouldPauseForRoomAction,
  waitForPortalTransitionBeforeTrivia,
} from "./helpers";
import { getPendingMystery } from "./pendingEvent";
import { syncFocusedPlayerWalkIfMoved } from "./playerWalk";
import type { GameState, GameStoreSet } from "./types";

export async function executeAcknowledgeMystery(deps: {
  get: () => GameState;
  set: GameStoreSet;
}) {
  const { get, set } = deps;
  const pendingRoomAction: {
    result: DiceTurnResult | null;
    playerId: string | null;
  } = {
    result: null,
    playerId: null,
  };
  let shouldEndTurn = false;
  let revealedCardId: MysteryCardId | null = null;
  let mysteryCoinsDelta = 0;
  let mysteryPlayerId: string | null = null;
  const playersBefore = get().players;

  set((state) => {
    const pendingMystery = getPendingMystery(state.pendingEvent);
    const cardId = pendingMystery?.revealedCardId ?? null;

    if (
      !pendingMystery ||
      cardId === null ||
      state.phase !== "playing" ||
      state.rolling
    ) {
      if (state.phase === "finished") {
        return clearFinishedInteractiveState();
      }

      return {};
    }

    const playerBefore = state.players.find(
      ({ id }) => id === pendingMystery.playerId,
    );
    const coinsBefore = playerBefore?.coins ?? 0;

    const effect = applyMysteryEffect({
      activePlayerId: pendingMystery.playerId,
      cardId,
      players: state.players.map((player) => ({
        id: player.id,
        positionId: player.positionIndex + 1,
        coins: player.coins,
      })),
    });
    const mysteryResult = applyMysteryPlayersToStore(
      state,
      effect.players,
      effect.changedPositionPlayerIds,
      pendingMystery.playerId,
    );
    const player = mysteryResult.players.find(
      ({ id }) => id === pendingMystery.playerId,
    );
    const card = getMysteryCardById(cardId);
    mysteryCoinsDelta = (player?.coins ?? coinsBefore) - coinsBefore;
    mysteryPlayerId = pendingMystery.playerId;
    const portalTransition =
      player && mysteryResult.activeResult
        ? createPortalTransition(player.id, mysteryResult.activeResult)
        : null;

    revealedCardId = cardId;
    pendingRoomAction.result =
      mysteryResult.winnerId === null &&
      shouldPauseForRoomAction(mysteryResult.activeResult)
        ? mysteryResult.activeResult
        : null;
    pendingRoomAction.playerId =
      pendingRoomAction.result && player ? player.id : null;
    shouldEndTurn =
      mysteryResult.winnerId === null && pendingRoomAction.result === null;

    return {
      players: mysteryResult.players,
      ...(portalTransition ? { portalTransition } : {}),
      ...(mysteryResult.winnerId
        ? createFinishedState(
            mysteryResult.winnerId,
            `${getPlayerName(player)} a dezvaluit ${card.title} si a castigat!`,
          )
        : {
            pendingEvent: null,
            message: `${getPlayerName(player)} a dezvaluit ${card.title}.`,
          }),
    };
  });

  if (!revealedCardId) {
    return;
  }

  if (get().phase === "playing" && mysteryPlayerId) {
    await syncFocusedPlayerWalkIfMoved(get, set, playersBefore, mysteryPlayerId);
  }

  if (pendingRoomAction.result && pendingRoomAction.playerId) {
    const result = pendingRoomAction.result;
    const playerId = pendingRoomAction.playerId;

    if (result.action === "trivia") {
      await waitForPortalTransitionBeforeTrivia(get, playerId);
    }

    set((state) => {
      if (state.phase !== "playing") {
        return {};
      }

      const player = state.players.find(({ id }) => id === playerId);

      if (!player) {
        return {};
      }

      return createPendingRoomActionState(
        state,
        playerId,
        result,
        `${getPlayerName(player)} a terminat misterul.`,
      );
    });

    return;
  }

  if (!shouldEndTurn) {
    return;
  }

  const cardId = revealedCardId;
  const coinsDelta = mysteryCoinsDelta;
  const playerId = mysteryPlayerId;

  if (coinsDelta !== 0 && playerId) {
    set((state) => {
      if (state.phase !== "playing") {
        return {};
      }

      const player = state.players.find(({ id }) => id === playerId);

      if (!player) {
        return {};
      }
      const card = getMysteryCardById(cardId);
      const coinMessage =
        coinsDelta > 0
          ? "primeste coins."
          : coinsDelta < 0
            ? "pierde coins."
            : "nu avea coins de pierdut.";

      return {
        pendingEvent: null,
        message: `${getPlayerName(player)} a terminat misterul. ${getPlayerName(player)} ${coinMessage}`,
        uiToast: createMysteryCoinToast(player, card, coinsDelta),
        playerCoinBursts: pushPlayerCoinBursts(
          state.playerCoinBursts,
          playerId,
          coinsDelta,
        ),
      };
    });

    await new Promise<void>((resolve) => {
      window.setTimeout(() => {
        set((latestState) => {
          if (latestState.phase !== "playing") {
            return {};
          }

          const player = latestState.players.find(({ id }) => id === playerId);

          return createEndTurnState(
            latestState,
            `${getPlayerName(player)} a terminat misterul.`,
          );
        });
        resolve();
      }, MYSTERY_COIN_TOAST_MS);
    });

    return;
  }

  set((state) => {
    if (state.phase !== "playing") {
      return {};
    }

    const player = state.players.find(({ id }) => id === playerId);

    if (!player) {
      return {};
    }

    return createEndTurnState(
      state,
      `${getPlayerName(player)} a terminat misterul.`,
    );
  });
}
