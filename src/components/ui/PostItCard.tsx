"use client";

import { memo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task } from "@/types";
import { supabase } from "@/lib/supabase";

import ReactionPicker from "./ReactionPicker";

export const TODO_COLORS = [
  "#FFF9C4", "#FFECB3", "#F8BBD9", "#E1BEE7",
  "#B2EBF2", "#C8E6C9", "#FFCCBC",
];

export const NOTE_COLORS = [
  "#FFF9C4", "#F8BBD9", "#B2EBF2",
  "#C8E6C9", "#E1BEE7", "#FFCCBC", "#FFECB3",
];

// Stable references prevent framer-motion from restarting animations on re-render
const SWAP_SCALE = [0.82, 1.06, 1];
const DRAG_ROTATE_DELTA = 6;

export function getColor(id: string, colors: string[]): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

interface PostItCardProps {
  task: Task;
  style?: React.CSSProperties;
  memberAvatar?: string;
  isDragging?: boolean;
  isDropTarget?: boolean;
  isSwapping?: boolean;
  onDragStart?: (id: string, clientX: number, clientY: number) => void;
}

function PostItCard({ task, style, memberAvatar, isDragging, isDropTarget, isSwapping, onDragStart }: PostItCardProps) {
  const isPinned = task.is_pinned ?? false;
  const [showPicker, setShowPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isTodo = task.type === "todo";
  const isDone = task.status === "done";
  const color = task.color ?? (isTodo
    ? getColor(task.id, TODO_COLORS)
    : getColor(task.id, NOTE_COLORS));

  const reactions: Record<string, number> = task.reactions ?? {};
  const reactionEntries = Object.entries(reactions).filter(([, count]) => count > 0);
  const lastTapRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [pickerAlign, setPickerAlign] = useState<"left" | "center" | "right">("center");

  async function handleToggleDone() {
    if (!isTodo) return;
    await supabase.from("tasks").update({
      status: isDone ? "pending" : "done",
      completed_at: isDone ? null : new Date().toISOString(),
    }).eq("id", task.id);
  }

  async function handleTogglePin() {
    await supabase.from("tasks").update({ is_pinned: !isPinned }).eq("id", task.id);
  }

  async function handleReaction(emoji: string) {
    const current = reactions[emoji] ?? 0;
    const updated = { ...reactions, [emoji]: current > 0 ? 0 : 1 };
    await supabase.from("tasks").update({ reactions: updated }).eq("id", task.id);
  }

  function startDelete() {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    // 애니메이션 후 DB 삭제
    setTimeout(() => {
      supabase.from("tasks").delete().eq("id", task.id);
    }, 550);
  }

  return (
    <div
      ref={cardRef}
      data-card-id={task.id}
      className="relative"
      style={{
        width: 148,
        paddingBottom: isTodo ? 0 : 20,
        zIndex: isDropTarget ? 30 : showDeleteConfirm ? 50 : undefined,
        pointerEvents: isDragging ? "none" : undefined,
        touchAction: "none",
        ...style,
      }}
      onPointerDown={(e) => {
        if ((e.target as Element).closest("button")) return;
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          lastTapRef.current = 0;
          if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            const vw = window.innerWidth;
            const pickerW = 320;
            if (rect.left + pickerW / 2 > vw) setPickerAlign("right");
            else if (rect.right - pickerW / 2 < 0) setPickerAlign("left");
            else setPickerAlign("center");
          }
          setShowPicker(true);
          return;
        }
        lastTapRef.current = now;
        e.currentTarget.setPointerCapture(e.pointerId);
        onDragStart?.(task.id, e.clientX, e.clientY);
      }}
    >
      {/* 반응 피커 */}
      <AnimatePresence>
        {showPicker && (
          <ReactionPicker
            onSelect={handleReaction}
            onDelete={() => { setShowPicker(false); setShowDeleteConfirm(true); }}
            onClose={() => setShowPicker(false)}
            isPinned={isPinned}
            onTogglePin={handleTogglePin}
            align={pickerAlign}
          />
        )}
      </AnimatePresence>

      {/* 드래그 카드 */}
      <motion.div
        initial={
          isTodo
            ? { opacity: 0, scale: 0.6, rotate: task.rotation - 8 }
            : { opacity: 0, y: -100, scale: 0.85, rotate: task.rotation }
        }
        animate={
          isDeleting
            ? { opacity: 0, y: 320, rotate: task.rotation + (Math.random() > 0.5 ? 18 : -18), scale: 0.7, transition: { duration: 0.5, ease: [0.4, 0, 1, 1] } }
            : isDragging
            ? { rotate: [task.rotation - DRAG_ROTATE_DELTA, task.rotation + DRAG_ROTATE_DELTA, task.rotation - DRAG_ROTATE_DELTA], opacity: isDone ? 0.4 : 1, scale: 1, y: 0 }
            : isSwapping
            ? { scale: SWAP_SCALE, rotate: task.rotation, opacity: isDone ? 0.4 : 1, y: 0 }
            : { opacity: isDone ? 0.4 : 1, scale: 1, rotate: task.rotation, y: 0 }
        }
        exit={{ opacity: 0 }}
        transition={
          isDragging
            ? { duration: 0.35, repeat: Infinity, ease: "easeInOut" }
            : isSwapping
            ? { duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }
            : { type: "spring", stiffness: 300, damping: 28 }
        }
        className="relative"
        onPointerDown={() => setShowDeleteConfirm(false)}
      >
        {/* 고정 핀 */}
        {isPinned && (
          <motion.div
            initial={{ scale: 0, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 18, delay: 0.08 }}
            className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))" }}
          >
            <svg width="20" height="32" viewBox="0 0 20 32" fill="none">
              <ellipse cx="10" cy="10" rx="10" ry="10" fill="#E53935"/>
              <ellipse cx="7" cy="7" rx="3" ry="3" fill="rgba(255,255,255,0.4)"/>
              <rect x="9" y="18" width="2" height="14" rx="1" fill="#B71C1C"/>
            </svg>
          </motion.div>
        )}

        {/* 클립 (쪽지, 고정 아닐 때) */}
        {!isTodo && !isPinned && (
          <motion.div
            initial={{ scale: 0, y: -6 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 18, delay: 0.08 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
            style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))" }}
          >
            <svg width="14" height="26" viewBox="0 0 14 26" fill="none">
              <path d="M7 24C3.7 24 1 21.3 1 18V6.5C1 4 3 2 5.5 2C8 2 10 4 10 6.5V18C10 19.7 8.7 21 7 21C5.3 21 4 19.7 4 18V7" stroke="#90A4AE" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
            </svg>
          </motion.div>
        )}

        {/* 카드 본체 */}
        <div
          className="rounded-xl overflow-visible select-none"
          style={{
            backgroundColor: color,
            aspectRatio: isTodo ? "1/1" : "3/4",
            boxShadow: `0 2px 4px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)`,
            filter: isDone ? "saturate(0.4) brightness(0.9)" : "none",
          }}
        >
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.04) 23px, rgba(0,0,0,0.04) 24px)",
              opacity: 0.5,
            }}
          />
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              outline: "3px solid var(--btn-primary-bg)",
              outlineOffset: 2,
              opacity: isDropTarget ? 1 : 0,
              transition: "opacity 80ms ease",
            }}
          />

          <div className="relative p-3 h-full flex flex-col">
            {isTodo && (
              <div className="flex items-start justify-between mb-2">
                <button
                  onPointerDown={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleToggleDone(); }}
                  className={`relative flex-shrink-0 mt-0.5 -m-1.5 p-1.5`}
                  style={{ touchAction: "none" }}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isDone ? "border-black/40 bg-black/30" : "border-black/25 bg-transparent"
                  }`}>
                    {isDone && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                </button>
                <motion.span
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.18 }}
                  className="text-2xl leading-none -mt-1 -mr-1"
                  style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.2))" }}
                >
                  {memberAvatar ?? "🐾"}
                </motion.span>
              </div>
            )}

            <p
              className="font-motto text-black/80 leading-snug flex-1"
              style={{
                textDecoration: isDone ? "line-through" : "none",
                fontSize: task.content.length > 30 ? "12px" : "14px",
              }}
            >
              {task.content}
            </p>

            {isTodo && task.assignee_name && (
              <p className="text-black/35 text-[10px] mt-1 font-sans">{task.assignee_name}</p>
            )}
          </div>
        </div>

        {/* 반응 이모지 뱃지 */}
        <AnimatePresence>
          {reactionEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1"
            >
              {reactionEntries.map(([emoji, count]) => (
                <motion.button
                  key={emoji}
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: "rgba(30,30,35,0.85)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    border: "2px solid #ffffff",
                  }}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  {count > 1 && <span className="text-white/70 text-[10px]">{count}</span>}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 삭제 확인 팝업 — motion.div 뒤에 배치해서 위에 렌더링 */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 6 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 flex flex-col items-center gap-2.5 px-4 py-3 rounded-2xl"
            style={{
              background: "rgba(28,28,32,0.97)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              minWidth: 148,
              zIndex: 60,
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
              style={{ background: "rgba(28,28,32,0.97)" }}
            />
            <p className="text-white/70 text-xs font-medium">삭제할까요?</p>
            <div className="flex gap-2 w-full">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-white/40"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                취소
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); startDelete(); }}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-white"
                style={{ backgroundColor: "#E53935" }}
              >
                삭제
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 외부 클릭 닫기 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-40" onClick={() => setShowDeleteConfirm(false)} />
      )}
    </div>
  );
}

export default memo(PostItCard);
