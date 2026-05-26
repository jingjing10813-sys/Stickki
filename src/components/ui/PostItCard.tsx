"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import type { PanInfo } from "framer-motion";
import type { Task, Member } from "@/types";
import { supabase } from "@/lib/supabase";
import { useLongPress } from "@/hooks/useLongPress";
import ReactionPicker from "./ReactionPicker";
import TaskDetailModal from "@/components/modals/TaskDetailModal";

export const TODO_COLORS = [
  "#FFF9C4", "#FFECB3", "#F8BBD9", "#E1BEE7",
  "#B2EBF2", "#C8E6C9", "#FFCCBC",
];

export const NOTE_COLORS = [
  "#FFF9C4", "#F8BBD9", "#B2EBF2",
  "#C8E6C9", "#E1BEE7", "#FFCCBC", "#FFECB3",
];

export function getColor(id: string, colors: string[]): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getDdayDiff(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDdayLabel(diff: number): string {
  if (diff === 0) return "D-day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function getDdayBadgeStyle(diff: number): { bg: string; text: string } {
  if (diff <= 0) return { bg: "#E53935", text: "#fff" };
  if (diff < 5) return { bg: "#FF6B35", text: "#fff" };
  return { bg: "#9E9E9E", text: "#fff" };
}

interface PostItCardProps {
  task: Task;
  style?: React.CSSProperties;
  memberAvatar?: string;
  members?: Member[];
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onPositionChange?: (id: string, x: number, y: number) => void;
  onTaskUpdate?: (updated: Task) => void;
}

export default function PostItCard({ task, style, memberAvatar, members = [], containerRef, onPositionChange, onTaskUpdate }: PostItCardProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFolded, setIsFolded] = useState(true);
  const [reactions, setReactions] = useState<Record<string, number>>(task.reactions ?? {});
  const isDragging = useRef(false);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const isTodo = task.type === "todo";
  const isDone = task.status === "done";
  const color = task.color ?? (isTodo
    ? getColor(task.id, TODO_COLORS)
    : getColor(task.id, NOTE_COLORS));

  useEffect(() => {
    setReactions(task.reactions ?? {});
  }, [task.reactions]);

  const reactionEntries = Object.entries(reactions).filter(([, count]) => count > 0);

  const ddayDiff = task.due_date ? getDdayDiff(task.due_date) : null;

  async function handleToggleDone() {
    if (!isTodo) return;
    await supabase.from("tasks").update({
      status: isDone ? "pending" : "done",
      completed_at: isDone ? null : new Date().toISOString(),
    }).eq("id", task.id);
  }

  async function handleReaction(emoji: string) {
    const current = reactions[emoji] ?? 0;
    const updated = { ...reactions, [emoji]: current > 0 ? 0 : 1 };
    setReactions(updated);
    await supabase.from("tasks").update({ reactions: updated }).eq("id", task.id);
  }

  function startDelete() {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    setTimeout(() => {
      supabase.from("tasks").delete().eq("id", task.id);
    }, 550);
  }

  function handleCardClick() {
    if (isDragging.current) return;
    if (isTodo) {
      setShowTaskDetail(true);
    } else {
      setIsFolded((prev) => !prev);
    }
  }

  const longPressHandlers = useLongPress({
    onLongPress: () => setShowPicker(true),
    onClick: handleCardClick,
    delay: 450,
  });

  async function handleDragEnd(_: PointerEvent, info: PanInfo) {
    const container = containerRef?.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    const cardW = 148;
    const cardH = 148;
    const maxX = ((width - cardW) / width) * 100;
    const maxY = ((height - cardH) / height) * 100;
    const newX = Math.max(0, Math.min(maxX, task.position_x + (info.offset.x / width) * 100));
    const newY = Math.max(0, Math.min(maxY, task.position_y + (info.offset.y / height) * 100));
    flushSync(() => { onPositionChange?.(task.id, newX, newY); });
    dragX.set(0);
    dragY.set(0);
    await supabase.from("tasks").update({ position_x: newX, position_y: newY }).eq("id", task.id);
    setTimeout(() => { isDragging.current = false; }, 50);
  }

  return (
    <div
      className="relative"
      style={{ width: isTodo ? 148 : (isFolded ? 96 : 148), zIndex: showDeleteConfirm ? 50 : undefined, ...style }}
    >
      {/* 반응 피커 */}
      <AnimatePresence>
        {showPicker && (
          <ReactionPicker
            onSelect={handleReaction}
            onDelete={() => { setShowPicker(false); setShowDeleteConfirm(true); }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* 할일 상세 모달 */}
      <AnimatePresence>
        {showTaskDetail && (
          <TaskDetailModal
            task={task}
            members={members}
            onClose={() => setShowTaskDetail(false)}
            onUpdate={(updated) => { onTaskUpdate?.(updated); }}
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
            : { opacity: isDone ? 0.4 : 1, scale: 1, rotate: task.rotation, y: 0 }
        }
        exit={{ opacity: 0, scale: 0.7 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        whileHover={!isDeleting ? { scale: 1.06, zIndex: 20, transition: { type: "spring", stiffness: 400, damping: 25 } } : undefined}
        drag={!isDeleting}
        dragMomentum={false}
        dragTransition={{ power: 0, timeConstant: 0 }}
        dragElastic={0}
        style={{ x: dragX, y: dragY }}
        className="relative cursor-grab active:cursor-grabbing"
        {...longPressHandlers}
        onDragStart={() => {
          isDragging.current = true;
          setShowPicker(false);
          setShowDeleteConfirm(false);
        }}
        onDragEnd={handleDragEnd}
      >
        {/* 빨간 핀 (쪽지) */}
        {!isTodo && !isFolded && (
          <motion.div
            initial={{ scale: 0, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 18, delay: 0.08 }}
            className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
          >
            <svg width="20" height="32" viewBox="0 0 20 32" fill="none">
              <ellipse cx="10" cy="10" rx="10" ry="10" fill="#E53935"/>
              <ellipse cx="7" cy="7" rx="3" ry="3" fill="rgba(255,255,255,0.4)"/>
              <rect x="9" y="18" width="2" height="14" rx="1" fill="#B71C1C"/>
            </svg>
          </motion.div>
        )}

        {/* 접힌 쪽지 */}
        {!isTodo && isFolded && (
          <motion.div
            layout
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              width: 96,
              height: 74,
              backgroundColor: color,
              borderRadius: 10,
              clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.5)",
              position: "relative",
              overflow: "visible",
            }}
          >
            {/* 접힌 모서리 삼각형 */}
            <div
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: 18,
                height: 18,
                background: "rgba(0,0,0,0.18)",
                clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
                borderBottomRightRadius: 6,
              }}
            />
            {/* 핀 아이콘 */}
            <div className="flex items-center justify-center h-full">
              <svg width="16" height="24" viewBox="0 0 20 32" fill="none" style={{ opacity: 0.4 }}>
                <ellipse cx="10" cy="10" rx="10" ry="10" fill="#333"/>
                <rect x="9" y="18" width="2" height="14" rx="1" fill="#333"/>
              </svg>
            </div>
          </motion.div>
        )}

        {/* 펼쳐진 쪽지 / 할일 카드 본체 */}
        {(isTodo || !isFolded) && (
          <div
            className="rounded-xl overflow-visible select-none"
            style={{
              backgroundColor: color,
              width: 148,
              aspectRatio: isTodo ? "1/1" : "3/4",
              boxShadow: `
                0 2px 4px rgba(0,0,0,0.08),
                0 8px 24px rgba(0,0,0,0.12),
                inset 0 1px 0 rgba(255,255,255,0.6)
              `,
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

            <div className="relative p-3 h-full flex flex-col">
              {isTodo && (
                <div className="flex items-start justify-between mb-2">
                  <button
                    onPointerDown={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); handleToggleDone(); }}
                    className="relative flex-shrink-0 mt-0.5 -m-1.5 p-1.5"
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

              {!isTodo && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
                  style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
                  <svg width="20" height="32" viewBox="0 0 20 32" fill="none">
                    <ellipse cx="10" cy="10" rx="10" ry="10" fill="#E53935"/>
                    <ellipse cx="7" cy="7" rx="3" ry="3" fill="rgba(255,255,255,0.4)"/>
                    <rect x="9" y="18" width="2" height="14" rx="1" fill="#B71C1C"/>
                  </svg>
                </div>
              )}

              <p
                className="font-motto text-black/80 leading-snug flex-1"
                style={{
                  textDecoration: isDone ? "line-through" : "none",
                  fontSize: task.content.length > 30 ? "12px" : "14px",
                  marginTop: !isTodo ? "20px" : undefined,
                }}
              >
                {task.content}
              </p>

              {isTodo && task.assignee_name && (
                <p className="text-black/35 text-[10px] mt-1 font-sans">{task.assignee_name}</p>
              )}

              {/* D-day 뱃지 — 카드 우하단 */}
              {isTodo && ddayDiff !== null && (
                <span
                  className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: getDdayBadgeStyle(ddayDiff).bg,
                    color: getDdayBadgeStyle(ddayDiff).text,
                    zIndex: 10,
                  }}
                >
                  {getDdayLabel(ddayDiff)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 반응 이모지 뱃지 */}
        <AnimatePresence>
          {reactionEntries.length > 0 && (isTodo || !isFolded) && (
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

      {/* 삭제 확인 팝업 */}
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
