"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Group, Task } from "@/types";
import { getColor, TODO_COLORS, NOTE_COLORS } from "@/components/ui/PostItCard";
import { useTheme } from "@/lib/theme";

type FilterTab = "all" | "todo" | "note" | "done";

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "전체", value: "all" },
  { label: "할 일", value: "todo" },
  { label: "쪽지", value: "note" },
  { label: "완료", value: "done" },
];

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getFilterSuffix(filter: FilterTab): string {
  if (filter === "todo") return "의 할 일";
  if (filter === "note") return "의 쪽지";
  if (filter === "done") return "에 완료된 흔적";
  return "의 기록";
}

function groupByDate(tasks: Task[]): [string, Task[]][] {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const date = new Date(task.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(task);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

// ─── 그리드용 포스트잇 카드 ─────────────────────────────────────────
function GridPostIt({ task }: { task: Task }) {
  const color = task.type === "todo"
    ? getColor(task.id, TODO_COLORS)
    : getColor(task.id, NOTE_COLORS);

  const reactions: Record<string, number> = task.reactions ?? {};
  const hasReactions = Object.values(reactions).some((r) => r > 0);

  return (
    <div
      className="relative flex flex-col"
      style={{ transform: `rotate(${(task.rotation ?? 0) * 0.5}deg)` }}
    >
      {/* 핀 / 클립 */}
      {task.type === "note" ? (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <svg width="14" height="20" viewBox="0 0 20 32" fill="none">
            <ellipse cx="10" cy="10" rx="10" ry="10" fill="#E53935"/>
            <rect x="9" y="18" width="2" height="14" rx="1" fill="#B71C1C"/>
          </svg>
        </div>
      ) : task.is_pinned ? (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <svg width="12" height="18" viewBox="0 0 20 30" fill="none">
            <circle cx="10" cy="10" r="9" fill="#FFD700" stroke="#FFA000" strokeWidth="1.5"/>
            <circle cx="10" cy="10" r="4" fill="#FFA000"/>
            <rect x="9" y="18" width="2" height="12" rx="1" fill="#FFA000"/>
          </svg>
        </div>
      ) : null}

      {/* 카드 */}
      <div
        className="rounded-xl p-3 relative overflow-hidden"
        style={{
          backgroundColor: task.is_pinned && task.type === "todo" ? "#FFF9C4" : color,
          boxShadow: "0 3px 10px rgba(0,0,0,0.13)",
          minHeight: 80,
        }}
      >
        <p className="font-motto text-black/75 text-xs leading-snug line-clamp-4 mt-2">
          {task.content}
        </p>
        {task.assignee_name && (
          <p className="text-black/40 text-[9px] mt-1 truncate">— {task.assignee_name}</p>
        )}
      </div>

      {/* 반응 뱃지 */}
      {hasReactions && (
        <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
          {Object.entries(reactions)
            .filter(([, count]) => count > 0)
            .map(([emoji, count]) => (
              <span
                key={emoji}
                className="text-[10px] bg-black/8 dark:bg-white/12 rounded-full px-1.5 py-0.5"
              >
                {emoji} {count > 1 ? count : ""}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── 블러 그리드 모달 ─────────────────────────────────────────
interface GridModalProps {
  tasks: Task[];
  dateKey: string;
  filter: FilterTab;
  onClose: () => void;
  isDark: boolean;
}

function PostItGridModal({ tasks, dateKey, filter, onClose, isDark }: GridModalProps) {
  const label = formatDateLabel(dateKey) + getFilterSuffix(filter);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.7)",
        }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-5 pt-12 pb-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className={`font-display font-bold text-lg ${isDark ? "text-white" : "text-black/80"}`}>
            {label}
          </h2>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-black/8 dark:bg-white/12"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </motion.button>
        </div>

        {/* 그리드 */}
        <div
          className="flex-1 overflow-auto px-5 pb-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-2 gap-4 pt-2">
            {tasks.map((task, idx) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: idx * 0.04, type: "spring", stiffness: 300, damping: 28 }}
              >
                <GridPostIt task={task} />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── 메인 ─────────────────────────────────────────
export default function ListPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [group, setGroup] = useState<Group | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>(
    (searchParams.get("filter") as FilterTab) ?? "all"
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("groups").select("*").eq("id", groupId).single()
      .then(({ data }) => { if (data) setGroup(data); });

    supabase.from("tasks").select("*").eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setTasks(data); });

    const channel = supabase
      .channel(`list-${groupId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "tasks",
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") setTasks((p) => [payload.new as Task, ...p]);
        else if (payload.eventType === "UPDATE")
          setTasks((p) => p.map((t) => t.id === payload.new.id ? payload.new as Task : t));
        else if (payload.eventType === "DELETE")
          setTasks((p) => p.filter((t) => t.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return tasks;
    if (activeFilter === "done") return tasks.filter((t) => t.status === "done");
    return tasks.filter((t) => t.type === activeFilter);
  }, [tasks, activeFilter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    return grouped.find(([k]) => k === selectedDate)?.[1] ?? [];
  }, [selectedDate, grouped]);

  return (
    <main className="min-h-screen t-bg flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 pt-12 pb-4 t-bg">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center"
        >
          <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
            <path d="M9 1L1 9L9 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="t-text"/>
          </svg>
        </motion.button>
        <h1 className="font-display font-bold t-text text-lg">
          {group?.name ?? ""}의 흔적
        </h1>
        <div className="w-9" />
      </header>

      {/* 필터 탭 */}
      <div className="px-5 pb-4 t-bg">
        <div className="flex gap-2">
          {FILTER_TABS.map((tab) => (
            <motion.button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              whileTap={{ scale: 0.95 }}
              className="relative px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              style={{
                backgroundColor: activeFilter === tab.value ? "var(--btn-primary-bg)" : "var(--card)",
                color: activeFilter === tab.value ? "var(--btn-primary-text)" : "var(--text-3)",
              }}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 날짜별 리스트 */}
      <div className="flex-1 overflow-auto px-5 pb-8 space-y-3">
        {grouped.length === 0 ? (
          <p className="text-center t-text-faint text-sm pt-16">항목이 없어요</p>
        ) : (
          <AnimatePresence>
            {grouped.map(([dateKey, dateTasks]) => (
              <motion.div
                key={dateKey}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {/* 날짜 레이블 */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2"/>
                    <path d="M6 3.5V6L7.5 7.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span className="t-text-muted text-xs font-medium">
                    {formatDateLabel(dateKey)}
                  </span>
                  <span className="t-text-faint text-xs ml-auto">{dateTasks.length}개</span>
                </div>

                {/* 날짜 카드 — 탭하면 모달 */}
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedDate(dateKey)}
                  className="t-elevated rounded-3xl p-4 cursor-pointer"
                  style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
                >
                  <h2 className="font-display font-bold t-text text-xl leading-tight mb-0.5">
                    {dateTasks[0].content.length > 20
                      ? dateTasks[0].content.slice(0, 20) + "..."
                      : dateTasks[0].content}
                  </h2>
                  {dateTasks.length > 1 && (
                    <p className="t-text-muted text-sm mb-3">
                      외 {dateTasks.length - 1}개 항목
                    </p>
                  )}

                  {/* 미니 포스트잇 프리뷰 */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {dateTasks.slice(0, 5).map((task) => {
                      const color = task.type === "todo"
                        ? getColor(task.id, TODO_COLORS)
                        : getColor(task.id, NOTE_COLORS);
                      return (
                        <div
                          key={task.id}
                          className="w-14 h-14 rounded-xl flex-shrink-0 p-1.5 relative overflow-hidden"
                          style={{
                            backgroundColor: task.is_pinned && task.type === "todo" ? "#FFF9C4" : color,
                            transform: `rotate(${(task.rotation ?? 0) * 0.5}deg)`,
                            boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                          }}
                        >
                          {task.type === "note" && (
                            <div className="absolute top-0.5 left-1/2 -translate-x-1/2">
                              <svg width="6" height="10" viewBox="0 0 20 32" fill="none">
                                <ellipse cx="10" cy="10" rx="10" ry="10" fill="#E53935"/>
                                <rect x="9" y="18" width="2" height="14" rx="1" fill="#B71C1C"/>
                              </svg>
                            </div>
                          )}
                          <p className="font-motto text-black/70 text-[8px] leading-tight line-clamp-3 mt-1.5">
                            {task.content}
                          </p>
                        </div>
                      );
                    })}
                    {dateTasks.length > 5 && (
                      <div className="w-14 h-14 rounded-xl flex-shrink-0 t-card flex items-center justify-center">
                        <span className="t-text-faint text-xs">+{dateTasks.length - 5}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* 그리드 모달 */}
      <AnimatePresence>
        {selectedDate && (
          <PostItGridModal
            tasks={selectedTasks}
            dateKey={selectedDate}
            filter={activeFilter}
            onClose={() => setSelectedDate(null)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
