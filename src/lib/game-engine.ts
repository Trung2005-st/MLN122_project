import type {
  Allocation,
  AllocationBucket,
  MarketParams,
  Player,
  RoundBreakdown,
  RoundResult,
  Scenario,
  SurpriseEvent,
} from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** z' = (z/TBCV) × 100% — điều chỉnh theo cung cầu tư bản cho vay */
export function effectiveInterestRate(
  market: MarketParams,
  lendShare: number
): number {
  const supplyPressure = market.loanSupplyDemand - lendShare * 0.4;
  return clamp(
    market.baseInterestRate - supplyPressure * 4 + lendShare * 2,
    2,
    25
  );
}

function fertilityMultiplier(f: MarketParams["landFertility"]): number {
  if (f === "high") return 1.35;
  if (f === "medium") return 1.0;
  return 0.75;
}

/** Tính địa tô R — phần thặng dư sau LPBQ */
function computeLandRent(
  market: MarketParams,
  landTokens: number,
  totalLandShare: number
): number {
  if (landTokens <= 0) return 0;
  const fertility = fertilityMultiplier(market.landFertility);
  const diff1 = market.landFertility === "high" ? 12 : 4;
  const diff2 = market.landInvestment ? 8 : 0;
  const superProfit =
    (market.avgProfitRate * 0.4 + diff1 + diff2) * fertility;
  const competition = 1 + totalLandShare * 0.5;
  return (superProfit * landTokens * competition) / 100;
}

function computeFictitiousReturn(
  tokens: number,
  event?: SurpriseEvent
): { gain: number; penalty: number; narrative: string } {
  if (tokens <= 0) return { gain: 0, penalty: 0, narrative: "" };

  let multiplier = 0.5 + Math.random() * 1.2;
  let narrative = "Tư bản giả giao dịch trên thị trường chứng khoán.";

  if (event === "stock_crash") {
    multiplier = -0.8 - Math.random() * 0.5;
    narrative =
      "Thị trường chứng khoán sụt mạnh — tư bản giả mất giá trị đột ngột!";
  } else if (event === "stock_boom") {
    multiplier = 1.5 + Math.random() * 1.0;
    narrative = "Chứng quyền bùng nổ — người nắm tư bản giả thu lợi bất ngờ!";
  } else if (event === "tt_illusion") {
    multiplier = Math.random() > 0.5 ? 0.9 : -0.6;
    narrative =
      "Ảo tưởng T→T': tiền đẻ tiền — một nửa thắng lớn, một nửa mất trắng!";
  }

  const gain = tokens * multiplier;
  const penalty = gain < 0 ? Math.abs(gain) * 0.3 : 0;
  return { gain, penalty, narrative };
}

export function rollSurprise(roundIndex: number): {
  event?: SurpriseEvent;
  text?: string;
} {
  if (roundIndex === 2) {
    return {
      event: "tt_illusion",
      text: "⚡ Sự kiện bất ngờ: Ảo tưởng T→T' lan truyền — tư bản giả biến động cực mạnh!",
    };
  }
  if (roundIndex === 4) {
    const events: SurpriseEvent[] = ["stock_crash", "stock_boom", "rent_spike"];
    const event = events[Math.floor(Math.random() * events.length)];
    const texts: Record<SurpriseEvent, string> = {
      stock_crash: "⚡ Khủng hoảng chứng khoán — tư bản giả lao dốc!",
      stock_boom: "⚡ Sóng chứng quyền — ai ôm tư bản giả được thưởng lớn!",
      rent_spike: "⚡ Ruộng màu mỡ được phát hiện — địa tô chênh lệch I tăng vọt!",
      tt_illusion: "",
      credit_squeeze: "",
      credit_flood: "",
    };
    return { event, text: texts[event] };
  }
  if (Math.random() < 0.25) {
    const event: SurpriseEvent =
      Math.random() > 0.5 ? "credit_squeeze" : "credit_flood";
    return {
      event,
      text:
        event === "credit_squeeze"
          ? "⚡ Cung tư bản cho vay thắt — lợi tức tăng đột biến!"
          : "⚡ Dư tiền nhàn rỗi tràn ngập — lãi cho vay sụt!",
    };
  }
  return {};
}

