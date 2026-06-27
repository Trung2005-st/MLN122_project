import { customAlphabet } from "nanoid";
import { getQuestion, pickQuestion } from "./questions";
import type {
  ActiveCombat,
  GameEvent,
  GameRoom,
  GiftBox,
  GiftEffect,
  Monster,
  Player,
  QuestionDifficulty,
  Vec2,
} from "./types";
import {
  ENDING_SOON_MS,
  GAME_DURATION_MS,
  GIFT_SPAWN_DELAY_MS,
  LOCK_DURATION_MS,
  MAP_H,
  MAP_W,
} from "./types";

const genId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);

const MONSTER_TEMPLATES: {
  name: string;
  reward: number;
  difficulty: QuestionDifficulty;
}[] = [
  { name: "Quái Lợi Tức", reward: 40, difficulty: "easy" },
  { name: "Quái TBCV", reward: 50, difficulty: "medium" },
  { name: "Quái T→T'", reward: 55, difficulty: "medium" },
  { name: "Quái Tư Bản Giả", reward: 45, difficulty: "easy" },
  { name: "Quái Địa Tô", reward: 60, difficulty: "hard" },
  { name: "Quái Chênh Lệch I", reward: 35, difficulty: "easy" },
  { name: "Quái Chênh Lệch II", reward: 45, difficulty: "medium" },
  { name: "Quái LPBQ", reward: 30, difficulty: "easy" },
];

export function randomPos(margin = 80): Vec2 {
  return {
    x: margin + Math.random() * (MAP_W - margin * 2),
    y: margin + Math.random() * (MAP_H - margin * 2),
  };
}

export function spawnMonsters(count = 8): Monster[] {
  return MONSTER_TEMPLATES.slice(0, count).map((t, i) => {
    const p = randomPos(100);
    return {
      id: `m${i}-${genId()}`,
      name: t.name,
      x: p.x,
      y: p.y,
      reward: t.reward,
      alive: true,
      difficulty: t.difficulty,
    };
  });
}

export function randomGiftEffect(): GiftEffect {
  const roll = Math.random();
  if (roll < 0.2) return { type: "add", amount: 10 + Math.floor(Math.random() * 21) };
  if (roll < 0.35) return { type: "sub", amount: 5 + Math.floor(Math.random() * 16) };
  if (roll < 0.55) {
    const factors = [0.5, 1, 1.5, 2];
    return { type: "multiply", factor: factors[Math.floor(Math.random() * factors.length)] };
  }
  if (roll < 0.75) return { type: "immunity" };
  return { type: "swap" };
}

export function spawnGifts(count: number): GiftBox[] {
  const now = Date.now();
  return Array.from({ length: count }, () => {
    const p = randomPos(120);
    return {
      id: genId(),
      x: p.x,
      y: p.y,
      effect: randomGiftEffect(),
      collected: false,
      spawnAt: now,
    };
  });
}

export function giftLabel(effect: GiftEffect): string {
  switch (effect.type) {
    case "add":
      return `+${effect.amount} điểm`;
    case "sub":
      return `-${effect.amount} điểm`;
    case "multiply":
      return `×${effect.factor} điểm`;
    case "immunity":
      return "Thẻ miễn trừ";
    case "swap":
      return "Thẻ tráo điểm";
  }
}

export function addEvent(room: GameRoom, text: string) {
  room.events.unshift({ at: Date.now(), text });
  room.events = room.events.slice(0, 30);
}

export function isPlayerLocked(p: Player): boolean {
  if (p.status === "locked" && p.lockedUntil && p.lockedUntil > Date.now()) {
    return true;
  }
  if (p.status === "locked" && p.lockedUntil && p.lockedUntil <= Date.now()) {
    p.status = "normal";
    p.lockedUntil = undefined;
  }
  return false;
}

export function lockPlayer(p: Player) {
  p.status = "locked";
  p.lockedUntil = Date.now() + LOCK_DURATION_MS;
}

export function applyPenalty(
  p: Player,
  reward: number,
  room: GameRoom,
  reason: string
): number {
  if (p.immunityCards > 0) {
    p.immunityCards -= 1;
    addEvent(room, `${p.name} dùng thẻ miễn trừ — không bị phạt (${reason})`);
    return 0;
  }
  if (p.totalScore <= 0) {
    lockPlayer(p);
    addEvent(room, `${p.name} bị khóa di chuyển 5s (${reason})`);
    return 0;
  }
  const penalty = Math.ceil(reward / 2);
  p.totalScore = Math.max(0, p.totalScore - penalty);
  addEvent(room, `${p.name} -${penalty} điểm (${reason})`);
  return penalty;
}

