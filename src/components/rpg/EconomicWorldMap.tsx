"use client";

import { motion } from "framer-motion";
import { MAP_ZONES, HUB, avatarPosition } from "@/lib/map-zones";
import { PlayerAvatar } from "./PlayerAvatar";
import type {
  Allocation,
  AllocationBucket,
  CharacterClass,
  Player,
} from "@/lib/types";

interface Props {
  allocation: Allocation;
  onAllocationChange: (a: Allocation) => void;
  players: Record<string, Player>;
  currentPlayerId: string;
  phase: string;
  disabled?: boolean;
  showAllAllocations?: boolean;
}

const STEPS = [5, 10, 25];

export function EconomicWorldMap({
  allocation,
  onAllocationChange,
  players,
  currentPlayerId,
  phase,
  disabled,
  showAllAllocations,
}: Props) {
  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  const remaining = 100 - total;
  const isAllocating = phase === "allocating" && !disabled;
  const hideOthers = phase === "allocating" || phase === "briefing";

  function addToZone(zone: AllocationBucket, amount: number) {
    if (!isAllocating || amount > remaining) return;
    onAllocationChange({
      ...allocation,
      [zone]: allocation[zone] + amount,
    });
  }

  function removeFromZone(zone: AllocationBucket, amount: number) {
    if (!isAllocating) return;
    onAllocationChange({
      ...allocation,
      [zone]: Math.max(0, allocation[zone] - amount),
    });
  }

  const myPos = avatarPosition(allocation);

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[16/10] rounded-2xl border border-white/[0.08] overflow-hidden bg-[#050505]">
      {/* Terrain */}
      <div className="absolute inset-0">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          {MAP_ZONES.map((z) => (
            <line
              key={`path-${z.id}`}
              x1={HUB.x}
              y1={HUB.y}
              x2={z.x}
              y2={z.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.3"
              strokeDasharray="1 1"
            />
          ))}
          <circle cx={HUB.x} cy={HUB.y} r="18" fill="url(#hubGlow)" />
        </svg>
      </div>

      {/* Hub label */}
      <div
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }}
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center backdrop-blur-sm"
        >
          <span className="text-2xl md:text-3xl">⚖️</span>
        </motion.div>
        <p className="text-[9px] md:text-[10px] text-center text-zinc-500 mt-1 whitespace-nowrap">
          {HUB.name}
        </p>
      </div>

      {/* Zones */}
      {MAP_ZONES.map((zone) => {
        const invested = allocation[zone.id];
        const active = invested > 0;
        const isSelected = isAllocating && active;

        return (
          <motion.div
            key={zone.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
            whileHover={isAllocating ? { scale: 1.05 } : undefined}
          >
            <button
              type="button"
              disabled={!isAllocating}
              onClick={() => addToZone(zone.id, Math.min(10, remaining))}
              className={`group relative flex flex-col items-center transition-all ${
                isAllocating ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <motion.div
                animate={
                  isSelected
                    ? {
                        boxShadow: [
                          `0 0 20px ${zone.color}44`,
                          `0 0 40px ${zone.color}66`,
                          `0 0 20px ${zone.color}44`,
                        ],
                      }
                    : {}
                }
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-2xl border flex flex-col items-center justify-center backdrop-blur-md transition-colors ${
                  active
                    ? "border-white/30 bg-white/[0.1]"
                    : "border-white/[0.08] bg-white/[0.03] group-hover:border-white/20"
                }`}
                style={
                  active
                    ? { boxShadow: `0 0 30px ${zone.color}33` }
                    : undefined
                }
              >
                <span className="text-2xl md:text-3xl">{zone.icon}</span>
                {invested > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 min-w-[28px] h-7 px-1.5 rounded-full text-xs font-bold flex items-center justify-center text-black"
                    style={{ background: zone.color }}
                  >
                    {invested}
                  </motion.span>
                )}
              </motion.div>
              <p
                className="text-[9px] md:text-[10px] font-semibold mt-1.5 text-center max-w-[90px] leading-tight"
                style={{ color: active ? zone.color : "#888" }}
              >
                {zone.name}
              </p>
            </button>

            {/* Zone controls */}
            {isAllocating && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-1 mt-2 justify-center"
              >
                {STEPS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToZone(zone.id, Math.min(s, remaining));
                    }}
                    disabled={remaining < s}
                    className="px-1.5 py-0.5 text-[9px] rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 border border-white/10"
                  >
                    +{s}
                  </button>
                ))}
                {invested > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromZone(zone.id, 10);
                    }}
                    className="px-1.5 py-0.5 text-[9px] rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/30"
                  >
                    −10
                  </button>
                )}
              </motion.div>
            )}

            {showAllAllocations && invested > 0 && (
              <div className="mt-1 text-center text-[9px] text-zinc-500">
                {zone.building}
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Player avatars */}
      {Object.values(players).map((p) => {
        const isSelf = p.id === currentPlayerId;
        const hidden = hideOthers && !isSelf;
        let pos: { x: number; y: number } = { x: HUB.x, y: HUB.y };
        if (!hidden && p.allocation) {
          pos = avatarPosition(p.allocation);
        } else if (isSelf) {
          pos = myPos;
        }
        // Offset multiple players at same spot
        const idx = Object.keys(players).indexOf(p.id);
        const offsetX = (idx % 3 - 1) * 3;
        const offsetY = (Math.floor(idx / 3) - 1) * 3;

        return (
          <PlayerAvatar
            key={p.id}
            name={p.name}
            characterClass={p.characterClass}
            x={pos.x + offsetX}
            y={pos.y + offsetY}
            isSelf={isSelf}
            hidden={hidden && !isSelf}
            score={p.totalScore}
            locked={p.locked}
          />
        );
      })}

      {/* Wallet bar */}
      {isAllocating && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <span className="text-sm text-zinc-400">Vốn còn lại</span>
          </div>
          <motion.span
            key={remaining}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className={`text-2xl font-bold font-mono ${
              remaining === 0 ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {remaining}
          </motion.span>
          <span className="text-xs text-zinc-600">/ 100</span>
        </motion.div>
      )}
    </div>
  );
}
