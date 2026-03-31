"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Member, TaskType } from "@/types";
import { TODO_COLORS, NOTE_COLORS } from "@/components/ui/PostItCard";

interface AddTaskModalProps {
  groupId: string;
  members: Member[];
  onClose: () => void;
}

export default function AddTaskModal({ groupId, members, onClose }: AddTaskModalProps) {
  const [type, setType] = useState<TaskType>("todo");
  const [content, setContent] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [noteRecipientId, setNoteRecipientId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const colors = type === "todo" ? TODO_COLORS : NOTE_COLORS;
  const activeColor = selectedColor ?? colors[0];
  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null;

  async function handleSubmit() {
    if (!content.trim() || loading) return;
    setLoading(true);
    const rotation = (Math.random() - 0.5) * 14;
    const position_x = 5 + Math.random() * 55;
    const position_y = 5 + Math.random() * 55;
    await supabase.from("tasks").insert({
      group_id: groupId,
      content: content.trim(),
      type,
      assignee_name: type === "todo"
        ? (selectedMember?.name ?? null)
        : (noteRecipientId ? (members.find((m) => m.id === noteRecipientId)?.name ?? null) : null),
      status: "pending",
      rotation,
      position_x,
      position_y,
      color: activeColor,
    });
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 40 }}
        className="relative w-full max-w-lg t-elevated rounded-t-3xl pt-3 pb-10 px-5 z-10"
        style={{ boxShadow: "0 -20px 60px rgba(0,0,0,0.3)" }}
      >
        {/* 드래그 핸들 */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: "var(--border-mid)" }} />

        {/* 포스트잇 프리뷰 */}
        <motion.div
          layout
          className="w-full rounded-2xl p-5 mb-5 relative overflow-hidden"
          style={{
            backgroundColor: activeColor,
            minHeight: 140,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(0,0,0,0.05) 27px, rgba(0,0,0,0.04) 28px)",
            }}
          />
          {type === "note" && (
            <div className="absolute -top-1 left-1/2 -translate-x-1/2">
              <svg width="18" height="28" viewBox="0 0 20 32" fill="none">
                <ellipse cx="10" cy="10" rx="10" ry="10" fill="#E53935"/>
                <ellipse cx="7" cy="7" rx="3" ry="3" fill="rgba(255,255,255,0.4)"/>
                <rect x="9" y="18" width="2" height="14" rx="1" fill="#B71C1C"/>
              </svg>
            </div>
          )}

          <div className="relative flex items-start justify-between gap-3">
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === "todo" ? "할 일을 적어요..." : "하고 싶은 말을 적어요..."}
              rows={3}
              className="flex-1 bg-transparent font-motto text-lg text-black/80 placeholder-black/30 outline-none resize-none"
            />
            {type === "todo" && selectedMember && (
              <motion.div
                key={selectedMember.id}
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: selectedMember.color + "99" }}
              >
                {selectedMember.avatar ?? selectedMember.name.slice(0, 1).toUpperCase()}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* 타입 선택 */}
        <div className="flex gap-2 mb-4">
          {(["todo", "note"] as TaskType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setSelectedColor(null); setSelectedMemberId(null); setNoteRecipientId(null); }}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: type === t ? "var(--btn-primary-bg)" : "var(--btn-secondary-bg)",
                color: type === t ? "var(--btn-primary-text)" : "var(--btn-secondary-text)",
              }}
            >
              {t === "todo" ? "📋 할 일" : "📌 쪽지"}
            </button>
          ))}
        </div>

        {/* 담당자 선택 */}
        <AnimatePresence>
          {type === "todo" && members.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="overflow-hidden mb-4"
            >
              <p className="t-text-muted text-xs mb-2.5">담당자</p>
              <div className="flex gap-2 flex-wrap">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedMemberId(null)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    backgroundColor: selectedMemberId === null ? "var(--card-hover)" : "var(--card)",
                    color: selectedMemberId === null ? "var(--text-1)" : "var(--text-3)",
                    border: `1px solid ${selectedMemberId === null ? "var(--border-mid)" : "var(--border-color)"}`,
                  }}
                >
                  없음
                </motion.button>
                {members.map((member) => {
                  const isSelected = selectedMemberId === member.id;
                  return (
                    <motion.button
                      key={member.id}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedMemberId(isSelected ? null : member.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                      style={{
                        backgroundColor: isSelected ? member.color + "33" : "var(--card)",
                        borderColor: isSelected ? member.color : "var(--border-color)",
                        color: isSelected ? member.color : "var(--text-3)",
                        border: `1px solid ${isSelected ? member.color : "var(--border-color)"}`,
                      }}
                    >
                      <span className="text-sm leading-none">
                        {member.avatar ?? member.name.slice(0, 1)}
                      </span>
                      {member.name}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 쪽지 수신자 선택 */}
        <AnimatePresence>
          {type === "note" && members.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="overflow-hidden mb-4"
            >
              <p className="t-text-muted text-xs mb-2.5">받는 사람</p>
              <div className="flex gap-2 flex-wrap">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setNoteRecipientId(null)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    backgroundColor: noteRecipientId === null ? "var(--card-hover)" : "var(--card)",
                    color: noteRecipientId === null ? "var(--text-1)" : "var(--text-3)",
                    border: `1px solid ${noteRecipientId === null ? "var(--border-mid)" : "var(--border-color)"}`,
                  }}
                >
                  모두에게
                </motion.button>
                {members.map((member) => {
                  const isSelected = noteRecipientId === member.id;
                  return (
                    <motion.button
                      key={member.id}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setNoteRecipientId(isSelected ? null : member.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                      style={{
                        backgroundColor: isSelected ? member.color + "33" : "var(--card)",
                        color: isSelected ? member.color : "var(--text-3)",
                        border: `1px solid ${isSelected ? member.color : "var(--border-color)"}`,
                      }}
                    >
                      <span className="text-sm leading-none">
                        {member.avatar ?? member.name.slice(0, 1)}
                      </span>
                      {member.name}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 컬러 피커 */}
        <div className="mb-5">
          <p className="t-text-muted text-xs mb-2.5">포스트잇 색상</p>
          <div className="flex gap-2.5 flex-wrap">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className="w-8 h-8 rounded-full transition-transform"
                style={{
                  backgroundColor: c,
                  transform: activeColor === c ? "scale(1.2)" : "scale(1)",
                  boxShadow: activeColor === c ? "0 0 0 2px var(--btn-primary-bg)" : "none",
                }}
              />
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl t-btn-secondary font-semibold"
          >
            취소
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
            className="flex-1 py-3.5 rounded-2xl t-btn-primary font-semibold disabled:opacity-30"
          >
            {loading ? "붙이는 중..." : "붙이기 ✦"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
