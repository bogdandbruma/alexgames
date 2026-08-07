import { ArrowLeft, LoaderCircle, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createRoom,
  joinRoom,
  listMembers,
  listRooms,
  roomStatusLabel,
  type Room,
  type RoomMember,
} from "./rooms";
import { WaitingRoom } from "./WaitingRoom";
import type { OnlinePlaySurface } from "./playSurface";

type LobbyProps = {
  client: SupabaseClient;
  gameSlug: string;
  deviceId: string;
  username: string;
  OnlinePlay?: OnlinePlaySurface;
  onBack: () => void;
};

type ActiveSession = {
  room: Room;
  member: RoomMember;
};

export function Lobby({
  client,
  gameSlug,
  deviceId,
  username,
  OnlinePlay,
  onBack,
}: LobbyProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listRooms(client, gameSlug)
      .then((next) => {
        if (!cancelled) {
          setRooms(next.filter((room) => room.status !== "closed"));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Nu am putut încărca lobby-ul.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client, gameSlug]);

  const refresh = async () => {
    const next = await listRooms(client, gameSlug);
    setRooms(next.filter((room) => room.status !== "closed"));
  };

  if (session) {
    return (
      <WaitingRoom
        client={client}
        room={session.room}
        member={session.member}
        deviceId={deviceId}
        username={username}
        OnlinePlay={OnlinePlay}
        onLeave={() => {
          setSession(null);
          void refresh().catch(() => {});
        }}
      />
    );
  }

  const handleCreate = async () => {
    const name = roomName.trim();
    if (!name) {
      setError("Alege un nume pentru cameră.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await createRoom(client, {
        gameSlug,
        name,
        hostDeviceId: deviceId,
        displayName: username,
      });
      setSession({ room: result.room, member: result.hostMember });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Crearea camerei a eșuat.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (room: Room, as: "player" | "spectator") => {
    setBusy(true);
    setError(null);
    try {
      const member = await joinRoom(client, {
        roomId: room.id,
        deviceId,
        displayName: username,
        as,
      });
      setSession({ room, member });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Intrarea a eșuat.");
    } finally {
      setBusy(false);
    }
  };

  const handleReenter = async (room: Room) => {
    setBusy(true);
    setError(null);
    try {
      const members = await listMembers(client, room.id);
      const existing = members.find((m) => m.deviceId === deviceId);
      if (!existing) {
        throw new Error("Nu ești membru al acestei camere.");
      }
      setSession({ room, member: existing });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reintrarea a eșuat.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="dashboard-shell online-mode-shell">
      <div className="dashboard-body online-mode-body">
        <button
          type="button"
          className="secondary-button online-mode-back"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" size={18} />
          <span>Înapoi</span>
        </button>

        <section className="online-lobby" aria-labelledby="online-lobby-heading">
          <h1 id="online-lobby-heading">Lobby</h1>
          <p className="subtitle">
            Camere pentru <strong>{gameSlug}</strong>. Creează sau intră ca
            jucător / spectator.
          </p>
          <p className="online-lobby-identity">
            Conectat ca <strong>{username}</strong>
          </p>

          <form
            className="online-lobby-create"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreate();
            }}
          >
            <label className="online-entry-label" htmlFor="online-room-name">
              Nume cameră
            </label>
            <input
              id="online-room-name"
              className="online-entry-input"
              type="text"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              disabled={busy}
              autoComplete="off"
            />
            <button
              type="submit"
              className="primary-button"
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle
                  aria-hidden="true"
                  size={20}
                  className="online-entry-spinner"
                />
              ) : (
                <Plus aria-hidden="true" size={20} />
              )}
              <span>Creează</span>
            </button>
          </form>

          {loading ? (
            <p className="online-entry-status" role="status">
              Se încarcă camerele…
            </p>
          ) : (
            <ul className="online-lobby-list" aria-label="Listă camere">
              {rooms.length === 0 ? (
                <li className="online-lobby-empty">Nicio cameră încă.</li>
              ) : (
                rooms.map((room) => (
                  <li key={room.id} className="online-lobby-item">
                    <div className="online-lobby-item-main">
                      <Users aria-hidden="true" size={18} />
                      <span className="online-lobby-item-name">{room.name}</span>
                      <span className="online-lobby-item-status">
                        {roomStatusLabel(room.status)}
                      </span>
                    </div>
                    <div className="online-lobby-item-actions">
                      {room.status === "waiting" ? (
                        <button
                          type="button"
                          className="primary-button"
                          disabled={busy}
                          onClick={() => void handleJoin(room, "player")}
                        >
                          Intră jucător
                        </button>
                      ) : null}
                      {room.status === "paused" || room.status === "playing" ? (
                        <button
                          type="button"
                          className="primary-button"
                          disabled={busy}
                          onClick={() => void handleReenter(room)}
                        >
                          Reintră
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => void handleJoin(room, "spectator")}
                      >
                        Spectator
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}

          {error ? (
            <p
              className="online-entry-status online-entry-status--error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
