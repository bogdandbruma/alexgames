import {
  gameplayRooms,
  roomActionColors,
  type RoomAction,
} from "./rooms";

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
  action: RoomAction;
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
  points: Vector3Tuple[];
  fromDirection: Direction;
  toDirection: Direction;
  kind: "bridge" | "path" | "portal";
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

const roomNames = [
  "Poarta de plecare",
  "Depozitul",
  "Camera cu stele",
  "Teleportorul",
  "Colțul stației",
  "Laboratorul",
  "Sala cu cutii",
  "Podul stricat",
  "Coridorul șefilor",
  "Centrul de navigație",
  "Grădina din spațiu",
  "Stația dronelor",
  "Sala reactorului",
  "Capsula medicală",
  "Cuibul semnalelor",
  "Nucleul gravitației",
  "Armeria",
  "Arhiva hărților",
  "Releul scutului",
  "Centrul de comandă",
];

const ROOM_SPACING = 12;

function addSnakeRow(
  positions: Record<number, Vector3Tuple>,
  startRoomId: number,
  roomIds: number[],
  xValues: number[],
  z: number,
) {
  roomIds.forEach((roomId, index) => {
    positions[roomId] = [xValues[index] ?? xValues[xValues.length - 1], 0, z];
  });

  return startRoomId + roomIds.length;
}

function createRoomPositions(): Record<number, Vector3Tuple> {
  const positions: Record<number, Vector3Tuple> = {};
  const startXValues = [-30, -18, -6, 6, 18, 30];
  const midXValues = [42, 54, 66, 78, 90, 102];
  const moonXValues = [42, 54, 66, 78, 90, 102];
  let nextRoomId = 1;

  nextRoomId = addSnakeRow(
    positions,
    nextRoomId,
    [1, 2, 3, 4, 5, 6],
    startXValues,
    -18,
  );
  nextRoomId = addSnakeRow(
    positions,
    nextRoomId,
    [12, 11, 10, 9, 8, 7],
    startXValues,
    -6,
  );
  nextRoomId = addSnakeRow(
    positions,
    nextRoomId,
    [13, 14, 15, 16, 17, 18],
    startXValues,
    6,
  );
  nextRoomId = addSnakeRow(
    positions,
    nextRoomId,
    [24, 23, 22, 21, 20, 19],
    startXValues,
    18,
  );
  addSnakeRow(positions, nextRoomId, [25, 26, 27, 28], startXValues, 30);

  addSnakeRow(positions, 29, [29, 30, 31, 32, 33, 34], midXValues, -18);
  addSnakeRow(positions, 35, [40, 39, 38, 37, 36, 35], midXValues, -6);
  addSnakeRow(positions, 41, [41, 42, 43, 44, 45, 46], midXValues, 6);
  addSnakeRow(positions, 47, [50, 49, 48, 47], midXValues, 18);

  addSnakeRow(positions, 51, [51, 52, 53, 54, 55, 56], moonXValues, 42);
  addSnakeRow(positions, 57, [62, 61, 60, 59, 58, 57], moonXValues, 54);
  addSnakeRow(positions, 63, [63, 64, 65, 66, 67], moonXValues, 66);

  return positions;
}

const roomPositions = createRoomPositions();

function getRoomPosition(roomId: number): Vector3Tuple {
  return roomPositions[roomId];
}

export const rooms: RoomDefinition[] = gameplayRooms.map((gameplayRoom, index) => {
  const id = gameplayRoom.id;

  return {
    id,
    name: roomNames[index % roomNames.length],
    action: gameplayRoom.action,
    position: getRoomPosition(id),
    accentColor: roomActionColors[gameplayRoom.action],
    shape: roomShapes[index % roomShapes.length],
    decorations: roomDecorations[index % roomDecorations.length],
  };
});

const hallwayWidths = [
  2.85, 2.95, 3.05, 2.9, 3.15, 3, 2.95, 3.1, 3.05, 2.9,
];

const connectionPair = (
  fromRoomId: number,
  toRoomId: number,
  kind: RoomConnection["kind"],
): [number, number, RoomConnection["kind"]] => [fromRoomId, toRoomId, kind];

const visualConnectionPairs: Array<[number, number, RoomConnection["kind"]]> = [
  ...Array.from({ length: 66 }, (_, index) =>
    connectionPair(
      index + 1,
      index + 2,
      index + 1 === 28 || index + 1 === 50 ? "bridge" : "path",
    ),
  ),
];

const portalConnectionPairs: Array<[number, number, RoomConnection["kind"]]> = [
  connectionPair(22, 28, "portal"),
  connectionPair(35, 42, "portal"),
  connectionPair(45, 38, "portal"),
  connectionPair(60, 50, "portal"),
];

const connectionDirectionOverrides = new Map<
  string,
  { fromDirection: Direction; toDirection: Direction }
