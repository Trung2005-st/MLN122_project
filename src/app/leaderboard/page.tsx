"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/types";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard?limit=50")
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.entries ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link href="/" className="text-arena-gold text-sm hover:underline">
        ← Về trang chủ
      </Link>

      <h1 className="font-display text-3xl mt-4 mb-6">🏆 Bảng xếp hạng</h1>

      {loading ? (
        <p className="text-arena-muted animate-pulse">Đang tải...</p>
      ) : entries.length === 0 ? (
        <p className="text-arena-muted">
          Chưa có kết quả. Hãy chơi một ván để ghi danh!
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e, i) => (
            <li
              key={`${e.playerName}-${e.finishedAt}-${i}`}
              className={`glass-panel px-4 py-3 flex items-center justify-between ${
                i < 3 ? "gold-glow" : ""
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`font-mono w-8 ${
                    i === 0
                      ? "text-arena-gold text-xl"
                      : i === 1
                        ? "text-gray-300"
                        : i === 2
                          ? "text-amber-700"
                          : "text-arena-muted"
                  }`}
                >
                  #{i + 1}
                </span>
                <span>
                  <span className="font-medium">{e.playerName}</span>
                  <span className="text-xs text-arena-muted ml-2 font-mono">
                    {e.roomCode}
                  </span>
                </span>
              </span>
              <span className="font-mono text-arena-gold">
                {e.score.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
