"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { storePlayerSession } from "@/lib/player-session";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createRoom() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      storePlayerSession(data.playerId, name);
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
        body: JSON.stringify({ playerName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      storePlayerSession(data.playerId, name);
      router.push(`/room/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8">
        <header className="text-center space-y-3">
          <p className="text-arena-gold text-sm tracking-[0.3em] uppercase">
            MLN122 · Kinh tế chính trị Mác-Lênin
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white">
            Thặng Dư Arena
          </h1>
          <p className="text-arena-muted text-lg leading-relaxed">
            Đấu trường{" "}
            <span className="text-arena-gold">phân bổ tư bản</span> realtime —
            Lợi tức, Địa tô, T→T&apos;. Không phải quiz. Không phải Kahoot.
          </p>
        </header>

        <div className="glass-panel p-6 space-y-5 gold-glow">
          <label className="block space-y-2">
            <span className="text-sm text-arena-muted">Tên của bạn</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên hiển thị..."
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-arena-bg border border-arena-border focus:border-arena-gold focus:outline-none transition"
            />
          </label>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            onClick={createRoom}
            disabled={loading || name.length < 2}
            className="w-full py-3.5 rounded-xl bg-arena-gold text-arena-bg font-bold text-lg hover:brightness-110 disabled:opacity-40 transition"
          >
            {loading ? "Đang tạo..." : "Tạo phòng mới"}
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-arena-border" />
            <span className="text-arena-muted text-xs">hoặc vào phòng</span>
            <div className="flex-1 h-px bg-arena-border" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="MÃ PHÒNG"
              maxLength={6}
              className="flex-1 px-4 py-3 rounded-xl bg-arena-bg border border-arena-border focus:border-arena-gold focus:outline-none uppercase tracking-widest text-center font-mono"
            />
            <button
              onClick={joinRoom}
              disabled={loading || name.length < 2 || joinCode.length < 4}
              className="px-6 py-3 rounded-xl border border-arena-gold text-arena-gold font-semibold hover:bg-arena-gold/10 disabled:opacity-40 transition"
            >
              Vào
            </button>
          </div>
        </div>

        <section className="glass-panel p-5 space-y-3 text-sm text-arena-muted">
          <h2 className="text-white font-semibold">Cách chơi</h2>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              2–8 người cùng phòng, mỗi vòng phân bổ 100 điểm vốn vào 4 kênh:{" "}
              <strong className="text-arena-gold">Cho vay</strong>,{" "}
              <strong className="text-blue-400">Đi vay</strong>,{" "}
              <strong className="text-green-400">Nông nghiệp/Địa tô</strong>,{" "}
              <strong className="text-red-400">Tư bản giả (T→T&apos;)</strong>
            </li>
            <li>
              Phân bổ bí mật → cùng lúc hé lộ → thị trường tính điểm theo công
              thức z&apos;, địa tô R, cung-cầu tư bản cho vay
            </li>
            <li>Sự kiện bất ngờ: ảo tưởng T→T&apos;, sụt chứng khoán, địa tô
              chênh lệch...</li>
            <li>5 vòng — ai tích lũy nhiều giá trị thặng dư nhất thắng</li>
          </ul>
        </section>

        <Link
          href="/leaderboard"
          className="block text-center text-arena-gold hover:underline text-sm"
        >
          🏆 Bảng xếp hạng toàn server →
        </Link>
      </div>
    </main>
  );
}
