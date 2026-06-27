import { customAlphabet } from "nanoid";
import {
  addEvent,
  applyGift,
  dist,
  initGameWorld,
  isPlayerLocked,
  randomPos,
  resolveCombat,
  startPveCombat,
  startPvpCombat,
  tickWorldState,
} from "./world-engine";
import { getQuestion, toCombatView } from "./questions";
import { getRedis, KEYS, withRoomLock } from "./redis";
import type {
  CombatQuestionView,
  GameRoom,
  LeaderboardEntry,
  Player,
  Vec2,
} from "./types";
import { MAP_H, MAP_W, MAX_PLAYERS, MIN_PLAYERS, PLAYER_SPEED } from "./types";

const genCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

function makePlayer(
  id: string,
  name: string,
  isHost: boolean,
  characterClass?: Player["characterClass"]
): Player {
  const now = Date.now();
  const pos = randomPos(120);
  return {
    id,
    name,
    characterClass,
    joinedAt: now,
    isHost,
    totalScore: 0,
    pos,
    status: "normal",
    immunityCards: 0,
    swapCards: 0,
    lastSeen: now,
  };
}

export function createEmptyRoom(
  hostId: string,
  hostName: string,
  characterClass?: Player["characterClass"]
): GameRoom {
  const now = Date.now();
  return {
    code: genCode(),
    version: 1,
    createdAt: now,
    updatedAt: now,
    phase: "lobby",
    phaseStartedAt: now,
    players: { [hostId]: makePlayer(hostId, hostName, true, characterClass) },
    hostId,
    monsters: [],
    gifts: [],
    combats: {},
    events: [],
    giftsSpawned: false,
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
  characterClass?: Player["characterClass"]
): Promise<GameRoom> {
  let room = createEmptyRoom(hostId, hostName, characterClass);
  for (let i = 0; i < 10; i++) {
    if (!(await loadRoom(room.code))) break;
    room = createEmptyRoom(hostId, hostName, characterClass);
  }
  await saveRoom(room);
  return room;
}

export async function joinRoom(
  code: string,
  playerId: string,
  playerName: string,
  characterClass?: Player["characterClass"]
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
    const player = makePlayer(playerId, playerName, false, characterClass);
    room.players[playerId] = player;
    await saveRoom(room);
    return { room, player };
  });
}

export async function startGame(code: string, hostId: string): Promise<GameRoom> {
  return withRoomLock(code, async () => {
    const room = await loadRoom(code);
    if (!room) throw new Error("Phòng không tồn tại");
    if (room.hostId !== hostId) throw new Error("Chỉ host mới bắt đầu được");
    if (Object.keys(room.players).length < MIN_PLAYERS) {
      throw new Error(`Cần ít nhất ${MIN_PLAYERS} người chơi`);
    }
    initGameWorld(room);
    await saveRoom(room);
    return room;
  });
}

export type ActionPayload =
  | { type: "move"; x: number; y: number }
  | { type: "attack_monster"; monsterId: string; x: number; y: number }
  | { type: "challenge_player"; targetId: string }
  | { type: "accept_challenge" }
  | { type: "reject_challenge" }
  | { type: "answer"; combatId: string; choiceIndex: number }
  | { type: "flee"; combatId: string }
  | { type: "collect_gift"; giftId: string; x: number; y: number }
  | { type: "use_swap_card" };

function syncPlayerPos(p: Player, x: number, y: number): void {
  const nx = Math.max(40, Math.min(MAP_W - 40, x));
  const ny = Math.max(40, Math.min(MAP_H - 40, y));
  const d = dist(p.pos, { x: nx, y: ny });
  if (d > 200) throw new Error("Vị trí không hợp lệ");
  p.pos = { x: nx, y: ny };
}

