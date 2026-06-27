"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { BackgroundEffects } from "@/components/rpg/BackgroundEffects";
import { CharacterSelect } from "@/components/rpg/CharacterSelect";
import { EconomicWorldMap } from "@/components/rpg/EconomicWorldMap";
import { storePlayerSession } from "@/lib/player-session";
import { EMPTY_ALLOCATION } from "@/lib/types";
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

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-10 md:py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12 md:mb-16"
        >
          <motion.p
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs text-zinc-400 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            MLN122 · RPG Kinh tế Chính trị Mác-Lênin
          </motion.p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
              Thặng Dư
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
              Chronicles
            </span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Khám phá bản đồ 2D, điều khiển nhân vật tư bản, phân bổ vốn bí mật
            trên 4 vùng lãnh thổ — Lợi tức, Địa tô, T→T&apos;.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Map preview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl shadow-blue-500/5"
          >
            <EconomicWorldMap
              allocation={EMPTY_ALLOCATION}
              onAllocationChange={() => {}}
              players={{}}
              currentPlayerId=""
              phase="preview"
              disabled
            />
            <div className="px-4 py-3 bg-black/80 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-500">
              <span>4 vùng · Multiplayer realtime</span>
              <span className="text-emerald-400">● Online</span>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 md:p-8 space-y-6"
          >
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                Tên nhân vật
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên..."
                maxLength={20}
                className="w-full px-4 py-3.5 rounded-xl bg-black/50 border border-white/10 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-3">
                Chọn class
              </label>
              <CharacterSelect selected={character} onSelect={setCharacter} />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={createRoom}
              disabled={loading || name.length < 2}
              className="w-full py-4 rounded-xl bg-white text-black font-semibold text-lg disabled:opacity-40 hover:bg-zinc-100 transition"
            >
              {loading ? "Đang mở cổng..." : "Tạo thế giới mới"}
            </motion.button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-zinc-600 text-xs">hoặc tham gia</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="MÃ"
                maxLength={6}
                className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 focus:border-fuchsia-500/50 focus:outline-none uppercase tracking-[0.3em] text-center font-mono"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={joinRoom}
                disabled={loading || name.length < 2 || joinCode.length < 4}
                className="px-6 py-3 rounded-xl border border-white/20 hover:bg-white/5 font-medium disabled:opacity-40 transition"
              >
                Vào
              </motion.button>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-600"
        >
          <p>
            RPG map 2D · Không quiz · 2–8 người · Lưu kết quả Redis
          </p>
          <Link
            href="/leaderboard"
            className="text-zinc-400 hover:text-white transition flex items-center gap-1"
          >
            Bảng xếp hạng →
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
