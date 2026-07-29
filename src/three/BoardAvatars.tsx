import { rooms, type Vector3Tuple } from "../game/board";
import type {
  GamePhase,
  GamePlayer,
  GamePortalTransition,
} from "../game/store";
import { Avatar } from "./Avatar";
import { VictoryCinematic } from "./VictoryCinematic";

type BoardAvatarsProps = {
  currentPlayerIndex: number;
  phase: GamePhase;
  players: GamePlayer[];
  portalTransition: GamePortalTransition | null;
  winnerId: string | null;
};

function getPlayerPosition(
  roomPosition: Vector3Tuple,
  playerIndex: number,
  playerCount: number,
): Vector3Tuple {
  if (playerCount <= 1) {
    return roomPosition;
  }

  const angle = (playerIndex / playerCount) * Math.PI * 2;
  const radius = 0.88;

  return [
    roomPosition[0] + Math.cos(angle) * radius,
    roomPosition[1],
    roomPosition[2] + Math.sin(angle) * radius,
  ];
}

export function BoardAvatars({
  currentPlayerIndex,
  phase,
  players,
  portalTransition,
  winnerId,
}: BoardAvatarsProps) {
  const winner =
    players.find(({ id }) => id === winnerId) ??
    players.find(({ positionIndex }) => positionIndex === rooms.length - 1);
  const showNameLabel = phase === "playing" || phase === "finished";

  return (
    <>
      {players.map((player, index) =>
        phase === "finished" && player.id === winner?.id ? null : (
          <Avatar
            key={player.id}
            active={index === currentPlayerIndex}
            avatarId={player.avatarId}
            label={player.name}
            markerColor={index === currentPlayerIndex ? "#f3c969" : "#67d5c8"}
            playerId={player.id}
            portalTransition={portalTransition}
            roomId={player.positionIndex + 1}
            showNameLabel={showNameLabel}
            targetPosition={getPlayerPosition(
              rooms[player.positionIndex].position,
              index,
              players.length,
            )}
          />
        ),
      )}

      {phase === "finished" && winner ? (
        <VictoryCinematic
          anchorPosition={rooms[rooms.length - 1].position}
          winner={winner}
        />
      ) : null}
    </>
  );
}
