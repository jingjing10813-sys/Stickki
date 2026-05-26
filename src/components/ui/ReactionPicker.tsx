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
      <div className="fixed inset-0 z-30" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.7, y: 8 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 꼬리 */}
        <div
          className={`absolute -bottom-1.5 w-3 h-3 rotate-45 ${
            align === "right" ? "right-4" : align === "left" ? "left-4" : "left-1/2 -translate-x-1/2"
          }`}
          style={{ background: "rgba(28,28,32,0.97)" }}
        />
        <div
          className="flex items-center gap-1 px-2.5 py-2 rounded-2xl"
          style={{
            background: "rgba(28,28,32,0.97)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
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
              className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-white/10 transition-colors"
            >
              {emoji}
            </motion.button>
          ))}

          {/* 구분선 */}
          <div className="w-px h-6 mx-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />

          {/* 고정 버튼 */}
          {onTogglePin && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: EMOJIS.length * 0.03 + 0.02, type: "spring", stiffness: 400, damping: 25 }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { onTogglePin(); onClose(); }}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
              style={{ background: isPinned ? "rgba(255,213,0,0.2)" : "transparent" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={isPinned ? "#FFD700" : "none"} stroke={isPinned ? "#FFD700" : "rgba(255,255,255,0.7)"} strokeWidth="2" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </motion.button>
          )}

        </div>
      </motion.div>
    </>
  );
}
