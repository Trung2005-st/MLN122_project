"use client";

import { getCharacter } from "@/lib/characters";
import type { Player } from "@/lib/types";

interface Props {
  players: Record<string, Player>;
  currentPlayerId: string;
}

export function GameHUD({ players, currentPlayerId }: Props) {
  const sorted = Object.values(players).sort(
    (a, b) => b.totalScore - a.totalScore
  );

  const statusLabel = (p: Player) => {
    if (p.status === "locked") return "🔒 Khóa 5s";
    if (p.status === "in_combat") return "⚔️ Đang đánh";
    if (p.status === "challenged") return "❓ Lời mời PvP";
    return null;
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex justify-between">
        <h3 className="text-xs uppercase tracking-widest text-zinc-500">
          Bảng điểm
        </h3>
        <span className="text-[10px] text-zinc-600">{sorted.length} người</span>
      </div>
      <ul className="p-2 space-y-1">
        {sorted.map((p, i) => {
          const char = getCharacter(p.characterClass);
          const isSelf = p.id === currentPlayerId;
          const st = statusLabel(p);
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${
                isSelf ? "bg-white/[0.08] border border-white/10" : ""
              }`}
            >
              <span className="w-5 text-center">{i === 0 ? "👑" : i + 1}</span>
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
                <p className="text-sm font-medium truncate">
                  {p.name}
                  {p.isHost && (
                    <span className="text-amber-500/80 text-[10px] ml-1">
                      HOST
                    </span>
                  )}
                </p>
                {st && <p className="text-[10px] text-zinc-500">{st}</p>}
              </div>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {p.totalScore.toFixed(1)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
