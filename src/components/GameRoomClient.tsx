"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { BackgroundEffects } from "@/components/rpg/BackgroundEffects";
import { CombatModal } from "@/components/rpg/CombatModal";
import { ChallengeModal } from "@/components/rpg/ChallengeModal";
import { GameHUD } from "@/components/rpg/GameHUD";
import { PhaseTimer } from "@/components/rpg/PhaseTimer";
import { getStoredPlayerId } from "@/lib/player-session";
import type { CombatQuestionView, GameRoom } from "@/lib/types";
import { GAME_DURATION_MS } from "@/lib/types";

const PhaserGameWorld = dynamic(
  () =>
    import("@/components/rpg/PhaserGameWorld").then((m) => m.PhaserGameWorld),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[960/640] min-h-[320px] rounded-2xl bg-[#0f1419] animate-pulse" />
    ),
  }
);

interface Props {
  code: string;
}

export function GameRoomClient({ code }: Props) {
  const router = useRouter();
  const playerIdRef = useRef<string | null>(null);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [combatQuestion, setCombatQuestion] =
    useState<CombatQuestionView | null>(null);
  const [serverTime, setServerTime] = useState(Date.now());
  const [error, setError] = useState("");

  const applyPoll = useCallback((data: {
    room: GameRoom;
    combatQuestion?: CombatQuestionView | null;
    serverTime: number;
    error?: string;
  }) => {
    if (data.error) {
      setError(data.error);
      return;
    }
    setRoom(data.room);
    setCombatQuestion(data.combatQuestion ?? null);
    setServerTime(data.serverTime);
    setError("");
  }, []);

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
      applyPoll(data);
    } catch {
      setError("Mất kết nối...");
    }
  }, [code, applyPoll]);

  const sendAction = useCallback(
    async (action: object) => {
      const pid = playerIdRef.current;
      if (!pid) return;
      try {
        const res = await fetch(`/api/rooms/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: pid, action }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        applyPoll(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lỗi");
      }
    },
    [code, applyPoll]
  );

  useEffect(() => {
    const pid = getStoredPlayerId();
    if (!pid) {
      router.replace("/");
      return;
    }
    playerIdRef.current = pid;
    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [poll, router]);

  async function handleStart() {
    const pid = playerIdRef.current;
    if (!pid) return;
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
    }
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BackgroundEffects />
        <p className="text-zinc-500 animate-pulse">Đang vào thế giới...</p>
      </div>
    );
  }

  const me = playerIdRef.current ? room.players[playerIdRef.current] : null;
  const isHost = me?.isHost ?? false;
  const playing = room.phase === "playing" || room.phase === "ending_soon";
  const playerCount = Object.keys(room.players).length;

  const challenger =
    me?.challengedBy && room.players[me.challengedBy]
      ? room.players[me.challengedBy].name
      : null;

  const timeLeft =
    room.gameEndsAt && playing
      ? Math.max(0, room.gameEndsAt - serverTime)
      : GAME_DURATION_MS;

  return (
    <div className="min-h-screen relative">
      <BackgroundEffects />

      <header className="relative z-10 border-b border-white/[0.06] bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-zinc-500 hover:text-white text-xs">
              ← Thoát
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600">
                Thế giới mở MLN122
              </p>
              <p className="font-mono text-lg font-semibold">{room.code}</p>
            </div>
          </div>
          {playing && (
            <div className="hidden md:block w-64">
              <PhaseTimer
                phase={room.phase}
                timeLeftMs={timeLeft}
                totalMs={GAME_DURATION_MS}
              />
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-4 md:p-6">
        {error && (
          <p className="mb-3 text-red-300 text-sm bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">
            {error}
          </p>
        )}

        {room.phase === "ending_soon" && (
          <motion.p
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="mb-3 text-amber-300 text-center text-sm font-medium"
          >
            ⚠️ Còn 30 giây trước khi kết thúc!
          </motion.p>
        )}

        {room.phase === "lobby" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
              <h2 className="text-2xl font-semibold">Sảnh chờ</h2>
              <p className="text-zinc-400 text-sm">
                Mã phòng:{" "}
                <span className="font-mono text-white bg-white/10 px-2 py-0.5 rounded">
                  {room.code}
                </span>
              </p>
              <p className="text-zinc-500 text-sm">
                Thế giới mở 5 phút · Đánh quái $ · PvP · Hộp quà từ trời rơi
              </p>
              {isHost ? (
                <button
                  onClick={handleStart}
                  disabled={playerCount < 2}
                  className="w-full py-4 rounded-xl bg-white text-black font-semibold disabled:opacity-40"
                >
                  🗺️ Mở thế giới ({playerCount} người)
                </button>
              ) : (
                <p className="text-center text-zinc-500 animate-pulse text-sm">
                  Chờ host mở thế giới...
                </p>
              )}
            </div>
            <GameHUD players={room.players} currentPlayerId={playerIdRef.current ?? ""} />
          </div>
        )}

        {playing && (
          <div className="grid lg:grid-cols-[1fr_280px] gap-4">
            <div className="space-y-3">
              <div className="md:hidden">
                <PhaseTimer
                  phase={room.phase}
                  timeLeftMs={timeLeft}
                  totalMs={GAME_DURATION_MS}
                />
              </div>
              <PhaserGameWorld
                room={room}
                currentPlayerId={playerIdRef.current ?? ""}
                onMove={(x, y) => sendAction({ type: "move", x, y })}
                onAttackMonster={(id) =>
                  sendAction({ type: "attack_monster", monsterId: id })
                }
                onCollectGift={(id) =>
                  sendAction({ type: "collect_gift", giftId: id })
                }
              />
              {/* Event feed */}
              <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3 max-h-28 overflow-y-auto text-xs text-zinc-500 space-y-1">
                {room.events.slice(0, 8).map((e, i) => (
                  <p key={i}>{e.text}</p>
                ))}
              </div>
            </div>
            <aside className="space-y-4">
              <GameHUD
                players={room.players}
                currentPlayerId={playerIdRef.current ?? ""}
              />
              {me && (me.immunityCards > 0 || me.swapCards > 0) && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-xs text-zinc-400 space-y-2">
                  {me.immunityCards > 0 && (
                    <p>🛡️ Miễn trừ: {me.immunityCards}</p>
                  )}
                  {me.swapCards > 0 && (
                    <button
                      type="button"
                      onClick={() => sendAction({ type: "use_swap_card" })}
                      className="w-full py-2 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-200 hover:bg-fuchsia-500/30"
                    >
                      🔀 Dùng thẻ tráo ({me.swapCards})
                    </button>
                  )}
                </div>
              )}
            </aside>
          </div>
        )}

        {room.phase === "finished" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto text-center space-y-6 py-8"
          >
            <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-fuchsia-300 bg-clip-text text-transparent">
              🏆 Kết thúc!
            </h2>
            {Object.values(room.players)
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((p, i) => (
                <div
                  key={p.id}
                  className={`p-5 rounded-2xl border ${
                    i === 0
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-white/[0.08] bg-white/[0.03]"
                  }`}
                >
                  <span className="text-2xl font-mono mr-2">#{i + 1}</span>
                  {p.name}
                  <p className="text-amber-400 font-mono text-lg mt-1">
                    {p.totalScore.toFixed(1)} điểm
                  </p>
                </div>
              ))}
            <Link
              href="/leaderboard"
              className="inline-block px-6 py-3 rounded-xl border border-white/20 hover:bg-white/5 text-sm"
            >
              Bảng xếp hạng →
            </Link>
          </motion.div>
        )}
      </main>

      {combatQuestion && me?.status === "in_combat" && (
        <CombatModal
          question={combatQuestion}
          serverTime={serverTime}
          onAnswer={(choiceIndex) => {
            const cid = me.activeCombatId;
            if (cid) sendAction({ type: "answer", combatId: cid, choiceIndex });
          }}
          onFlee={() => {
            const cid = me.activeCombatId;
            if (cid) sendAction({ type: "flee", combatId: cid });
          }}
        />
      )}

      {challenger && me?.status === "challenged" && (
        <ChallengeModal
          challengerName={challenger}
          onAccept={() => sendAction({ type: "accept_challenge" })}
          onReject={() => sendAction({ type: "reject_challenge" })}
        />
      )}
    </div>
  );
}
