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

// 이미지처럼 접힌 쪽지 모양 (sealed/folded state)
function SealedNoteShape({
  color,
  isDropTarget = false,
  isLongPressTarget = false,
}: {
  color: string;
  isDropTarget?: boolean;
  isLongPressTarget?: boolean;
}) {
  const s = 148;
  const h = s / 2; // 74
  const dHalf = 40;
  const dcx = 110;
  const dcy = s + 16;

  const svgFilter = isLongPressTarget
    ? "drop-shadow(0 0 8px rgba(255,59,48,0.7)) drop-shadow(4px 7px 6px rgba(0,0,0,0.18))"
    : isDropTarget
    ? "drop-shadow(0 0 6px var(--btn-primary-bg)) drop-shadow(4px 7px 6px rgba(0,0,0,0.18))"
    : "drop-shadow(4px 7px 6px rgba(0,0,0,0.2))";

  return (
    <div style={{ position: "relative", width: s, height: dcy + dHalf + 8 }}>
      <svg
        width={dcx + dHalf + 8}
        height={dcy + dHalf + 8}
        viewBox={`0 0 ${dcx + dHalf + 8} ${dcy + dHalf + 8}`}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          filter: svgFilter,
          overflow: "visible",
          transition: "filter 0.15s ease",
        }}
      >
        {/* 위쪽 삼각형 */}
        <polygon points={`0,0 ${s},0 ${h},${h}`} fill={color} />
        {/* 왼쪽 삼각형 */}
        <polygon points={`0,0 ${h},${h} 0,${s}`} fill={color} />
        {/* 오른쪽 삼각형 (입체감) */}
        <polygon points={`${s},0 ${s},${s} ${h},${h}`} fill={color} />
        <polygon points={`${s},0 ${s},${s} ${h},${h}`} fill="rgba(0,0,0,0.18)" />
        {/* 아래쪽 삼각형 (안쪽 흰 면) */}
        <polygon points={`0,${s} ${h},${h} ${s},${s}`} fill="rgba(255,255,255,0.58)" />
        {/* 다이아몬드 꼬리 */}
        <polygon
          points={`${dcx},${dcy - dHalf} ${dcx + dHalf},${dcy} ${dcx},${dcy + dHalf} ${dcx - dHalf},${dcy}`}
          fill={color}
        />
      </svg>
    </div>
  );
}

// 쪽지가 펼쳐진 상태
function OpenNoteView({
  color,
  content,
  assigneeName,
  isDone,
  isLongPressTarget,
  isDropTarget,
}: {
  color: string;
  content: string;
  assigneeName: string | null;
  isDone: boolean;
  isLongPressTarget: boolean;
  isDropTarget: boolean;
}) {
  return (
    <div
      style={{
        width: 148,
        minHeight: 148,
        backgroundColor: color,
        borderRadius: 12,
        position: "relative",
        overflow: "hidden",
        boxShadow: isLongPressTarget
          ? `0 0 0 2.5px #FF3B30, 0 6px 24px rgba(255,59,48,0.35), 0 8px 24px rgba(0,0,0,0.18)`
          : `0 2px 4px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)`,
        filter: isDone ? "saturate(0.4) brightness(0.9)" : "none",
        clipPath: "polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 0 100%)",
        transition: "box-shadow 0.18s ease",
      }}
    >
      {/* 접힌 모서리 그림자 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 28,
          height: 28,
          background: "linear-gradient(225deg, rgba(0,0,0,0.12) 50%, transparent 50%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* 드롭 타겟 아웃라인 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 12,
          outline: "3px solid var(--btn-primary-bg)",
          outlineOffset: 2,
          opacity: isDropTarget ? 1 : 0,
          transition: "opacity 80ms ease",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* 줄 텍스처 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.04) 23px, rgba(0,0,0,0.04) 24px)",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      {/* 내용 */}
      <div style={{ padding: "14px 12px 12px", position: "relative", zIndex: 2 }}>
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 26 }}
          className="font-motto text-black/80 leading-snug"
          style={{
            fontSize: content.length > 30 ? 12 : 14,
            textDecoration: isDone ? "line-through" : "none",
            minHeight: 80,
          }}
        >
          {content}
        </motion.p>
        {assigneeName && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-black/35 text-[10px] font-sans mt-2"
          >
            {assigneeName}
          </motion.p>
        )}
      </div>
    </div>
  );
}

function getDdayInfo(dueDate: string | null | undefined): { label: string; color: string } | null {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return { label: "D-day", color: "#EF4444" };
  if (diff < 0) return { label: `D+${-diff}`, color: "#EF4444" };
  if (diff <= 4) return { label: `D-${diff}`, color: "#F97316" };
  return { label: `D-${diff}`, color: "#6B7280" };
}

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
  isBeingDeleted?: boolean;
  isLongPressTarget?: boolean;
  onDragStart?: (id: string, clientX: number, clientY: number) => void;
  onLongPress?: (id: string) => void;
  onTap?: (id: string) => void;
}

