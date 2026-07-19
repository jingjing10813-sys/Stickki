"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Group, Task, Member } from "@/types";
import PostItCard from "@/components/ui/PostItCard";
import MemberBar from "@/components/ui/MemberBar";
import AddTaskModal from "@/components/modals/AddTaskModal";

const AVATARS = ["🐶","🐱","🐻","🦊","🐸","🐼","🐨","🐯","🐧","🦁","🐮","🐷","🐙","🦋","🐺","🦝"];
const MEMBER_COLORS = ["#FF6B6B","#FF9F43","#FECA57","#48DBFB","#FF9FF3","#54A0FF","#5F27CD","#01CBC6"];

const CELL_W = 172;
const CELL_H = 290;
const PADDING = 20;
const SCATTER = 14;
const FIXED_ROWS = 5;
const GRID_VERSION = "v3";

function hashInt(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function computeGridPos(index: number, taskId: string) {
  const col = Math.floor(index / FIXED_ROWS);
  const row = index % FIXED_ROWS;
  const h = hashInt(taskId);
  const sx = ((h % (SCATTER * 2)) - SCATTER);
  const sy = (((h >> 6) % (SCATTER * 2)) - SCATTER);
  return { x: PADDING + col * CELL_W + sx, y: PADDING + row * CELL_H + sy };
}

export default function WhiteboardPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMotto, setEditingMotto] = useState(false);
  const [mottoValue, setMottoValue] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 360, h: 600 });
  const [nextPosition, setNextPosition] = useState<{ x: number; y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [swappingIds, setSwappingIds] = useState<[string, string] | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragActiveRef = useRef(false);
  const dropTargetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tutorialShownRef = useRef(false);

  // 휴지통 드래그-삭제 상태
  const [longPressId, setLongPressId] = useState<string | null>(null);
  const longPressIdRef = useRef<string | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const isOverTrashRef = useRef(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!draggingIdRef.current) return;
      if (dragStartPosRef.current) {
        const dx = e.clientX - dragStartPosRef.current.x;
        const dy = e.clientY - dragStartPosRef.current.y;
        if (Math.hypot(dx, dy) < 8) return;
        dragActiveRef.current = true;
        dragStartPosRef.current = null;
        setDraggingId(draggingIdRef.current);
      }
      if (!dragActiveRef.current) return;

      // 롱프레스 모드: 휴지통 존 감지
      if (longPressIdRef.current) {
        const over = e.clientY > window.innerHeight - 100;
        if (over !== isOverTrashRef.current) {
          isOverTrashRef.current = over;
          setIsOverTrash(over);
        }
        return; // 카드 스왑 감지 스킵
      }

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cardEl = el?.closest("[data-card-id]") as HTMLElement | null;
      const targetId = cardEl?.dataset.cardId ?? null;
      const next = targetId !== draggingIdRef.current ? targetId : null;
      if (dropTargetTimerRef.current) clearTimeout(dropTargetTimerRef.current);
      dropTargetTimerRef.current = setTimeout(() => setDropTargetId(next), 40);
    }
    function onPointerUp(e: PointerEvent) {
      if (!draggingIdRef.current) return;
      const dragging = draggingIdRef.current;
      const wasActive = dragActiveRef.current;
      const longId = longPressIdRef.current;
      const wasOverTrash = isOverTrashRef.current;

      draggingIdRef.current = null;
      dragStartPosRef.current = null;
      dragActiveRef.current = false;
      longPressIdRef.current = null;
      isOverTrashRef.current = false;
      setDraggingId(null);
      setDropTargetId(null);
      setLongPressId(null);
      setIsOverTrash(false);

      if (!wasActive) return;

      // 휴지통에 드롭 → 삭제
      if (longId && wasOverTrash) {
        setDeletingTaskId(longId);
        setTimeout(() => {
          setTasks((prev) => prev.filter((t) => t.id !== longId));
          supabase.from("tasks").delete().eq("id", longId);
          setDeletingTaskId(null);
        }, 520);
        return;
      }

      // 롱프레스 모드였지만 휴지통 밖에서 놓음 → 아무것도 안 함
      if (longId) return;

      // 일반 드래그: 카드 스왑
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cardEl = el?.closest("[data-card-id]") as HTMLElement | null;
      const targetId = cardEl?.dataset.cardId;
      if (targetId && targetId !== dragging) {
        setSwappingIds([dragging, targetId]);
        setTasks((prev) => {
          const taskA = prev.find((t) => t.id === dragging);
          const taskB = prev.find((t) => t.id === targetId);
          if (!taskA || !taskB) return prev;
          const posA = { position_x: taskA.position_x, position_y: taskA.position_y };
          const posB = { position_x: taskB.position_x, position_y: taskB.position_y };
          supabase.from("tasks").update(posB).eq("id", dragging);
          supabase.from("tasks").update(posA).eq("id", targetId);
          return prev.map((t) => {
            if (t.id === dragging) return { ...t, ...posB };
            if (t.id === targetId) return { ...t, ...posA };
            return t;
          });
        });
        setTimeout(() => setSwappingIds(null), 400);
      }
    }
    function onPointerCancel() {
      if (dropTargetTimerRef.current) clearTimeout(dropTargetTimerRef.current);
      draggingIdRef.current = null;
      dragStartPosRef.current = null;
      dragActiveRef.current = false;
      longPressIdRef.current = null;
      isOverTrashRef.current = false;
      setDraggingId(null);
      setDropTargetId(null);
      setLongPressId(null);
      setIsOverTrash(false);
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, []);

  const handleCardDragStart = useCallback((id: string, clientX: number, clientY: number) => {
    draggingIdRef.current = id;
    dragStartPosRef.current = { x: clientX, y: clientY };
    dragActiveRef.current = false;
    setDropTargetId(null);
  }, []);

  const handleCardLongPress = useCallback((id: string) => {
    longPressIdRef.current = id;
    setLongPressId(id);
  }, []);

  const handleCardTap = useCallback((id: string) => {
    router.push(`/${groupId}/${id}`);
  }, [groupId, router]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setCanvasSize({ w: width - 40, h: height - 60 });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = Math.max(2, Math.ceil(tasks.length / FIXED_ROWS));
  const actualRows = tasks.length === 0 ? 1 : Math.min(FIXED_ROWS, tasks.length);
  const gridNaturalW = cols * CELL_W + PADDING * 2;
  const gridNaturalH = (actualRows - 1) * CELL_H + 148 + PADDING * 2;

  const [viewAll, setViewAll] = useState(true);
  const scrollScale = Math.min(1.2, Math.max(0.5, canvasSize.h / gridNaturalH));
  const fitScale = Math.min(0.95, canvasSize.w / gridNaturalW, canvasSize.h / gridNaturalH);
  const gridScale = viewAll ? fitScale : scrollScale;


  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupAvatar, setSetupAvatar] = useState(AVATARS[0]);
  const [setupLoading, setSetupLoading] = useState(false);

  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

  // 마지막 방 저장
  useEffect(() => {
    if (groupId) localStorage.setItem("last_group_id", groupId);
  }, [groupId]);

  // 처음 방 입장 시 튜토리얼 표시
  // ref를 써서 group 업데이트(realtime 멤버 추가 등)로 effect가 재실행돼도 한 번만 뜨도록 보장
  // ?reset-tutorial=1 파라미터로 언제든 재실행 가능 (테스트용)
  useEffect(() => {
    if (!group || !groupId || tutorialShownRef.current) return;
    const key = `tutorial_seen_${groupId}`;
    const shouldReset = searchParams.get("reset-tutorial") === "1";
    if (shouldReset) localStorage.removeItem(key);
    if (!localStorage.getItem(key)) {
      tutorialShownRef.current = true;
      localStorage.setItem(key, "true");
      setTutorialStep(0);
    }
  }, [group, groupId, searchParams]);

  function advanceTutorial() {
    setTutorialStep((s) => (s === null || s >= 2 ? null : s + 1));
  }

  useEffect(() => {
    if (authLoading || !user) return;

    if (!profile) {
      setShowProfileSetup(true);
      return;
    }

    supabase.from("groups").select("*").eq("id", groupId).single()
      .then(async ({ data }) => {
        if (!data) return;
        const alreadyMember = (data.members ?? []).some((m: Member) => m.id === user.id);
        if (!alreadyMember) {
          const newMember: Member = {
            id: user.id,
            name: profile.name,
            avatar: profile.avatar,
            color: profile.color,
          };
          const updated = [...(data.members ?? []), newMember];
          const { data: updatedGroup } = await supabase
            .from("groups").update({ members: updated }).eq("id", data.id).select().single();
          setGroup(updatedGroup ?? { ...data, members: updated });
        } else {
          setGroup(data);
        }
        setMottoValue(data.motto);
      });

    supabase.from("tasks").select("*").eq("group_id", groupId)
      .order("position_x", { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        const storedVersion = localStorage.getItem(`grid_version_${groupId}`);
        // 퍼센트 기반 구 포지션 감지: 카드가 FIXED_ROWS 초과인데 x가 전부 CELL_W 미만이면 구 데이터
        const looksLikeOldData = data.length > FIXED_ROWS && data.every((t) => (t.position_x ?? 0) < CELL_W);
        const needsMigration = storedVersion !== GRID_VERSION || data.some((t) => t.position_y === 0) || looksLikeOldData;
        if (needsMigration) {
          const migrated = data.map((task, i) => {
            const { x, y } = computeGridPos(i, task.id);
            return { ...task, position_x: x, position_y: y };
          });
          setTasks(migrated);
          localStorage.setItem(`grid_version_${groupId}`, GRID_VERSION);
          migrated.forEach((t) => {
            supabase.from("tasks").update({ position_x: t.position_x, position_y: t.position_y }).eq("id", t.id);
          });
        } else {
          setTasks(data);
        }
      });

    const channel = supabase
      .channel(`group-${groupId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "tasks",
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") setTasks((p) => [...p, payload.new as Task]);
        else if (payload.eventType === "UPDATE")
          setTasks((p) => p.map((t) => {
            if (t.id !== payload.new.id) return t;
            const incoming = payload.new as Task;
            // position은 로컬 state 유지 — swap은 이미 optimistic 처리, toggle/reaction 등은 position 변경 없음
            return { ...incoming, position_x: t.position_x, position_y: t.position_y };
          }));
        else if (payload.eventType === "DELETE")
          setTasks((p) => p.filter((t) => t.id !== payload.old.id));
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "groups",
        filter: `id=eq.${groupId}`,
      }, (payload) => {
        setGroup(payload.new as Group);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId, user, profile, authLoading]);

  async function handleProfileSetup() {
    if (!setupName.trim() || !user || setupLoading) return;
    setSetupLoading(true);
    const usedColors = group ? (group.members ?? []).map((m: Member) => m.color) : [];
    const color = MEMBER_COLORS.find((c) => !usedColors.includes(c)) ?? MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)];
    await supabase.from("profiles").insert({
      id: user.id,
      name: setupName.trim(),
      avatar: setupAvatar,
      color,
    });
    await refreshProfile();
    setShowProfileSetup(false);
    setSetupLoading(false);
  }

  async function saveMotto() {
    setEditingMotto(false);
    if (!group || mottoValue === group.motto) return;
    const { data } = await supabase.from("groups").update({ motto: mottoValue })
      .eq("id", group.id).select().single();
    if (data) setGroup(data);
  }

  async function addDummyTasks() {
    const dummies = [
      { content: "장보기 🛒", type: "todo" },
      { content: "운동하기 💪", type: "todo" },
      { content: "같이 영화보자!", type: "note" },
      { content: "청소기 돌리기", type: "todo" },
      { content: "오늘 저녁 뭐 먹지? 🍜", type: "note" },
      { content: "세탁기 돌리기", type: "todo" },
      { content: "고마워 ❤️", type: "note" },
      { content: "약속 잡기", type: "todo" },
    ];
    for (let i = 0; i < dummies.length; i++) {
      const { x, y } = computeGridPos(tasks.length + i, `dummy-${i}`);
      await supabase.from("tasks").insert({
        group_id: groupId,
        content: dummies[i].content,
        type: dummies[i].type,
        status: "pending",
        rotation: (Math.random() - 0.5) * 12,
        position_x: x,
        position_y: y,
        color: ["#FFF9C4","#F8BBD9","#B2EBF2","#C8E6C9","#FFCCBC","#E1BEE7"][i % 6],
      });
    }
  }

  async function handleRemoveMember(id: string) {
    if (!group) return;
    const updated = (group.members ?? []).filter((m) => m.id !== id);
    const { data } = await supabase.from("groups").update({ members: updated })
      .eq("id", group.id).select().single();
    if (data) setGroup(data);
  }

  const me = (group?.members ?? []).find((m) => m.id === user?.id);

  if (showProfileSetup) {
    return (
      <main className="min-h-screen dot-pattern flex items-end justify-center">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 40 }}
          className="w-full max-w-lg t-elevated rounded-t-3xl pt-3 pb-10 px-5"
          style={{ boxShadow: "0 -20px 60px rgba(0,0,0,0.3)" }}
        >
          <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: "var(--border-mid)" }} />
          <div className="flex justify-center mb-5">
            <motion.div
              key={setupAvatar}
              initial={{ scale: 0.6, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-5xl"
              style={{ background: "var(--card)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
            >
              {setupAvatar}
            </motion.div>
          </div>
          <div className="grid grid-cols-8 gap-1.5 mb-5">
            {AVATARS.map((av) => (
              <motion.button
                key={av}
                whileTap={{ scale: 0.85 }}
                onClick={() => setSetupAvatar(av)}
                className="w-full aspect-square rounded-xl flex items-center justify-center text-xl"
                style={{
                  background: setupAvatar === av ? "var(--card-hover)" : "var(--card)",
                  boxShadow: setupAvatar === av ? "0 0 0 2px var(--btn-primary-bg)" : "none",
                }}
              >
                {av}
              </motion.button>
            ))}
          </div>
          <p className="t-text font-semibold text-base mb-3">어떻게 불릴까요?</p>
          <input
            autoFocus
            value={setupName}
            onChange={(e) => setSetupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleProfileSetup()}
            placeholder="나의 이름"
            className="w-full t-card rounded-2xl px-4 py-3 t-text outline-none mb-4"
            style={{ border: "1px solid var(--border-color)" }}
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleProfileSetup}
            disabled={!setupName.trim() || setupLoading}
            className="w-full py-3.5 rounded-2xl t-btn-primary font-semibold disabled:opacity-30"
          >
            {setupLoading ? "저장 중..." : "입장하기 ✦"}
          </motion.button>
        </motion.div>
      </main>
    );
  }

  if (!group) {
    return (
      <main className="min-h-screen dot-pattern flex items-center justify-center">
        <span className="t-text-faint text-sm">불러오는 중...</span>
      </main>
    );
  }

  return (
    <main className="h-dvh dot-pattern flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between px-5 pb-4 relative" style={{ paddingTop: 20 }}>
        <span className="font-display font-bold t-text text-lg tracking-tight">Stickki</span>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
          <span className="text-sm">🏠</span>
          <span className="font-display t-text font-semibold text-sm tracking-tight">{group.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push(`/${groupId}/list`)}
            className="w-11 h-11 glass rounded-full flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="1.5" rx="0.75" fill="currentColor" fillOpacity="0.7"/>
              <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" fillOpacity="0.7"/>
              <rect x="2" y="11.5" width="12" height="1.5" rx="0.75" fill="currentColor" fillOpacity="0.7"/>
            </svg>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push(`/${groupId}/mypage`)}
            className="w-11 h-11 rounded-full flex items-center justify-center text-xl overflow-hidden"
            style={{
              background: me ? me.color + "99" : "var(--card)",
              border: me ? "none" : "1.5px dashed var(--border-mid)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            {me ? me.avatar : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.4"/>
                <path d="M2.5 13.5c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            )}
          </motion.button>
        </div>
      </header>

      <div className="flex-shrink-0 flex items-center justify-center px-5" style={{ marginBottom: 0 }}>
        {editingMotto ? (
          <input
            autoFocus
            value={mottoValue}
            onChange={(e) => setMottoValue(e.target.value)}
            onBlur={saveMotto}
            onKeyDown={(e) => e.key === "Enter" && saveMotto()}
            className="font-motto text-xs bg-transparent outline-none text-center w-48 t-text-muted"
            style={{ borderBottom: "1px solid var(--border-mid)" }}
          />
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            onClick={() => setEditingMotto(true)}
            className="font-motto text-xs t-text-muted"
          >
            {group.motto}
          </motion.button>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="flex-shrink-0 flex items-center justify-end px-5" style={{ paddingTop: 10, paddingBottom: 0 }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setViewAll((v) => !v)}
            className="glass rounded-full"
            style={{ padding: "4px 10px 4px 8px", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            {viewAll ? (
              <>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8h12M10 5l3 3-3 3M6 5L3 8l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
                </svg>
                <span className="text-xs font-semibold t-text-muted">스크롤</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
                  <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
                  <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
                  <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6"/>
                </svg>
                <span className="text-xs font-semibold t-text-muted">전체보기</span>
              </>
            )}
          </motion.button>
        </div>
      )}

      <div
        ref={canvasRef}
        className="flex-1 relative"
        style={{ minHeight: 0, overflowX: viewAll ? "hidden" : "auto", overflowY: "hidden", padding: "0px 20px 40px 20px" }}
      >
        {tasks.length === 0 || tutorialStep !== null ? (
          <div className="h-full flex items-center justify-center">
            {tasks.length === 0 && tutorialStep === null && (
              <p className="t-text-faint text-sm">아직 포스트잇이 없어요</p>
            )}
          </div>
        ) : (
          <div style={{ minWidth: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: viewAll ? "center" : "flex-start" }}>
            <div style={{ width: gridNaturalW * gridScale, height: gridNaturalH * gridScale, position: "relative", flexShrink: 0 }}>
              <div style={{ width: gridNaturalW, transform: `scale(${gridScale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
                {(() => {
                  const pinned = [...tasks].filter((t) => t.is_pinned).sort((a, b) => a.position_x - b.position_x);
                  const normal = [...tasks].filter((t) => !t.is_pinned).sort((a, b) => a.position_x - b.position_x);
                  const sorted = [...pinned, ...normal];

                  return (
                    <>
                      {sorted.map((task, i) => {
                        const { x, y } = computeGridPos(i, task.id);
                        const member = (group.members ?? []).find((m) => m.name === task.assignee_name);
                        const isSwapping = swappingIds !== null && swappingIds.includes(task.id);
                        return (
                          <div
                            key={task.id}
                            style={{
                              position: "absolute",
                              left: x,
                              top: y,
                              zIndex: isSwapping ? 100 : undefined,
                            }}
                          >
                            <PostItCard
                              task={task}
                              memberAvatar={member?.avatar}
                              isDragging={draggingId === task.id}
                              isDropTarget={dropTargetId === task.id}
                              isSwapping={isSwapping}
                              isBeingDeleted={deletingTaskId === task.id}
                              isLongPressTarget={longPressId === task.id}
                              onDragStart={handleCardDragStart}
                              onLongPress={handleCardLongPress}
                              onTap={handleCardTap}
                            />
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      <MemberBar members={group.members ?? []} inviteCode={group.invite_code} onRemove={handleRemoveMember} />

      {/* FAB — 휴지통 존 활성화 시 숨김 */}
      <AnimatePresence>
        {!longPressId && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              const col = Math.floor(tasks.length / FIXED_ROWS);
              const row = tasks.length % FIXED_ROWS;
              const sx = Math.round((Math.random() - 0.5) * SCATTER * 2);
              const sy = Math.round((Math.random() - 0.5) * SCATTER * 2);
              setNextPosition({ x: PADDING + col * CELL_W + sx, y: PADDING + row * CELL_H + sy });
              setShowModal(true);
            }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed bottom-8 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--fab-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2v14M2 9h14" stroke="var(--fab-icon)" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 더미 데이터 버튼 (개발용) */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={addDummyTasks}
        className="fixed bottom-8 left-6 z-40 px-3 h-9 rounded-full flex items-center gap-1.5 text-xs font-semibold glass"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}
      >
        <span>🧪</span> 더미 추가
      </motion.button>

      {/* 휴지통 존 — 롱프레스 시 하단에 나타남 */}
      <AnimatePresence>
        {longPressId && (
          <motion.div
            key="trash-zone"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center pointer-events-none"
            style={{
              height: 130,
              background: "linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.65) 55%, transparent 100%)",
            }}
          >
            <motion.div
              animate={
                isOverTrash
                  ? { scale: 1.35, y: -6 }
                  : { scale: 1, y: 0 }
              }
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="flex flex-col items-center gap-1.5 pb-8"
            >
              {/* 휴지통 아이콘 */}
              <motion.div
                animate={isOverTrash ? { rotate: [-4, 4, -4, 0] } : { rotate: 0 }}
                transition={isOverTrash ? { duration: 0.35, ease: "easeInOut" } : {}}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                    stroke={isOverTrash ? "#FF3B30" : "#FF6B6B"}
                    strokeWidth={isOverTrash ? "2.4" : "1.9"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 11v6M14 11v6"
                    stroke={isOverTrash ? "#FF3B30" : "#FF6B6B"}
                    strokeWidth={isOverTrash ? "2.4" : "1.9"}
                    strokeLinecap="round"
                  />
                </svg>
              </motion.div>
              <span
                className="text-xs font-medium"
                style={{ color: isOverTrash ? "#FF3B30" : "rgba(255,255,255,0.45)" }}
              >
                {isOverTrash ? "놓으면 삭제" : "여기로 끌어오면 삭제"}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <AddTaskModal groupId={groupId} members={group.members ?? []} onClose={() => setShowModal(false)} newPosition={nextPosition ?? undefined} />
        )}
      </AnimatePresence>

      {/* 첫 입장 튜토리얼 오버레이 */}
      <AnimatePresence>
        {tutorialStep !== null && (
          <motion.div
            key="tutorial-overlay"
            className="fixed inset-0"
            style={{ zIndex: 55 }}
            onClick={advanceTutorial}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AnimatePresence mode="wait">
              {tutorialStep === 0 && (
                <TutorialStep0 key="t0" userName={profile?.name ?? ""} />
              )}
              {tutorialStep === 1 && (
                <TutorialStep1 key="t1" />
              )}
              {tutorialStep === 2 && (
                <TutorialStep2 key="t2" />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

// ── 튜토리얼 헬퍼 컴포넌트 ──

function TutorialSpeechBubble({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{
        background: "white",
        border: "2.5px solid #1a1a1a",
        borderRadius: 20,
        padding: "12px 18px",
        maxWidth: 230,
        textAlign: "center",
      }}>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: "#1a1a1a", whiteSpace: "pre-line", margin: 0 }}>
          {children}
        </p>
      </div>
      {/* 말꼬리 */}
      <div style={{
        position: "absolute", bottom: -14, left: "50%",
        transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "11px solid transparent",
        borderRight: "11px solid transparent",
        borderTop: "14px solid #1a1a1a",
      }} />
      <div style={{
        position: "absolute", bottom: -10, left: "50%",
        transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "9px solid transparent",
        borderRight: "9px solid transparent",
        borderTop: "11px solid white",
      }} />
    </div>
  );
}

function Character01SvgIcon({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 46 49" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <path d="M4.46892 43.0045C23.0809 44.7226 36.7609 44.7226 36.8629 44.7226C39.5174 45.6495 40.9314 46.7125 42.0458 46.6039C43.1602 46.4953 44.0018 46.2845 43.855 45.3302C39.9338 39.0064 29.6488 32.3385 32.3493 30.6156C33.163 30.0965 36.328 30.0774 38.4334 26.768C40.4231 23.6403 42.5954 16.9838 40.2264 12.4556C38.156 8.498 35.6911 4.383 32.5753 3.03376C31.2029 2.43951 26.6748 1.44856 20.9347 2.38563C16.6551 3.08426 12.0401 4.15151 7.59868 9.84956C5.94146 11.9757 4.84579 14.1836 5.56084 16.1027C6.66617 19.0692 17.3732 25.2591 14.2926 28.8207C12.9992 30.316 10.5457 32.1247 6.36453 35.5494C3.55567 37.8501 -0.78111 42.5198 4.46892 43.0045Z" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.1817 13.4395C19.1817 13.4801 19.1817 13.5207 19.1553 13.9244C19.129 14.328 19.0763 15.0936 19.244 15.7653C19.4116 16.437 19.8013 16.9917 20.2892 17.7439" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M27.0493 12.9829V19.5543" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function HatSvgIcon({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 46 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <rect x="37.1364" width="18" height="42.0361" transform="rotate(62.06 37.1364 0)" fill="#D9D9D9" fillOpacity="0.6"/>
    </svg>
  );
}

function TutorialStep0({ userName }: { userName: string }) {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      style={{ paddingTop: 80, paddingBottom: 140 }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <TutorialSpeechBubble>
          {`하이 ${userName}\n우리집이 만들어졌어\n집을 한번 둘러봐 ~`}
        </TutorialSpeechBubble>
        {/* 캐릭터01 + 모자 */}
        <div style={{ position: "relative", width: 80, height: 90 }}>
          {/* 모자 — 캐릭터 왼쪽 위에 비스듬하게 */}
          <div style={{
            position: "absolute", top: -22, left: -10,
            transform: "rotate(-28deg)",
          }}>
            <HatSvgIcon style={{ width: 50, height: 38 }} />
          </div>
          <Character01SvgIcon style={{ width: 80, height: 85 }} />
        </div>
      </div>
    </motion.div>
  );
}

function TutorialStep1() {
  return (
    <motion.div
      className="fixed inset-0"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
    >
      {/* 말풍선 — 캐릭터02 자리 (나중에 추가 예정) */}
      <div style={{
        position: "absolute", top: "42%", left: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 24,
      }}>
        <TutorialSpeechBubble>오 내 모자!</TutorialSpeechBubble>
        {/* TODO: 캐릭터02.svg 첨부 후 여기에 추가 */}
      </div>
      {/* 모자 — '+' 버튼 왼쪽 상단 */}
      <div style={{
        position: "fixed", bottom: 90, right: 64,
        transform: "rotate(22deg)",
      }}>
        <HatSvgIcon style={{ width: 50, height: 38 }} />
      </div>
    </motion.div>
  );
}

function TutorialStep2() {
  const footsteps = [
    { x: 190, y: 492, angle: -40 },
    { x: 208, y: 516, angle: -36 },
    { x: 221, y: 544, angle: -40 },
    { x: 238, y: 568, angle: -35 },
    { x: 251, y: 596, angle: -38 },
    { x: 265, y: 622, angle: -36 },
    { x: 278, y: 651, angle: -34 },
    { x: 291, y: 678, angle: -37 },
    { x: 303, y: 706, angle: -34 },
  ];

  return (
    <motion.div
      className="fixed inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {footsteps.map((fp, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: Math.max(0.2, 0.75 - i * 0.06), scale: 1 }}
          transition={{ delay: i * 0.1, type: "spring", stiffness: 400, damping: 22 }}
          style={{
            position: "absolute",
            left: fp.x,
            top: fp.y,
            transform: `rotate(${fp.angle}deg)`,
            width: 14,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#27272A",
          }}
        />
      ))}
    </motion.div>
  );
}
