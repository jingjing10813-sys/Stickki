"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
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
      className="w-[90px] h-[90px] flex-shrink-0 p-2.5 relative overflow-hidden"
      style={{
        borderRadius: 8,
        backgroundColor: color,
        transform: `rotate(${task.rotation * 0.5}deg)`,
        boxShadow: "0 2px 10px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.5)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: 8,
          background: "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0,0,0,0.05) 20px, rgba(0,0,0,0.05) 21px)",
        }}
      />
      {task.type === "note" && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2">
          <svg width="8" height="12" viewBox="0 0 20 32" fill="none">
            <ellipse cx="10" cy="10" rx="10" ry="10" fill="#E53935"/>
            <rect x="9" y="18" width="2" height="14" rx="1" fill="#B71C1C"/>
          </svg>
        </div>
      )}
      <p className="font-motto text-black/70 text-[12px] leading-tight line-clamp-3 mt-2">
        {task.content}
      </p>
    </div>
  );
}

// ─── 전체화면 그리드 ─────────────────────────────────────────────
interface GridModalProps {
  tasks: Task[];
  members: Member[];
  groupId: string;
  dateLabel: string;
  onClose: () => void;
}

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function PostItGridModal({ tasks, members, groupId, dateLabel, onClose }: GridModalProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "#8E8E93" }}
    >
      {/* 헤더 */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pb-4" style={{ paddingTop: 60 }}>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </motion.button>

        <div className="text-center">
          <p className="font-display font-bold text-white" style={{ fontSize: 17 }}>{dateLabel}</p>
          <p className="text-white/60" style={{ fontSize: 13 }}>{tasks.length}개</p>
        </div>

        <div className="w-10" />
      </div>

      {/* 카드 그리드 — 2열 균등 배치 */}
      <div className="flex-1 overflow-y-auto" style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 40 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {tasks.map((task, i) => {
            const color = task.type === "todo"
              ? getColor(task.id, TODO_COLORS)
              : getColor(task.id, NOTE_COLORS);
            const isDone = task.status === "done";
            const d = daysSince(task.created_at);
            const tilt = (i % 2 === 0 ? 1 : -1) * (2 + (i % 3));

            return (
              <div key={task.id} style={{ padding: 12 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: tilt }}
                animate={{ opacity: 1, scale: 1, rotate: tilt }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 300, damping: 26, delay: i * 0.04 }}
                onClick={() => router.push(`/${groupId}/${task.id}`)}
                className="relative cursor-pointer flex flex-col"
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  backgroundColor: color,
                  borderRadius: 18,
                  padding: 14,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)",
                  filter: isDone ? "saturate(0.35) brightness(0.88)" : "none",
                }}
              >
                {/* 상단 행: 체크박스 + D+N 배지 */}
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 24, height: 24, borderRadius: 12,
                      border: `2px solid ${isDone ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.18)"}`,
                      backgroundColor: isDone ? "rgba(0,0,0,0.22)" : "transparent",
                    }}
                  >
                    {isDone && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>

                  {d > 0 && (
                    <div
                      className="flex items-center justify-center"
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
              </div>
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
  const { profile } = useAuth();
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
    <main className="min-h-screen flex flex-col dot-pattern">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 pb-4" style={{ paddingTop: 20 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="w-11 h-11 glass rounded-full flex items-center justify-center"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M8 2L2 8L8 14" stroke="currentColor" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
        <h1 className="font-display font-bold t-text text-lg">
          {profile?.name ?? ""}의 흔적
        </h1>
        <div className="w-11" />
      </header>

      {/* 필터 탭 */}
      <div className="px-5 pb-4">
        <div className="flex gap-2">
          {FILTER_TABS.map((tab) => (
            <motion.button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              whileTap={{ scale: 0.95 }}
              className="relative font-semibold transition-colors"
              style={{
                borderRadius: 12,
                fontSize: 16,
                paddingLeft: 14,
                paddingRight: 14,
                paddingTop: 10,
                paddingBottom: 10,
                backgroundColor: activeFilter === tab.value ? "var(--btn-primary-bg)" : "var(--card)",
                color: activeFilter === tab.value ? "var(--btn-primary-text)" : "var(--text-3)",
              }}
            >
              {activeFilter === tab.value && (
                <motion.span
                  layoutId="list-filter-pill"
                  className="absolute inset-0"
                  style={{ backgroundColor: "var(--btn-primary-bg)", borderRadius: 12, zIndex: -1 }}
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
                <div className="flex items-center gap-2" style={{ paddingLeft: 16, paddingRight: 16, marginBottom: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2" className="t-text"/>
                    <path d="M6 3.5V6L7.5 7.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2" strokeLinecap="round" className="t-text"/>
                  </svg>
                  <span className="t-text-muted font-medium" style={{ fontSize: 14 }}>
                    {formatDateLabel(dateKey)}
                  </span>
                  <span className="t-text-faint ml-auto" style={{ fontSize: 14 }}>
                    {dateTasks.length}개
                  </span>
                </div>

                {/* 날짜 카드 */}
                <motion.div
                  whileTap={{ scale: 0.975 }}
                  onClick={() => setSelectedDate(dateKey)}
                  className="pt-4 px-4 pb-6 cursor-pointer"
                  style={{ borderRadius: 10, backgroundColor: "var(--card)", boxShadow: "0 2px 14px rgba(0,0,0,0.09), 0 1px 3px rgba(0,0,0,0.06)" }}
                >
                  <h2 className="font-display font-bold t-text leading-tight" style={{ fontSize: 14, marginBottom: dateTasks.length > 1 ? 2 : 8 }}>
                    {dateTasks[0].content.length > 20
                      ? dateTasks[0].content.slice(0, 20) + "..."
                      : dateTasks[0].content}
                  </h2>
                  {dateTasks.length > 1 && (
                    <p className="t-text-muted mb-3" style={{ fontSize: 12 }}>
                      외 {dateTasks.length - 1}개 항목
                    </p>
                  )}

                  {/* 미니 포스트잇 프리뷰 */}
                  <div
                    className="flex gap-[10px] overflow-x-auto scrollbar-rounded"
                    style={{
                      paddingTop: 4,
                      paddingBottom: 12,
                      paddingLeft: 10,
                      paddingRight: 10,
                      marginTop: -4,
                      marginBottom: -12,
                      marginLeft: 0,
                      marginRight: 0,
                    }}
                  >
                    {dateTasks.slice(0, 6).map((task) => (
                      <MiniPostIt key={task.id} task={task} />
                    ))}
                    {dateTasks.length > 6 && (
                      <div className="w-[90px] h-[90px] flex-shrink-0 t-card flex items-center justify-center" style={{ borderRadius: 8 }}>
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
            onClose={() => setSelectedDate(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