function PostItCard({
  task,
  style,
  memberAvatar,
  isDragging,
  isDropTarget,
  isSwapping,
  isBeingDeleted,
  isLongPressTarget,
  onDragStart,
  onLongPress,
  onTap,
}: PostItCardProps) {
  const isPinned = task.is_pinned ?? false;
  const [showPicker, setShowPicker] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const isTodo = task.type === "todo";
  const ddayInfo = isTodo ? getDdayInfo(task.due_date) : null;
  const isDone = task.status === "done";
  const color = task.color ?? (isTodo
    ? getColor(task.id, TODO_COLORS)
    : getColor(task.id, NOTE_COLORS));

  const reactions: Record<string, number> = task.reactions ?? {};
  const reactionEntries = Object.entries(reactions).filter(([, count]) => count > 0);
  const lastTapRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [pickerAlign, setPickerAlign] = useState<"left" | "center" | "right">("center");
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressFiredRef = useRef(false);

  const deleteRot = task.rotation + (task.id.charCodeAt(0) % 2 === 0 ? 18 : -18);

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

  return (
    <div
      ref={cardRef}
      data-card-id={task.id}
      className="relative"
      style={{
        width: 148,
        paddingBottom: 20,
        zIndex: isDropTarget ? 30 : isLongPressTarget ? 50 : undefined,
        pointerEvents: (isDragging || isBeingDeleted) ? "none" : undefined,
        touchAction: "none",
        ...style,
      }}
      onPointerDown={(e) => {
        if ((e.target as Element).closest("button")) return;
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          lastTapRef.current = 0;
          if (singleTapTimerRef.current) { clearTimeout(singleTapTimerRef.current); singleTapTimerRef.current = null; }
          if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
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
        longPressFiredRef.current = false;
        pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
        longPressTimerRef.current = setTimeout(() => {
          longPressFiredRef.current = true;
          longPressTimerRef.current = null;
          onLongPress?.(task.id);
        }, 800);
        e.currentTarget.setPointerCapture(e.pointerId);
        onDragStart?.(task.id, e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!pointerDownPosRef.current) return;
        const dx = e.clientX - pointerDownPosRef.current.x;
        const dy = e.clientY - pointerDownPosRef.current.y;
        if (Math.hypot(dx, dy) > 8) {
          if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
          if (singleTapTimerRef.current) { clearTimeout(singleTapTimerRef.current); singleTapTimerRef.current = null; }
          pointerDownPosRef.current = null;
        }
      }}
      onPointerUp={() => {
        if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
        if (!pointerDownPosRef.current) return;
        pointerDownPosRef.current = null;
        if (longPressFiredRef.current) return;
        singleTapTimerRef.current = setTimeout(() => {
          singleTapTimerRef.current = null;
          if (!isTodo) {
            // 쪽지: 탭하면 접힘/펼침 토글
            setIsNoteOpen((prev) => !prev);
          } else {
            onTap?.(task.id);
          }
        }, 280);
      }}
    >
      {/* 반응 피커 */}
      <AnimatePresence>
        {showPicker && (
          <ReactionPicker
            onSelect={handleReaction}
            onClose={() => setShowPicker(false)}
            isPinned={isPinned}
            onTogglePin={handleTogglePin}
            align={pickerAlign}
          />
        )}
      </AnimatePresence>

      {/* 카드 */}
      <motion.div
        initial={
          isTodo
            ? { opacity: 0, scale: 0.6, rotate: task.rotation - 8 }
            : { opacity: 0, y: -100, scale: 0.85, rotate: task.rotation }
        }
        animate={
          isBeingDeleted
            ? {
                opacity: 0,
                y: 320,
                rotate: deleteRot,
                scale: 0.55,
                transition: { duration: 0.48, ease: [0.4, 0, 1, 1] },
              }
            : isDragging
            ? {
                rotate: [task.rotation - DRAG_ROTATE_DELTA, task.rotation + DRAG_ROTATE_DELTA, task.rotation - DRAG_ROTATE_DELTA],
                opacity: isDone ? 0.4 : 1,
                scale: isLongPressTarget ? 1.06 : 1,
                y: 0,
              }
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

        {/* 카드 본체 */}
        {!isTodo ? (
          /* 쪽지: 접힌 상태 ↔ 펼친 상태 */
          <AnimatePresence mode="wait">
            {!isNoteOpen ? (
              <motion.div
                key="sealed"
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.13 } }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              >
                <SealedNoteShape
                  color={color}
                  isDropTarget={isDropTarget}
                  isLongPressTarget={isLongPressTarget}
                />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ opacity: 0, scale: 0.88, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 8, transition: { duration: 0.13 } }}
                transition={{ type: "spring", stiffness: 360, damping: 26 }}
              >
                <OpenNoteView
                  color={color}
                  content={task.content}
                  assigneeName={task.assignee_name}
                  isDone={isDone}
                  isLongPressTarget={isLongPressTarget ?? false}
                  isDropTarget={isDropTarget ?? false}
                />
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          /* 할일: 기존 카드 그대로 */
          <div
            className="rounded-xl overflow-visible select-none"
            style={{
              backgroundColor: color,
              aspectRatio: "1/1",
              boxShadow: isLongPressTarget
                ? `0 0 0 2.5px #FF3B30, 0 6px 24px rgba(255,59,48,0.35), 0 8px 24px rgba(0,0,0,0.18)`
                : `0 2px 4px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)`,
              filter: isDone ? "saturate(0.4) brightness(0.9)" : "none",
              transition: "box-shadow 0.18s ease",
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

              <p
                className="font-motto text-black/80 leading-snug flex-1"
                style={{
                  textDecoration: isDone ? "line-through" : "none",
                  fontSize: task.content.length > 30 ? "12px" : "14px",
                }}
              >
                {task.content}
              </p>

              {(task.assignee_name || ddayInfo) && (
                <div className="flex items-end justify-between mt-1">
                  <span className="text-black/35 text-[10px] font-sans leading-none">{task.assignee_name ?? ""}</span>
                  {ddayInfo && (
                    <span
                      className="text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none flex-shrink-0"
                      style={{ backgroundColor: ddayInfo.color }}
                    >
                      {ddayInfo.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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
    </div>
  );
}

export default memo(PostItCard);
