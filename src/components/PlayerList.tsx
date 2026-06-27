"use client";

import type { Player } from "@/lib/types";

interface Props {
  players: Record<string, Player>;
  currentPlayerId: string;
  showLockStatus?: boolean;
}

export function PlayerList({
  players,
  currentPlayerId,
  showLockStatus,
}: Props) {
  const sorted = Object.values(players).sort(
    (a, b) => b.totalScore - a.totalScore
  );

  return (
    <ul className="space-y-2">
      {sorted.map((p, i) => (
        <li
          key={p.id}
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
            p.id === currentPlayerId
              ? "bg-arena-gold/15 border border-arena-gold/40"
              : "bg-arena-bg/50"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="text-arena-muted w-5">{i + 1}.</span>
            <span className={p.isHost ? "text-arena-gold" : ""}>
              {p.name}
              {p.isHost && " ★"}
              {p.id === currentPlayerId && (
                <span className="text-arena-muted ml-1">(bạn)</span>
              )}
            </span>
          </span>
          <span className="flex items-center gap-2">
            {showLockStatus && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  p.locked
                    ? "bg-green-900/50 text-green-300"
                    : "bg-yellow-900/50 text-yellow-300"
                }`}
              >
                {p.locked ? "✓ Khóa" : "..."}
              </span>
            )}
            <span className="font-mono text-arena-gold">
              {p.totalScore.toFixed(1)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
