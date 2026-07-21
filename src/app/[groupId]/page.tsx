"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Group, Task, Member } from "@/types";
import PostItCard from "@/components/ui/PostItCard";
import MemberBar from "@/components/ui/MemberBar";
import AddTaskModal from "@/components/modals/AddTaskModal";
import { Avatar } from "@/components/ui/Avatar";
import { StickkiLogo } from "@/components/ui/StickkiLogos";

const AVATARS = ["🐶","🐱","🐻","🦊","🐸","🐼","🐨","🐯","🐧","🦁","🐮","🐷","🐙","🦋","🐺","🦝"];
const MEMBER_COLORS = ["#FF6B6B","#FF9F43","#FECA57","#48DBFB","#FF9FF3","#54A0FF","#5F27CD","#01CBC6"];

const PADDING = 20;
const SCATTER = 14;
const FIXED_COLS = 2;
const FIXED_ROWS = 4;
const CARDS_PER_GROUP = FIXED_COLS * FIXED_ROWS; // 8 — 이 개수 채우면 옆으로 새 2열 그룹 시작
const GRID_VERSION = "v4";

// 4개까지는 180x180, 5개부터는 140x140으로 축소 (배열 사이즈 목업 기준 — 이보다 작아지면 안 됨)
function getCellSize(count: number) {
  const cardSize = count > 4 ? 140 : 180;
  return { cardSize, cellW: cardSize + 20, cellH: cardSize + 20 };
}

