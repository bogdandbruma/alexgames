import type { ComponentType } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Room, RoomMember } from "./rooms";

/** Game-agnostic play surface mounted after room status becomes playing. */
export type OnlinePlaySurfaceProps = {
  client: SupabaseClient;
  room: Room;
  member: RoomMember;
  members: RoomMember[];
  deviceId: string;
  onLeave: () => void;
};

export type OnlinePlaySurface = ComponentType<OnlinePlaySurfaceProps>;
