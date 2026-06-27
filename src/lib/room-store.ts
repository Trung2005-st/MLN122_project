import { customAlphabet } from "nanoid";
import { getScenario, pickScenarioIds } from "./scenarios";
import {
  resolveRound,
  rollSurprise,
  validateAllocation,
} from "./game-engine";
import { getRedis, KEYS, withRoomLock } from "./redis";
import type {
  Allocation,
  GamePhase,
  GameRoom,
  LeaderboardEntry,
  Player,
} from "./types";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  PHASE_DURATIONS_MS,
  TOTAL_ROUNDS,
} from "./types";

const genCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export function createEmptyRoom(
  hostId: string,
  hostName: string,
  characterClass?: import("./types").CharacterClass
): GameRoom {
  const code = genCode();
  const now = Date.now();
  const host: Player = {
    id: hostId,
    name: hostName,
    characterClass,
    joinedAt: now,
    isHost: true,
    totalScore: 0,
    locked: false,
    lastSeen: now,
  };
  return {
    code,
    version: 1,
    createdAt: now,
    updatedAt: now,
    phase: "lobby",
    phaseStartedAt: now,
    roundIndex: 0,
    totalRounds: TOTAL_ROUNDS,
    players: { [hostId]: host },
    hostId,
    scenarioIds: pickScenarioIds(TOTAL_ROUNDS),
    roundResults: [],
  };
}

export async function saveRoom(room: GameRoom): Promise<void> {
  const r = getRedis();
  room.updatedAt = Date.now();
  room.version += 1;
  await r.set(KEYS.room(room.code), JSON.stringify(room), { ex: 7200 });
}

export async function loadRoom(code: string): Promise<GameRoom | null> {
  const r = getRedis();
  const data = await r.get<string>(KEYS.room(code));
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : (data as GameRoom);
}

export async function createRoom(
  hostId: string,
  hostName: string,
  characterClass?: import("./types").CharacterClass
): Promise<GameRoom> {
  let room = createEmptyRoom(hostId, hostName, characterClass);
  for (let i = 0; i < 10; i++) {
    const existing = await loadRoom(room.code);
    if (!existing) break;
    room = createEmptyRoom(hostId, hostName, characterClass);
  }
  await saveRoom(room);
  return room;
}

export async function joinRoom(
  code: string,
  playerId: string,
  playerName: string,
  characterClass?: import("./types").CharacterClass
): Promise<{ room: GameRoom; player: Player }> {
  return withRoomLock(code, async () => {
    const room = await loadRoom(code);
    if (!room) throw new Error("Phòng không tồn tại");
    if (room.phase !== "lobby") throw new Error("Game đã bắt đầu");
    if (room.players[playerId]) {
      room.players[playerId].lastSeen = Date.now();
      room.players[playerId].name = playerName;
      if (characterClass) room.players[playerId].characterClass = characterClass;
      await saveRoom(room);
      return { room, player: room.players[playerId] };
    }
    if (Object.keys(room.players).length >= MAX_PLAYERS) {
      throw new Error("Phòng đầy (tối đa 8 người)");
    }
    const now = Date.now();
    const player: Player = {
      id: playerId,
      name: playerName,
      characterClass,
      joinedAt: now,
      isHost: false,
      totalScore: 0,
      locked: false,
      lastSeen: now,
    };
    room.players[playerId] = player;
    await saveRoom(room);
    return { room, player };
  });
}

export async function startGame(
  code: string,
  hostId: string
): Promise<GameRoom> {
  return withRoomLock(code, async () => {
    const room = await loadRoom(code);
    if (!room) throw new Error("Phòng không tồn tại");
    if (room.hostId !== hostId) throw new Error("Chỉ host mới bắt đầu được");
    if (Object.keys(room.players).length < MIN_PLAYERS) {
      throw new Error(`Cần ít nhất ${MIN_PLAYERS} người chơi`);
    }
    room.phase = "briefing";
    room.phaseStartedAt = Date.now();
    room.roundIndex = 0;
    room.currentScenarioId = room.scenarioIds[0];
    for (const p of Object.values(room.players)) {
      p.allocation = undefined;
      p.locked = false;
      p.totalScore = 0;
    }
    room.roundResults = [];
    await saveRoom(room);
    return room;
  });
}

export async function submitAllocation(
  code: string,
  playerId: string,
  allocation: Allocation
): Promise<GameRoom> {
  const err = validateAllocation(allocation);
  if (err) throw new Error(err);

  return withRoomLock(code, async () => {
    const room = await loadRoom(code);
    if (!room) throw new Error("Phòng không tồn tại");
    if (room.phase !== "allocating") {
      throw new Error("Không trong giai đoạn phân bổ");
    }
    const player = room.players[playerId];
    if (!player) throw new Error("Bạn chưa tham gia phòng");
    if (player.locked) throw new Error("Bạn đã khóa phân bổ");

    player.allocation = allocation;
    player.locked = true;
    player.lastSeen = Date.now();
    await saveRoom(room);
    return room;
  });
}

