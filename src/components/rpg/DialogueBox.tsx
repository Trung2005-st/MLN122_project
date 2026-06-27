"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  speaker: string;
  title: string;
  text: string;
  theory?: string;
  visible: boolean;
  avatar?: string;
}

export function DialogueBox({
  speaker,
  title,
  text,
  theory,
  visible,
  avatar = "📜",
}: Props) {
  const [displayed, setDisplayed] = useState("");
  const full = `${text}${theory ? `\n\n"${theory}"` : ""}`;

  useEffect(() => {
    if (!visible) {
      setDisplayed("");
      return;
    }
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(full.slice(0, i));
      if (i >= full.length) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [visible, full]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="absolute bottom-4 left-4 right-4 z-30 md:left-auto md:right-6 md:bottom-6 md:w-[420px]"
        >
          <div className="rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl p-5 shadow-2xl">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-600/20 flex items-center justify-center text-2xl border border-amber-500/30">
                {avatar}
              </div>
              <div>
                <p className="text-xs text-amber-400/80 uppercase tracking-wider">
                  {speaker}
                </p>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              </div>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed min-h-[4rem] whitespace-pre-wrap">
              {displayed}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-block w-0.5 h-4 bg-amber-400 ml-0.5 align-middle"
              />
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
