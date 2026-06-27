"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { GamePhase } from "@/lib/types";
import { PHASE_DURATIONS_MS } from "@/lib/types";

interface Props {
  phase: GamePhase;
  phaseStartedAt: number;
  serverTime: number;
  roundIndex: number;
  totalRounds: number;
}

const PHASE_LABELS: Partial<Record<GamePhase, string>> = {
  briefing: "Nhiệm vụ",
  allocating: "Di chuyển & Phân bổ vốn",
  reveal: "Hé lộ chiến thuật",
  resolution: "Tính thặng dư",
};

export function PhaseTimer({
  phase,
  phaseStartedAt,
  serverTime,
  roundIndex,
  totalRounds,
}: Props) {
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
  const urgent = remaining < 10000;

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/[0.08] bg-black/50 backdrop-blur-md">
      <div className="flex-1 space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-400">
            Vòng {roundIndex + 1}/{totalRounds} · {label}
          </span>
          <motion.span
            className={`font-mono tabular-nums ${urgent ? "text-red-400" : "text-white"}`}
            animate={urgent ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 0.8, repeat: urgent ? Infinity : 0 }}
          >
            {(remaining / 1000).toFixed(0)}s
          </motion.span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${urgent ? "bg-red-500" : "bg-gradient-to-r from-blue-500 to-fuchsia-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
