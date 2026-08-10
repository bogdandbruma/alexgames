import { ArrowLeft, LoaderCircle, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createRoom,
  fetchRoom,
  joinRoom,
  listJoinedRoomIds,
  listMembers,
  listRooms,
  roomStatusLabel,
  type Room,
  type RoomMember,
} from "./rooms";
import { WaitingRoom } from "./WaitingRoom";
import { setGameHash, setOnlineRoomHash } from "./onlineRoute";
import type { OnlinePlaySurface } from "./playSurface";
import {
  clearRememberedActiveRoomId,
  getRememberedActiveRoomId,
  rememberActiveRoomId,
} from "./sessionMemory";

type LobbyProps = {
  client: SupabaseClient;
  gameSlug: string;
  deviceId: string;
  username: string;
  OnlinePlay?: OnlinePlaySurface;
  initialRoomId?: string | null;
  onBack: () => void;
};

type ActiveSession = {
  room: Room;
  member: RoomMember;
};

function RoomLobbyActions({
  room,
  isMember,
  busy,
  onJoinPlayer,
  onJoinSpectator,
  onReenter,
}: {
  room: Room;
  isMember: boolean;
  busy: boolean;
  onJoinPlayer: () => void;
  onJoinSpectator: () => void;
  onReenter: () => void;
}) {
  const canReenter =
    isMember &&
    (room.status === "paused" ||
      room.status === "playing" ||
      room.status === "waiting");
  const canJoinPlayer = !isMember && room.status === "waiting";
  const canJoinSpectator = !isMember;

  return (
    <div className="online-lobby-item-actions">
      {canJoinPlayer ? (
        <button
          type="button"
          className="primary-button"
          disabled={busy}
          onClick={onJoinPlayer}
        >
          Intră jucător
        </button>
      ) : null}
      {canReenter ? (
        <button
          type="button"
          className="primary-button"
          disabled={busy}
          onClick={onReenter}
        >
          Reintră
        </button>
      ) : null}
      {canJoinSpectator ? (
        <button
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={onJoinSpectator}
        >
          Spectator
        </button>
      ) : null}
    </div>
  );
}

export function Lobby({
  client,
  gameSlug,
  deviceId,
  username,
  OnlinePlay,
  initialRoomId = null,
  onBack,
}: LobbyProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(true);
  const [restoringSession, setRestoringSession] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      listRooms(client, gameSlug),
      listJoinedRoomIds(client, deviceId),
    ])
      .then(([nextRooms, nextJoined]) => {
        if (!cancelled) {
          setRooms(nextRooms.filter((room) => room.status !== "closed"));
          setJoinedRoomIds(nextJoined);
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
  }, [client, gameSlug, deviceId]);

  useEffect(() => {
    const roomId = initialRoomId ?? getRememberedActiveRoomId(gameSlug);
    if (!roomId) {
      return;
    }

    let cancelled = false;
    setRestoringSession(true);
    setError(null);

    void (async () => {
      try {
        const room = await fetchRoom(client, roomId);
        if (cancelled) {
          return;
        }
        if (room.gameSlug !== gameSlug || room.status === "closed") {
          clearRememberedActiveRoomId(gameSlug);
          if (initialRoomId) {
            setGameHash(gameSlug);
          }
          return;
        }

        const members = await listMembers(client, room.id);
        if (cancelled) {
          return;
        }
        const existing = members.find((m) => m.deviceId === deviceId);
        if (!existing) {
          clearRememberedActiveRoomId(gameSlug);
          if (initialRoomId) {
            setGameHash(gameSlug);
          }
          return;
        }

        rememberActiveRoomId(gameSlug, room.id);
        setOnlineRoomHash(gameSlug, room.id);
        setSession({ room, member: existing });
      } catch {
        clearRememberedActiveRoomId(gameSlug);
        if (initialRoomId) {
          setGameHash(gameSlug);
        }
      } finally {
        if (!cancelled) {
          setRestoringSession(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, gameSlug, deviceId, initialRoomId]);

  const refresh = async () => {
    const [nextRooms, nextJoined] = await Promise.all([
      listRooms(client, gameSlug),
      listJoinedRoomIds(client, deviceId),
    ]);
    setRooms(nextRooms.filter((room) => room.status !== "closed"));
    setJoinedRoomIds(nextJoined);
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
          clearRememberedActiveRoomId(gameSlug);
          setGameHash(gameSlug);
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
      rememberActiveRoomId(gameSlug, result.room.id);
      setOnlineRoomHash(gameSlug, result.room.id);
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
      rememberActiveRoomId(gameSlug, room.id);
      setOnlineRoomHash(gameSlug, room.id);
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
      rememberActiveRoomId(gameSlug, room.id);
      setOnlineRoomHash(gameSlug, room.id);
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
          ) : restoringSession ? (
            <p className="online-entry-status" role="status">
              Se reia camera curentă…
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
                    <RoomLobbyActions
                      room={room}
                      isMember={joinedRoomIds.has(room.id)}
                      busy={busy}
                      onJoinPlayer={() => void handleJoin(room, "player")}
                      onJoinSpectator={() =>
                        void handleJoin(room, "spectator")
                      }
                      onReenter={() => void handleReenter(room)}
                    />
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
