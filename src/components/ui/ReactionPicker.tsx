"use client";

import { motion } from "framer-motion";

const EMOJIS = ["❤️", "😂", "👍", "🔥", "😮", "😢", "🎉", "👀"];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function ReactionPicker({ onSelect, onDelete, onClose }: ReactionPickerProps) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.7, y: 8 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 꼬리 */}
        <div
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
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

          {/* 삭제 버튼 */}
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: EMOJIS.length * 0.03, type: "spring", stiffness: 400, damping: 25 }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { onDelete(); onClose(); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-500/20 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M6 7v5M10 7v5M3 4l1 9.5a.5.5 0 00.5.5h7a.5.5 0 00.5-.5L13 4" stroke="#FF6B6B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
