"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { CombatQuestionView } from "@/lib/types";

interface Props {
  question: CombatQuestionView;
  onAnswer: (choiceIndex: number) => void;
  onFlee: () => void;
  serverTime: number;
}

export function CombatModal({
  question,
  onAnswer,
  onFlee,
  serverTime,
}: Props) {
  const [now, setNow] = useState(serverTime);

  useEffect(() => {
    setNow(serverTime);
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [serverTime]);

  const remaining = Math.max(0, question.deadlineAt - now);
  const pct = Math.min(
    100,
    ((question.timeLimitSec * 1000 - remaining) / (question.timeLimitSec * 1000)) * 100
  );
  const urgent = remaining < 5000;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs uppercase tracking-widest text-amber-400">
            ⚔️ Chiến đấu · {question.difficulty}
          </span>
          <span
            className={`font-mono tabular-nums ${urgent ? "text-red-400 animate-pulse" : "text-white"}`}
          >
            {Math.ceil(remaining / 1000)}s
          </span>
        </div>

        <div className="h-1 rounded-full bg-white/10 mb-5 overflow-hidden">
          <div
            className={`h-full ${urgent ? "bg-red-500" : "bg-amber-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-lg font-medium text-white mb-6 leading-relaxed">
          {question.text}
        </p>

        <div className="space-y-2 mb-6">
          {question.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onAnswer(i)}
              className="w-full text-left px-4 py-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-amber-500/20 hover:border-amber-500/40 transition text-sm text-zinc-200"
            >
              <span className="text-amber-400/80 mr-2">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onFlee}
          className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition"
        >
          Thoát / Đầu hàng (−50% thưởng hoặc khóa 5s)
        </button>
      </motion.div>
    </motion.div>
  );
}
