"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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

function hashInt(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
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

// ─── 리스트용 미니 썸네일 ─────────────────────────────────────────
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

// ─── 추억 흩뿌리기 모달 ───────────────────────────────────────────
const MAX_SCATTER = 9;
const CARD_W = 148;

interface ScatterModalProps {
  tasks: Task[];
  members: Member[];
  groupId: string;
  dateLabel: string;
  onClose: () => void;
}

function PostItScatterModal({ tasks, members, groupId, dateLabel, onClose }: ScatterModalProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [areaSize, setAreaSize] = useState({ w: 375, h: 640 });

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setAreaSize({ w: width, h: height });
    }
  }, []);

  const visible = tasks.slice(0, MAX_SCATTER);

  function getScatterPos(index: number, taskId: string) {
    const hash = hashInt(taskId);
    const cols = 3;
    const colStep = (areaSize.w - CARD_W - 16) / (cols - 1);
    const rows = Math.ceil(visible.length / cols);
    const rowStep = Math.min((areaSize.h - 80) / Math.max(rows, 2), 210);
    const col = index % cols;
    const row = Math.floor(index / cols);

    const ox = (hash % 22) - 11;
    const oy = ((hash >> 8) % 18) - 9;
    const rotate = ((hash >> 4) % 26) - 13;
    const zIndex = ((hash >> 12) % 9) + 1;

    return {
      x: Math.max(4, 8 + col * colStep + ox),
      y: Math.max(8, 28 + row * rowStep + oy),
      rotate,
      zIndex,
    };
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: "radial-gradient(ellipse at 50% 18%, #FFFBEF 0%, #EFE0B4 100%)",
      }}
      onClick={onClose}
    >
      {/* 종이 도트 텍스처 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(139,101,40,0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* 외곽 비네트 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 42%, rgba(110,75,15,0.14) 100%)",
        }}
      />

      {/* 헤더 */}
      <div
        className="relative flex-shrink-0 flex items-center justify-between px-5 pb-3"
        style={{ paddingTop: "calc(var(--spacing) * 4)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="font-display font-bold text-xl" style={{ color: "rgba(90,58,10,0.8)" }}>
            {dateLabel}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(120,85,20,0.45)" }}>
            {tasks.length}개의 메모가 있었어요
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(139,101,40,0.13)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="rgba(100,65,10,0.55)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </motion.button>
      </div>

      {/* 흩뿌리기 영역 */}
      <div ref={containerRef} className="flex-1 relative" onClick={onClose}>
        {visible.map((task, i) => {
          const pos = getScatterPos(i, task.id);
          const color = task.type === "todo"
            ? getColor(task.id, TODO_COLORS)
            : getColor(task.id, NOTE_COLORS);
          const isDone = task.status === "done";
          const isPinned = task.is_pinned ?? false;
          const isTodo = task.type === "todo";
          const member = members.find((m) => m.name === task.assignee_name);
          const reactions: Record<string, number> = task.reactions ?? {};
          const hasReactions = Object.values(reactions).some((c) => c > 0);

          return (
            <motion.div
              key={task.id}
              initial={{ y: 140, opacity: 0, rotate: pos.rotate * 2.2, scale: 0.78 }}
              animate={{ y: 0, opacity: 1, rotate: pos.rotate, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 230,
                damping: 22,
                delay: i * 0.06,
              }}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                zIndex: pos.zIndex,
                width: CARD_W,
                paddingTop: isPinned ? 18 : isTodo ? 0 : 14,
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/${groupId}/${task.id}`);
              }}
              whileTap={{ scale: 1.1, zIndex: 30, transition: { duration: 0.12 } }}
            >
              {/* 고정 핀 */}
              {isPinned && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
                  style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
                >
                  <svg width="20" height="32" viewBox="0 0 20 32" fill="none">
                    <ellipse cx="10" cy="10" rx="10" ry="10" fill="#E53935"/>
                    <ellipse cx="7" cy="7" rx="3" ry="3" fill="rgba(255,255,255,0.4)"/>
                    <rect x="9" y="18" width="2" height="14" rx="1" fill="#B71C1C"/>
                  </svg>
                </div>
              )}

              {/* 클립 (쪽지, 고정 아닐 때) */}
              {!isTodo && !isPinned && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
                  style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.2))" }}
                >
                  <svg width="14" height="26" viewBox="0 0 14 26" fill="none">
                    <path d="M7 24C3.7 24 1 21.3 1 18V6.5C1 4 3 2 5.5 2C8 2 10 4 10 6.5V18C10 19.7 8.7 21 7 21C5.3 21 4 19.7 4 18V7"
                      stroke="#90A4AE" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                  </svg>
                </div>
              )}

              {/* 카드 본체 */}
              <div
                className="rounded-xl overflow-visible select-none relative"
                style={{
                  backgroundColor: color,
                  aspectRatio: isTodo ? "1/1" : "3/4",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.55)",
                  filter: isDone ? "saturate(0.35) brightness(0.88)" : "none",
                }}
              >
                {/* 종이 줄 */}
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
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isDone ? "border-black/35 bg-black/25" : "border-black/22"
                        }`}
                      >
                        {isDone && (
                          <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                          </svg>
                        )}
                      </div>
                      <span
                        className="text-xl leading-none -mt-1 -mr-1"
                        style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.18))" }}
                      >
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

                {/* 반응 뱃지 */}
                {hasReactions && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                    {Object.entries(reactions)
                      .filter(([, c]) => c > 0)
                      .map(([emoji]) => (
                        <div
                          key={emoji}
                          className="px-1.5 py-0.5 rounded-full text-xs"
                          style={{
                            background: "rgba(28,28,32,0.8)",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                            border: "1.5px solid white",
                          }}
                        >
                          {emoji}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* 더 있음 안내 */}
        {tasks.length > MAX_SCATTER && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: visible.length * 0.06 + 0.15 }}
            className="absolute bottom-6 left-0 right-0 text-center text-xs"
            style={{ color: "rgba(130,90,20,0.4)" }}
          >
            +{tasks.length - MAX_SCATTER}개의 메모가 더 있어요
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

// ─── 리스트 페이지 ────────────────────────────────────────────────
export default function ListPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
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
      <header
        className="flex items-center justify-between px-5 pb-4 t-bg"
        style={{ paddingTop: "calc(var(--spacing) * 4)" }}
      >
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

                {/* 날짜 카드 — 탭하면 흩뿌리기 */}
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
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 overflow-hidden">
                      {dateTasks.slice(0, 4).map((task) => (
                        <MiniPostIt key={task.id} task={task} />
                      ))}
                      {dateTasks.length > 4 && (
                        <div className="w-16 h-16 rounded-xl flex-shrink-0 t-card flex items-center justify-center">
                          <span className="t-text-faint text-xs">+{dateTasks.length - 4}</span>
                        </div>
                      )}
                    </div>
                    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="flex-shrink-0 ml-2 opacity-25">
                      <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* 흩뿌리기 모달 */}
      <AnimatePresence>
        {selectedDate && selectedTasks.length > 0 && (
          <PostItScatterModal
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

