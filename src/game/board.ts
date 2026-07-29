export type Vector3Tuple = [number, number, number];

export type Direction = "north" | "east" | "south" | "west";

export type DecorationKind =
  | "barrel"
  | "barrels"
  | "cables"
  | "chair"
  | "computer"
  | "console"
  | "crate"
  | "crystals"
  | "door"
  | "generator"
  | "panel"
  | "pipe"
  | "rover"
  | "satellite"
  | "turret"
  | "wireless";

export type RoomDecoration = {
  kind: DecorationKind;
  position: Vector3Tuple;
  rotationY?: number;
  scale?: number;
};

export type RoomEffect = {
  toIndex: number;
  message: string;
  kind: "forward" | "backward";
};

export type RoomCell = [number, number];

export type RoomDefinition = {
  id: number;
  name: string;
  position: Vector3Tuple;
  rotationY?: number;
  accentColor: string;
  shape: RoomCell[];
  decorations: RoomDecoration[];
  effect?: RoomEffect;
};

export type RoomDoor = {
  direction: Direction;
  width: number;
};

export type RoomConnection = {
  fromRoomId: number;
  toRoomId: number;
  from: Vector3Tuple;
  to: Vector3Tuple;
  fromDirection: Direction;
  toDirection: Direction;
  width: number;
};

export const TILE_SIZE = 1.45;

