"use client";

import type { GamePhase } from "@/lib/types";

interface Props {
  phase: GamePhase;
  timeLeftMs: number;
  totalMs: number;
  preparing?: boolean;
}

export function PhaseTimer({ phase, timeLeftMs, totalMs, preparing }: Props) {
  const seconds = Math.ceil(timeLeftMs / 1000);
  const elapsed = totalMs - timeLeftMs;
  const pct = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
  const urgent = !preparing && timeLeftMs < 30000;

  const label = preparing
    ? "Chuẩn bị — timer chưa chạy"
    : phase === "ending_soon"
      ? "Sắp kết thúc!"
      : "Thời gian còn lại";

  return (
    <div className="px-4 py-3 rounded-xl border border-white/[0.08] bg-black/50 backdrop-blur-md">
      <div className="flex justify-between text-xs mb-1.5">
        <span
          className={
            preparing ? "text-emerald-400" : urgent ? "text-amber-400" : "text-zinc-400"
          }
        >
          {label}
        </span>
        <span
          className={`font-mono tabular-nums ${
            preparing ? "text-emerald-300" : urgent ? "text-red-400" : "text-white"
          }`}
        >
          {preparing
            ? `${seconds}s`
            : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full transition-[width] duration-500 ease-linear ${
            preparing
              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
              : urgent
                ? "bg-gradient-to-r from-red-500 to-amber-500"
                : "bg-gradient-to-r from-blue-500 to-emerald-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
