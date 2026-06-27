"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BackgroundEffects } from "@/components/rpg/BackgroundEffects";
import { DialogueBox } from "@/components/rpg/DialogueBox";
import { EconomicWorldMap } from "@/components/rpg/EconomicWorldMap";
import { GameHUD } from "@/components/rpg/GameHUD";
import { PhaseTimer } from "@/components/rpg/PhaseTimer";
import { getScenario } from "@/lib/scenarios";
import { getStoredPlayerId } from "@/lib/player-session";
import { MAP_ZONES } from "@/lib/map-zones";
import type { Allocation, GameRoom } from "@/lib/types";
import { EMPTY_ALLOCATION } from "@/lib/types";

interface Props {
  code: string;
}

function defaultAllocation(): Allocation {
  return { ...EMPTY_ALLOCATION };
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

  // Reset allocation each new round
  useEffect(() => {
    if (room?.phase === "allocating") {
      const me = playerIdRef.current
        ? room.players[playerIdRef.current]
        : null;
      if (me && !me.locked && !me.allocation) {
        setAllocation(defaultAllocation());
      }
    }
  }, [room?.phase, room?.roundIndex, room?.players]);

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
      setError("Phân bổ đủ 100 vốn trên bản đồ trước khi khóa!");
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
        <BackgroundEffects />
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm"
        >
          Đang tải thế giới {code}...
        </motion.div>
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
  const showMap =
    room.phase !== "lobby" && room.phase !== "finished";

  return (
    <div className="min-h-screen relative">
      <BackgroundEffects />

      <header className="relative z-10 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-zinc-500 hover:text-white text-xs transition">
              ← Thoát
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Thế giới MLN122
              </p>
              <p className="font-mono text-lg font-semibold text-white">{room.code}</p>
            </div>
          </div>
          {showMap && (
            <div className="hidden md:block w-72">
              <PhaseTimer
                phase={room.phase}
                phaseStartedAt={room.phaseStartedAt}
                serverTime={serverTime}
                roundIndex={room.roundIndex}
                totalRounds={room.totalRounds}
              />
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-4 md:p-6">
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-red-300 text-sm bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl"
          >
            {error}
          </motion.p>
        )}

        <AnimatePresence mode="wait">
          {room.surpriseText &&
            (room.phase === "resolution" || room.phase === "reveal") && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-4 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 backdrop-blur-md"
              >
                <p className="text-fuchsia-200 font-medium text-sm">
                  {room.surpriseText}
                </p>
              </motion.div>
            )}
        </AnimatePresence>

        {/* LOBBY */}
        {room.phase === "lobby" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-6 items-start"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 space-y-4">
              <h2 className="text-2xl font-semibold">Sảnh chờ</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Mời đồng đội vào mã{" "}
                <span className="font-mono text-white bg-white/10 px-2 py-0.5 rounded">
                  {room.code}
                </span>
                . Cần ít nhất 2 nhà tư bản để bắt đầu cuộc phiêu lưu.
              </p>
              <div className="aspect-video rounded-xl border border-white/[0.06] bg-black/50 flex items-center justify-center overflow-hidden relative">
                <EconomicWorldMap
                  allocation={defaultAllocation()}
                  onAllocationChange={() => {}}
                  players={room.players}
                  currentPlayerId={playerIdRef.current ?? ""}
                  phase="lobby"
                  disabled
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <p className="text-zinc-500 text-sm">Bản đồ chờ khám phá...</p>
                </div>
              </div>
              {isHost ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStart}
                  disabled={submitting || playerCount < 2}
                  className="w-full py-4 rounded-xl bg-white text-black font-semibold disabled:opacity-40 transition"
                >
                  {submitting ? "..." : "🗺️ Bắt đầu phiêu lưu"}
                </motion.button>
              ) : (
                <p className="text-center text-zinc-500 text-sm animate-pulse">
                  Chờ host mở cổng thế giới...
                </p>
              )}
            </div>
            <GameHUD
              players={room.players}
              currentPlayerId={playerIdRef.current ?? ""}
            />
          </motion.div>
        )}

        {/* ACTIVE GAME */}
        {showMap && scenario && (
          <div className="grid lg:grid-cols-[1fr_280px] gap-4">
            <div className="space-y-4">
              {room.phase !== "lobby" && (
                <div className="md:hidden">
                  <PhaseTimer
                    phase={room.phase}
                    phaseStartedAt={room.phaseStartedAt}
                    serverTime={serverTime}
                    roundIndex={room.roundIndex}
                    totalRounds={room.totalRounds}
                  />
                </div>
              )}

              <div className="relative">
                <EconomicWorldMap
                  allocation={allocation}
                  onAllocationChange={setAllocation}
                  players={room.players}
                  currentPlayerId={playerIdRef.current ?? ""}
                  phase={room.phase}
                  disabled={me?.locked}
                  showAllAllocations={
                    room.phase === "reveal" || room.phase === "resolution"
                  }
                />

                <DialogueBox
                  speaker="C. Mác · Người hướng dẫn"
                  title={scenario.title}
                  text={scenario.narrative}
                  theory={scenario.theoryRef}
                  visible={room.phase === "briefing"}
                  avatar="📜"
                />
              </div>

              {room.phase === "allocating" && !me?.locked && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <p className="flex-1 text-sm text-zinc-500 self-center">
                    Nhấn vào khu vực trên bản đồ để đặt vốn. Nhân vật sẽ di chuyển
                    theo chiến lược của bạn.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmitAllocation}
                    disabled={
                      submitting ||
                      Object.values(allocation).reduce((a, b) => a + b, 0) !== 100
                    }
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 font-semibold disabled:opacity-40 whitespace-nowrap"
                  >
                    {submitting ? "..." : "⚔️ Khóa & Di chuyển"}
                  </motion.button>
                </motion.div>
              )}

              {room.phase === "allocating" && me?.locked && (
                <p className="text-center text-emerald-400 text-sm py-2">
                  ✓ Bạn đã khóa vị trí — chờ đối thủ trên bản đồ...
                </p>
              )}

              {room.phase === "resolution" && lastResult && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-5 space-y-2"
                >
                  <h3 className="text-sm uppercase tracking-widest text-zinc-500 mb-3">
                    Kết quả vòng {lastResult.roundIndex + 1}
                  </h3>
                  {Object.entries(lastResult.deltaScores)
                    .sort(([, a], [, b]) => b - a)
                    .map(([id, delta], i) => {
                      const p = room.players[id];
                      const bd = lastResult.breakdowns[id];
                      return (
                        <motion.div
                          key={id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className={`flex items-start gap-3 p-3 rounded-xl ${
                            id === playerIdRef.current
                              ? "bg-white/[0.08] border border-white/10"
                              : "bg-black/30"
                          }`}
                        >
                          <span
                            className={`font-mono text-lg font-bold ${
                              delta >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {delta >= 0 ? "+" : ""}
                            {delta.toFixed(1)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{p?.name}</p>
                            {bd && (
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {bd.narrative}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                </motion.div>
              )}
            </div>

            <aside className="space-y-4">
              <GameHUD
                players={room.players}
                currentPlayerId={playerIdRef.current ?? ""}
                showLockStatus={room.phase === "allocating"}
              />

              {(room.phase === "reveal" || room.phase === "resolution") && (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2">
                    <h4 className="text-xs uppercase tracking-widest text-zinc-500">
                      Phân bổ vòng này
                    </h4>
                    {Object.entries(room.players).map(([id, p]) => {
                      const alloc =
                        room.phase === "resolution" && lastResult
                          ? lastResult.allocations[id]
                          : p.allocation;
                      if (!alloc) return null;
                      return (
                        <div key={id} className="text-xs">
                          <p className="text-zinc-400 mb-1">{p.name}</p>
                          <div className="flex gap-1">
                            {MAP_ZONES.map((z) => (
                              <div
                                key={z.id}
                                className="flex-1 h-6 rounded bg-white/[0.04] relative overflow-hidden"
                                title={`${z.name}: ${alloc[z.id]}`}
                              >
                                <div
                                  className="absolute inset-y-0 left-0 rounded"
                                  style={{
                                    width: `${alloc[z.id]}%`,
                                    background: `${z.color}66`,
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-4 text-[11px] text-zinc-600 space-y-1">
                <p>z&apos; = (z/TBCV) × 100%</p>
                <p>Giá đất = Địa tô / Lãi suất NH</p>
              </div>
            </aside>
          </div>
        )}

        {/* FINISHED */}
        {room.phase === "finished" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto text-center space-y-6 py-8"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl"
            >
              🏆
            </motion.div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-fuchsia-300 bg-clip-text text-transparent">
              Chương kết — Thặng dư thuộc về ai?
            </h2>
            <div className="space-y-3">
              {Object.values(room.players)
                .sort((a, b) => b.totalScore - a.totalScore)
                .map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-5 rounded-2xl border ${
                      i === 0
                        ? "border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-fuchsia-500/10"
                        : "border-white/[0.08] bg-white/[0.03]"
                    }`}
                  >
                    <span className="text-3xl font-mono text-zinc-600 mr-3">
                      #{i + 1}
                    </span>
                    <span className="text-xl font-semibold">{p.name}</span>
                    <p className="text-amber-400 font-mono text-lg mt-1">
                      {p.totalScore.toFixed(1)} giá trị thặng dư
                    </p>
                  </motion.div>
                ))}
            </div>
            <Link
              href="/leaderboard"
              className="inline-block px-6 py-3 rounded-xl border border-white/20 hover:bg-white/5 transition text-sm"
            >
              Bảng xếp hạng toàn server →
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
