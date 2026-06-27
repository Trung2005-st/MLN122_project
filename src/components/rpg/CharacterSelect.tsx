"use client";

import { motion } from "framer-motion";
import { CHARACTERS } from "@/lib/characters";
import type { CharacterClass } from "@/lib/types";

interface Props {
  selected: CharacterClass;
  onSelect: (c: CharacterClass) => void;
}

export function CharacterSelect({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CHARACTERS.map((c) => {
        const active = selected === c.id;
        return (
          <motion.button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`relative text-left p-4 rounded-xl border transition-all duration-300 overflow-hidden ${
              active
                ? "border-white/30 bg-white/[0.08]"
                : "border-white/[0.08] bg-white/[0.03] hover:border-white/20"
            }`}
            style={
              active
                ? { boxShadow: `0 0 40px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.1)` }
                : undefined
            }
          >
            {active && (
              <motion.div
                layoutId="char-glow"
                className="absolute inset-0 opacity-20"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${c.color}, transparent 70%)`,
                }}
              />
            )}
            <span className="text-3xl block mb-2">{c.emoji}</span>
            <span className="block text-sm font-semibold text-white">{c.title}</span>
            <span className="block text-xs text-zinc-500 mt-0.5">{c.subtitle}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
