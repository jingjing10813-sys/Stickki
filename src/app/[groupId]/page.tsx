"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

  // 마지막 방 저장
  useEffect(() => {
    if (groupId) localStorage.setItem("last_group_id", groupId);
  }, [groupId]);

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
        {tasks.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="t-text-faint text-sm">아직 포스트잇이 없어요</p>
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
    </main>
  );
}
