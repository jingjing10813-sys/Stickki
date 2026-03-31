"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Group } from "@/types";

interface HeaderProps {
  group: Group;
  onGroupUpdate: (updated: Group) => void;
}

export default function Header({ group, onGroupUpdate }: HeaderProps) {
  const [editingMotto, setEditingMotto] = useState(false);
  const [mottoValue, setMottoValue] = useState(group.motto);

  async function saveMotto() {
    setEditingMotto(false);
    if (mottoValue === group.motto) return;
    const { data } = await supabase
      .from("groups")
      .update({ motto: mottoValue })
      .eq("id", group.id)
      .select()
      .single();
    if (data) onGroupUpdate(data);
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-white/5 px-6 h-14 flex items-center">
      {/* 방 이름 */}
      <span className="text-white font-semibold text-sm tracking-tight">
        {group.name}
      </span>

      {/* 가훈 - 중앙 */}
      <div className="absolute left-1/2 -translate-x-1/2">
        {editingMotto ? (
          <input
            autoFocus
            value={mottoValue}
            onChange={(e) => setMottoValue(e.target.value)}
            onBlur={saveMotto}
            onKeyDown={(e) => e.key === "Enter" && saveMotto()}
            className="font-motto text-lg text-white/80 bg-transparent outline-none text-center w-56 border-b border-white/30"
          />
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            onClick={() => setEditingMotto(true)}
            className="font-motto text-lg text-white/60 hover:text-white/90 transition-colors"
            title="클릭해서 수정"
          >
            {group.motto}
          </motion.button>
        )}
      </div>
    </header>
  );
}