const baseRoomShape: RoomCell[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [0, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

const shape = (...extraCells: RoomCell[]): RoomCell[] => {
  const cells = [...baseRoomShape, ...extraCells];
  const seen = new Set<string>();

  return cells.filter(([x, z]) => {
    const key = `${x}:${z}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const positions: Vector3Tuple[] = [
  [0, 0, 0],
  [12, 0, 0],
  [24, 0, 0],
  [36, 0, 0],
  [48, 0, 0],
  [48, 0, 12],
  [36, 0, 12],
  [24, 0, 12],
  [12, 0, 12],
  [0, 0, 12],
  [0, 0, 24],
  [12, 0, 24],
  [24, 0, 24],
  [36, 0, 24],
  [48, 0, 24],
  [48, 0, 36],
  [36, 0, 36],
  [24, 0, 36],
  [12, 0, 36],
  [0, 0, 36],
];

const roomShapes: RoomCell[][] = [
  shape([2, 0], [2, 1], [0, 2]),
  shape([-2, 0], [-2, -1], [2, 1], [0, -2]),
  shape([-2, 0], [2, 0], [2, -1], [-1, 2]),
  shape([-2, 1], [-2, 0], [2, 0], [1, -2], [0, -2]),
  shape([-2, 0], [0, 2], [1, 2], [2, 0], [2, 1]),
  shape([0, -2], [1, -2], [-2, 0], [-2, -1], [2, 1]),
  shape([-2, 0], [2, 0], [0, 2], [-1, 2], [1, -2]),
  shape([-2, -1], [-2, 0], [2, 0], [2, 1], [0, -2], [1, 2]),
  shape([-2, 0], [2, -1], [2, 0], [0, 2], [-1, -2]),
  shape([-2, 0], [-2, 1], [0, 2], [1, 2], [1, -2]),
  shape([0, -2], [-1, -2], [2, 0], [2, -1], [0, 2]),
  shape([-2, 0], [2, 0], [-2, 1], [1, 2], [0, -2], [2, -1]),
  shape([-2, 0], [2, 0], [2, 1], [-1, -2], [0, 2]),
  shape([-2, 0], [2, 0], [1, -2], [2, -2], [-1, 2], [0, 2]),
  shape([-2, 0], [2, 0], [0, 2], [1, 2], [-1, -2], [2, 1]),
  shape([0, -2], [1, -2], [-2, 0], [-2, 1], [2, 0], [0, 2]),
  shape([-2, 0], [2, 0], [-1, -2], [1, 2], [2, 2]),
  shape([-2, 0], [2, 0], [2, -1], [-2, 1], [0, -2], [0, 2]),
  shape([-2, 0], [2, 0], [1, -2], [-1, 2], [-2, -1], [2, 1]),
  shape([2, 0], [2, -1], [2, 1], [0, -2], [-1, 2], [-2, 1]),
];

const roomDecorations: RoomDecoration[][] = [
  [
    { kind: "console", position: [1.55, 0, -1.25], rotationY: Math.PI / 2 },
    { kind: "satellite", position: [-1.45, 0, -1.35], rotationY: -Math.PI / 5, scale: 0.34 },
    { kind: "barrel", position: [1.35, 0, 1.35], rotationY: Math.PI / 8, scale: 0.48 },
  ],
  [
    { kind: "crate", position: [1.45, 0, -1.25], rotationY: Math.PI / 4 },
    { kind: "crate", position: [-1.55, 0, 1.2], rotationY: -Math.PI / 6 },
    { kind: "barrels", position: [1.45, 0, 1.25], rotationY: -Math.PI / 4, scale: 0.46 },
    { kind: "pipe", position: [-0.2, 0, -1.45], rotationY: Math.PI / 2, scale: 0.6 },
  ],
  [
    { kind: "cables", position: [0, 0, -1.45], rotationY: Math.PI / 2 },
    { kind: "panel", position: [1.65, 0, 0.45], rotationY: -Math.PI / 2 },
    { kind: "chair", position: [-1.35, 0, 1.15], rotationY: Math.PI / 4, scale: 0.4 },
    { kind: "computer", position: [-1.45, 0, -1.1], rotationY: Math.PI / 2, scale: 0.4 },
  ],
  [
    { kind: "console", position: [1.45, 0, -1.25], rotationY: Math.PI / 2 },
    { kind: "cables", position: [-1.1, 0, 1.2], rotationY: 0 },
    { kind: "wireless", position: [1.35, 0, 1.2], rotationY: -Math.PI / 6, scale: 0.44 },
    { kind: "crystals", position: [-1.45, 0, -1.35], rotationY: Math.PI / 7, scale: 0.4 },
  ],
  [
    { kind: "crate", position: [-1.35, 0, -1.1], rotationY: Math.PI / 3 },
    { kind: "generator", position: [1.35, 0, -1.3], rotationY: -Math.PI / 3, scale: 0.4 },
    { kind: "pipe", position: [1.45, 0, 0.8], rotationY: 0, scale: 0.64 },
  ],
  [
    { kind: "console", position: [1.35, 0, 1.2], rotationY: -Math.PI / 2 },
    { kind: "panel", position: [-1.65, 0, 0.55], rotationY: Math.PI / 2 },
    { kind: "computer", position: [-1.35, 0, -1.05], rotationY: Math.PI / 2, scale: 0.42 },
    { kind: "chair", position: [-0.65, 0, -0.95], rotationY: -Math.PI / 2, scale: 0.4 },
    { kind: "wireless", position: [1.4, 0, -1.3], rotationY: Math.PI / 4, scale: 0.38 },
  ],
  [
    { kind: "crate", position: [1.25, 0, 1.1], rotationY: Math.PI / 5 },
    { kind: "crate", position: [-1.35, 0, -1.1], rotationY: -Math.PI / 5 },
    { kind: "cables", position: [0.45, 0, -1.45], rotationY: 0 },
    { kind: "barrels", position: [-1.35, 0, 1.25], rotationY: Math.PI / 8, scale: 0.48 },
    { kind: "rover", position: [1.35, 0, -1.25], rotationY: -Math.PI / 3, scale: 0.44 },
  ],
  [
    { kind: "cables", position: [-1.1, 0, 1.2], rotationY: -Math.PI / 3 },
    { kind: "panel", position: [1.65, 0, -0.35], rotationY: -Math.PI / 2 },
    { kind: "turret", position: [1.3, 0, 1.15], rotationY: Math.PI / 4, scale: 0.42 },
    { kind: "barrel", position: [-1.45, 0, -1.1], rotationY: -Math.PI / 8, scale: 0.48 },
  ],
  [
    { kind: "console", position: [-1.35, 0, -1.2], rotationY: Math.PI / 2 },
    { kind: "panel", position: [1.65, 0, 0.65], rotationY: -Math.PI / 2 },
    { kind: "satellite", position: [1.2, 0, -1.25], rotationY: Math.PI / 2, scale: 0.32 },
    { kind: "generator", position: [-1.35, 0, 1.15], rotationY: Math.PI / 5, scale: 0.36 },
  ],
  [
    { kind: "console", position: [1.35, 0, -1.25], rotationY: Math.PI / 2 },
    { kind: "console", position: [-1.35, 0, -1.25], rotationY: Math.PI / 2 },
    { kind: "chair", position: [1.05, 0, -0.75], rotationY: -Math.PI / 2, scale: 0.4 },
    { kind: "chair", position: [-1.05, 0, -0.75], rotationY: -Math.PI / 2, scale: 0.4 },
    { kind: "wireless", position: [0, 0, -1.45], rotationY: 0, scale: 0.42 },
  ],
  [
    { kind: "crystals", position: [-1.3, 0, 1.2], rotationY: -Math.PI / 6, scale: 0.42 },
    { kind: "panel", position: [1.55, 0, -0.8], rotationY: -Math.PI / 2 },
    { kind: "pipe", position: [0.2, 0, 1.45], rotationY: Math.PI / 2, scale: 0.58 },
  ],
  [
    { kind: "rover", position: [1.2, 0, 1.1], rotationY: -Math.PI / 3, scale: 0.42 },
    { kind: "crate", position: [-1.35, 0, -1.2], rotationY: Math.PI / 6 },
    { kind: "wireless", position: [1.35, 0, -1.25], rotationY: Math.PI / 3, scale: 0.38 },
  ],
  [
    { kind: "generator", position: [-1.25, 0, -1.2], rotationY: Math.PI / 5, scale: 0.4 },
    { kind: "barrels", position: [1.35, 0, 1.1], rotationY: -Math.PI / 8, scale: 0.46 },
    { kind: "cables", position: [0.2, 0, -1.45], rotationY: Math.PI / 2 },
  ],
  [
    { kind: "chair", position: [-1.1, 0, 1.1], rotationY: Math.PI / 4, scale: 0.4 },
    { kind: "computer", position: [-1.45, 0, 0.2], rotationY: Math.PI / 2, scale: 0.4 },
    { kind: "panel", position: [1.65, 0, -0.55], rotationY: -Math.PI / 2 },
  ],
  [
    { kind: "satellite", position: [1.25, 0, -1.2], rotationY: -Math.PI / 3, scale: 0.32 },
    { kind: "console", position: [-1.35, 0, -1.25], rotationY: Math.PI / 2 },
    { kind: "turret", position: [1.35, 0, 1.15], rotationY: Math.PI / 4, scale: 0.42 },
  ],
  [
    { kind: "generator", position: [1.25, 0, -1.2], rotationY: -Math.PI / 5, scale: 0.4 },
    { kind: "crystals", position: [-1.35, 0, 1.15], rotationY: Math.PI / 6, scale: 0.4 },
    { kind: "pipe", position: [-0.15, 0, -1.45], rotationY: Math.PI / 2, scale: 0.58 },
  ],
  [
    { kind: "crate", position: [1.25, 0, -1.2], rotationY: Math.PI / 8 },
    { kind: "barrel", position: [-1.35, 0, 1.15], rotationY: -Math.PI / 8, scale: 0.48 },
    { kind: "panel", position: [-1.65, 0, -0.25], rotationY: Math.PI / 2 },
  ],
  [
    { kind: "console", position: [-1.3, 0, -1.2], rotationY: Math.PI / 2 },
    { kind: "satellite", position: [1.25, 0, 1.1], rotationY: Math.PI / 4, scale: 0.34 },
    { kind: "cables", position: [0.45, 0, -1.45], rotationY: 0 },
  ],
  [
    { kind: "wireless", position: [1.3, 0, -1.2], rotationY: Math.PI / 5, scale: 0.4 },
    { kind: "generator", position: [-1.25, 0, 1.15], rotationY: -Math.PI / 4, scale: 0.38 },
    { kind: "barrels", position: [1.35, 0, 1.15], rotationY: Math.PI / 9, scale: 0.46 },
  ],
  [
    { kind: "console", position: [1.25, 0, -1.15], rotationY: Math.PI / 2 },
    { kind: "console", position: [-1.25, 0, -1.15], rotationY: Math.PI / 2 },
    { kind: "chair", position: [0.85, 0, -0.55], rotationY: -Math.PI / 2, scale: 0.4 },
    { kind: "wireless", position: [0, 0, 1.3], rotationY: 0, scale: 0.42 },
  ],
];

const accentColors = [
  "#f3c969",
  "#8fb1ff",
  "#67d5c8",
  "#64d88a",
  "#c8a1ff",
  "#7ce38b",
  "#ffba69",
  "#ff7867",
  "#76a6ff",
  "#f0f36a",
  "#98d97a",
  "#7ec8ff",
  "#ff9f6e",
  "#d0a6ff",
  "#78e6c6",
  "#ffd36f",
  "#a7b6ff",
  "#ff8ea1",
  "#86d6ff",
  "#f6f0a3",
];

const roomNames = [
  "Launch Bay",
  "Storage",
  "Observation Room",
  "Teleport Chamber",
  "Corner Module",
  "Research Lab",
  "Cargo Room",
  "Broken Airlock",
  "Command Corridor",
  "Navigation Hub",
  "Hydroponics",
  "Drone Dock",
  "Reactor Watch",
  "Medical Pod",
  "Signal Nest",
  "Gravity Core",
  "Armor Vault",
  "Map Archive",
  "Shield Relay",
  "Command Center",
];

export const rooms: RoomDefinition[] = positions.map((position, index) => {
  const id = index + 1;

  return {
    id,
    name: roomNames[index],
    position,
    accentColor: accentColors[index],
    shape: roomShapes[index],
    decorations: roomDecorations[index],
    effect:
      id === 4
        ? {
            toIndex: 5,
            kind: "forward",
            message: "The teleporter sends you forward to room 6.",
          }
        : id === 8
          ? {
              toIndex: 4,
              kind: "backward",
              message: "The airlock malfunctions. Return to room 5.",
            }
          : undefined,
  };
});

const hallwayWidths = [
  2.45, 2.8, 3.05, 2.6, 3.15, 2.35, 2.95, 2.7, 3.1, 2.55,
];

const oppositeDirection: Record<Direction, Direction> = {
  north: "south",
  east: "west",
  south: "north",
  west: "east",
};

const directionVector: Record<Direction, [number, number]> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};

function getConnectionDirection(from: Vector3Tuple, to: Vector3Tuple) {
  const deltaX = to[0] - from[0];
  const deltaZ = to[2] - from[2];

  if (Math.abs(deltaX) >= Math.abs(deltaZ)) {
    return deltaX >= 0 ? "east" : "west";
  }

  return deltaZ >= 0 ? "south" : "north";
}

function getDoorDistance(room: RoomDefinition, direction: Direction) {
  if (direction === "east") {
    const edgeX = Math.max(...room.shape.filter(([, z]) => z === 0).map(([x]) => x));
    return (edgeX + 0.5) * TILE_SIZE;
  }

  if (direction === "west") {
    const edgeX = Math.min(...room.shape.filter(([, z]) => z === 0).map(([x]) => x));
    return (Math.abs(edgeX) + 0.5) * TILE_SIZE;
  }

  if (direction === "south") {
    const edgeZ = Math.max(...room.shape.filter(([x]) => x === 0).map(([, z]) => z));
    return (edgeZ + 0.5) * TILE_SIZE;
  }

  const edgeZ = Math.min(...room.shape.filter(([x]) => x === 0).map(([, z]) => z));
  return (Math.abs(edgeZ) + 0.5) * TILE_SIZE;
}

function getDoorWorldPosition(
  room: RoomDefinition,
  direction: Direction,
): Vector3Tuple {
  const [vectorX, vectorZ] = directionVector[direction];
  const distance = getDoorDistance(room, direction);

  return [
    room.position[0] + vectorX * distance,
    room.position[1],
    room.position[2] + vectorZ * distance,
  ];
}

export const roomConnections: RoomConnection[] = rooms
  .slice(0, -1)
  .map((room, index) => {
    const nextRoom = rooms[index + 1];
    const fromDirection = getConnectionDirection(room.position, nextRoom.position);
    const toDirection = oppositeDirection[fromDirection];

    return {
      fromRoomId: room.id,
      toRoomId: nextRoom.id,
      fromDirection,
      toDirection,
      from: getDoorWorldPosition(room, fromDirection),
      to: getDoorWorldPosition(nextRoom, toDirection),
      width: hallwayWidths[index % hallwayWidths.length],
    };
  });

export const roomDoorsById = roomConnections.reduce<Record<number, RoomDoor[]>>(
  (doorsById, connection) => {
    doorsById[connection.fromRoomId] = [
      ...(doorsById[connection.fromRoomId] ?? []),
      {
        direction: connection.fromDirection,
        width: connection.width,
      },
    ];

    doorsById[connection.toRoomId] = [
      ...(doorsById[connection.toRoomId] ?? []),
      {
        direction: connection.toDirection,
        width: connection.width,
      },
    ];

    return doorsById;
  },
  {},
);