export function startPveCombat(
  room: GameRoom,
  playerId: string,
  monsterId: string
): ActiveCombat {
  const monster = room.monsters.find((m) => m.id === monsterId && m.alive);
  if (!monster) throw new Error("Quái không tồn tại");

  const q = pickQuestion(monster.difficulty);
  const now = Date.now();
  const combat: ActiveCombat = {
    id: genId(),
    kind: "pve",
    monsterId,
    playerIds: [playerId],
    questionId: q.id,
    reward: monster.reward,
    startedAt: now,
    deadlineAt: now + q.timeLimitSec * 1000,
    answers: {},
    fled: [],
    resolved: false,
  };
  room.combats[combat.id] = combat;

  const p = room.players[playerId];
  p.status = "in_combat";
  p.activeCombatId = combat.id;
  addEvent(room, `${p.name} ⚔️ ${monster.name} (+${monster.reward})`);
  return combat;
}

export function startPvpCombat(
  room: GameRoom,
  p1: string,
  p2: string
): ActiveCombat {
  const q = pickQuestion("medium");
  const now = Date.now();
  const reward = 35;
  const combat: ActiveCombat = {
    id: genId(),
    kind: "pvp",
    playerIds: [p1, p2],
    questionId: q.id,
    reward,
    startedAt: now,
    deadlineAt: now + q.timeLimitSec * 1000,
    answers: {},
    fled: [],
    resolved: false,
  };
  room.combats[combat.id] = combat;

  for (const id of [p1, p2]) {
    const pl = room.players[id];
    pl.status = "in_combat";
    pl.activeCombatId = combat.id;
    pl.challengedBy = undefined;
  }
  addEvent(
    room,
    `${room.players[p1].name} ⚔️ ${room.players[p2].name} (PvP +${reward})`
  );
  return combat;
}

export function resolveCombat(room: GameRoom, combatId: string) {
  const combat = room.combats[combatId];
  if (!combat || combat.resolved) return;

  combat.resolved = true;
  const q = getQuestion(combat.questionId)!;

  if (combat.kind === "pve") {
    const pid = combat.playerIds[0];
    const p = room.players[pid];
    const monster = room.monsters.find((m) => m.id === combat.monsterId);

    if (combat.fled.includes(pid)) {
      applyPenalty(p, combat.reward, room, "bỏ cuộc đánh quái");
    } else {
      const ans = combat.answers[pid];
      if (ans?.correct) {
        p.totalScore += combat.reward;
        if (monster) monster.alive = false;
        combat.resultMessage = `+${combat.reward} điểm!`;
        addEvent(room, `${p.name} đánh bại ${monster?.name}! +${combat.reward}`);
      } else {
        applyPenalty(p, combat.reward, room, "trả lời sai");
        combat.resultMessage = "Sai — bị phạt!";
      }
    }
    p.status = "normal";
    p.activeCombatId = undefined;
  } else {
    // PvP
    const [a, b] = combat.playerIds;
    const pa = room.players[a];
    const pb = room.players[b];
    const fledA = combat.fled.includes(a);
    const fledB = combat.fled.includes(b);

    if (fledA && !fledB) {
      applyPenalty(pa, combat.reward, room, "đầu hàng PvP");
      pb.totalScore += combat.reward;
      combat.resultMessage = `${pb.name} thắng!`;
    } else if (fledB && !fledA) {
      applyPenalty(pb, combat.reward, room, "đầu hàng PvP");
      pa.totalScore += combat.reward;
      combat.resultMessage = `${pa.name} thắng!`;
    } else {
      const ansA = combat.answers[a];
      const ansB = combat.answers[b];
      const okA = ansA?.correct;
      const okB = ansB?.correct;

      if (okA && okB) {
        if (ansA.at < ansB.at) {
          pa.totalScore += combat.reward;
          applyPenalty(pb, combat.reward, room, "PvP chậm hơn");
          combat.resultMessage = `${pa.name} nhanh hơn! +${combat.reward}`;
        } else if (ansB.at < ansA.at) {
          pb.totalScore += combat.reward;
          applyPenalty(pa, combat.reward, room, "PvP chậm hơn");
          combat.resultMessage = `${pb.name} nhanh hơn! +${combat.reward}`;
        } else {
          addEvent(room, "PvP hòa — không ai cộng điểm");
          combat.resultMessage = "Hòa!";
        }
      } else if (okA) {
        pa.totalScore += combat.reward;
        applyPenalty(pb, combat.reward, room, "PvP trả lời sai");
        combat.resultMessage = `${pa.name} thắng!`;
      } else if (okB) {
        pb.totalScore += combat.reward;
        applyPenalty(pa, combat.reward, room, "PvP trả lời sai");
        combat.resultMessage = `${pb.name} thắng!`;
      } else {
        applyPenalty(pa, combat.reward, room, "PvP cả hai sai");
        applyPenalty(pb, combat.reward, room, "PvP cả hai sai");
        combat.resultMessage = "Cả hai sai!";
      }
    }
    pa.status = "normal";
    pb.status = "normal";
    pa.activeCombatId = undefined;
    pb.activeCombatId = undefined;
    pa.challengedBy = undefined;
    pb.challengedBy = undefined;
  }
}

