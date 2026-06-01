"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Task, Member } from "@/types";

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

function getDdayColors(diff: number): { bg: string; text: string } {
  if (diff <= 0) return { bg: "#E53935", text: "#fff" };
  if (diff < 5) return { bg: "#FF6B35", text: "#fff" };
  return { bg: "#9E9E9E", text: "#fff" };
}

function formatDateKorean(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}까지`;
}

interface TaskDetailModalProps {
  task: Task;
  members: Member[];
  onClose: () => void;
  onUpdate?: (updated: Task) => void;
}

export default function TaskDetailModal({ task, members, onClose, onUpdate }: TaskDetailModalProps) {
  const [content, setContent] = useState(task.content);
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [assigneeName, setAssigneeName] = useState(task.assignee_name ?? "");
  const [isDone, setIsDone] = useState(task.status === "done");
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const reactions: Record<string, number> = task.reactions ?? {};
  const reactionEntries = Object.entries(reactions).filter(([, count]) => count > 0);
  const diff = dueDate ? getDdayDiff(dueDate) : null;
  const selectedMember = members.find((m) => m.name === assigneeName) ?? null;

  async function handleToggleDone() {
    const newDone = !isDone;
    setIsDone(newDone);
    const { data } = await supabase
      .from("tasks")
      .update({
        status: newDone ? "done" : "pending",
        completed_at: newDone ? (task.completed_at ?? new Date().toISOString()) : null,
      })
      .eq("id", task.id)
      .select()
      .single();
    if (data) onUpdate?.(data as Task);
  }

  async function handleSaveAndClose() {
    if (saving) return;
    setSaving(true);
    const { data } = await supabase
      .from("tasks")
      .update({
        content: content.trim() || task.content,
        due_date: dueDate || null,
        assignee_name: assigneeName || null,
        status: isDone ? "done" : "pending",
        completed_at: isDone ? (task.completed_at ?? new Date().toISOString()) : null,
      })
      .eq("id", task.id)
      .select()
      .single();
    if (data) onUpdate?.(data as Task);
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      onClick={handleSaveAndClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 420, damping: 38 }}
        className="relative w-full max-w-sm rounded-3xl p-6"
        style={{
          backgroundColor: "#fff",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          minHeight: 320,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 행: 체크박스 + 담당자 드롭다운 */}
        <div className="flex items-start justify-between mb-5">
          <button
            onClick={handleToggleDone}
            className="w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              borderColor: isDone ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.18)",
              backgroundColor: isDone ? "rgba(0,0,0,0.25)" : "transparent",
            }}
          >
            {isDone && (
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                <path d="M1.5 5.5L5 9L12.5 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-all"
              style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
            >
              <span className="text-2xl leading-none">
                {selectedMember?.avatar ?? "🐾"}
              </span>
              <motion.svg
                animate={{ rotate: showDropdown ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                width="12" height="12" viewBox="0 0 12 12" fill="none"
              >
                <path d="M2 4L6 8L10 4" stroke="rgba(0,0,0,0.4)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </motion.svg>
            </button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  className="absolute right-0 top-full mt-1.5 rounded-2xl overflow-hidden"
                  style={{
                    background: "#fff",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    minWidth: 140,
                    zIndex: 20,
                  }}
                >
                  <button
                    onClick={() => { setAssigneeName(""); setShowDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm"
                    style={{
                      backgroundColor: !assigneeName ? "rgba(0,0,0,0.05)" : "transparent",
                      color: "rgba(0,0,0,0.5)",
                    }}
                  >
                    <span className="text-base">🐾</span>없음
                  </button>
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setAssigneeName(m.name); setShowDropdown(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium"
                      style={{
                        backgroundColor: assigneeName === m.name ? m.color + "22" : "transparent",
                        color: assigneeName === m.name ? m.color : "rgba(0,0,0,0.7)",
                      }}
                    >
                      <span className="text-base">{m.avatar}</span>
                      {m.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* D-day 뱃지 + 날짜 + 달력 아이콘 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <AnimatePresence mode="wait">
            {diff !== null && (
              <motion.span
                key={getDdayLabel(diff)}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: getDdayColors(diff).bg, color: getDdayColors(diff).text }}
              >
                {getDdayLabel(diff)}
              </motion.span>
            )}
          </AnimatePresence>

          {dueDate && (
            <span className="text-sm font-medium" style={{ color: "rgba(0,0,0,0.45)" }}>
              {formatDateKorean(dueDate)}
            </span>
          )}

          {/* 달력 아이콘 — label로 감싸 input 클릭 트리거 */}
          <label
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: "rgba(0,0,0,0.06)" }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1" y="2.5" width="13" height="11.5" rx="2" stroke="rgba(0,0,0,0.4)" strokeWidth="1.3"/>
              <path d="M1 6h13" stroke="rgba(0,0,0,0.4)" strokeWidth="1.3"/>
              <path d="M5 1v3M10 1v3" stroke="rgba(0,0,0,0.4)" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              ref={dateInputRef}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              style={{ fontSize: "16px" }}
            />
          </label>

          {dueDate && (
            <button
              onClick={() => setDueDate("")}
              className="text-xs"
              style={{ color: "rgba(0,0,0,0.25)" }}
            >
              ✕
            </button>
          )}
        </div>

        {/* 할일 내용 */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="할 일을 적어요..."
          rows={3}
          className="w-full bg-transparent outline-none resize-none font-bold leading-tight mb-5"
          style={{
            fontSize: content.length > 20 ? "22px" : "28px",
            color: isDone ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.8)",
            textDecoration: isDone ? "line-through" : "none",
          }}
        />

        {/* 공감 */}
        {reactionEntries.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {reactionEntries.map(([emoji, count]) => (
              <span
                key={emoji}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-base"
                style={{
                  background: "rgba(0,0,0,0.06)",
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                {emoji}
                {count > 1 && (
                  <span className="text-xs font-medium" style={{ color: "rgba(0,0,0,0.4)" }}>{count}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* 작성자 */}
        <p className="text-sm" style={{ color: "rgba(0,0,0,0.3)" }}>
          {task.assignee_name ?? ""}
        </p>
      </motion.div>
    </motion.div>
  );
}