export function scorePlayerRound(
  allocation: Allocation,
  market: MarketParams,
  totalAllocations: Allocation[],
  surprise?: SurpriseEvent
): RoundBreakdown {
  const totalTokens = 100;
  const lendShare =
    totalAllocations.reduce((s, a) => s + a.lend, 0) /
    (totalTokens * totalAllocations.length || 1);
  const landShare =
    totalAllocations.reduce((s, a) => s + a.land, 0) /
    (totalTokens * totalAllocations.length || 1);

  let zPrime = effectiveInterestRate(market, lendShare);
  if (surprise === "credit_squeeze") zPrime += 5;
  if (surprise === "credit_flood") zPrime -= 4;

  const avgProfit = market.avgProfitRate;

  // Cho vay: thu lợi tức z' trên phần vốn cho vay
  const lendGain = (allocation.lend * zPrime) / 100;

  // Đi vay: LPBQ trừ lợi tức phải trả (từ giá trị thặng dư)
  const interestPaid = (allocation.borrow * zPrime * 0.85) / 100;
  const borrowGain =
    (allocation.borrow * avgProfit) / 100 - interestPaid;

  // Nông nghiệp: LPBQ + siêu ngạch trừ địa tô R
  let landRentPaid = computeLandRent(market, allocation.land, landShare);
  if (surprise === "rent_spike") landRentPaid *= 1.6;

  const landProfit =
    (allocation.land * avgProfit) / 100 +
    (allocation.land *
      (market.landFertility === "high" ? 8 : 3) *
      (market.landInvestment ? 1.2 : 1)) /
      100;
  const landGain = landProfit - landRentPaid;

  // Tư bản giả
  const fict = computeFictitiousReturn(allocation.fictitious, surprise);

  // Thưởng phạt theo lý thuyết: phân bổ cân bằng vs all-in một kênh
  const buckets = Object.values(allocation) as number[];
  const maxBucket = Math.max(...buckets);
  let penalty = 0;
  let bonus = 0;
  if (maxBucket >= 70) {
    penalty = maxBucket * 0.08;
  }
  if (maxBucket <= 40 && buckets.every((b) => b >= 10)) {
    bonus = 5;
  }

  const total =
    lendGain +
    borrowGain +
    landGain +
    fict.gain -
    fict.penalty -
    penalty +
    bonus;

  const narrative = [
    allocation.lend > 0
      ? `Cho vay: +${lendGain.toFixed(1)} (z'=${zPrime.toFixed(1)}%)`
      : "",
    allocation.borrow > 0
      ? `Đi vay: ${borrowGain >= 0 ? "+" : ""}${borrowGain.toFixed(1)} (trừ lợi tức)`
      : "",
    allocation.land > 0
      ? `Nông nghiệp: ${landGain >= 0 ? "+" : ""}${landGain.toFixed(1)} (trừ địa tô R=${landRentPaid.toFixed(1)})`
      : "",
    allocation.fictitious > 0 ? fict.narrative : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    lendGain,
    borrowGain,
    landGain,
    landRentPaid,
    fictitiousGain: fict.gain,
    penalty: penalty + fict.penalty,
    bonus,
    narrative: narrative || "Không phân bổ vốn.",
  };
}

export function resolveRound(
  roundIndex: number,
  scenario: Scenario,
  players: Record<string, Player>,
  surprise?: SurpriseEvent,
  surpriseText?: string
): RoundResult {
  const allocations: Record<string, Allocation> = {};
  for (const [id, p] of Object.entries(players)) {
    allocations[id] = p.allocation ?? {
      lend: 25,
      borrow: 25,
      land: 25,
      fictitious: 25,
    };
  }

  const allAllocs = Object.values(allocations);
  const scores: Record<string, number> = {};
  const deltaScores: Record<string, number> = {};
  const breakdowns: Record<string, RoundBreakdown> = {};

  for (const [id, alloc] of Object.entries(allocations)) {
    const bd = scorePlayerRound(alloc, scenario.market, allAllocs, surprise);
    breakdowns[id] = bd;
    const delta =
      bd.lendGain +
      bd.borrowGain +
      bd.landGain +
      bd.fictitiousGain -
      bd.penalty +
      bd.bonus;
    deltaScores[id] = Math.round(delta * 10) / 10;
    scores[id] = (players[id]?.totalScore ?? 0) + deltaScores[id];
  }

  return {
    roundIndex,
    scenarioId: scenario.id,
    allocations,
    scores,
    deltaScores,
    marketAfter: scenario.market,
    surprise,
    surpriseText,
    breakdowns,
  };
}

export function validateAllocation(alloc: Allocation): string | null {
  const buckets: AllocationBucket[] = [
    "lend",
    "borrow",
    "land",
    "fictitious",
  ];
  let sum = 0;
  for (const b of buckets) {
    const v = alloc[b];
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      return "Mỗi kênh phải từ 0–100";
    }
    sum += v;
  }
  if (sum !== 100) {
    return `Tổng phân bổ phải = 100 (hiện tại: ${sum})`;
  }
  return null;
}

export function rankPlayers(
  players: Record<string, Player>
): { id: string; name: string; score: number; rank: number }[] {
  return Object.entries(players)
    .map(([id, p]) => ({ id, name: p.name, score: p.totalScore }))
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}
