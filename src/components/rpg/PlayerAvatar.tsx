"use client";

import { motion } from "framer-motion";
import { getCharacter } from "@/lib/characters";
import type { CharacterClass } from "@/lib/types";

interface Props {
  name: string;
  characterClass?: CharacterClass;
  x: number;
  y: number;
  isSelf?: boolean;
  hidden?: boolean;
  score?: number;
  locked?: boolean;
}

export function PlayerAvatar({
  name,
  characterClass,
  x,
  y,
  isSelf,
  hidden,
  score,
  locked,
}: Props) {
  const char = getCharacter(characterClass);
  const label = hidden ? "???" : name.slice(0, 8);

  return (
    <motion.div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      animate={{ left: `${x}%`, top: `${y}%` }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
    >
      <motion.div
        animate={isSelf && !locked ? { y: [0, -4, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="flex flex-col items-center"
      >
        <div
          className={`relative w-11 h-11 rounded-full flex items-center justify-center text-xl border-2 ${
            isSelf ? "ring-2 ring-white/50 ring-offset-2 ring-offset-black" : ""
          }`}
          style={{
            background: hidden
              ? "rgba(60,60,60,0.8)"
              : `linear-gradient(135deg, ${char.color}44, ${char.color}22)`,
            borderColor: hidden ? "#555" : char.color,
            boxShadow: hidden ? "none" : `0 0 20px ${char.glow}`,
          }}
        >
          {hidden ? "?" : char.emoji}
          {locked && isSelf && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[10px] flex items-center justify-center">
              ✓
            </span>
          )}
        </div>
        <div
          className={`mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap ${
            isSelf ? "bg-white text-black" : "bg-black/80 text-white border border-white/10"
          }`}
        >
          {label}
          {score !== undefined && !hidden && (
            <span className="ml-1 text-amber-400">{score.toFixed(0)}</span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
