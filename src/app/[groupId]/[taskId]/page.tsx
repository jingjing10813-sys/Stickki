"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Task, Member } from "@/types";
import { getColor, TODO_COLORS, NOTE_COLORS } from "@/components/ui/PostItCard";

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

export default function TaskDetailPage() {
  const { taskId } = useParams<{ groupId: string; taskId: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [content, setContent] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dateMode, setDateMode] = useState<"none" | "deadline" | "range">("none");
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [origAssigneeId, setOrigAssigneeId] = useState<string | null>(null);
  const [origDueDate, setOrigDueDate] = useState("");
  const [origStartDate, setOrigStartDate] = useState("");
  const [origContent, setOrigContent] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.from("tasks").select("*").eq("id", taskId).single().then(({ data }) => {
      if (!data) return;
      setTask(data as Task);
      setContent(data.content);
      setOrigContent(data.content);
      setAssigneeId(data.assignee_id ?? null);
      setAssigneeName(data.assignee_name ?? null);
      setOrigAssigneeId(data.assignee_id ?? null);
      const dd = data.due_date ?? "";
      const sd = data.start_date ?? "";
      setDueDate(dd);
      setStartDate(sd);
      setOrigDueDate(dd);
      setOrigStartDate(sd);
      if (sd) setDateMode("range");
      else if (dd) setDateMode("deadline");
      supabase.from("groups").select("members").eq("id", data.group_id).single()
        .then(({ data: g }) => { if (g) setMembers(g.members ?? []); });
    });
  }, [taskId]);

  async function handleBack() {
    const trimmed = content.trim();
    const updates: Record<string, unknown> = {};
    if (trimmed !== origContent) updates.content = trimmed || origContent;
    if (assigneeId !== origAssigneeId) {
      updates.assignee_id = assigneeId;
      updates.assignee_name = assigneeName;
    }
    const newDue = dateMode !== "none" ? dueDate : "";
    const newStart = dateMode === "range" ? startDate : "";
    if (newDue !== origDueDate) updates.due_date = newDue || null;
    if (newStart !== origStartDate) updates.start_date = newStart || null;
    if (Object.keys(updates).length > 0) {
      await supabase.from("tasks").update(updates).eq("id", taskId);
    }
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

  const newDue = dateMode !== "none" ? dueDate : "";
  const newStart = dateMode === "range" ? startDate : "";
  const hasChanges =
    content.trim() !== origContent ||
    assigneeId !== origAssigneeId ||
    newDue !== origDueDate ||
    newStart !== origStartDate;

  const ddayInfo = isTodo ? getDdayInfo(dateMode !== "none" ? dueDate : null) : null;

  return (
    <motion.main
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 38 }}
      className="min-h-screen dot-pattern flex flex-col"
      style={{ paddingTop: "calc(var(--spacing) * 4)" }}
    >
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 pb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleBack}
          className="w-9 h-9 glass rounded-full flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>

        <span className="font-display font-semibold t-text text-sm">
          {isTodo ? "할일" : "쪽지"}
        </span>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowDeleteConfirm(true)}
          className="w-9 h-9 glass rounded-full flex items-center justify-center"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M6 7v5M10 7v5M3 4l1 9.5a.5.5 0 00.5.5h7a.5.5 0 00.5-.5L13 4" stroke="#FF6B6B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      </header>

      {/* Card Preview */}
      <div className="flex justify-center px-5 mb-6">
        <div
          className="relative rounded-2xl overflow-hidden shadow-xl"
          style={{
            backgroundColor: color,
            width: 160,
            aspectRatio: isTodo ? "1/1" : "3/4",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1), 0 16px 48px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.04) 23px, rgba(0,0,0,0.04) 24px)",
              opacity: 0.5,
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
              </div>
            )}
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 bg-transparent resize-none outline-none font-motto text-black/80 leading-snug w-full"
              style={{
                fontSize: content.length > 30 ? "12px" : "14px",
                textDecoration: isDone ? "line-through" : "none",
              }}
            />
            {isTodo && (
              <div className="flex items-end justify-between mt-1">
                <span className="text-black/35 text-[10px] font-sans leading-none">{assigneeName ?? ""}</span>
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
      </div>

      {/* Actions */}
      <div className="px-5 flex flex-col gap-2.5">
        {isTodo && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleToggleDone}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl t-elevated"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isDone ? "border-black/40 bg-black/30" : "border-black/25"}`}>
              {isDone && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <span className="t-text text-sm font-medium">
              {isDone ? "완료 취소" : "완료로 표시"}
            </span>
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleTogglePin}
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl t-elevated"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isPinned ? "#E53935" : "none"} stroke={isPinned ? "#E53935" : "currentColor"} strokeOpacity={isPinned ? 1 : 0.45} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span className="t-text text-sm font-medium">
            {isPinned ? "상단 고정 해제" : "상단에 고정"}
          </span>
        </motion.button>

        {/* 담당자 드롭다운 */}
        {isTodo && (
          <div
            className="rounded-2xl t-elevated overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <motion.button
              whileTap={{ scale: 0.99 }}
              onClick={() => setShowAssigneePicker(!showAssigneePicker)}
              className="w-full flex items-center gap-3 px-4 py-3.5"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4"/>
                <path d="M2.5 13.5c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span className="t-text-muted text-sm">담당자</span>
              <span className="t-text text-sm font-semibold ml-auto mr-1.5">
                {assigneeName ?? "없음"}
              </span>
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                style={{ transform: showAssigneePicker ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
              >
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.button>

            <AnimatePresence>
              {showAssigneePicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div
                    className="px-3 pb-2.5 pt-1 flex flex-col gap-0.5"
                    style={{ borderTop: "1px solid var(--border-mid)" }}
                  >
                    <button
                      onClick={() => { setAssigneeId(null); setAssigneeName(null); setShowAssigneePicker(false); }}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left w-full"
                      style={{ background: assigneeId === null ? "rgba(0,0,0,0.06)" : "transparent" }}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm t-card flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6h8" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <span className="t-text text-sm">없음</span>
                      {assigneeId === null && (
                        <svg className="ml-auto" width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    {members.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setAssigneeId(m.id); setAssigneeName(m.name); setShowAssigneePicker(false); }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left w-full"
                        style={{ background: assigneeId === m.id ? "rgba(0,0,0,0.06)" : "transparent" }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-base flex-shrink-0"
                          style={{ backgroundColor: m.color + "55" }}
                        >
                          {m.avatar}
                        </div>
                        <span className="t-text text-sm">{m.name}</span>
                        {assigneeId === m.id && (
                          <svg className="ml-auto" width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 날짜 설정 */}
        {isTodo && (
          <div
            className="rounded-2xl t-elevated overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-center gap-3 px-4 py-3.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3.5" width="12" height="11" rx="2" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4"/>
                <path d="M5 2v3M11 2v3M2 7.5h12" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span className="t-text-muted text-sm">날짜</span>
              <div
                className="ml-auto flex rounded-xl overflow-hidden gap-0.5"
                style={{ background: "rgba(0,0,0,0.06)", padding: "3px" }}
              >
                {(["none", "deadline", "range"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDateMode(mode)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all"
                    style={{
                      background: dateMode === mode ? "var(--btn-primary-bg)" : "transparent",
                      color: dateMode === mode ? "var(--btn-primary-fg, #fff)" : "var(--text-muted, rgba(0,0,0,0.45))",
                    }}
                  >
                    {mode === "none" ? "없음" : mode === "deadline" ? "마감일" : "기간"}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {dateMode !== "none" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div
                    className="px-4 pt-3 pb-4 flex flex-col gap-2.5"
                    style={{ borderTop: "1px solid var(--border-mid)" }}
                  >
                    {dateMode === "range" && (
                      <div className="flex items-center gap-3">
                        <span className="t-text-muted text-xs w-10 text-right flex-shrink-0">시작일</span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="flex-1 t-card rounded-xl px-3 py-2 text-sm t-text outline-none"
                          style={{ border: "1px solid var(--border-color, rgba(0,0,0,0.1))" }}
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="t-text-muted text-xs w-10 text-right flex-shrink-0">마감일</span>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="flex-1 t-card rounded-xl px-3 py-2 text-sm t-text outline-none"
                        style={{ border: "1px solid var(--border-color, rgba(0,0,0,0.1))" }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Save button */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-8 left-5 right-5 z-30"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleBack}
              className="w-full py-4 rounded-2xl t-btn-primary font-semibold text-base"
            >
              저장하기
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
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
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl font-semibold t-btn-secondary"
                >
                  취소
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDelete}
                  className="flex-1 py-3.5 rounded-2xl font-semibold text-white"
                  style={{ backgroundColor: "#E53935" }}
                >
                  삭제
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
