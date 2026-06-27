"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BackgroundEffects } from "@/components/rpg/BackgroundEffects";
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
    <div className="min-h-screen relative">
      <BackgroundEffects />
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="text-zinc-500 hover:text-white text-sm transition inline-flex items-center gap-1 mb-8"
        >
          ← Về trang chủ
        </Link>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-amber-200 to-fuchsia-300 bg-clip-text text-transparent"
        >
          Bảng Vinh Danh
        </motion.h1>
        <p className="text-zinc-500 mb-8 text-sm">
          Những nhà tư bản tích lũy nhiều thặng dư nhất
        </p>

        {loading ? (
          <p className="text-zinc-600 animate-pulse">Đang tải...</p>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center text-zinc-500">
            Chưa có huyền thoại nào. Hãy chơi một ván để ghi danh!
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((e, i) => (
              <motion.li
                key={`${e.playerName}-${e.finishedAt}-${i}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center justify-between px-5 py-4 rounded-2xl border ${
                  i === 0
                    ? "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <span className="flex items-center gap-4">
                  <span className="font-mono text-lg w-8 text-zinc-600">
                    {i === 0 ? "👑" : `#${i + 1}`}
                  </span>
                  <span>
                    <span className="font-medium text-white">{e.playerName}</span>
                    <span className="block text-[10px] text-zinc-600 font-mono mt-0.5">
                      {e.roomCode}
                    </span>
                  </span>
                </span>
                <span className="font-mono text-amber-400 font-semibold">
                  {e.score.toFixed(1)}
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
