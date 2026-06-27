"use client";

import { motion } from "framer-motion";

interface Props {
  challengerName: string;
  onAccept: () => void;
  onReject: () => void;
}

export function ChallengeModal({
  challengerName,
  onAccept,
  onReject,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm mx-4"
    >
      <div className="rounded-2xl border border-fuchsia-500/30 bg-black/90 backdrop-blur-xl p-5 shadow-2xl">
        <p className="text-white font-medium mb-1">⚔️ Lời thách đấu!</p>
        <p className="text-zinc-400 text-sm mb-4">
          <strong className="text-fuchsia-300">{challengerName}</strong> muốn đánh bạn.
          Cả hai trả lời câu hỏi — ai đúng nhanh hơn thắng.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-medium text-sm transition"
          >
            Chiến!
          </button>
          <button
            type="button"
            onClick={onReject}
            className="flex-1 py-2.5 rounded-xl border border-white/20 hover:bg-white/5 text-sm transition"
          >
            Từ chối
          </button>
        </div>
      </div>
    </motion.div>
  );
}
