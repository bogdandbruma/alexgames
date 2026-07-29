import { memo } from "react";
import { roomDoorsById, rooms } from "../game/board";
import { SpaceRoom } from "./SpaceRoom";

type BoardRoomsProps = {
  activeRoomId: number;
};

export const BoardRooms = memo(function BoardRooms({
  activeRoomId,
}: BoardRoomsProps) {
  return (
    <>
      {rooms.map((room) => (
        <SpaceRoom
          key={room.id}
          active={room.id === activeRoomId}
          doors={roomDoorsById[room.id] ?? []}
          room={room}
        />
      ))}
    </>
  );
});
