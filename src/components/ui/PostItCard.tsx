"use client";

import { memo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressFiredRef = useRef(false);

  // Stable delete rotation — deterministic from task.id to avoid re-render flicker
  const deleteRotRef = useRef(task.rotation + (task.id.charCodeAt(0) % 2 === 0 ? 18 : -18));

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
        paddingBottom: isTodo ? 0 : 20,
        zIndex: showPicker ? 100 : isDropTarget ? 30 : isLongPressTarget ? 50 : undefined,
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
            setPickerPos({ x: rect.left + rect.width / 2, y: rect.top });
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
          // 드래그는 유지 — 휴지통으로 끌 수 있도록
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
          onTap?.(task.id);
        }, 280);
      }}
    >
      {/* 반응 피커 - portal로 body에 렌더링 (z-index 충돌 방지) */}
      {mounted && showPicker && pickerPos && createPortal(
        <AnimatePresence>
          <div
            style={{
              position: "fixed",
              left: pickerAlign === "right" ? "auto" : pickerAlign === "left" ? pickerPos.x - 8 : pickerPos.x,
              right: pickerAlign === "right" ? window.innerWidth - pickerPos.x - 8 : "auto",
              top: pickerPos.y - 8,
              transform: pickerAlign === "center" ? "translate(-50%, -100%)" : "translateY(-100%)",
              zIndex: 9999,
            }}
          >
            <ReactionPicker
              onSelect={handleReaction}
              onClose={() => setShowPicker(false)}
              isPinned={isPinned}
              onTogglePin={handleTogglePin}
              align={pickerAlign}
            />
          </div>
        </AnimatePresence>,
        document.body
      )}

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
                rotate: deleteRotRef.current,
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
          className="relative rounded-xl overflow-visible select-none"
          style={{ aspectRatio: "1/1" }}
        >
          <svg
            className="absolute inset-0 pointer-events-none"
            width="100%"
            height="100%"
            viewBox="0 0 180 180"
            preserveAspectRatio="none"
            style={{ overflow: "visible" }}
          >
            <defs>
              <filter id={`postit-shadow-${task.id}`} x="-20%" y="-5%" width="140%" height="180%" filterUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                <feOffset dy="5" />
                <feGaussianBlur stdDeviation="5.5" />
                <feColorMatrix type="matrix" values="0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0.1 0" />
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1" />
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                <feOffset dy="20" />
                <feGaussianBlur stdDeviation="10" />
                <feColorMatrix type="matrix" values="0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0.09 0" />
                <feBlend mode="normal" in2="effect1" result="effect2" />
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                <feOffset dy="45" />
                <feGaussianBlur stdDeviation="13.5" />
                <feColorMatrix type="matrix" values="0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0.05 0" />
                <feBlend mode="normal" in2="effect2" result="effect3" />
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                <feOffset dy="79" />
                <feGaussianBlur stdDeviation="16" />
                <feColorMatrix type="matrix" values="0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0.01 0" />
                <feBlend mode="normal" in2="effect3" result="effect4" />
                <feBlend mode="normal" in="SourceGraphic" in2="effect4" result="shape" />
              </filter>
              <pattern id={`postit-ruled-${task.id}`} patternUnits="userSpaceOnUse" width="180" height="21">
                <rect y="20" width="180" height="1" fill="#CACACA" fillOpacity="0.3" />
              </pattern>
              <clipPath id={`postit-tape-clip-${task.id}`} transform="translate(-79.4 1.6)">
                <rect x="123.404" y="6" width="18" height="42.0361" transform="rotate(60 123.404 6)" />
              </clipPath>
              <linearGradient id={`postit-pin-fill-${task.id}`} x1="111" y1="6" x2="111" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F87171" />
                <stop offset="1" stopColor="#991B1B" />
              </linearGradient>
              <linearGradient id={`postit-pin-stroke-${task.id}`} x1="111.5" y1="19" x2="111.5" y2="34" gradientUnits="userSpaceOnUse">
                <stop stopColor="#390C0C" />
                <stop offset="1" stopColor="#9F2121" />
              </linearGradient>
            </defs>
            <g filter={isLongPressTarget ? undefined : `url(#postit-shadow-${task.id})`}>
              <rect width="180" height="180" rx="18" fill={color} />
              <rect width="180" height="180" rx="18" fill={`url(#postit-ruled-${task.id})`} fillOpacity="0.5" />
              {isDone && <rect width="180" height="180" rx="18" fill="black" fillOpacity="0.1" />}
              <rect x="0.5" y="0.5" width="179" height="179" rx="17.5" fill="none" stroke={COLOR_STROKE[color] ?? "rgba(255,255,255,0.6)"} strokeWidth="1" />
            </g>
            {isLongPressTarget && (
              <rect x="0.5" y="0.5" width="179" height="179" rx="17.5" fill="none" stroke="#FF3B30" strokeWidth="2.5" />
            )}
            {/* 등록한 메모 타입 구분 — 할일: 테이프, 쪽지: 핀 */}
            {isTodo ? (
              <g transform="translate(-20,-20)" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.15))" }}>
                <foreignObject x="79.4" y="-1.6" width="60.6043" height="51.8066">
                  <div
                    style={{ backdropFilter: "blur(3.8px)", WebkitBackdropFilter: "blur(3.8px)", clipPath: `url(#postit-tape-clip-${task.id})`, height: "100%", width: "100%" }}
                  />
                </foreignObject>
                <rect x="123.404" y="6" width="18" height="42.0361" transform="rotate(60 123.404 6)" fill="#D9D9D9" fillOpacity="0.4" />
              </g>
            ) : (
              <g transform="translate(-20,-17)" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}>
                <circle cx="111" cy="14" r="8" fill={`url(#postit-pin-fill-${task.id})`} />
                <path d="M111 19L111 29.8351" stroke={`url(#postit-pin-stroke-${task.id})`} strokeWidth="2" strokeLinecap="round" />
              </g>
            )}
          </svg>
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
    </div>
  );
}

export default memo(PostItCard);
