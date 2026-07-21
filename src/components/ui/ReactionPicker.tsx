"use client";

import { motion } from "framer-motion";

const EMOJIS = ["❤️", "😂", "👍", "🔥", "😮", "😢", "🎉", "👀"];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  align?: "left" | "center" | "right";
}

export default function ReactionPicker({ onSelect, onClose, isPinned, onTogglePin, align = "center" }: ReactionPickerProps) {
  return (
    <>
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.7, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.7, y: -8 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 꼬리 — 피커가 메모 아래에 위치하므로 위쪽에서 카드를 향해 뾰족하게 */}
        <div
          className={`absolute -top-1.5 w-3 h-3 rotate-45 ${
            align === "right" ? "right-4" : align === "left" ? "left-4" : "left-1/2 -translate-x-1/2"
          }`}
          style={{ background: "rgba(31,32,35,0.2)", backdropFilter: "blur(7.3px)", WebkitBackdropFilter: "blur(7.3px)" }}
        />
        <div
          className="flex items-center gap-0.5 px-1.5 py-1 rounded-full"
          style={{
            background: "rgba(31,32,35,0.2)",
            backdropFilter: "blur(7.3px)",
            WebkitBackdropFilter: "blur(7.3px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          }}
        >
          {EMOJIS.map((emoji, i) => (
            <motion.button
              key={emoji}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 25 }}
              whileHover={{ scale: 1.35 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { onSelect(emoji); onClose(); }}
              className="w-6 h-6 flex items-center justify-center text-sm rounded-full hover:bg-white/20 transition-colors"
            >
              {emoji}
            </motion.button>
          ))}

          {/* 구분선 */}
          <div className="w-px h-4 mx-0.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.3)" }} />

          {/* 고정 버튼 */}
          {onTogglePin && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: EMOJIS.length * 0.03 + 0.02, type: "spring", stiffness: 400, damping: 25 }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { onTogglePin(); onClose(); }}
              className="w-6 h-6 flex items-center justify-center rounded-full transition-colors"
              style={{ background: isPinned ? "rgba(255,213,0,0.3)" : "transparent" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={isPinned ? "#FFD700" : "none"} stroke={isPinned ? "#FFD700" : "rgba(255,255,255,0.85)"} strokeWidth="2" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </motion.button>
          )}

        </div>
      </motion.div>
    </>
  );
}
