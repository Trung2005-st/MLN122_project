"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AllocationSliders, defaultAllocation } from "@/components/AllocationSliders";
import { PhaseTimer } from "@/components/PhaseTimer";
import { PlayerList } from "@/components/PlayerList";
import { getScenario } from "@/lib/scenarios";
import { getStoredPlayerId } from "@/lib/player-session";
import type { Allocation, GameRoom } from "@/lib/types";
import { BUCKET_LABELS } from "@/lib/types";

interface Props {
  code: string;
}

export function GameRoomClient({ code }: Props) {
  const router = useRouter();
  const playerIdRef = useRef<string | null>(null);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [serverTime, setServerTime] = useState(Date.now());
  const [allocation, setAllocation] = useState<Allocation>(defaultAllocation());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const poll = useCallback(async () => {
    const pid = playerIdRef.current;
    if (!pid) return;
    try {
      const res = await fetch(
        `/api/rooms/${code}?playerId=${encodeURIComponent(pid)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Lỗi");
        return;
      }
      setRoom(data.room);
      setServerTime(data.serverTime);
      setError("");
    } catch {
      setError("Mất kết nối — đang thử lại...");
    }
  }, [code]);

  useEffect(() => {
    const pid = getStoredPlayerId();
    if (!pid) {
      router.replace("/");
      return;
    }
    playerIdRef.current = pid;
    poll();
    const interval = setInterval(poll, 1200);
    return () => clearInterval(interval);
  }, [poll, router]);

  async function handleStart() {
    const pid = playerIdRef.current;
    if (!pid) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${code}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: pid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitAllocation() {
    const pid = playerIdRef.current;
    if (!pid) return;
    const total = Object.values(allocation).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      setError("Tổng phân bổ phải = 100");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${code}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: pid, allocation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setSubmitting(false);
    }
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-arena-muted animate-pulse">Đang vào phòng {code}...</p>
      </div>
    );
  }

  const me = playerIdRef.current ? room.players[playerIdRef.current] : null;
  const isHost = me?.isHost ?? false;
  const scenario = room.currentScenarioId
    ? getScenario(room.currentScenarioId)
    : null;
  const lastResult = room.roundResults[room.roundResults.length - 1];
  const playerCount = Object.keys(room.players).length;

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-arena-muted text-xs tracking-widest">PHÒNG</p>
          <h1 className="font-mono text-3xl text-arena-gold">{room.code}</h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-arena-muted">
            Vòng {Math.min(room.roundIndex + 1, room.totalRounds)}/{room.totalRounds}
          </p>
          <p className="text-xs text-arena-muted capitalize">{room.phase}</p>
        </div>
      </header>

      {error && (
        <p className="mb-4 text-red-400 bg-red-950/40 px-4 py-2 rounded-lg text-sm">
          {error}
        </p>
      )}

      {room.surpriseText && room.phase === "resolution" && (
        <div className="mb-4 p-4 rounded-xl border border-arena-crimson/50 bg-arena-crimson/10 animate-reveal">
          <p className="text-red-200 font-medium">{room.surpriseText}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          {/* LOBBY */}
          {room.phase === "lobby" && (
            <div className="glass-panel p-6 space-y-4">
              <h2 className="text-xl font-display">Sảnh chờ</h2>
              <p className="text-arena-muted">
                Chờ {playerCount} người (cần tối thiểu 2). Chia mã phòng{" "}
                <strong className="text-arena-gold font-mono">{room.code}</strong>{" "}
                cho bạn bè.
              </p>
              {isHost && (
                <button
                  onClick={handleStart}
                  disabled={submitting || playerCount < 2}
                  className="w-full py-3 rounded-xl bg-arena-gold text-arena-bg font-bold disabled:opacity-40"
                >
                  {submitting ? "..." : "Bắt đầu đấu"}
                </button>
              )}
              {!isHost && (
                <p className="text-center text-arena-muted text-sm">
                  Chờ host bắt đầu...
                </p>
              )}
            </div>
          )}

          {/* BRIEFING */}
          {room.phase === "briefing" && scenario && (
            <div className="glass-panel p-6 space-y-4 animate-reveal">
              <PhaseTimer
                phase={room.phase}
                phaseStartedAt={room.phaseStartedAt}
                serverTime={serverTime}
              />
              <h2 className="text-2xl font-display text-arena-gold">
                {scenario.title}
              </h2>
              <p className="leading-relaxed">{scenario.narrative}</p>
              <blockquote className="border-l-2 border-arena-gold pl-4 text-sm text-arena-muted italic">
                {scenario.theoryRef}
              </blockquote>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-arena-bg/60 p-3 rounded-lg">
                <span>LPBQ: {scenario.market.avgProfitRate}%</span>
                <span>z&apos; cơ bản: {scenario.market.baseInterestRate}%</span>
                <span>
                  Cung-cầu TBCV:{" "}
                  {scenario.market.loanSupplyDemand > 0 ? "thiếu" : "dư"}
                </span>
                <span>
                  Độ màu mỡ: {scenario.market.landFertility}
                </span>
              </div>
            </div>
          )}

          {/* ALLOCATING */}
          {room.phase === "allocating" && (
            <div className="glass-panel p-6 space-y-4">
              <PhaseTimer
                phase={room.phase}
                phaseStartedAt={room.phaseStartedAt}
                serverTime={serverTime}
              />
              <h2 className="text-xl font-display">
                Phân bổ 100 điểm vốn — bí mật!
              </h2>
              <p className="text-sm text-arena-muted">
                Đối thủ không thấy phân bổ của bạn cho đến khi hết giờ.
              </p>
              <AllocationSliders
                allocation={allocation}
                onChange={setAllocation}
                disabled={me?.locked}
              />
              {!me?.locked ? (
                <button
                  onClick={handleSubmitAllocation}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-arena-gold text-arena-bg font-bold disabled:opacity-40"
                >
                  {submitting ? "..." : "🔒 Khóa phân bổ"}
                </button>
              ) : (
                <p className="text-center text-green-300 py-2">
                  ✓ Đã khóa — chờ đối thủ...
                </p>
              )}
            </div>
          )}

          {/* REVEAL */}
          {room.phase === "reveal" && (
            <div className="glass-panel p-6 animate-reveal">
              <PhaseTimer
                phase={room.phase}
                phaseStartedAt={room.phaseStartedAt}
                serverTime={serverTime}
              />
              <h2 className="text-xl font-display mb-4">Hé lộ chiến thuật!</h2>
              <div className="space-y-3">
                {Object.entries(room.players).map(([id, p]) => {
                  const alloc = p.allocation;
                  if (!alloc) return null;
                  return (
                    <div key={id} className="bg-arena-bg/60 p-3 rounded-lg">
                      <p className="font-medium mb-2">
                        {p.name}
                        {id === playerIdRef.current && " (bạn)"}
                      </p>
                      <div className="grid grid-cols-4 gap-1 text-xs">
                        {(Object.keys(BUCKET_LABELS) as (keyof typeof BUCKET_LABELS)[]).map(
                          (b) => (
                            <div key={b} className="text-center">
                              <div
                                className="font-mono text-lg"
                                style={{ color: BUCKET_LABELS[b].color }}
                              >
                                {alloc[b]}
                              </div>
                              <div className="text-arena-muted">
                                {BUCKET_LABELS[b].short}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RESOLUTION */}
          {room.phase === "resolution" && lastResult && (
            <div className="glass-panel p-6 space-y-4 animate-reveal">
              <PhaseTimer
                phase={room.phase}
                phaseStartedAt={room.phaseStartedAt}
                serverTime={serverTime}
              />
              <h2 className="text-xl font-display text-arena-gold">
                Kết quả vòng {lastResult.roundIndex + 1}
              </h2>
              <div className="space-y-2">
                {Object.entries(lastResult.deltaScores)
                  .sort(([, a], [, b]) => b - a)
                  .map(([id, delta]) => {
                    const p = room.players[id];
                    const bd = lastResult.breakdowns[id];
                    return (
                      <div
                        key={id}
                        className={`p-3 rounded-lg ${
                          id === playerIdRef.current
                            ? "bg-arena-gold/10 border border-arena-gold/30"
                            : "bg-arena-bg/60"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{p?.name}</span>
                          <span
                            className={`font-mono text-lg ${
                              delta >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {delta >= 0 ? "+" : ""}
                            {delta.toFixed(1)}
                          </span>
                        </div>
                        {bd && (
                          <p className="text-xs text-arena-muted mt-1">
                            {bd.narrative}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* FINISHED */}
          {room.phase === "finished" && (
            <div className="glass-panel p-6 space-y-4 text-center animate-reveal">
              <h2 className="text-3xl font-display text-arena-gold">
                🏆 Kết thúc!
              </h2>
              {Object.values(room.players)
                .sort((a, b) => b.totalScore - a.totalScore)
                .map((p, i) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl ${
                      i === 0
                        ? "bg-arena-gold/20 border-2 border-arena-gold"
                        : "bg-arena-bg/60"
                    }`}
                  >
                    <span className="text-2xl font-mono mr-3">#{i + 1}</span>
                    <span className="text-xl">{p.name}</span>
                    <span className="ml-4 text-arena-gold font-mono">
                      {p.totalScore.toFixed(1)} thặng dư
                    </span>
                  </div>
                ))}
              <a
                href="/leaderboard"
                className="inline-block text-arena-gold hover:underline"
              >
                Xem bảng xếp hạng toàn server →
              </a>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="glass-panel p-4">
            <h3 className="text-sm text-arena-muted mb-3 uppercase tracking-wider">
              Bảng điểm
            </h3>
            <PlayerList
              players={room.players}
              currentPlayerId={playerIdRef.current ?? ""}
              showLockStatus={room.phase === "allocating"}
            />
          </div>

          <div className="glass-panel p-4 text-xs text-arena-muted space-y-2">
            <p className="text-white font-medium text-sm">Lý thuyết cốt lõi</p>
            <p>z&apos; = (z/TBCV) × 100%</p>
            <p>Giá đất = Địa tô / Tỷ suất lợi tức NH</p>
            <p>Lợi tức ⊂ LPBQ ⊂ Giá trị thặng dư</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
