"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { BackgroundEffects } from "@/components/rpg/BackgroundEffects";
import { CharacterSelect } from "@/components/rpg/CharacterSelect";
import { storePlayerSession } from "@/lib/player-session";
import type { CharacterClass } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [character, setCharacter] = useState<CharacterClass>("lender");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createRoom() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: name, characterClass: character }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      storePlayerSession(data.playerId, name, character);
      router.push(`/room/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom() {
    setError("");
    setLoading(true);
    try {
      const code = joinCode.trim().toUpperCase();
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name, characterClass: character }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      storePlayerSession(data.playerId, name, character);
      router.push(`/room/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <BackgroundEffects />

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">
            MLN122 · Thế giới mở
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-3">
            <span className="bg-gradient-to-r from-amber-300 via-fuchsia-300 to-blue-400 bg-clip-text text-transparent">
              Thặng Dư
            </span>{" "}
            <span className="text-white">Open World</span>
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Đánh quái $ · PvP quiz · Hộp quà rơi từ trời · 5 phút đua điểm
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 md:p-8 space-y-6 max-w-md mx-auto"
        >
          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
              Tên nhân vật
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên..."
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 focus:border-blue-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-3">
              Class
            </label>
            <CharacterSelect selected={character} onSelect={setCharacter} />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            onClick={createRoom}
            disabled={loading || name.length < 2}
            className="w-full py-4 rounded-xl bg-white text-black font-semibold disabled:opacity-40"
          >
            Tạo thế giới mới
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-zinc-600 text-xs">hoặc</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="MÃ"
              maxLength={6}
              className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 uppercase tracking-widest text-center font-mono"
            />
            <button
              onClick={joinRoom}
              disabled={loading || name.length < 2 || joinCode.length < 4}
              className="px-6 py-3 rounded-xl border border-white/20 hover:bg-white/5 disabled:opacity-40"
            >
              Vào
            </button>
          </div>
        </motion.div>

        <ul className="mt-8 text-sm text-zinc-600 space-y-2 max-w-md mx-auto text-center">
          <li>🎯 Quái $ — trả lời đúng câu hỏi từ content.md</li>
          <li>⚔️ Chạm người chơi → PvP ai nhanh hơn</li>
          <li>🎁 Hộp quà rơi sau 30s — buff, debuff, thẻ đặc biệt</li>
        </ul>

        <Link
          href="/leaderboard"
          className="block text-center mt-6 text-zinc-500 hover:text-white text-sm"
        >
          Bảng xếp hạng →
        </Link>
      </main>
    </div>
  );
}
