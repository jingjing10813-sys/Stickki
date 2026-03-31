"use client";

import { motion } from "framer-motion";

export type TimeFilter = "today" | "yesterday" | "week" | "all";

const OPTIONS: { label: string; value: TimeFilter }[] = [
  { label: "오늘", value: "today" },
  { label: "어제", value: "yesterday" },
  { label: "이번 주", value: "week" },
  { label: "전체", value: "all" },
];

interface SegmentedControlProps {
  value: TimeFilter;
  onChange: (value: TimeFilter) => void;
}

export default function SegmentedControl({ value, onChange }: SegmentedControlProps) {
  return (
    <div className="inline-flex glass rounded-2xl p-1 gap-0.5">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className="relative px-4 py-1.5 text-sm font-medium rounded-xl transition-colors z-10"
          style={{ color: value === option.value ? "#0d0d0f" : "rgba(255,255,255,0.5)" }}
        >
          {value === option.value && (
            <motion.span
              layoutId="segmented-pill"
              className="absolute inset-0 bg-white rounded-xl"
              style={{ zIndex: -1 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            />
          )}
          {option.label}
        </button>
      ))}
    </div>
  );
}
