"use client";

import { motion } from "framer-motion";

interface FABProps {
  onClick: () => void;
}

export default function FAB({ onClick }: FABProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed bottom-8 right-6 w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center z-40"
      aria-label="추가하기"
    >
      <span className="text-black text-2xl font-light leading-none">+</span>
    </motion.button>
  );
}
