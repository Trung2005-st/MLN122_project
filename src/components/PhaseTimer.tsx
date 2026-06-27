"use client";

import { useEffect, useState } from "react";
import type { GamePhase } from "@/lib/types";
import { PHASE_DURATIONS_MS } from "@/lib/types";

interface Props {
  phase: GamePhase;
  phaseStartedAt: number;
  serverTime: number;
}

const PHASE_LABELS: Partial<Record<GamePhase, string>> = {
  briefing: "Đọc kịch bản",
  allocating: "Phân bổ vốn",
  reveal: "Hé lộ chiến thuật",
  resolution: "Tính thặng dư",
};

export function PhaseTimer({ phase, phaseStartedAt, serverTime }: Props) {
  const [now, setNow] = useState(serverTime);
  const duration = PHASE_DURATIONS_MS[phase];
  const label = PHASE_LABELS[phase];

  useEffect(() => {
    setNow(serverTime);
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [serverTime, phase]);

  if (!label || !Number.isFinite(duration)) return null;

  const elapsed = now - phaseStartedAt;
  const remaining = Math.max(0, duration - elapsed);
  const pct = Math.min(100, (elapsed / duration) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-arena-muted">
        <span>{label}</span>
        <span className="font-mono">{(remaining / 1000).toFixed(0)}s</span>
      </div>
      <div className="h-1.5 bg-arena-bg rounded-full overflow-hidden">
        <div
          className="h-full bg-arena-gold transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
