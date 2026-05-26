"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Group, Task, Member } from "@/types";
import { getColor, TODO_COLORS, NOTE_COLORS } from "@/components/ui/PostItCard";

type FilterTab = "all" | "todo" | "note" | "done";

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "전체", value: "all" },
  { label: "할 일", value: "todo" },
  { label: "쪽지", value: "note" },
  { label: "완료", value: "done" },
];

function getFilterSuffix(filter: FilterTab): string {
  if (filter === "todo") return "의 할 일";
  if (filter === "note") return "의 쪽지";
  if (filter === "done") return "에 완료된 흔적";
  return "의 기록";
}

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

function MiniPostIt({ task }: { task: Task }) {
  const color = task.type === "todo"
    ? getColor(task.id, TODO_COLORS)
    : getColor(task.id, NOTE_COLORS);
  return (
    <div
      className="w-16 h-16 rounded-xl flex-shrink-0 p-2 relative overflow-hidden"
      style={{
        backgroundColor: color,
        transform: `rotate(${task.rotation * 0.5}deg)`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      {task.type === "note" && (
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2">
          <svg width="8" height="12" viewBox="0 0 20 32" fill="none">
            <ellipse cx="10" cy="10" rx="10" ry="10" fill="#E53935"/>
            <rect x="9" y="18" width="2" height="14" rx="1" fill="#B71C1C"/>
          </svg>
        </div>
      )}
      <p className="font-motto text-black/70 text-[9px] leading-tight line-clamp-3 mt-2">
        {task.content}
      </p>
    </div>
  );
}

// ─── 블러 그리드 모달 ─────────────────────────────────────────────
interface GridModalProps {
  tasks: Task[];
  members: Member[];
  groupId: string;
  dateLabel: string;
  filter: FilterTab;
  onClose: () => void;
}

function PostItGridModal({ tasks, members, groupId, dateLabel, filter, onClose }: GridModalProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex flex-col bg-white/70 dark:bg-black/60"
      style={{ backdropFilter: "blur(20px)" }}
      onClick={onClose}
    >
      {/* 헤더 */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-5 pb-4"
        style={{ paddingTop: "calc(var(--spacing) * 4)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="font-display font-bold text-xl text-black/80 dark:text-white">
            {dateLabel}{getFilterSuffix(filter)}
          </p>
          <p className="text-xs mt-0.5 text-black/40 dark:text-white/40">{tasks.length}개</p>
        </div>
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

      {/* 카드 그리드 */}
      <div
        className="flex-1 overflow-y-auto px-5 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
          {tasks.map((task, i) => {
            const color = task.type === "todo"
              ? getColor(task.id, TODO_COLORS)
              : getColor(task.id, NOTE_COLORS);
            const isPinned = task.is_pinned ?? false;
            const isTodo = task.type === "todo";
            const isDone = task.status === "done";
            const member = members.find((m) => m.name === task.assignee_name);
            const reactions: Record<string, number> = task.reactions ?? {};
            const reactionEntries = Object.entries(reactions).filter(([, c]) => c > 0);

            // 그리드에서 너무 기울면 어색하므로 rotation 살짝 줄임
            const tilt = Math.max(-4, Math.min(4, task.rotation * 0.5));

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, scale: 0.82, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26, delay: i * 0.05 }}
                className="relative cursor-pointer"
                style={{
                  paddingTop: isPinned ? 20 : !isTodo ? 14 : 0,
                  paddingBottom: reactionEntries.length > 0 ? 16 : 0,
                }}
                onClick={() => router.push(`/${groupId}/${task.id}`)}
              >
                {/* 핀·클립·카드·반응 모두 같은 rotating 컨테이너 안에 */}
                <motion.div
                  whileTap={{ scale: 0.94 }}
                  className="relative"
                  style={{ transform: `rotate(${tilt}deg)` }}
                >
                  {/* 고정 핀 */}
                  {isPinned && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
                      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}>
                      <svg width="20" height="32" viewBox="0 0 20 32" fill="none">
                        <ellipse cx="10" cy="10" rx="10" ry="10" fill="#E53935"/>
                        <ellipse cx="7" cy="7" rx="3" ry="3" fill="rgba(255,255,255,0.4)"/>
                        <rect x="9" y="18" width="2" height="14" rx="1" fill="#B71C1C"/>
                      </svg>
                    </div>
                  )}

                  {/* 클립 */}
                  {!isTodo && !isPinned && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
                      style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))" }}>
                      <svg width="14" height="26" viewBox="0 0 14 26" fill="none">
                        <path d="M7 24C3.7 24 1 21.3 1 18V6.5C1 4 3 2 5.5 2C8 2 10 4 10 6.5V18C10 19.7 8.7 21 7 21C5.3 21 4 19.7 4 18V7"
                          stroke="#90A4AE" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                      </svg>
                    </div>
                  )}

                  {/* 카드 본체 */}
                  <div
                    className="rounded-xl overflow-visible select-none"
                    style={{
                      backgroundColor: color,
                      aspectRatio: isTodo ? "1/1" : "3/4",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.55)",
                      filter: isDone ? "saturate(0.35) brightness(0.88)" : "none",
                    }}
                  >
                    <div className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        background: "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.04) 23px, rgba(0,0,0,0.04) 24px)",
                        opacity: 0.5,
                      }}
                    />
                    <div className="relative p-3 h-full flex flex-col">
                      {isTodo && (
                        <div className="flex items-start justify-between mb-2">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isDone ? "border-black/35 bg-black/25" : "border-black/22"
                          }`}>
                            {isDone && (
                              <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                              </svg>
                            )}
                          </div>
                          <span className="text-xl leading-none -mt-1 -mr-1"
                            style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.18))" }}>
                            {member?.avatar ?? "🐾"}
                          </span>
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

                  {/* 반응 뱃지 — 카드와 같은 rotating 컨테이너 안에서 absolute */}
                  {reactionEntries.length > 0 && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                      {reactionEntries.map(([emoji, count]) => (
                        <div key={emoji} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: "rgba(28,28,32,0.88)", border: "1.5px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
                          <span className="text-sm leading-none">{emoji}</span>
                          {count > 1 && <span className="text-white/60 text-[10px]">{count}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default function ListPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const initialFilter = (searchParams.get("filter") as FilterTab) ?? "all";
  const [activeFilter, setActiveFilter] = useState<FilterTab>(initialFilter);
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
  const members: Member[] = group?.members ?? [];

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    return grouped.find(([dk]) => dk === selectedDate)?.[1] ?? [];
  }, [selectedDate, grouped]);

  return (
    <main className="min-h-screen t-bg flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 pb-4 t-bg" style={{ paddingTop: "calc(var(--spacing) * 4)" }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="w-9 h-9 glass rounded-full flex items-center justify-center"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M8 2L2 8L8 14" stroke="currentColor" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
              {activeFilter === tab.value && (
                <motion.span
                  layoutId="list-filter-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: "var(--btn-primary-bg)", zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 리스트 */}
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
                {/* 날짜 섹션 헤더 */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2" className="t-text"/>
                    <path d="M6 3.5V6L7.5 7.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2" strokeLinecap="round" className="t-text"/>
                  </svg>
                  <span className="t-text-muted text-xs font-medium">
                    {formatDateLabel(dateKey)}
                  </span>
                  <span className="t-text-faint text-xs ml-auto">
                    {dateTasks.length}개
                  </span>
                </div>

                {/* 날짜 카드 */}
                <motion.div
                  whileTap={{ scale: 0.975 }}
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
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {dateTasks.slice(0, 6).map((task) => (
                      <MiniPostIt key={task.id} task={task} />
                    ))}
                    {dateTasks.length > 6 && (
                      <div className="w-16 h-16 rounded-xl flex-shrink-0 t-card flex items-center justify-center">
                        <span className="t-text-faint text-xs">+{dateTasks.length - 6}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* 블러 그리드 모달 */}
      <AnimatePresence>
        {selectedDate && selectedTasks.length > 0 && (
          <PostItGridModal
            tasks={selectedTasks}
            members={members}
            groupId={groupId}
            dateLabel={formatDateLabel(selectedDate)}
            filter={activeFilter}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