export function applyGift(room: GameRoom, playerId: string, gift: GiftBox) {
  const p = room.players[playerId];
  const eff = gift.effect;

  switch (eff.type) {
    case "add":
      p.totalScore += eff.amount;
      addEvent(room, `${p.name} nhặt quà +${eff.amount}`);
      break;
    case "sub":
      p.totalScore = Math.max(0, p.totalScore - eff.amount);
      addEvent(room, `${p.name} nhặt quà -${eff.amount}`);
      break;
    case "multiply":
      p.totalScore = Math.round(p.totalScore * eff.factor * 10) / 10;
      addEvent(room, `${p.name} nhặt quà ×${eff.factor}`);
      break;
    case "immunity":
      p.immunityCards += 1;
      addEvent(room, `${p.name} nhận thẻ miễn trừ`);
      break;
    case "swap":
      p.swapCards += 1;
      addEvent(room, `${p.name} nhận thẻ tráo điểm`);
      break;
  }
  gift.collected = true;
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function tickWorldState(room: GameRoom): GameRoom {
  const now = Date.now();

  if (room.phase === "playing" || room.phase === "ending_soon") {
    if (room.gameEndsAt && now >= room.gameEndsAt) {
      room.phase = "finished";
      room.phaseStartedAt = now;
      return room;
    }
    if (
      room.gameEndsAt &&
      room.phase === "playing" &&
      room.gameEndsAt - now <= ENDING_SOON_MS
    ) {
      room.phase = "ending_soon";
      addEvent(room, "⚠️ Còn 30 giây trước khi kết thúc!");
    }

    if (
      !room.giftsSpawned &&
      room.gameStartedAt &&
      now - room.gameStartedAt >= GIFT_SPAWN_DELAY_MS
    ) {
      const count = 1 + Math.floor(Math.random() * 3);
      room.gifts.push(...spawnGifts(count));
      room.giftsSpawned = true;
      addEvent(room, `🎁 ${count} hộp quà rơi xuống bản đồ!`);
    }

    // Land gifts
    for (const g of room.gifts) {
      if (!g.landedAt && now - g.spawnAt >= 2000) g.landedAt = now;
    }

    // Resolve expired combats
    for (const c of Object.values(room.combats)) {
      if (!c.resolved && now >= c.deadlineAt) {
        for (const pid of c.playerIds) {
          if (!c.answers[pid] && !c.fled.includes(pid)) {
            c.fled.push(pid);
          }
        }
        resolveCombat(room, c.id);
      }
    }

    // Unlock expired locks
    for (const p of Object.values(room.players)) {
      isPlayerLocked(p);
    }
  }

  return room;
}

export function initGameWorld(room: GameRoom): GameRoom {
  const now = Date.now();
  room.phase = "playing";
  room.phaseStartedAt = now;
  room.gameStartedAt = now;
  room.gameEndsAt = now + GAME_DURATION_MS;
  room.monsters = spawnMonsters(8);
  room.gifts = [];
  room.combats = {};
  room.events = [];
  room.giftsSpawned = false;

  for (const p of Object.values(room.players)) {
    p.totalScore = 0;
    p.pos = randomPos(120);
    p.status = "normal";
    p.immunityCards = 0;
    p.swapCards = 0;
    p.lockedUntil = undefined;
    p.challengedBy = undefined;
    p.activeCombatId = undefined;
  }

  addEvent(room, "🗺️ Thế giới mở — đánh quái $, PvP, nhặt quà!");
  return room;
}
