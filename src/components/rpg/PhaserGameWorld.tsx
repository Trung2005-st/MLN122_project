"use client";

import { useEffect, useRef, useCallback } from "react";
import type Phaser from "phaser";
import type {
  Allocation,
  AllocationBucket,
  Player,
} from "@/lib/types";
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
  const onAllocateRef = useRef<(zone: AllocationBucket, amount: number) => void>(
    () => {}
  );

  const handleAllocate = useCallback(
    (zone: AllocationBucket, amount: number) => {
      onAllocationChange({
        ...allocation,
        [zone]: allocation[zone] + amount,
      });
    },
    [allocation, onAllocationChange]
  );

  onAllocateRef.current = (zone, amount) => {
    const total = Object.values(allocation).reduce((a, b) => a + b, 0);
    if (total + amount > 100) return;
    onAllocationChange({
      ...allocation,
      [zone]: allocation[zone] + amount,
    });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { createPhaserGame } = await import("./phaser/WorldScene");
      if (!mounted || !containerRef.current || gameRef.current) return;

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
    })();

    return () => {
      mounted = false;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gameRef.current) return;
    (async () => {
      const { syncPhaserWorld } = await import("./phaser/WorldScene");
      syncPhaserWorld(gameRef.current, {
        allocation,
        players,
        currentPlayerId,
        phase,
        disabled,
        showAll: showAllAllocations,
        onAllocate: (z, a) => onAllocateRef.current(z, a),
      });
    })();
  }, [
    allocation,
    players,
    currentPlayerId,
    phase,
    disabled,
    showAllAllocations,
  ]);

  return (
    <div className="relative w-full rounded-2xl border border-white/[0.08] overflow-hidden bg-[#1a1a2e] shadow-2xl shadow-blue-500/10">
      <div
        ref={containerRef}
        className="w-full aspect-[960/640] [&_canvas]:!w-full [&_canvas]:!h-full"
      />
      {phase === "allocating" && !disabled && (
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none">
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
