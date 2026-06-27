"use client";

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import type { GameRoom } from "@/lib/types";
import type { OpenWorldSync } from "./phaser/OpenWorldScene";

interface Props {
  room: GameRoom;
  currentPlayerId: string;
  onMove: (x: number, y: number) => void;
  onAttackMonster: (id: string, x: number, y: number) => void;
  onCollectGift: (id: string, x: number, y: number) => void;
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
    import("./phaser/OpenWorldScene");
  }, []);

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
          onAttackMonster: (id, x, y) =>
            callbacksRef.current.onAttackMonster(id, x, y),
          onCollectGift: (id, x, y) =>
            callbacksRef.current.onCollectGift(id, x, y),
          onReady: () => {
            if (mounted) setStatus("ready");
          },
        };

        gameRef.current = createOpenWorldGame(containerRef.current, sync);
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
    if (!gameRef.current) return;
    import("./phaser/OpenWorldScene").then(({ syncOpenWorld }) => {
      syncOpenWorld(gameRef.current, {
        room,
        currentPlayerId,
        onMove: (x, y) => callbacksRef.current.onMove(x, y),
        onAttackMonster: (id, x, y) =>
          callbacksRef.current.onAttackMonster(id, x, y),
        onCollectGift: (id, x, y) =>
          callbacksRef.current.onCollectGift(id, x, y),
      });
    });
  }, [room, currentPlayerId]);

  const playing = room.phase === "playing" || room.phase === "ending_soon";

  return (
    <div className="relative w-full rounded-2xl border border-white/[0.08] overflow-hidden bg-[#c4a574]">
      <div
        ref={containerRef}
        className="w-full min-h-[320px] aspect-[960/640]"
        onClick={() => gameRef.current?.canvas?.focus()}
      />

      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f1419]/90 gap-2">
          <p className="text-zinc-300 text-sm animate-pulse">Đang tải bản đồ...</p>
          <p className="text-zinc-500 text-xs">Timer chưa chạy trong 12s đầu</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">
          Lỗi tải map — refresh trang
        </div>
      )}

      {playing && status === "ready" && (
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 pointer-events-none z-10">
          <span className="text-[10px] px-2 py-1 rounded bg-black/70 text-zinc-300 border border-white/10">
            Click map rồi WASD di chuyển
          </span>
          <span className="text-[10px] px-2 py-1 rounded bg-black/70 text-zinc-300 border border-white/10">
            E / Click $ đánh quái
          </span>
          <span className="text-[10px] px-2 py-1 rounded bg-black/70 text-zinc-300 border border-white/10">
            E / Click 🎁 nhặt quà
          </span>
        </div>
      )}
    </div>
  );
}
