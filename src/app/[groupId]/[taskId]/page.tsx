"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Task, Member } from "@/types";
import { getColor, TODO_COLORS, NOTE_COLORS } from "@/components/ui/PostItCard";
import { Avatar } from "@/components/ui/Avatar";

type DateType = "마감일" | "기간" | "없음";

const SHEET_H = 402;
const SHEET_BOTTOM = 47;
const SHEET_SIDE = 20;
const DATE_TYPE_OPTIONS: DateType[] = ["마감일", "기간", "없음"];

const CalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

function getDaysSince(createdAt: string): number {
  const created = new Date(createdAt);
  const today = new Date();
  created.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

function getDDay(dueDateStr: string): string {
  const today = new Date();
  const due = new Date(dueDateStr);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function formatDate(d: string): string {
  const parts = d.split("T")[0].split("-");
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

export default function TaskDetailPage() {
  const { groupId, taskId } = useParams<{ groupId: string; taskId: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [content, setContent] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [dateType, setDateType] = useState<DateType>("없음");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("tasks").select("*").eq("id", taskId).single().then(({ data }) => {
      if (!data) return;
      const t = data as Task;
      setTask(t);
      setContent(t.content);
      setAssigneeName(t.assignee_name);
      if (t.due_date) {
        setDateType("마감일");
        setDueDate(t.due_date.split("T")[0]);
      }
    });
  }, [taskId]);

  useEffect(() => {
    supabase.from("groups").select("members").eq("id", groupId).single().then(({ data }) => {
      if (data?.members) setMembers(data.members);
    });
  }, [groupId]);

  function computeDueDate(): string | null {
    if (dateType === "없음") return null;
    if (dateType === "기간") return endDate ?? startDate;
    return dueDate;
  }

  async function handleSave() {
    if (!task || !content.trim()) return;
    await supabase.from("tasks").update({
      content: content.trim(),
      assignee_name: assigneeName,
      due_date: computeDueDate(),
    }).eq("id", taskId);
    router.back();
  }

  async function handleDelete() {
    await supabase.from("tasks").delete().eq("id", taskId);
    router.back();
  }

  async function handleTogglePin() {
    if (!task) return;
    const { data } = await supabase
      .from("tasks")
      .update({ is_pinned: !task.is_pinned })
      .eq("id", task.id)
      .select()
      .single();
    if (data) setTask(data as Task);
  }

  async function handleToggleDone() {
    if (!task || task.type !== "todo") return;
    const isDone = task.status === "done";
    const { data } = await supabase
      .from("tasks")
      .update({
        status: isDone ? "pending" : "done",
        completed_at: isDone ? null : new Date().toISOString(),
      })
      .eq("id", task.id)
      .select()
      .single();
    if (data) setTask(data as Task);
  }

  if (!task) {
    return (
      <main className="min-h-screen dot-pattern flex items-center justify-center">
        <span className="t-text-faint text-sm">불러오는 중...</span>
      </main>
    );
  }

  const isTodo = task.type === "todo";
  const isDone = task.status === "done";
  const isPinned = task.is_pinned ?? false;
  const color = task.color ?? (isTodo ? getColor(task.id, TODO_COLORS) : getColor(task.id, NOTE_COLORS));
  const daysSince = getDaysSince(task.created_at);
  const effectiveDueDate = dateType === "없음" ? null : (dateType === "기간" ? (endDate ?? startDate) : dueDate);
  const ddayLabel = effectiveDueDate ? getDDay(effectiveDueDate) : `D+${daysSince}`;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="h-dvh flex flex-col relative"
      style={{
        paddingTop: "calc(var(--spacing) * 4)",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 pb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="w-11 h-11 glass rounded-full flex items-center justify-center"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12l6-6" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>

        <span className="font-display font-semibold text-white/90 text-base">
          {isTodo ? "할일" : "쪽지"}
        </span>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowDeleteConfirm(true)}
          className="w-11 h-11 glass rounded-full flex items-center justify-center"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4 7H20M10 11V17M14 11V17M5 7L6 19C6 19.5304 6.21071 20.0391 6.58579 20.4142C6.96086 20.7893 7.46957 21 8 21H16C16.5304 21 17.0391 20.7893 17.4142 20.4142C17.7893 20.0391 18 19.5304 18 19L19 7M9 7V4C9 3.73478 9.10536 3.48043 9.29289 3.29289C9.48043 3.10536 9.73478 3 10 3H14C14.2652 3 14.5196 3.10536 14.7071 3.29289C14.8946 3.48043 15 3.73478 15 4V7" stroke="currentColor" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      </header>

      {/* 카드 — 바텀시트 위 공간 중앙 정렬 */}
      <div
        className="flex-1 flex items-center justify-center min-h-0"
        style={{ paddingBottom: SHEET_H + SHEET_BOTTOM }}
      >
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            backgroundColor: color,
            width: 180,
            height: isTodo ? 180 : 240,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1), 0 16px 48px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0,0,0,0.05) 20px, rgba(0,0,0,0.05) 21px)",
            }}
          />
          <div className="relative p-4 h-full flex flex-col">
            {isTodo && (
              <div className="flex items-start justify-between mb-2">
                <button onClick={handleToggleDone} className="flex-shrink-0 -m-1 p-1">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? "border-black/40 bg-black/30" : "border-black/25"}`}>
                    {isDone && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                </button>
                <div className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: "#FF8C00" }}>
                  {ddayLabel}
                </div>
              </div>
            )}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 bg-transparent resize-none outline-none font-motto text-black/80 leading-snug w-full"
              style={{
                fontSize: content.length > 30 ? "12px" : "14px",
                textDecoration: isDone ? "line-through" : "none",
              }}
            />
            {assigneeName && (
              <div className="flex items-center gap-1 mt-1">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="5.5" r="2.5" stroke="rgba(0,0,0,0.35)" strokeWidth="1.4"/>
                  <path d="M2.5 13.5c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="rgba(0,0,0,0.35)" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <p className="text-black/35 text-[10px] font-sans">{assigneeName}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 바텀시트 */}
      <motion.div
        initial={{ y: 600 }}
        animate={{ y: 0 }}
        exit={{ y: 600 }}
        transition={{ type: "spring", stiffness: 380, damping: 40 }}
        className="absolute t-elevated rounded-3xl overflow-hidden"
        style={{
          left: SHEET_SIDE,
          right: SHEET_SIDE,
          bottom: SHEET_BOTTOM,
          height: SHEET_H,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div className="h-full flex flex-col px-5 pt-6">
          <div className="flex-1 overflow-y-auto">

            {/* 완료로 표시 (할일 전용) */}
            {isTodo && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleToggleDone}
                className="flex items-center gap-3 py-3.5 w-full"
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isDone ? "border-black/40 bg-black/30" : "border-black/25"}`}>
                  {isDone && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <span className="t-text text-sm font-medium">{isDone ? "완료 취소" : "완료로 표시"}</span>
              </motion.button>
            )}

            {/* 상단에 고정 */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleTogglePin}
              className="flex items-center gap-3 py-3.5 w-full"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isPinned ? "#E53935" : "none"} stroke={isPinned ? "#E53935" : "currentColor"} strokeOpacity={isPinned ? 1 : 0.45} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span className="t-text text-sm font-medium">{isPinned ? "상단 고정 해제" : "상단에 고정"}</span>
            </motion.button>

            {/* 담당자 */}
            <div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { setShowAssigneeDropdown((v) => !v); setShowDateDropdown(false); }}
                className="flex items-center gap-3 py-3.5 w-full"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4"/>
                  <path d="M2.5 13.5c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <span className="t-text text-sm font-medium">담당자</span>
                <div className="flex items-center gap-1 ml-auto">
                  <span className="t-text-muted text-sm">{assigneeName ?? "없음"}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    style={{ transition: "transform 0.2s", transform: showAssigneeDropdown ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </motion.button>
              <AnimatePresence>
                {showAssigneeDropdown && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 pb-3">
                      <button
                        onClick={() => { setAssigneeName(null); setShowAssigneeDropdown(false); }}
                        className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
                        style={{
                          backgroundColor: assigneeName === null ? "var(--btn-primary-bg)" : "var(--card)",
                          color: assigneeName === null ? "var(--btn-primary-text)" : "var(--text-3)",
                        }}
                      >없음</button>
                      {members.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => { setAssigneeName(m.name); setShowAssigneeDropdown(false); }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
                          style={{
                            backgroundColor: assigneeName === m.name ? "var(--btn-primary-bg)" : "var(--card)",
                            color: assigneeName === m.name ? "var(--btn-primary-text)" : "var(--text-3)",
                          }}
                        >
                          <Avatar avatar={m.avatar} fallback="🧑" size={14} className="text-xs" />
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 날짜 — 담당자와 동일한 형식 */}
            <div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { setShowDateDropdown((v) => !v); setShowAssigneeDropdown(false); }}
                className="flex items-center gap-3 py-3.5 w-full"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span className="t-text text-sm font-medium">날짜</span>
                <div className="flex items-center gap-1 ml-auto">
                  <span className="t-text-muted text-sm">{dateType}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    style={{ transition: "transform 0.2s", transform: showDateDropdown ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </motion.button>
              <AnimatePresence>
                {showDateDropdown && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-2 pb-3">
                      {DATE_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setDateType(opt);
                            setShowDateDropdown(false);
                            if (opt === "없음") { setDueDate(null); setStartDate(null); setEndDate(null); }
                          }}
                          className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
                          style={{
                            backgroundColor: dateType === opt ? "var(--btn-primary-bg)" : "var(--card)",
                            color: dateType === opt ? "var(--btn-primary-text)" : "var(--text-3)",
                          }}
                        >{opt}</button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 마감일 입력 */}
              {dateType === "마감일" && (
                <div className="pb-3">
                  <input ref={dueDateRef} type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value || null)} className="sr-only"/>
                  <button
                    onClick={() => dueDateRef.current?.showPicker?.()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-all"
                    style={{
                      backgroundColor: "var(--card)",
                      border: `1px solid ${dueDate ? "var(--border-mid)" : "transparent"}`,
                      color: dueDate ? "var(--text-1)" : "var(--text-3)",
                    }}
                  >
                    <CalIcon/>
                    {dueDate ? formatDate(dueDate) : "날짜 선택"}
                  </button>
                </div>
              )}

              {/* 기간 입력 */}
              {dateType === "기간" && (
                <div className="flex items-center gap-2 pb-3">
                  <input ref={startDateRef} type="date" value={startDate ?? ""} onChange={(e) => setStartDate(e.target.value || null)} className="sr-only"/>
                  <button
                    onClick={() => startDateRef.current?.showPicker?.()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-all"
                    style={{
                      backgroundColor: "var(--card)",
                      border: `1px solid ${startDate ? "var(--border-mid)" : "transparent"}`,
                      color: startDate ? "var(--text-1)" : "var(--text-3)",
                    }}
                  >
                    <CalIcon/>
                    {startDate ? formatDate(startDate) : "시작일"}
                  </button>
                  <span className="t-text-muted text-sm">~</span>
                  <input ref={endDateRef} type="date" value={endDate ?? ""} onChange={(e) => setEndDate(e.target.value || null)} className="sr-only"/>
                  <button
                    onClick={() => endDateRef.current?.showPicker?.()}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-all"
                    style={{
                      backgroundColor: "var(--card)",
                      border: `1px solid ${endDate ? "var(--border-mid)" : "transparent"}`,
                      color: endDate ? "var(--text-1)" : "var(--text-3)",
                    }}
                  >
                    <CalIcon/>
                    {endDate ? formatDate(endDate) : "종료일"}
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* 저장하기 — 시트 하단 고정 */}
          <div className="flex-shrink-0 pt-4 pb-6">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={!content.trim()}
              className="w-full py-4 rounded-2xl t-btn-primary font-semibold text-base disabled:opacity-30"
            >
              저장하기
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* 삭제 확인 */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <div
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className="fixed bottom-8 left-5 right-5 z-50 t-elevated rounded-3xl p-5 flex flex-col gap-3"
              style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}
            >
              <p className="t-text font-semibold text-center text-base">이 카드를 삭제할까요?</p>
              <p className="t-text-muted text-sm text-center">삭제하면 되돌릴 수 없어요.</p>
              <div className="flex gap-2 mt-1">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3.5 rounded-2xl font-semibold t-btn-secondary">취소</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleDelete} className="flex-1 py-3.5 rounded-2xl font-semibold text-white" style={{ backgroundColor: "#E53935" }}>삭제</motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
