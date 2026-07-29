import { useState } from "react";
import {
  BadgeQuestionMark,
  CircleDollarSign,
  Flag,
  Orbit,
  PawPrint,
  ShoppingBag,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { avatarOptions } from "../../game/avatars";
import { roomConnections, rooms, type Vector3Tuple } from "../../game/board";
import type { GamePlayer } from "../../game/store";
import {
  roomActionColors,
  roomActionLabels,
  type RoomAction,
} from "../../game/rooms";

const minimapPlayerColors = ["#f3c969", "#67d5c8", "#ff7867", "#c8a1ff"];

const minimapBounds = rooms.reduce(
  (bounds, room) => {
    const [x, , z] = room.position;

    return {
      maxX: Math.max(bounds.maxX, x),
      maxZ: Math.max(bounds.maxZ, z),
      minX: Math.min(bounds.minX, x),
      minZ: Math.min(bounds.minZ, z),
    };
  },
  {
    maxX: Number.NEGATIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
    minX: Number.POSITIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
  },
);

const minimapPadding = 7;
const minimapWidth = minimapBounds.maxX - minimapBounds.minX;
const minimapHeight = minimapBounds.maxZ - minimapBounds.minZ;

const minimapLegend: RoomAction[] = [
  "coins",
  "trap",
  "shop",
  "mystery",
  "trivia",
  "portal",
  "finish",
];

const minimapActionIcons: Record<RoomAction, LucideIcon> = {
  coins: CircleDollarSign,
  finish: Flag,
  mystery: Sparkles,
  portal: Orbit,
  shop: ShoppingBag,
  trap: TriangleAlert,
  trivia: BadgeQuestionMark,
};

function projectMinimapPosition(position: Vector3Tuple) {
  const [x, , z] = position;
  const usableSize = 100 - minimapPadding * 2;

  return {
    x:
      minimapPadding +
      ((x - minimapBounds.minX) / minimapWidth) * usableSize,
    y:
      minimapPadding +
      ((z - minimapBounds.minZ) / minimapHeight) * usableSize,
  };
}

function getPlayerMarkerOffset(
  playerIndex: number,
  players: GamePlayer[],
): { x: number; y: number } {
  const roomIndex = players[playerIndex].positionIndex;
  const indicesInRoom = players
    .map((player, index) => ({ index, roomIndex: player.positionIndex }))
    .filter(({ roomIndex: room }) => room === roomIndex)
    .map(({ index }) => index);
  const slot = indicesInRoom.indexOf(playerIndex);
  const count = indicesInRoom.length;

  if (count <= 1) {
    return { x: 0, y: -3.2 };
  }

  const spread = Math.min(2.8, 1.35 + count * 0.45);
  const angle = Math.PI * 0.72 + (slot / Math.max(count - 1, 1)) * Math.PI * 0.56;

  return {
    x: Math.cos(angle) * spread,
    y: Math.sin(angle) * spread - 2.4,
  };
}

function getPlayerInitial(name: string, playerIndex: number) {
  const trimmed = name.trim();

  if (trimmed.length > 0) {
    return trimmed.charAt(0).toLocaleUpperCase("ro-RO");
  }

  return `${playerIndex + 1}`;
}

export function SpaceMinimap({
  currentPlayerIndex,
  layout = "embedded",
  players,
  showHeading = true,
}: {
  currentPlayerIndex: number;
  layout?: "embedded" | "modal";
  players: GamePlayer[];
  showHeading?: boolean;
}) {
  const [highlightedAction, setHighlightedAction] = useState<RoomAction | null>(
    null,
  );
  const isFiltering = highlightedAction !== null;

  function toggleLegendAction(action: RoomAction) {
    setHighlightedAction((current) => (current === action ? null : action));
  }

  return (
    <section
      className={
        layout === "modal"
          ? "minimap-panel minimap-panel-modal"
          : "minimap-panel"
      }
      aria-label="Miniharta"
      data-testid="space-minimap"
    >
      {showHeading ? (
        <div className="section-heading-row">
          <h2>Miniharta</h2>
          <span className="minimap-route-count">{rooms.length}</span>
        </div>
      ) : null}

      <svg
        className={[
          layout === "modal" ? "space-minimap space-minimap-modal" : "space-minimap",
          isFiltering ? "space-minimap-legend-filter" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        viewBox="0 0 100 100"
        role="img"
        aria-label="Traseu cu ramura, poduri, portale si pozitiile jucatorilor"
      >
        <defs>
          <pattern
            id="minimap-finish-checker"
            width="1.16"
            height="1.16"
            patternUnits="userSpaceOnUse"
          >
            <rect width="0.58" height="0.58" fill="#f8fbf7" />
            <rect x="0.58" width="0.58" height="0.58" fill="#171410" />
            <rect y="0.58" width="0.58" height="0.58" fill="#171410" />
            <rect
              x="0.58"
              y="0.58"
              width="0.58"
              height="0.58"
              fill="#f8fbf7"
            />
          </pattern>
        </defs>

        <g className="minimap-links">
          {roomConnections.map((connection) => {
            const points = connection.points
              .map(projectMinimapPosition)
              .map(({ x, y }) => `${x},${y}`)
              .join(" ");

            return (
              <polyline
                key={`${connection.fromRoomId}-${connection.toRoomId}-${connection.kind}`}
                className={`minimap-link minimap-link-${connection.kind}`}
                points={points}
              />
            );
          })}
        </g>

        <g className="minimap-rooms">
          {rooms.map((room) => {
            const position = projectMinimapPosition(room.position);
            const twoDigit = room.id >= 10;
            const isHighlighted =
              isFiltering && room.action === highlightedAction;
            const isDimmed =
              isFiltering && room.action !== highlightedAction;

            return (
              <g
                key={room.id}
                className={[
                  `minimap-room minimap-room-${room.action}`,
                  twoDigit ? "minimap-room-wide" : "",
                  isHighlighted ? "minimap-room-highlighted" : "",
                  isDimmed ? "minimap-room-dimmed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                transform={`translate(${position.x} ${position.y})`}
              >
                <title>{`Camera ${room.id}: ${roomActionLabels[room.action]}`}</title>
                {isHighlighted ? (
                  <circle className="minimap-room-highlight-halo" r={3.35} />
                ) : null}
                <circle
                  r={twoDigit ? 2.35 : 2.05}
                  style={{
                    fill:
                      room.action === "finish"
                        ? "url(#minimap-finish-checker)"
                        : roomActionColors[room.action],
                  }}
                />
                <text x="0" y={twoDigit ? 0.62 : 0.68}>
                  {room.id}
                </text>
              </g>
            );
          })}
        </g>

        <g className="minimap-players">
          {players.map((player, index) => {
            const position = projectMinimapPosition(
              rooms[player.positionIndex].position,
            );
            const markerOffset = getPlayerMarkerOffset(index, players);
            const roomId = player.positionIndex + 1;
            const fill = minimapPlayerColors[index % minimapPlayerColors.length];
            const isActive = index === currentPlayerIndex;

            return (
              <g
                key={player.id}
                className={
                  isActive
                    ? "minimap-player minimap-player-active"
                    : "minimap-player"
                }
                transform={`translate(${position.x + markerOffset.x} ${position.y + markerOffset.y})`}
              >
                <title>{`${player.name}: camera ${roomId}`}</title>
                {isActive ? <circle className="minimap-player-halo" r={3.15} /> : null}
                <circle
                  r={isActive ? 2.55 : 2.2}
                  fill={fill}
                />
                <text className="minimap-player-initial" x="0" y="0.78">
                  {getPlayerInitial(player.name, index)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="minimap-player-roster" aria-label="Pozitii jucatori">
        {players.map((player, index) => {
          const avatar = avatarOptions.find(({ id }) => id === player.avatarId);
          const Icon = avatar?.Icon ?? PawPrint;
          const isActive = index === currentPlayerIndex;
          const roomId = player.positionIndex + 1;
          const color = minimapPlayerColors[index % minimapPlayerColors.length];

          return (
            <div
              key={player.id}
              className={
                isActive
                  ? "minimap-roster-chip minimap-roster-chip-active"
                  : "minimap-roster-chip"
              }
              title={`${player.name} — camera ${roomId}`}
            >
              <span
                className="minimap-roster-swatch"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <Icon aria-hidden="true" size={16} />
              <span className="minimap-roster-name">{player.name}</span>
              <span className="minimap-roster-room">#{roomId}</span>
            </div>
          );
        })}
      </div>

      <div className="minimap-legend" aria-label="Filtru tip cameră">
        {minimapLegend.map((action) => {
          const isActive = highlightedAction === action;
          const Icon = minimapActionIcons[action];

          return (
            <button
              key={action}
              type="button"
              className={
                isActive
                  ? "minimap-legend-item minimap-legend-item-active"
                  : "minimap-legend-item"
              }
              aria-pressed={isActive}
              onClick={() => toggleLegendAction(action)}
            >
              <i
                className={`minimap-legend-swatch minimap-legend-swatch-${action}`}
                style={
                  action === "finish"
                    ? undefined
                    : { backgroundColor: roomActionColors[action] }
                }
                aria-hidden="true"
              />
              <Icon aria-hidden="true" size={13} strokeWidth={2.4} />
              <span>{roomActionLabels[action]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