>([
  ["28->29", { fromDirection: "east", toDirection: "south" }],
  ["46->47", { fromDirection: "south", toDirection: "east" }],
]);

const connectionRouteOverrides = new Map<string, (args: {
  from: Vector3Tuple;
  to: Vector3Tuple;
}) => Vector3Tuple[]>([
  [
    "28->29",
    ({ from, to }) =>
      compactPoints([
        from,
        [36, from[1], from[2]],
        [36, from[1], to[2]],
        to,
      ]),
  ],
]);

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

function arePointsEqual(a: Vector3Tuple, b: Vector3Tuple) {
  return Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[2] - b[2]) < 0.01;
}

function compactPoints(points: Vector3Tuple[]) {
  return points.filter((point, index) => {
    const previousPoint = points[index - 1];

    return !previousPoint || !arePointsEqual(previousPoint, point);
  });
}

function getOrthogonalRoute(
  from: Vector3Tuple,
  to: Vector3Tuple,
  fromDirection: Direction,
  toDirection: Direction,
): Vector3Tuple[] {
  if (Math.abs(from[0] - to[0]) < 0.01 || Math.abs(from[2] - to[2]) < 0.01) {
    return [from, to];
  }

  const [fromVectorX, fromVectorZ] = directionVector[fromDirection];
  const [toVectorX, toVectorZ] = directionVector[toDirection];
  const stubDistance = ROOM_SPACING / 4;
  const fromStub: Vector3Tuple = [
    from[0] + fromVectorX * stubDistance,
    from[1],
    from[2] + fromVectorZ * stubDistance,
  ];
  const toStub: Vector3Tuple = [
    to[0] + toVectorX * stubDistance,
    to[1],
    to[2] + toVectorZ * stubDistance,
  ];
  const bend: Vector3Tuple =
    fromDirection === "east" || fromDirection === "west"
      ? [toStub[0], from[1], fromStub[2]]
      : [fromStub[0], from[1], toStub[2]];

  return compactPoints([from, fromStub, bend, toStub, to]);
}

function createConnection(
  fromRoomId: number,
  toRoomId: number,
  kind: RoomConnection["kind"],
  index: number,
): RoomConnection {
  const room = rooms[fromRoomId - 1];
  const nextRoom = rooms[toRoomId - 1];
  const directionOverride = connectionDirectionOverrides.get(
    `${fromRoomId}->${toRoomId}`,
  );
  const fromDirection =
    directionOverride?.fromDirection ??
    getConnectionDirection(room.position, nextRoom.position);
  const toDirection =
    directionOverride?.toDirection ?? oppositeDirection[fromDirection];
  const from = getDoorWorldPosition(room, fromDirection);
  const to = getDoorWorldPosition(nextRoom, toDirection);
  const routeOverride = connectionRouteOverrides.get(`${fromRoomId}->${toRoomId}`);

  return {
    fromRoomId: room.id,
    toRoomId: nextRoom.id,
    fromDirection,
    toDirection,
    from,
    to,
    points:
      kind === "portal"
        ? [room.position, nextRoom.position]
        : routeOverride?.({ from, to }) ??
          getOrthogonalRoute(from, to, fromDirection, toDirection),
    kind,
    width: hallwayWidths[index % hallwayWidths.length],
  };
}

export const roomConnections: RoomConnection[] = visualConnectionPairs.map(
  ([fromRoomId, toRoomId, kind], index) => {
    return createConnection(fromRoomId, toRoomId, kind, index);
  },
);

export const portalConnections: RoomConnection[] = portalConnectionPairs.map(
  ([fromRoomId, toRoomId, kind], index) =>
    createConnection(fromRoomId, toRoomId, kind, index),
);

const traversableConnectionByPair = new Map(
  roomConnections.flatMap((connection) => [
    [`${connection.fromRoomId}->${connection.toRoomId}`, connection] as const,
    [`${connection.toRoomId}->${connection.fromRoomId}`, {
      ...connection,
      fromRoomId: connection.toRoomId,
      toRoomId: connection.fromRoomId,
      from: connection.to,
      to: connection.from,
      fromDirection: connection.toDirection,
      toDirection: connection.fromDirection,
      points: [...connection.points].reverse(),
    }] as const,
  ]),
);

export function getTravelRouteBetweenRooms(
  fromRoomId: number,
  toRoomId: number,
): Vector3Tuple[] {
  const step = fromRoomId <= toRoomId ? 1 : -1;
  const points: Vector3Tuple[] = [];

  for (let roomId = fromRoomId; roomId !== toRoomId; roomId += step) {
    const connection = traversableConnectionByPair.get(`${roomId}->${roomId + step}`);

    if (!connection) {
      return [];
    }

    points.push(...connection.points);
  }

  return compactPoints(points);
}

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
