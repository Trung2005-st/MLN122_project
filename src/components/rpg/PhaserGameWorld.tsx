"use client";

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import type { Allocation, AllocationBucket, Player } from "@/lib/types";
import type { WorldSyncPayload } from "./phaser/WorldScene";

interface Props {
  allocation: Allocation;
  onAllocationChange: (a: Allocation) => void;
  players: Record<string, Player>;
  currentPlayerId: string;
  phase: string;
  disabled?: boolean;
  showAllAllocations?: boolean;
}

export function PhaserGameWorld({
  allocation,
  onAllocationChange,
  players,
  currentPlayerId,
  phase,
  disabled,
  showAllAllocations,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const initRef = useRef(false);
  const onAllocateRef = useRef<(zone: AllocationBucket, amount: number) => void>(
    () => {}
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState("");

  onAllocateRef.current = (zone, amount) => {
    const total = Object.values(allocation).reduce((a, b) => a + b, 0);
    if (total + amount > 100) return;
    onAllocationChange({
      ...allocation,
      [zone]: allocation[zone] + amount,
    });
  };

  // Khởi tạo Phaser khi container đã có kích thước
  useEffect(() => {
    let mounted = true;
    let observer: ResizeObserver | null = null;

    async function boot() {
      if (!mounted || !containerRef.current || initRef.current) return;

      const el = containerRef.current;
      if (el.clientWidth < 80) return;

      try {
        initRef.current = true;
        const { createPhaserGame } = await import("./phaser/WorldScene");

        if (!mounted || !containerRef.current) return;

        const payload: WorldSyncPayload = {
          allocation,
          players,
          currentPlayerId,
          phase,
          disabled,
          showAll: showAllAllocations,
          onAllocate: (z, a) => onAllocateRef.current(z, a),
        };

        gameRef.current = createPhaserGame(containerRef.current, payload);
        setStatus("ready");
      } catch (e) {
        initRef.current = false;
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : "Không khởi tạo được game");
        console.error("[PhaserGameWorld]", e);
      }
    }

    boot();

    if (containerRef.current && !initRef.current) {
      observer = new ResizeObserver(() => {
        if (!initRef.current) boot();
      });
      observer.observe(containerRef.current);
    }

    return () => {
      mounted = false;
      observer?.disconnect();
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      initRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đồng bộ state React → Phaser
  useEffect(() => {
    if (!gameRef.current || status !== "ready") return;

    import("./phaser/WorldScene").then(({ syncPhaserWorld }) => {
      syncPhaserWorld(gameRef.current, {
        allocation,
        players,
        currentPlayerId,
        phase,
        disabled,
        showAll: showAllAllocations,
        onAllocate: (z, a) => onAllocateRef.current(z, a),
      });
    });
  }, [
    allocation,
    players,
    currentPlayerId,
    phase,
    disabled,
    showAllAllocations,
    status,
  ]);

  return (
    <div className="relative w-full rounded-2xl border border-white/[0.08] overflow-hidden bg-[#1a1a2e] shadow-2xl shadow-blue-500/10">
      <div
        ref={containerRef}
        className="w-full min-h-[320px] aspect-[960/640]"
        style={{ touchAction: "none" }}
      />

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]/90">
          <p className="text-zinc-400 text-sm animate-pulse">
            Đang tải bản đồ & nhân vật...
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a2e]/95 gap-2 p-4">
          <p className="text-red-400 text-sm">Lỗi tải game: {errorMsg}</p>
          <button
            type="button"
            className="text-xs px-3 py-1 rounded border border-white/20 hover:bg-white/5"
            onClick={() => window.location.reload()}
          >
            Tải lại trang
          </button>
        </div>
      )}

      {phase === "allocating" && !disabled && status === "ready" && (
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none z-10">
          <span className="text-[10px] px-2 py-1 rounded bg-black/70 text-zinc-400 border border-white/10">
            WASD / ↑↓←→ di chuyển
          </span>
          <span className="text-[10px] px-2 py-1 rounded bg-black/70 text-zinc-400 border border-white/10">
            Click vùng để +10 vốn
          </span>
        </div>
      )}
    </div>
  );
}
