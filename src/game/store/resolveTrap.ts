import { trapEscapeCoinCost } from "../rooms";
import { pushPlayerCoinBursts } from "../playerCoinBurst";
import {
  createCoinDeltaToast,
  createEndTurnState,
  getPlayerInventory,
  getPlayerName,
  removeInventoryItem,
} from "./helpers";
import { getPendingTrap, type TrapEscapeChoice } from "./pendingEvent";
import type { GameStoreSet } from "./types";

export function executeResolveTrap(deps: {
  set: GameStoreSet;
  choice: TrapEscapeChoice;
}): boolean {
  const { set, choice } = deps;
  let resolved = false;

  set((state) => {
    const pendingTrap = getPendingTrap(state.pendingEvent);
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (
      !pendingTrap ||
      state.phase !== "playing" ||
      state.rolling ||
      !currentPlayer ||
      currentPlayer.id !== pendingTrap.playerId ||
      !currentPlayer.trapped
    ) {
      return {};
    }

    const hasKey = getPlayerInventory(currentPlayer).includes("cosmic-key");
    const canPay = currentPlayer.coins >= trapEscapeCoinCost;

    switch (choice) {
      case "key": {
        if (!hasKey) {
          return {};
        }

        resolved = true;

        return {
          pendingEvent: null,
          players: state.players.map((player) =>
            player.id === currentPlayer.id
              ? {
                  ...removeInventoryItem(player, "cosmic-key"),
                  trapped: false,
                }
              : player,
          ),
          message: `${getPlayerName(currentPlayer)} a folosit cheia cosmica ca sa iasa din capcana.`,
        };
      }
      case "pay": {
        if (!canPay) {
          return {};
        }

        resolved = true;

        return {
          pendingEvent: null,
          players: state.players.map((player) =>
            player.id === currentPlayer.id
              ? {
                  ...player,
                  coins: player.coins - trapEscapeCoinCost,
                  trapped: false,
                }
              : player,
          ),
          uiToast: createCoinDeltaToast(
            "Capcana",
            currentPlayer,
            -trapEscapeCoinCost,
          ),
          playerCoinBursts: pushPlayerCoinBursts(
            state.playerCoinBursts,
            currentPlayer.id,
            -trapEscapeCoinCost,
          ),
          message: `${getPlayerName(currentPlayer)} a platit ${trapEscapeCoinCost} banuti ca sa iasa din capcana.`,
        };
      }
      case "stay": {
        resolved = true;

        const players = state.players.map((player) =>
          player.id === currentPlayer.id
            ? { ...player, trapped: false }
            : player,
        );

        return {
          ...createEndTurnState(
            { ...state, players },
            `${getPlayerName(currentPlayer)} pierde turul in capcana.`,
          ),
          players,
        };
      }
      default: {
        const exhaustiveCheck: never = choice;
        return exhaustiveCheck;
      }
    }
  });

  return resolved;
}