function allPlayersLocked(room: GameRoom): boolean {
  return Object.values(room.players).every((p) => p.locked);
}

function phaseExpired(room: GameRoom): boolean {
  const dur = PHASE_DURATIONS_MS[room.phase];
  if (!Number.isFinite(dur)) return false;
  return Date.now() - room.phaseStartedAt >= dur;
}

async function advancePhase(room: GameRoom): Promise<GameRoom> {
  const now = Date.now();

  switch (room.phase) {
    case "briefing":
      room.phase = "allocating";
      room.phaseStartedAt = now;
      for (const p of Object.values(room.players)) {
        p.locked = false;
        p.allocation = undefined;
      }
      break;

    case "allocating": {
      // Auto-submit default for players who didn't lock
      for (const p of Object.values(room.players)) {
        if (!p.locked) {
          p.allocation = { lend: 25, borrow: 25, land: 25, fictitious: 25 };
          p.locked = true;
        }
      }
      room.phase = "reveal";
      room.phaseStartedAt = now;
      break;
    }

    case "reveal": {
      const scenario = getScenario(room.currentScenarioId!);
      if (!scenario) throw new Error("Kịch bản không hợp lệ");

      const surpriseRoll = rollSurprise(room.roundIndex);
      room.activeSurprise = surpriseRoll.event;
      room.surpriseText = surpriseRoll.text;

      const result = resolveRound(
        room.roundIndex,
        scenario,
        room.players,
        surpriseRoll.event,
        surpriseRoll.text
      );
      room.roundResults.push(result);

      for (const [id, score] of Object.entries(result.scores)) {
        if (room.players[id]) room.players[id].totalScore = score;
      }

      room.phase = "resolution";
      room.phaseStartedAt = now;
      break;
    }

    case "resolution": {
      if (room.roundIndex + 1 >= room.totalRounds) {
        room.phase = "finished";
        await persistLeaderboard(room);
      } else {
        room.roundIndex += 1;
        room.currentScenarioId = room.scenarioIds[room.roundIndex];
        room.activeSurprise = undefined;
        room.surpriseText = undefined;
        room.phase = "briefing";
        room.phaseStartedAt = now;
        for (const p of Object.values(room.players)) {
          p.allocation = undefined;
          p.locked = false;
        }
      }
      break;
    }
  }

  await saveRoom(room);
  return room;
}

export async function tickRoom(code: string): Promise<GameRoom | null> {
  return withRoomLock(code, async () => {
    const room = await loadRoom(code);
    if (!room) return null;

    // heartbeat update
    const phases: GamePhase[] = [
      "briefing",
      "allocating",
      "reveal",
      "resolution",
    ];
    if (!phases.includes(room.phase)) return room;

    const shouldAdvance =
      (room.phase === "allocating" &&
        (allPlayersLocked(room) || phaseExpired(room))) ||
      (room.phase !== "allocating" && phaseExpired(room));

    if (shouldAdvance) {
      return advancePhase(room);
    }
    return room;
  });
}

export async function getRoomWithTick(code: string): Promise<GameRoom | null> {
  await tickRoom(code);
  return loadRoom(code);
}

async function persistLeaderboard(room: GameRoom): Promise<void> {
  const r = getRedis();
  const entries: LeaderboardEntry[] = Object.values(room.players)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((p, i) => ({
      playerName: p.name,
      score: Math.round(p.totalScore * 10) / 10,
      roomCode: room.code,
      finishedAt: Date.now(),
      rank: i + 1,
    }));

  for (const entry of entries) {
    const id = `${room.code}:${entry.playerName}:${entry.finishedAt}`;
    await r.zadd(KEYS.leaderboard, {
      score: entry.score,
      member: JSON.stringify({ ...entry, id }),
    });
  }

  // trim to top 500
  await r.zremrangebyrank(KEYS.leaderboard, 0, -501);
}

export async function getLeaderboard(
  limit = 50
): Promise<LeaderboardEntry[]> {
  const r = getRedis();
  const raw = await r.zrange(KEYS.leaderboard, 0, limit - 1, {
    rev: true,
  });
  if (!raw) return [];
  const entries: LeaderboardEntry[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const parsed =
      typeof item === "string"
        ? (JSON.parse(item) as LeaderboardEntry & { id?: string })
        : (item as LeaderboardEntry);
    const key = `${parsed.playerName}:${parsed.score}:${parsed.roomCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(parsed);
  }
  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

export function sanitizeRoomForClient(
  room: GameRoom,
  viewerId: string
): GameRoom {
  const copy = JSON.parse(JSON.stringify(room)) as GameRoom;
  const hideAllocations =
    room.phase === "allocating" || room.phase === "briefing";

  if (hideAllocations) {
    for (const [id, p] of Object.entries(copy.players)) {
      if (id !== viewerId) {
        delete p.allocation;
      }
      p.locked = room.phase === "allocating" ? p.locked : false;
    }
  }

  return copy;
}