export async function handleAction(
  code: string,
  playerId: string,
  action: ActionPayload
): Promise<GameRoom> {
  return withRoomLock(code, async () => {
    let room = await loadRoom(code);
    if (!room) throw new Error("Phòng không tồn tại");
    room = tickWorldState(room);

    const p = room.players[playerId];
    if (!p) throw new Error("Bạn chưa trong phòng");

    if (room.phase !== "playing" && room.phase !== "ending_soon") {
      throw new Error("Game chưa bắt đầu hoặc đã kết thúc");
    }

    p.lastSeen = Date.now();

    switch (action.type) {
      case "move": {
        if (isPlayerLocked(p) || p.status === "in_combat") break;
        const x = Math.max(40, Math.min(MAP_W - 40, action.x));
        const y = Math.max(40, Math.min(MAP_H - 40, action.y));
        const d = dist(p.pos, { x, y });
        if (d > PLAYER_SPEED * 0.5) break; // anti-cheat speed cap per tick
        p.pos = { x, y };

        // PvP touch detection
        for (const other of Object.values(room.players)) {
          if (other.id === playerId || other.status === "in_combat") continue;
          if (isPlayerLocked(other)) continue;
          if (dist(p.pos, other.pos) < 48 && !other.challengedBy) {
            other.challengedBy = playerId;
            other.status = "challenged";
            addEvent(
              room,
              `${p.name} gửi lời chiến tới ${other.name}!`
            );
          }
        }
        break;
      }

      case "attack_monster": {
        if (p.status === "in_combat" || isPlayerLocked(p)) {
          throw new Error("Không thể đánh lúc này");
        }
        syncPlayerPos(p, action.x, action.y);
        const monster = room.monsters.find(
          (m) => m.id === action.monsterId && m.alive
        );
        if (!monster) throw new Error("Quái không còn");
        if (dist(p.pos, { x: monster.x, y: monster.y }) > 100) {
          throw new Error("Quái quá xa — đi lại gần hơn");
        }
        startPveCombat(room, playerId, monster.id);
        break;
      }

      case "challenge_player": {
        const target = room.players[action.targetId];
        if (!target) throw new Error("Người chơi không tồn tại");
        if (target.challengedBy !== playerId) {
          throw new Error("Chưa gửi lời chiến (chạm vào người chơi trước)");
        }
        startPvpCombat(room, playerId, target.id);
        break;
      }

      case "accept_challenge": {
        if (!p.challengedBy) throw new Error("Không có lời mời");
        const challenger = room.players[p.challengedBy];
        if (!challenger) throw new Error("Người mời không còn");
        startPvpCombat(room, challenger.id, playerId);
        break;
      }

      case "reject_challenge": {
        if (p.challengedBy) {
          const from = room.players[p.challengedBy];
          addEvent(room, `${p.name} từ chối lời chiến từ ${from?.name}`);
          p.challengedBy = undefined;
          p.status = "normal";
        }
        break;
      }

      case "answer": {
        const combat = room.combats[action.combatId];
        if (!combat || combat.resolved) throw new Error("Trận đã kết thúc");
        if (!combat.playerIds.includes(playerId)) throw new Error("Không trong trận");
        if (combat.answers[playerId]) throw new Error("Đã trả lời");

        const q = getQuestion(combat.questionId)!;
        const correct = action.choiceIndex === q.correctIndex;
        combat.answers[playerId] = {
          choiceIndex: action.choiceIndex,
          at: Date.now(),
          correct,
        };

        if (combat.kind === "pve") {
          resolveCombat(room, combat.id);
        } else if (combat.playerIds.every((id) => combat.answers[id])) {
          resolveCombat(room, combat.id);
        }
        break;
      }

      case "flee": {
        const combat = room.combats[action.combatId];
        if (!combat || combat.resolved) throw new Error("Trận đã kết thúc");
        if (!combat.fled.includes(playerId)) combat.fled.push(playerId);
        resolveCombat(room, combat.id);
        break;
      }

      case "collect_gift": {
        if (isPlayerLocked(p) || p.status === "in_combat") {
          throw new Error("Không thể nhặt quà lúc này");
        }
        syncPlayerPos(p, action.x, action.y);
        const gift = room.gifts.find(
          (g) => g.id === action.giftId && !g.collected && g.landedAt
        );
        if (!gift) throw new Error("Quà không tồn tại hoặc chưa rơi xong");
        if (dist(p.pos, { x: gift.x, y: gift.y }) > 80) {
          throw new Error("Quà quá xa — đi lại gần hơn");
        }
        applyGift(room, playerId, gift);
        break;
      }

      case "use_swap_card": {
        if (p.swapCards <= 0) throw new Error("Không có thẻ tráo");
        const others = Object.values(room.players).filter((o) => o.id !== playerId);
        if (!others.length) throw new Error("Không có ai để tráo");
        const target = others[Math.floor(Math.random() * others.length)];
        const tmp = p.totalScore;
        p.totalScore = target.totalScore;
        target.totalScore = tmp;
        p.swapCards -= 1;
        addEvent(room, `${p.name} tráo điểm với ${target.name}!`);
        break;
      }
    }

    room = tickWorldState(room);

    if (room.phase === "finished") {
      await saveRoom(room);
      return room;
    }

    await saveRoom(room);
    return room;
  });
}

export async function getRoomWithTick(code: string): Promise<GameRoom | null> {
  return withRoomLock(code, async () => {
    let room = await loadRoom(code);
    if (!room) return null;
    const prevPhase = room.phase;
    room = tickWorldState(room);
    if (prevPhase !== "finished" && room.phase === "finished") {
      await persistLeaderboard(room);
    }
    await saveRoom(room);
    return room;
  });
}

async function persistLeaderboard(room: GameRoom): Promise<void> {
  const r = getRedis();
  for (const p of Object.values(room.players).sort(
    (a, b) => b.totalScore - a.totalScore
  )) {
    const entry: LeaderboardEntry = {
      playerName: p.name,
      score: Math.round(p.totalScore * 10) / 10,
      roomCode: room.code,
      finishedAt: Date.now(),
    };
    await r.zadd(KEYS.leaderboard, {
      score: entry.score,
      member: JSON.stringify({ ...entry, id: `${room.code}:${p.name}:${Date.now()}` }),
    });
  }
  await r.zremrangebyrank(KEYS.leaderboard, 0, -501);
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const r = getRedis();
  const raw = await r.zrange(KEYS.leaderboard, 0, limit - 1, { rev: true });
  if (!raw) return [];
  return raw.map((item, i) => {
    const parsed =
      typeof item === "string" ? JSON.parse(item) : (item as LeaderboardEntry);
    return { ...parsed, rank: i + 1 };
  });
}

export function getClientCombatQuestion(
  room: GameRoom,
  playerId: string
): CombatQuestionView | null {
  const p = room.players[playerId];
  if (!p?.activeCombatId) return null;
  const combat = room.combats[p.activeCombatId];
  if (!combat || combat.resolved) return null;
  const q = getQuestion(combat.questionId);
  if (!q) return null;
  return toCombatView(q, combat.deadlineAt);
}

export function sanitizeRoomForClient(room: GameRoom): GameRoom {
  const copy = JSON.parse(JSON.stringify(room)) as GameRoom;
  // Strip combat internals - client gets question via separate field
  for (const c of Object.values(copy.combats)) {
    for (const ans of Object.values(c.answers)) {
      delete (ans as { correct?: boolean }).correct;
    }
  }
  return copy;
}
