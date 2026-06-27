"use client";

import { motion } from "framer-motion";
import { getCharacter } from "@/lib/characters";
import type { Player } from "@/lib/types";

interface Props {
  players: Record<string, Player>;
  currentPlayerId: string;
  showLockStatus?: boolean;
}

export function GameHUD({ players, currentPlayerId, showLockStatus }: Props) {
  const sorted = Object.values(players).sort(
    (a, b) => b.totalScore - a.totalScore
  );

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Thặng dư
        </h3>
        <span className="text-[10px] text-zinc-600">{sorted.length} người chơi</span>
      </div>
      <ul className="p-2 space-y-1">
        {sorted.map((p, i) => {
          const char = getCharacter(p.characterClass);
          const isSelf = p.id === currentPlayerId;
          return (
            <motion.li
              key={p.id}
              layout
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors ${
                isSelf ? "bg-white/[0.08] border border-white/10" : "hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-zinc-600 font-mono text-xs w-4">
                {i === 0 ? "👑" : i + 1}
              </span>
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border"
                style={{
                  borderColor: `${char.color}44`,
                  background: `${char.color}15`,
                }}
              >
                {char.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">
                  {p.name}
                  {p.isHost && (
                    <span className="text-amber-500/80 text-[10px] ml-1">HOST</span>
                  )}
                </p>
                {showLockStatus && (
                  <p
                    className={`text-[10px] ${
                      p.locked ? "text-emerald-400" : "text-amber-400/80"
                    }`}
                  >
                    {p.locked ? "Đã di chuyển & khóa" : "Đang phân bổ..."}
                  </p>
                )}
              </div>
              <motion.span
                key={p.totalScore}
                initial={{ scale: 1.2, color: "#f0b429" }}
                animate={{ scale: 1, color: "#ffffff" }}
                className="font-mono text-sm font-semibold tabular-nums"
              >
                {p.totalScore.toFixed(1)}
              </motion.span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