function hashInt(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function computeGridPos(index: number, taskId: string, cellW: number, cellH: number) {
  const indexInGroup = index % CARDS_PER_GROUP;
  const groupIndex = Math.floor(index / CARDS_PER_GROUP);
  const localCol = indexInGroup % FIXED_COLS;
  const localRow = Math.floor(indexInGroup / FIXED_COLS);
  const col = groupIndex * FIXED_COLS + localCol;
  const row = localRow;
  const h = hashInt(taskId);
  const sx = ((h % (SCATTER * 2)) - SCATTER);
  const sy = (((h >> 6) % (SCATTER * 2)) - SCATTER);
  return { x: PADDING + col * cellW + sx, y: PADDING + row * cellH + sy };
}

// 4개 이하일 때 전용 배치 — 배열 사이즈 목업(포스트잇 1/2/3/4.png) 기준: 오른쪽 컬럼부터 시작해서
// 좌우 번갈아가며 겹치듯 아래로 쌓이는 형태, 화면 폭 안에 항상 다 들어오게 고정 x 앵커 사용
const LOW_COUNT_RIGHT_X = 155;
const LOW_COUNT_LEFT_X = 20;
const LOW_COUNT_Y_BASE = 20;
const LOW_COUNT_Y_STEP = 150;
const LOW_COUNT_SCATTER = 10;

function computeLowCountPos(index: number, taskId: string) {
  const isRight = index % 2 === 0;
  const h = hashInt(taskId);
  const sx = ((h % (LOW_COUNT_SCATTER * 2)) - LOW_COUNT_SCATTER);
  const sy = (((h >> 6) % (LOW_COUNT_SCATTER * 2)) - LOW_COUNT_SCATTER);
  return {
    x: (isRight ? LOW_COUNT_RIGHT_X : LOW_COUNT_LEFT_X) + sx,
    y: LOW_COUNT_Y_BASE + index * LOW_COUNT_Y_STEP + sy,
  };
}

function getPos(index: number, taskId: string, count: number, cellW: number, cellH: number) {
  return count <= 4 ? computeLowCountPos(index, taskId) : computeGridPos(index, taskId, cellW, cellH);
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

  const { cardSize, cellW, cellH } = getCellSize(tasks.length);
  const isLowCount = tasks.length <= 4;
  let gridNaturalW: number;
  let gridNaturalH: number;
  if (isLowCount) {
    gridNaturalW = LOW_COUNT_RIGHT_X + cardSize + PADDING;
    gridNaturalH = LOW_COUNT_Y_BASE + Math.max(0, tasks.length - 1) * LOW_COUNT_Y_STEP + cardSize + PADDING;
  } else {
    const totalGroups = Math.ceil(tasks.length / CARDS_PER_GROUP);
    const lastGroupCount = tasks.length - (totalGroups - 1) * CARDS_PER_GROUP;
    const cols = totalGroups * FIXED_COLS;
    const actualRows = totalGroups > 1 ? FIXED_ROWS : Math.min(FIXED_ROWS, Math.ceil(lastGroupCount / FIXED_COLS));
    gridNaturalW = cols * cellW + PADDING * 2;
    gridNaturalH = (actualRows - 1) * cellH + cardSize + PADDING * 2;
  }

  // 카드는 항상 스펙 그대로(180/140) — 확대/축소 없이 고정 크기로 렌더링
  const gridScale = 1;


  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupAvatar, setSetupAvatar] = useState(AVATARS[0]);
  const [setupLoading, setSetupLoading] = useState(false);

  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const hatAnimControls = useAnimation();
  const [hatTapped, setHatTapped] = useState(false);

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

  function handleTutorialClick() {
    if (tutorialStep === 0) {
      if (hatTapped) return;
      setHatTapped(true);
      hatAnimControls.start({
        x: 0, y: 0, rotate: 62.06 + 360,
        transition: { type: "spring", stiffness: 80, damping: 16 },
      });
      setTimeout(advanceTutorial, 1000);
    } else if (tutorialStep === 1) {
      // TutorialStep1 내부에서 직접 처리 (stopPropagation + 캐릭터 애니메이션)
    } else {
      advanceTutorial();
    }
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
        // 퍼센트 기반 구 포지션 감지: 카드가 FIXED_ROWS 초과인데 x가 전부 200 미만이면 구 데이터
        const looksLikeOldData = data.length > FIXED_ROWS && data.every((t) => (t.position_x ?? 0) < 200);
        const needsMigration = storedVersion !== GRID_VERSION || data.some((t) => t.position_y === 0) || looksLikeOldData;
        if (needsMigration) {
          const { cellW: mCellW, cellH: mCellH } = getCellSize(data.length);
          const migrated = data.map((task, i) => {
            const { x, y } = getPos(i, task.id, data.length, mCellW, mCellH);
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
    const { cellW: dCellW, cellH: dCellH } = getCellSize(tasks.length + dummies.length);
    for (let i = 0; i < dummies.length; i++) {
      const { y } = getPos(tasks.length + i, `dummy-${i}`, tasks.length + dummies.length, dCellW, dCellH);
      await supabase.from("tasks").insert({
        group_id: groupId,
        content: dummies[i].content,
        type: dummies[i].type,
        status: "pending",
        rotation: (Math.random() - 0.5) * 12,
        position_x: Date.now() + i,
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
      <header className="flex-shrink-0 flex items-start justify-between px-5" style={{ paddingTop: 20 }}>
        <div className="flex flex-col items-start">
          <span className="font-ongeulip t-text-muted text-sm tracking-tight flex items-center gap-1">
            <span>🏠</span>{group.name}
          </span>
          <StickkiLogo style={{ width: 88, height: "auto", color: "var(--text-1)", marginTop: 6 }} />
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push(`/${groupId}/list`)}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--card)" }}
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
              backgroundColor: "#FFFFFF",
              border: "1.5px solid #E5E5E5",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            {me ? (
              <Avatar avatar={me.avatar} fallback={me.avatar} size={44} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.4"/>
                <path d="M2.5 13.5c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            )}
          </motion.button>
        </div>
      </header>

      <div className="flex-shrink-0 flex items-center justify-start px-5" style={{ marginTop: 20, marginBottom: 0 }}>
        {editingMotto ? (
          <input
            autoFocus
            value={mottoValue}
            onChange={(e) => setMottoValue(e.target.value)}
            onBlur={saveMotto}
            onKeyDown={(e) => e.key === "Enter" && saveMotto()}
            className="font-ongeulip text-sm bg-transparent outline-none text-left w-48 t-text-muted"
            style={{ borderBottom: "1px solid var(--border-mid)" }}
          />
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            onClick={() => setEditingMotto(true)}
            className="font-ongeulip text-sm t-text-muted"
          >
            {group.motto}
          </motion.button>
        )}
      </div>

      <div
        ref={canvasRef}
        className="flex-1 relative"
        style={{ minHeight: 0, overflowX: "auto", overflowY: "auto", padding: "24px 20px 40px 20px" }}
      >
        {tasks.length === 0 || tutorialStep !== null ? (
          <div className="h-full flex items-center justify-center">
            {tasks.length === 0 && tutorialStep === null && (
              <p className="t-text-faint text-sm">아직 포스트잇이 없어요</p>
            )}
          </div>
        ) : (
          <div style={{ minWidth: "100%", minHeight: "100%", display: "flex", alignItems: "flex-start", justifyContent: "flex-start" }}>
            <div style={{ width: gridNaturalW * gridScale, height: gridNaturalH * gridScale, position: "relative", flexShrink: 0 }}>
              <div style={{ width: gridNaturalW, transform: `scale(${gridScale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
                {(() => {
                  const pinned = [...tasks].filter((t) => t.is_pinned).sort((a, b) => a.position_x - b.position_x);
                  const normal = [...tasks].filter((t) => !t.is_pinned).sort((a, b) => a.position_x - b.position_x);
                  const sorted = [...pinned, ...normal];

                  return (
                    <>
                      {sorted.map((task, i) => {
                        const { x, y } = getPos(i, task.id, tasks.length, cellW, cellH);
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
                              size={cardSize}
                              style={{ width: cardSize }}
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
              const { cellW: nCellW, cellH: nCellH } = getCellSize(tasks.length + 1);
              const { y } = getPos(tasks.length, `next-${tasks.length}`, tasks.length + 1, nCellW, nCellH);
              // position_x는 정렬 기준(생성 순서)으로도 쓰이므로 그리드 좌표가 아니라 항상 마지막으로 정렬되는 타임스탬프를 사용
              setNextPosition({ x: Date.now(), y });
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
              background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0) 100%)",
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
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ color: "#EF4444" }}>
                  <path
                    d="M4 7H20M10 11V17M14 11V17M5 7L6 19C6 19.5304 6.21071 20.0391 6.58579 20.4142C6.96086 20.7893 7.46957 21 8 21H16C16.5304 21 17.0391 20.7893 17.4142 20.4142C17.7893 20.0391 18 19.5304 18 19L19 7M9 7V4C9 3.73478 9.10536 3.48043 9.29289 3.29289C9.48043 3.10536 9.73478 3 10 3H14C14.2652 3 14.5196 3.10536 14.7071 3.29289C14.8946 3.48043 15 3.73478 15 4V7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
              <span
                className="text-xs font-medium"
                style={{ color: "#EF4444" }}
              >
                놓으면 삭제됩니다
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
            onClick={handleTutorialClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 모자 — step 0~2 내내 유지 (AnimatePresence 밖에서 렌더링) */}
            {tutorialStep !== null && (
              <motion.div
                animate={hatAnimControls}
                initial={{ x: -160, y: -364, rotate: 62.06 }}
                style={{
                  position: "fixed",
                  bottom: 51,
                  right: 24.86,
                  width: 21.6,
                  height: 50.4,
                  transformOrigin: "0 0",
                }}
              >
                <svg width="21.6" height="50.4" viewBox="0 0 18 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="18" height="42" fill="#D9D9D9" fillOpacity="0.4"/>
                </svg>
              </motion.div>
            )}
            <AnimatePresence mode="wait">
              {tutorialStep === 0 && (
                <TutorialStep0 key="t0" userName={profile?.name ?? ""} />
              )}
              {tutorialStep === 1 && (
                <TutorialStep1 key="t1" onAdvance={advanceTutorial} />
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
    <div style={{ position: "relative", width: 190, height: 135 }}>
      <svg width="190" height="135" viewBox="0 0 128 91" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M43.6494 76.7297C44.3711 78.68 46.5484 84.4308 48.6191 87.8382C50.9552 91.6824 55.3777 79.4368 57.905 75.6598C63.5587 67.2104 86.9702 71.722 99.1269 70.3298C112.003 68.8551 116.712 65.2004 121.515 60.3117C127.934 53.778 126.493 42.0566 122.122 22.2614C120.932 16.8704 118.634 14.32 116.302 11.8049C111.492 6.61671 101.867 4.73017 87.3845 2.80608C78.2217 1.58874 65.1582 1.98164 56.3571 2.48503C35.4516 3.68074 23.8227 13.6367 14.7298 21.6925C9.26191 26.5366 7.09372 32.1612 5.01889 38.5071C1.06593 50.5972 1.28664 60.5972 3.99618 68.2967C5.57113 72.7722 10.4241 74.508 18.9286 76.8968C26.0138 78.1314 36.5411 78.456 41.952 77.0837C42.8133 76.5017 43.6618 75.7825 44.7503 75.0414"
          fill="white"
          stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
      <div style={{
        position: "absolute",
        top: "2%", left: 0, right: 0,
        bottom: "15%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontFamily: "var(--font-ongeulip)",
        fontSize: 15,
        color: "#1a1a1a",
        lineHeight: 1.6,
        whiteSpace: "pre-line",
        padding: "0 22px",
      }}>
        {children}
      </div>
    </div>
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        <TutorialSpeechBubble>
          {`하이 ${userName}\n우리집이 만들어졌어\n집을 한번 둘러봐 ~`}
        </TutorialSpeechBubble>
        {/* 포스트잇 캐릭터 */}
        <svg width="72" height="81" viewBox="0 0 60 67" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.4673 61.0045C37.0793 62.7226 50.7593 62.7226 50.8613 62.7226C53.5158 63.6495 54.9298 64.7125 56.0442 64.6039C57.1586 64.4953 58.0002 64.2845 57.8534 63.3302C53.9322 57.0064 43.6472 50.3385 46.3477 48.6156C47.1614 48.0965 50.3264 48.0774 52.4318 44.768C54.4215 41.6403 56.5938 34.9838 54.2248 30.4556C52.1544 26.498 49.6895 22.383 46.5737 21.0338C45.2014 20.4395 40.6732 19.4486 34.9331 20.3856C30.6535 21.0843 26.0385 22.1515 21.5971 27.8496C19.9399 29.9757 18.8442 32.1836 19.5593 34.1027C20.6646 37.0692 31.3716 43.2591 28.291 46.8207C26.9976 48.316 24.5441 50.1247 20.3629 53.5494C17.5541 55.8501 13.2173 60.5198 18.4673 61.0045Z" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M33.1801 31.4395C33.1801 31.4801 33.1801 31.5207 33.1537 31.9244C33.1274 32.328 33.0747 33.0936 33.2424 33.7653C33.4101 34.437 33.7997 34.9917 34.2876 35.7439" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M41.0477 30.9829V37.5543" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </motion.div>
  );
}

function TutorialStep1({ onAdvance }: { onAdvance: () => void }) {
  const [exiting, setExiting] = useState(false);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (exiting) return;
    setExiting(true);
    setTimeout(onAdvance, 780);
  }

  return (
    <motion.div
      className="fixed inset-0"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      onClick={handleClick}
    >
      {/* 말풍선02 + 캐릭터02 — 화면 중앙 */}
      <div className="fixed inset-0 flex items-center justify-center" style={{ paddingTop: 80, paddingBottom: 140 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {/* 말풍선02 */}
          <motion.div
            animate={{ opacity: exiting ? 0 : 1, y: exiting ? -16 : 0 }}
            transition={{ duration: 0.22 }}
            style={{ position: "relative", width: 160, height: 120, marginLeft: 40 }}
          >
            <svg width="160" height="120" viewBox="0 0 108 81" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M39.4973 63.6472C39.4973 63.8086 39.4429 68.5602 39.3738 75.8213C39.3491 78.4139 39.3859 78.7894 41.2544 77.0314C47.0427 71.5857 51.4451 66.0959 52.8027 63.9775C53.3606 63.1068 53.6893 62.6745 54.2555 62.4522C55.5456 61.9457 58.6639 62.6185 63.2907 63.2597C68.2261 63.9437 74.2548 63.5231 80.834 62.4575C84.0891 61.9302 86.9851 60.4819 89.8048 58.584C92.6246 56.6862 95.2318 54.1403 97.2804 51.7022C101.03 47.2397 102.853 43.1115 104.144 38.344C106.244 30.5893 105.78 24.1228 104.802 20.9683C102.2 12.578 95.6674 10.7978 92.2616 9.13827C90.1472 8.10803 87.0594 7.10982 79.2437 5.85177C71.4279 4.59373 58.9294 3.21192 50.0194 2.5356C41.1093 1.85927 36.1664 1.9303 32.3386 2.16959C25.9279 2.57036 21.656 3.84495 18.5231 5.20122C15.6088 6.46286 12.1174 9.93599 8.24523 13.7572C4.59008 17.3643 3.44262 21.309 2.28344 27.6485C1.86386 29.9431 1.93414 33.0236 2.33635 36.4407C3.18184 43.6238 5.36288 48.9324 6.90416 51.8768C8.30482 54.5526 10.9874 56.622 13.6387 58.7345C18.5632 62.6582 24.4977 63.4831 27.6727 64.3863C29.444 64.7855 32.9608 64.9961 37.0263 64.9822C38.5324 64.9416 38.9078 64.8327 39.5378 64.6381"
                fill="white"
                stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            <div style={{
              position: "absolute",
              top: "3%", left: 0, right: 0,
              bottom: "21%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontFamily: "var(--font-ongeulip)",
              fontSize: 15,
              color: "#1a1a1a",
              lineHeight: 1.6,
              whiteSpace: "pre-line",
              padding: "0 22px",
            }}>
              오 내 모자!
            </div>
          </motion.div>
          {/* 캐릭터02 — 탭하면 FAB 방향으로 이동하며 사라짐 */}
          <motion.div
            animate={{
              x: exiting ? 145 : 0,
              y: exiting ? 330 : 0,
              opacity: exiting ? 0 : 1,
            }}
            transition={{
              x: { duration: 0.7, ease: [0.4, 0, 1, 1] },
              y: { duration: 0.7, ease: [0.4, 0, 1, 1] },
              opacity: { duration: 0.35, ease: "easeIn", delay: 0.4 },
            }}
          >
            <svg width="55" height="63" viewBox="0 0 48 55" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.11963 52.0322C22.6199 43.0322 36.8794 47.755 36.9813 47.755C39.6358 48.6819 41.0499 49.7449 42.1643 49.6363C43.2787 49.5277 44.1203 49.3168 43.9735 48.3626C40.0523 42.0388 29.7672 35.3708 32.4678 33.648C33.2815 33.1289 36.4465 33.1098 38.5519 29.8004C40.5416 26.6727 47.0015 15.9824 44.6325 11.4542C42.562 7.4966 40.0972 3.38159 36.9813 2.03235C35.609 1.43811 25.4061 9.27535 21.0532 5.41802C14.4111 -0.467773 12.1585 7.1839 7.71717 12.882C6.05995 15.0081 4.96428 17.216 5.67933 19.1351C6.78466 22.1016 17.4917 28.2915 14.4111 31.8531C13.1177 33.3484 10.6641 35.1571 6.48302 38.5818C3.67416 40.8825 -0.62146 54.3387 4.11963 52.0322Z" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.2998 16.4717C18.2998 16.5123 18.2998 16.5529 18.2735 16.9566C18.2471 17.3603 18.1944 18.1258 18.3621 18.7975C18.5298 19.4692 18.9195 20.0239 19.4074 20.7761" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M26.1675 16.0151V22.5865" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function TutorialStep2() {
  // 발자국 SVG 세그먼트 (위→아래 순서로 정렬)
  const segments = [
    "M3.77015 2.00049L2.00049 5.48982",
    "M22.4898 22.0007L25.8433 35.1997",
    "M32.7819 72.3905L41.5513 82.8096",
    "M56.5141 102.788L55.2767 104.972",
    "M66.4505 133L65.0005 139.371",
    "M57.0004 148.376L60.0513 154.153",
    "M82.6645 168.81L83.6685 182.391",
    "M82.953 202.234L86.2381 207.19",
    "M96.7214 214L95.484 216.184",
  ];

  return (
    <motion.div
      className="fixed inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <svg
        width="99"
        height="219"
        viewBox="0 0 99 219"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", left: 264, top: 606 }}
      >
        {segments.map((d, i) => {
          const t = i / (segments.length - 1);
          const v = Math.round(196 * (1 - t));
          const color = `rgb(${v},${v},${v})`;
          return (
            <motion.path
              key={i}
              d={d}
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1, duration: 0.25, ease: "easeOut" }}
            />
          );
        })}
      </svg>
    </motion.div>
  );
}
