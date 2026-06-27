export type CharacterClass =
  | "lender"
  | "borrower"
  | "farmer"
  | "speculator";

export type GamePhase = "lobby" | "playing" | "ending_soon" | "finished";

export type PlayerStatus =
  | "normal"
  | "locked"
  | "in_combat"
  | "challenged";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  name: string;
  characterClass?: CharacterClass;
  joinedAt: number;
  isHost: boolean;
  totalScore: number;
  pos: Vec2;
  status: PlayerStatus;
  lockedUntil?: number;
  immunityCards: number;
  swapCards: number;
  challengedBy?: string;
  activeCombatId?: string;
  lastSeen: number;
}

export interface Monster {
  id: string;
  name: string;
  x: number;
  y: number;
  reward: number;
  alive: boolean;
  difficulty: QuestionDifficulty;
}

export type GiftEffect =
  | { type: "add"; amount: number }
  | { type: "sub"; amount: number }
  | { type: "multiply"; factor: number }
  | { type: "immunity" }
  | { type: "swap" };

export interface GiftBox {
  id: string;
  x: number;
  y: number;
  effect: GiftEffect;
  collected: boolean;
  spawnAt: number;
  landedAt?: number;
}

export interface ActiveCombat {
  id: string;
  kind: "pve" | "pvp";
  monsterId?: string;
  playerIds: string[];
  questionId: string;
  reward: number;
  startedAt: number;
  deadlineAt: number;
  answers: Record<
    string,
    { choiceIndex: number; at: number; correct: boolean }
  >;
  fled: string[];
  resolved: boolean;
  resultMessage?: string;
}

export interface GameEvent {
  at: number;
  text: string;
}

export interface GameRoom {
  code: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  phase: GamePhase;
  phaseStartedAt: number;
  gameStartedAt?: number;
  gameEndsAt?: number;
  players: Record<string, Player>;
  hostId: string;
  monsters: Monster[];
  gifts: GiftBox[];
  combats: Record<string, ActiveCombat>;
  events: GameEvent[];
  giftsSpawned: boolean;
}

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  roomCode: string;
  finishedAt: number;
  rank?: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: QuestionDifficulty;
  timeLimitSec: number;
}

/** Client-safe combat question (no correctIndex) */
export interface CombatQuestionView {
  id: string;
  text: string;
  options: string[];
  difficulty: QuestionDifficulty;
  timeLimitSec: number;
  deadlineAt: number;
}

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const GAME_PREP_MS = 12 * 1000;
export const GAME_DURATION_MS = 5 * 60 * 1000;
export const ENDING_SOON_MS = 30 * 1000;
export const GIFT_SPAWN_DELAY_MS = 30 * 1000;
export const LOCK_DURATION_MS = 5 * 1000;
export const MAP_W = 960;
export const MAP_H = 640;
export const PLAYER_SPEED = 180;
