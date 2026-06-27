export type CharacterClass =
  | "lender" // Tư bản cho vay
  | "borrower" // Tư bản đi vay
  | "farmer" // KT nông nghiệp
  | "speculator"; // Tư bản giả

export type AllocationBucket =
  | "lend" // Tư bản cho vay
  | "borrow" // Tư bản đi vay / sản xuất
  | "land" // Tư bản kinh doanh nông nghiệp (địa tô)
  | "fictitious"; // Tư bản giả (chứng khoán)

export type Allocation = Record<AllocationBucket, number>;

export type GamePhase =
  | "lobby"
  | "briefing"
  | "allocating"
  | "reveal"
  | "resolution"
  | "finished";

export type SurpriseEvent =
  | "tt_illusion" // Ảo tưởng T→T'
  | "stock_crash" // Thị trường chứng khoán sụt
  | "stock_boom" // Chứng quyền bùng nổ
  | "rent_spike" // Địa tô chênh lệch I
  | "credit_squeeze" // Cung tư bản cho vay thắt
  | "credit_flood"; // Dư tiền nhàn rỗi

export interface MarketParams {
  avgProfitRate: number; // tỷ suất lợi nhuận bình quân (%)
  baseInterestRate: number; // z' cơ bản (%)
  loanSupplyDemand: number; // -1..1 cung cầu tư bản cho vay
  landFertility: "low" | "medium" | "high"; // độ màu mỡ
  landInvestment: boolean; // địa tô chênh lệch II
  bankDepositRate: number; // tỷ suất lợi tức nhận gửi ngân hàng
}

export interface Scenario {
  id: string;
  title: string;
  narrative: string;
  theoryRef: string;
  market: MarketParams;
  optimalHint: AllocationBucket;
}

export interface RoundResult {
  roundIndex: number;
  scenarioId: string;
  allocations: Record<string, Allocation>;
  scores: Record<string, number>;
  deltaScores: Record<string, number>;
  marketAfter: MarketParams;
  surprise?: SurpriseEvent;
  surpriseText?: string;
  breakdowns: Record<string, RoundBreakdown>;
}

export interface RoundBreakdown {
  lendGain: number;
  borrowGain: number;
  landGain: number;
  landRentPaid: number;
  fictitiousGain: number;
  penalty: number;
  bonus: number;
  narrative: string;
}

export interface Player {
  id: string;
  name: string;
  characterClass?: CharacterClass;
  joinedAt: number;
  isHost: boolean;
  totalScore: number;
  allocation?: Allocation;
  locked: boolean;
  lastSeen: number;
}

export interface GameRoom {
  code: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  phase: GamePhase;
  phaseStartedAt: number;
  roundIndex: number;
  totalRounds: number;
  players: Record<string, Player>;
  hostId: string;
  scenarioIds: string[];
  currentScenarioId?: string;
  roundResults: RoundResult[];
  activeSurprise?: SurpriseEvent;
  surpriseText?: string;
}

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  roomCode: string;
  finishedAt: number;
  rank?: number;
}

export const EMPTY_ALLOCATION: Allocation = {
  lend: 0,
  borrow: 0,
  land: 0,
  fictitious: 0,
};

export const BUCKET_LABELS: Record<
  AllocationBucket,
  { label: string; short: string; color: string }
> = {
  lend: {
    label: "Tư bản cho vay",
    short: "Cho vay",
    color: "#c9a227",
  },
  borrow: {
    label: "Tư bản đi vay",
    short: "Đi vay",
    color: "#4a90d9",
  },
  land: {
    label: "KT nông nghiệp",
    short: "Địa tô",
    color: "#1a6b4a",
  },
  fictitious: {
    label: "Tư bản giả",
    short: "T→T'",
    color: "#8b2635",
  },
};

export const PHASE_DURATIONS_MS: Record<GamePhase, number> = {
  lobby: Infinity,
  briefing: 16000,
  allocating: 55000,
  reveal: 12000,
  resolution: 16000,
  finished: Infinity,
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const TOTAL_ROUNDS = 5;
