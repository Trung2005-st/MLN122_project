"use client";

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import type { GameRoom } from "@/lib/types";
import type { OpenWorldSync } from "./phaser/OpenWorldScene";

interface Props {
  room: GameRoom;
  currentPlayerId: string;
  onMove: (x: number, y: number) => void;
  onAttackMonster: (id: string) => void;
  onCollectGift: (id: string) => void;
}

export function PhaserGameWorld({
  room,
  currentPlayerId,
  onMove,
  onAttackMonster,
  onCollectGift,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const initRef = useRef(false);
  const callbacksRef = useRef({ onMove, onAttackMonster, onCollectGift });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  callbacksRef.current = { onMove, onAttackMonster, onCollectGift };

  useEffect(() => {
    let mounted = true;
    let observer: ResizeObserver | null = null;

    async function boot() {
      if (!mounted || !containerRef.current || initRef.current) return;
      if (containerRef.current.clientWidth < 80) return;

      try {
        initRef.current = true;
        const { createOpenWorldGame } = await import("./phaser/OpenWorldScene");

        const sync: OpenWorldSync = {
          room,
          currentPlayerId,
          onMove: (x, y) => callbacksRef.current.onMove(x, y),
          onAttackMonster: (id) => callbacksRef.current.onAttackMonster(id),
          onCollectGift: (id) => callbacksRef.current.onCollectGift(id),
        };

        gameRef.current = createOpenWorldGame(containerRef.current, sync);
        setStatus("ready");
      } catch (e) {
        initRef.current = false;
        setStatus("error");
        console.error(e);
      }
    }

    boot();
    if (containerRef.current && !initRef.current) {
      observer = new ResizeObserver(() => boot());
      observer.observe(containerRef.current);
    }

    return () => {
      mounted = false;
      observer?.disconnect();
      gameRef.current?.destroy(true);
      gameRef.current = null;
      initRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gameRef.current || status !== "ready") return;
    import("./phaser/OpenWorldScene").then(({ syncOpenWorld }) => {
      syncOpenWorld(gameRef.current, {
        room,
        currentPlayerId,
        onMove: (x, y) => callbacksRef.current.onMove(x, y),
        onAttackMonster: (id) => callbacksRef.current.onAttackMonster(id),
        onCollectGift: (id) => callbacksRef.current.onCollectGift(id),
      });
    });
  }, [room, currentPlayerId, status]);

  const playing = room.phase === "playing" || room.phase === "ending_soon";

  return (
    <div className="relative w-full rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0f1419]">
      <div ref={containerRef} className="w-full min-h-[320px] aspect-[960/640]" />

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f1419]/90">
          <p className="text-zinc-400 text-sm animate-pulse">Đang tải thế giới...</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">
          Lỗi tải map — refresh trang
        </div>
      )}

      {playing && status === "ready" && (
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 pointer-events-none z-10">
          <span className="text-[10px] px-2 py-1 rounded bg-black/70 text-zinc-400 border border-white/10">
            WASD di chuyển
          </span>
          <span className="text-[10px] px-2 py-1 rounded bg-black/70 text-zinc-400 border border-white/10">
            E / Click $ để đánh quái
          </span>
          <span className="text-[10px] px-2 py-1 rounded bg-black/70 text-zinc-400 border border-white/10">
            Chạm người chơi → PvP
          </span>
        </div>
      )}
    </div>
  );
}
