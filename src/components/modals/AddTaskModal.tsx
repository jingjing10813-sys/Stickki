"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Member, TaskType } from "@/types";
import { TODO_COLORS, NOTE_COLORS } from "@/components/ui/PostItCard";

type DateType = "마감일" | "기간" | "없음";

interface AddTaskModalProps {
  groupId: string;
  members: Member[];
  onClose: () => void;
  newPosition?: { x: number; y: number };
}

const CalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const DATE_TYPE_OPTIONS: DateType[] = ["마감일", "기간", "없음"];

export default function AddTaskModal({ groupId, members, onClose, newPosition }: AddTaskModalProps) {
  const [type, setType] = useState<TaskType>("todo");
  const [content, setContent] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [noteRecipientId, setNoteRecipientId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [dateType, setDateType] = useState<DateType>("없음");
  const [isDateTypeOpen, setIsDateTypeOpen] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const dateTypeDropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    if (!isDateTypeOpen) return;
    function handleOutside(e: MouseEvent) {
      if (!dateTypeDropdownRef.current?.contains(e.target as Node)) {
        setIsDateTypeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isDateTypeOpen]);

  const colors = type === "todo" ? TODO_COLORS : NOTE_COLORS;
  const activeColor = selectedColor ?? colors[0];
  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null;

  function formatDate(d: string) {
    const [y, m, day] = d.split("-");
    return `${y}.${m}.${day}`;
  }

  function computeDueDate(): string | null {
    if (dateType === "없음") return null;
    if (dateType === "기간") return endDate ?? startDate;
    return dueDate;
  }

  async function handleSubmit() {
    if (!content.trim() || loading) return;
    setLoading(true);
    const rotation = (Math.random() - 0.5) * 14;
    const position_x = newPosition?.x ?? Date.now();
    const position_y = newPosition?.y ?? 0;
    await supabase.from("tasks").insert({
      group_id: groupId,
      content: content.trim(),
      type,
      assignee_name:
        type === "todo"
          ? (selectedMember?.name ?? null)
          : (noteRecipientId ? (members.find((m) => m.id === noteRecipientId)?.name ?? null) : null),
      status: "pending",
      rotation,
      position_x,
      position_y,
      color: activeColor,
      is_pinned: isPinned,
      due_date: computeDueDate(),
    });
    onClose();
  }

  const activeAssigneeId = type === "todo" ? selectedMemberId : noteRecipientId;
  const setActiveAssignee = type === "todo" ? setSelectedMemberId : setNoteRecipientId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-end px-5 pb-[47px]"
    >
      {/* 백드롭 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* 뒤로가기 버튼 — Header와 동일한 높이 기준(h-14=56px) 안에 44px 버튼 수직 중앙 정렬 → top: 6px */}
      <button
        onClick={onClose}
        className="absolute z-20 flex items-center justify-center rounded-full"
        style={{
          top: 6,
          left: 16,
          width: 44,
          height: 44,
          backgroundColor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
          <path d="M9 1L1 9L9 17" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 포스트잇 프리뷰 — 화면 너비에 비례, 최대 200px 정사각형 */}
      <motion.div
        layout
        className="relative z-10 mb-3 rounded-2xl p-4 overflow-hidden"
        style={{
          width: "min(200px, 45vw)",
          aspectRatio: "1 / 1",
          backgroundColor: activeColor,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 6px #FFFFFF",
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
              <ellipse cx="10" cy="10" rx="10" ry="10" fill="#E53935" />
              <ellipse cx="7" cy="7" rx="3" ry="3" fill="rgba(255,255,255,0.4)" />
              <rect x="9" y="18" width="2" height="14" rx="1" fill="#B71C1C" />
            </svg>
          </div>
        )}
        <textarea
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={type === "todo" ? "할 일을 적어요..." : "하고 싶은 말을 적어요..."}
          className="relative w-full h-full bg-transparent font-motto text-sm text-black/80 placeholder-black/30 outline-none resize-none"
          style={{
            WebkitBoxShadow: "0 0 0 1000px transparent inset",
            WebkitTextFillColor: "rgba(0,0,0,0.8)",
          }}
        />
        {type === "todo" && selectedMember && (
          <div className="absolute bottom-3 left-4 text-xs text-black/50 truncate">
            {selectedMember.avatar || "🧑"} {selectedMember.name}
          </div>
        )}
      </motion.div>

      {/* 바텀 시트 */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 40 }}
        className="t-elevated relative w-full max-w-lg rounded-3xl pt-5 pb-6 px-5 z-10"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 타입 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{ backgroundColor: "var(--card)" }}>
          {(["todo", "note"] as TaskType[]).map((t) => {
            const active = type === t;
            return (
              <button
                key={t}
                onClick={() => { setType(t); setSelectedColor(null); setSelectedMemberId(null); setNoteRecipientId(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: active ? "var(--btn-primary-bg)" : "transparent",
                  color: active ? "var(--btn-primary-text)" : "var(--text-3)",
                }}
              >
                {t === "todo" ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    할일
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    쪽지
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* 담당자 / 받는 사람 */}
        {members.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-semibold t-text mb-2.5">
              {type === "todo" ? "담당자" : "받는 사람"}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
              <button
                onClick={() => setActiveAssignee(null)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: activeAssigneeId === null ? "var(--btn-primary-bg)" : "var(--card)",
                  color: activeAssigneeId === null ? "var(--btn-primary-text)" : "var(--text-3)",
                }}
              >
                {type === "todo" ? "없음" : "모두에게"}
              </button>
              {members.map((member) => {
                const isSelected = activeAssigneeId === member.id;
                return (
                  <button
                    key={member.id}
                    onClick={() => setActiveAssignee(isSelected ? null : member.id)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isSelected ? "var(--btn-primary-bg)" : "var(--card)",
                      color: isSelected ? "var(--btn-primary-text)" : "var(--text-3)",
                    }}
                  >
                    <span className="text-xs leading-none">{member.avatar || "🧑"}</span>
                    {member.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 상단에 고정하기 */}
        <button
          type="button"
          onClick={() => setIsPinned((v) => !v)}
          className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 mb-4 transition-all"
          style={{
            backgroundColor: isPinned ? "rgba(255,213,0,0.08)" : "var(--card)",
            border: `1px solid ${isPinned ? "rgba(220,170,0,0.5)" : "var(--border-color)"}`,
            color: isPinned ? "#B8860B" : "var(--text-3)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isPinned ? "#B8860B" : "none"} stroke={isPinned ? "#B8860B" : "currentColor"} strokeWidth="2" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {isPinned ? "상단에 고정됨" : "상단에 고정하기"}
        </button>

        {/* 날짜 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-sm font-semibold t-text">날짜</p>
            {/* 커스텀 드롭다운 — 버튼 바로 아래 펼쳐짐 */}
            <div ref={dateTypeDropdownRef} className="relative">
              <button
                onClick={() => setIsDateTypeOpen((v) => !v)}
                className="flex items-center gap-1 text-sm font-medium transition-all"
                style={{ color: "var(--text-2)" }}
              >
                {dateType}
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{
                    transition: "transform 0.2s",
                    transform: isDateTypeOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {isDateTypeOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 rounded-2xl overflow-hidden z-30"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                    border: "1px solid var(--border-color)",
                    minWidth: 90,
                  }}
                >
                  {DATE_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setDateType(opt);
                        setIsDateTypeOpen(false);
                        setDueDate(null);
                        setStartDate(null);
                        setEndDate(null);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-all"
                      style={{
                        color: opt === dateType ? "var(--text-1)" : "var(--text-2)",
                        fontWeight: opt === dateType ? 600 : 400,
                        backgroundColor: opt === dateType ? "var(--card)" : "transparent",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 날짜 입력 */}
          {dateType === "마감일" && (
            <>
              <input ref={dueDateRef} type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value || null)} className="sr-only" />
              <button
                onClick={() => dueDateRef.current?.showPicker?.()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-all"
                style={{
                  backgroundColor: "var(--card)",
                  border: `1px solid ${dueDate ? "var(--border-mid)" : "transparent"}`,
                  color: dueDate ? "var(--text-1)" : "var(--text-3)",
                }}
              >
                <CalIcon />
                {dueDate ? formatDate(dueDate) : "날짜 선택"}
              </button>
            </>
          )}

          {dateType === "기간" && (
            <div className="flex items-center gap-2">
              <input ref={startDateRef} type="date" value={startDate ?? ""} onChange={(e) => setStartDate(e.target.value || null)} className="sr-only" />
              <button
                onClick={() => startDateRef.current?.showPicker?.()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-all"
                style={{
                  backgroundColor: "var(--card)",
                  border: `1px solid ${startDate ? "var(--border-mid)" : "transparent"}`,
                  color: startDate ? "var(--text-1)" : "var(--text-3)",
                }}
              >
                <CalIcon />
                {startDate ? formatDate(startDate) : "시작일"}
              </button>
              <span className="t-text-muted text-sm">~</span>
              <input ref={endDateRef} type="date" value={endDate ?? ""} onChange={(e) => setEndDate(e.target.value || null)} className="sr-only" />
              <button
                onClick={() => endDateRef.current?.showPicker?.()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-all"
                style={{
                  backgroundColor: "var(--card)",
                  border: `1px solid ${endDate ? "var(--border-mid)" : "transparent"}`,
                  color: endDate ? "var(--text-1)" : "var(--text-3)",
                }}
              >
                <CalIcon />
                {endDate ? formatDate(endDate) : "종료일"}
              </button>
            </div>
          )}
        </div>

        {/* 포스트잇 색상 */}
        <div className="mb-6">
          <p className="text-sm font-semibold t-text mb-2.5">포스트잇 색상</p>
          <div className="flex gap-3">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className="w-8 h-8 rounded-full transition-all border-2"
                style={{
                  backgroundColor: c,
                  transform: activeColor === c ? "scale(1.18)" : "scale(1)",
                  borderColor: activeColor === c ? "var(--text-1)" : "transparent",
                }}
              />
            ))}
          </div>
        </div>

        {/* 취소 / 붙이기 */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold t-btn-secondary"
          >
            취소
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
            className="flex-1 py-3.5 rounded-2xl text-sm font-semibold t-btn-primary disabled:opacity-30"
          >
            {loading ? "붙이는 중..." : "붙이기"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
