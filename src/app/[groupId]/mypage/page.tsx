"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Group, Member, Task } from "@/types";
import { useTheme } from "@/lib/theme";
import { Avatar } from "@/components/ui/Avatar";

function isImageAvatar(avatar: string): boolean {
  return avatar.startsWith("data:") || avatar.startsWith("http");
}

const PEN_COLORS = ["#000000", "#EF4444", "#3B82F6"];

function ChevronRight() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.35"/>
    </svg>
  );
}

export default function MyPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, toggle } = useTheme();

  const [group, setGroup] = useState<Group | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [me, setMe] = useState<Member | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editDrawColor, setEditDrawColor] = useState(PEN_COLORS[0]);
  const [hasEditStrokes, setHasEditStrokes] = useState(false);
  const editCanvasRef = useRef<HTMLCanvasElement>(null);
  const editDrawingRef = useRef(false);
  const editLastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNameInput(profile.name);

    supabase.from("groups").select("*").eq("id", groupId).single()
      .then(({ data }) => {
        if (!data) return;
        setGroup(data);
        const member = (data.members ?? []).find((m: Member) => m.id === user.id);
        if (member) setMe(member);
      });

    supabase.from("tasks").select("*")
      .eq("group_id", groupId)
      .eq("assignee_name", profile.name)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setMyTasks(data); });

    supabase.from("tasks").select("*")
      .eq("group_id", groupId)
      .eq("type", "note")
      .or(`assignee_name.eq.${profile.name},assignee_name.is.null`)
      .then(({ data }) => {
        if (data) {
          setMyTasks((prev) => {
            const todos = prev.filter((t) => t.type === "todo");
            const notes = data.filter((n) => !todos.find((t) => t.id === n.id));
            return [...todos, ...notes];
          });
        }
      });
  }, [groupId, user, profile]);

  // 수정 모달이 열릴 때 현재 프로필 그림을 캔버스에 불러옴
  useEffect(() => {
    if (!showEditModal) return;
    setSheetExpanded(false);
    setHasEditStrokes(false);
    setEditDrawColor(PEN_COLORS[0]);
    const timer = setTimeout(() => {
      const canvas = editCanvasRef.current;
      if (!canvas) return;
      // Retina 대응: 물리 픽셀 기준으로 캔버스 해상도 설정
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(278 * dpr);
      canvas.height = Math.round(340 * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // 이후 모든 드로잉 좌표는 CSS px 기준(0-278, 0-340)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (me?.avatar && isImageAvatar(me.avatar)) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, 278, 340);
          setHasEditStrokes(true);
        };
        img.src = me.avatar;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [showEditModal, me?.avatar]);

  // 좌표를 CSS px 공간(0-278, 0-340)으로 변환 — DPR 무관
  function editCanvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = editCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (278 / rect.width),
      y: (e.clientY - rect.top) * (340 / rect.height),
    };
  }

  function handleEditCanvasDown(e: React.PointerEvent<HTMLCanvasElement>) {
    editDrawingRef.current = true;
    editLastPointRef.current = editCanvasPos(e);
    setHasEditStrokes(true);
  }

  function handleEditCanvasMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!editDrawingRef.current) return;
    const ctx = editCanvasRef.current?.getContext("2d");
    if (!ctx || !editLastPointRef.current) return;
    const pos = editCanvasPos(e);
    ctx.strokeStyle = editDrawColor;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(editLastPointRef.current.x, editLastPointRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    editLastPointRef.current = pos;
  }

  function handleEditCanvasUp() {
    editDrawingRef.current = false;
    editLastPointRef.current = null;
  }

  function clearEditCanvas() {
    const canvas = editCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, 278, 340); // CSS px 기준
    setHasEditStrokes(false);
  }

  async function handleSave() {
    if (!group || !me || !user || !nameInput.trim()) return;
    const oldName = me.name;
    const newName = nameInput.trim();

    const canvas = editCanvasRef.current;
    const newAvatar = canvas && hasEditStrokes ? canvas.toDataURL("image/png") : me.avatar;
    const newColor = me.color;

    await supabase.from("profiles").update({ name: newName, avatar: newAvatar, color: newColor }).eq("id", user.id);
    await refreshProfile();

    const updatedMembers = (group.members ?? []).map((m) =>
      m.id === user.id ? { ...m, name: newName, avatar: newAvatar, color: newColor } : m
    );
    const { data } = await supabase.from("groups").update({ members: updatedMembers })
      .eq("id", group.id).select().single();
    if (data) {
      setGroup(data);
      setMe(updatedMembers.find((m) => m.id === user.id)!);
    }

    if (oldName !== newName) {
      await supabase.from("tasks")
        .update({ assignee_name: newName })
        .eq("group_id", groupId)
        .eq("assignee_name", oldName);
      setMyTasks((prev) => prev.map((t) => ({ ...t, assignee_name: newName })));
    }
    setShowEditModal(false);
  }

  async function handleSignOut() {
    localStorage.removeItem("last_group_id");
    await signOut();
    router.push("/login");
  }

  async function handleLeaveRoom() {
    if (!group || !user) return;
    const updated = (group.members ?? []).filter((m) => m.id !== user.id);
    await supabase.from("groups").update({ members: updated }).eq("id", group.id);
    router.push("/");
  }

  async function handleDeleteAccount() {
    if (!group || !user) return;
    const updated = (group.members ?? []).filter((m) => m.id !== user.id);
    await supabase.from("groups").update({ members: updated }).eq("id", group.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    localStorage.removeItem("last_group_id");
    await signOut();
    router.push("/login");
  }

  const doneTasks = myTasks.filter((t) => t.type === "todo" && t.status === "done");
  const pendingTasks = myTasks.filter((t) => t.type === "todo" && t.status === "pending");
  const receivedNotes = myTasks.filter((t) => t.type === "note");

  if (!group || !me) {
    return (
      <main className="min-h-screen flex items-center justify-center dot-pattern">
        <span className="t-text-faint text-sm">불러오는 중...</span>
      </main>
    );
  }

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
            <path d="M8 2L2 8L8 14" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
        <span className="font-display font-bold t-text text-base">마이페이지</span>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggle}
          className="w-11 h-11 glass rounded-full flex items-center justify-center"
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.6"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.6"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 10.5A6 6 0 015.5 2.5a6 6 0 000 11A6 6 0 0013.5 10.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
            </svg>
          )}
        </motion.button>
      </header>

      <div className="flex-1 px-5 pb-10 overflow-auto flex flex-col gap-5">

        {/* ── 프로필 ── */}
        <div className="flex flex-col items-center pt-4 pb-2">
          <div className="relative mb-3">
            <motion.div
              key={me.avatar}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="rounded-full flex items-center justify-center text-5xl overflow-hidden"
              style={{ width: 100, height: 100, backgroundColor: "var(--card-hover)", border: "1.5px solid var(--border-color)" }}
            >
              <Avatar avatar={me.avatar} fallback={me.avatar} size={100} className="text-5xl" />
            </motion.div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setNameInput(me.name); setShowEditModal(true); }}
              className="absolute bottom-0 right-0 rounded-full flex items-center justify-center"
              style={{ width: 28, height: 28, backgroundColor: "var(--card-hover)" }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M11.2502 5.41671L14.5835 8.75004M3.3335 16.6668H6.66683L15.4168 7.91676C15.6357 7.69789 15.8093 7.43805 15.9278 7.15208C16.0462 6.86612 16.1072 6.55962 16.1072 6.25009C16.1072 5.94056 16.0462 5.63406 15.9278 5.3481C15.8093 5.06213 15.6357 4.80229 15.4168 4.58342C15.198 4.36455 14.9381 4.19094 14.6522 4.07248C14.3662 3.95403 14.0597 3.89307 13.7502 3.89307C13.4406 3.89307 13.1341 3.95403 12.8482 4.07248C12.5622 4.19094 12.3024 4.36455 12.0835 4.58342L3.3335 13.3334V16.6668Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
              </svg>
            </motion.button>
          </div>
          <p className="font-display font-bold t-text text-xl mb-0.5">{me.name}</p>
          <p className="text-sm t-text-sub">{user?.email}</p>
        </div>

        {/* ── 통계 row ── */}
        <div className="flex" style={{ gap: 10 }}>
          {[
            { label: "진행중",   count: pendingTasks.length,   tab: "todo" },
            { label: "완료",     count: doneTasks.length,       tab: "done" },
            { label: "받은 쪽지", count: receivedNotes.length,  tab: "note" },
          ].map((stat) => (
            <motion.button
              key={stat.label}
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push(`/${groupId}/list?filter=${stat.tab}`)}
              className="flex-1 flex flex-col items-center"
              style={{ backgroundColor: "var(--card)", borderRadius: 10, padding: "16px 10px", gap: 6 }}
            >
              <p className="font-bold text-xl t-text leading-none">{stat.count}</p>
              <p className="text-sm t-text-sub">{stat.label}</p>
            </motion.button>
          ))}
        </div>

        {/* ── 기본 섹션 ── */}
        <div>
          <p className="t-text-muted text-xs font-semibold mb-2 px-1">기본</p>
          <div style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" }}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/${groupId}/mypage/invite-code`)}
              className="w-full flex items-center justify-between"
              style={{ padding: "16px 20px" }}
            >
              <span className="t-text text-sm font-medium">초대 코드</span>
              <ChevronRight />
            </motion.button>
            <div style={{ height: 1, backgroundColor: "var(--border-color)", marginLeft: 10, marginRight: 10 }} />
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/${groupId}/mypage/room-info`)}
              className="w-full flex items-center justify-between"
              style={{ padding: "16px 20px" }}
            >
              <span className="t-text text-sm font-medium">방 정보</span>
              <ChevronRight />
            </motion.button>
          </div>
        </div>

        {/* ── 설정 섹션 ── */}
        <div>
          <p className="t-text-muted text-xs font-semibold mb-2 px-1">설정</p>
          <div style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" }}>
            {/* 알림설정 */}
            <div className="flex items-center justify-between" style={{ padding: "16px 20px" }}>
              <span className="t-text text-sm font-medium">알림설정</span>
              <button
                onClick={() => setNotifEnabled((v) => !v)}
                className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
                style={{ backgroundColor: notifEnabled ? "var(--btn-primary-bg)" : "var(--border-mid)" }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform duration-200"
                  style={{
                    backgroundColor: notifEnabled ? "var(--btn-primary-text)" : "#FFFFFF",
                    transform: notifEnabled ? "translateX(20px)" : "translateX(0px)",
                  }}
                />
              </button>
            </div>
            <div style={{ height: 1, backgroundColor: "var(--border-color)", marginLeft: 10, marginRight: 10 }} />
            {/* 로그아웃 */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSignOut}
              className="w-full flex items-center justify-between"
              style={{ padding: "16px 20px" }}
            >
              <span className="t-text text-sm font-medium">로그아웃</span>
              <ChevronRight />
            </motion.button>
            <div style={{ height: 1, backgroundColor: "var(--border-color)", marginLeft: 10, marginRight: 10 }} />
            {/* 계정 탈퇴 */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-between"
              style={{ padding: "16px 20px" }}
            >
              <span className="t-text text-sm font-medium">계정 탈퇴</span>
              <ChevronRight />
            </motion.button>
            <div style={{ height: 1, backgroundColor: "var(--border-color)", marginLeft: 10, marginRight: 10 }} />
            {/* 약관 및 정책 */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-between"
              style={{ padding: "16px 20px" }}
            >
              <span className="t-text text-sm font-medium">약관 및 정책</span>
              <ChevronRight />
            </motion.button>
          </div>
        </div>

      </div>

      {/* 프로필 수정 모달 — 어두운 드로잉 패널 스타일 */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
          >
            <div className="absolute inset-0" onClick={() => setShowEditModal(false)} />
            <motion.div
              layout
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                layout: { type: "spring", stiffness: 320, damping: 38 },
                y: { type: "spring", stiffness: 380, damping: 40 },
              }}
              className="relative w-full max-w-lg rounded-t-3xl pt-3 z-10"
              style={{ backgroundColor: "#27272A", boxShadow: "0 -20px 60px rgba(0,0,0,0.5)" }}
            >
              {/* drag handle */}
              <div className="rounded-full mx-auto" style={{ width: 70, height: 6, backgroundColor: "rgba(255,255,255,0.3)", marginBottom: 20 }} />

              {/* 이름 입력 */}
              <div className="flex items-center mx-5 rounded-2xl px-4" style={{ backgroundColor: "rgba(255,255,255,0.08)", height: 52, marginBottom: 20 }}>
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  className="flex-1 bg-transparent outline-none text-sm font-medium"
                  style={{ color: "#FFFFFF" }}
                  placeholder="이름"
                />
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M11.2502 5.41671L14.5835 8.75004M3.3335 16.6668H6.66683L15.4168 7.91676C15.6357 7.69789 15.8093 7.43805 15.9278 7.15208C16.0462 6.86612 16.1072 6.55962 16.1072 6.25009C16.1072 5.94056 16.0462 5.63406 15.9278 5.3481C15.8093 5.06213 15.6357 4.80229 15.4168 4.58342C15.198 4.36455 14.9381 4.19094 14.6522 4.07248C14.3662 3.95403 14.0597 3.89307 13.7502 3.89307C13.4406 3.89307 13.1341 3.95403 12.8482 4.07248C12.5622 4.19094 12.3024 4.36455 12.0835 4.58342L3.3335 13.3334V16.6668Z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* ─── 드로잉 영역 (온보딩 sheetLevel 1↔2 동일 패턴) ─── */}
              <div
                className="w-full flex items-center justify-center"
                style={{
                  flexDirection: sheetExpanded ? "column" : "row",
                  gap: sheetExpanded ? 0 : 24,
                  marginTop: sheetExpanded ? 16 : 24,
                  paddingLeft: 16,
                  paddingRight: 16,
                }}
              >
                {/* 펜 버튼: 축소=세로, 확장=가로 */}
                <div
                  className="flex"
                  style={{
                    flexDirection: sheetExpanded ? "row" : "column",
                    gap: sheetExpanded ? 32 : 16,
                    marginBottom: sheetExpanded ? 20 : 0,
                  }}
                >
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setEditDrawColor(c); setSheetExpanded(true); }}
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 52,
                        height: 48,
                        backgroundColor: (sheetExpanded && editDrawColor === c) ? "rgba(255,255,255,0.15)" : "transparent",
                      }}
                    >
                      <EditPenIcon tipColor={c} />
                    </button>
                  ))}
                </div>

                {/* 캔버스: 축소=180×220, 확장=278×340 */}
                <div
                  className="relative"
                  style={{
                    width: sheetExpanded ? 278 : 180,
                    height: sheetExpanded ? 340 : 220,
                    flexShrink: 0,
                  }}
                >
                  <canvas
                    ref={editCanvasRef}
                    width={278}
                    height={340}
                    onPointerDown={handleEditCanvasDown}
                    onPointerMove={handleEditCanvasMove}
                    onPointerUp={handleEditCanvasUp}
                    onPointerLeave={handleEditCanvasUp}
                    style={{
                      width: "100%",
                      height: "100%",
                      touchAction: "none",
                      backgroundColor: "#fff",
                      borderRadius: 8,
                      display: "block",
                    }}
                  />
                  {!hasEditStrokes && (
                    <p
                      className="absolute inset-0 flex items-center justify-center text-sm pointer-events-none"
                      style={{ color: "#CECECE" }}
                    >
                      여기에 그려주세요
                    </p>
                  )}
                  {hasEditStrokes && (
                    <button
                      onClick={clearEditCanvas}
                      className="absolute flex items-center justify-center rounded-full"
                      style={{ top: 8, left: 8, width: 24, height: 24, backgroundColor: "rgba(0,0,0,0.08)" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2L12 12M12 2L2 12" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* 확인(저장) 버튼: 확장 시 캔버스 우측 하단 */}
                {sheetExpanded ? (
                  <div className="flex justify-end" style={{ width: 278, marginTop: 12, marginBottom: 40 }}>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleSave} disabled={!nameInput.trim()} className="disabled:opacity-30">
                      <EditCheckIcon />
                    </motion.button>
                  </div>
                ) : (
                  <motion.button whileTap={{ scale: 0.9 }} onClick={handleSave} disabled={!nameInput.trim()} className="disabled:opacity-30">
                    <EditCheckIcon />
                  </motion.button>
                )}
              </div>

              <div style={{ height: sheetExpanded ? 0 : 32 }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 방 나가기 확인 모달 */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <>
            <motion.div
              key="leave-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setShowLeaveConfirm(false)}
              className="fixed inset-0 z-50"
              style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.35)" }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none">
              <motion.div
                key="leave-modal"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="w-full glass rounded-3xl px-6 py-8 pointer-events-auto"
                style={{ maxWidth: 320 }}
              >
                <div className="text-center mb-6">
                  <p className="font-display font-bold t-text text-lg mb-2">방을 나가시겠어요?</p>
                  <p className="t-text-muted text-sm leading-relaxed">
                    방에서 나가면 내 할 일과 쪽지는<br />그대로 남아요. 다시 입장하려면<br />초대 코드가 필요해요.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleLeaveRoom}
                    className="w-full py-3.5 rounded-2xl font-semibold text-sm"
                    style={{ backgroundColor: "rgba(229,57,53,0.1)", color: "#E53935" }}
                  >
                    나가기
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowLeaveConfirm(false)}
                    className="w-full py-3 rounded-2xl font-semibold text-sm t-btn-secondary"
                  >
                    취소
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* 계정 탈퇴 확인 모달 */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              key="delete-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="fixed inset-0 z-50"
              style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.35)" }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none">
              <motion.div
                key="delete-modal"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="w-full glass rounded-3xl px-6 py-8 pointer-events-auto"
                style={{ maxWidth: 320 }}
              >
                <div className="text-center mb-6">
                  <p className="font-display font-bold t-text text-lg mb-2">계정을 탈퇴하시겠어요?</p>
                  <p className="t-text-muted text-sm leading-relaxed">
                    탈퇴하면 계정 정보가 삭제되고<br />복구할 수 없어요.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDeleteAccount}
                    className="w-full py-3.5 rounded-2xl font-semibold text-sm"
                    style={{ backgroundColor: "rgba(229,57,53,0.1)", color: "#E53935" }}
                  >
                    탈퇴하기
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full py-3 rounded-2xl font-semibold text-sm t-btn-secondary"
                  >
                    취소
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

function EditPenIcon({ tipColor }: { tipColor: string }) {
  return (
    <svg width="52" height="48" viewBox="0 0 52 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.2618 25.8279C12.5517 24.9817 12.6621 23.7202 13.5083 23.0102L35.7236 4.36935C36.5697 3.65934 37.8312 3.76971 38.5412 4.61586L46.8975 14.5744C47.6075 15.4206 47.4971 16.6821 46.6509 17.3921L24.4357 36.0329C23.5895 36.7429 22.328 36.6326 21.618 35.7864L13.2618 25.8279Z" fill="#D9D9D9" />
      <path d="M38.386 4.74611C37.676 3.89996 37.7864 2.63845 38.6325 1.92845L39.3985 1.28566C40.2447 0.575659 41.5062 0.686026 42.2162 1.53218L50.5725 11.4908C51.2825 12.3369 51.1721 13.5984 50.3259 14.3084L49.5599 14.9512C48.7137 15.6612 47.4522 15.5508 46.7422 14.7047L38.386 4.74611Z" fill={tipColor} />
      <path d="M6.4807 41.2827C5.73346 41.4397 5.10707 40.6932 5.39148 39.9846L11.3478 25.1438C11.6147 24.4788 12.495 24.3443 12.9593 24.8976L22.6526 36.4497C23.1169 37.003 22.8316 37.8466 22.1303 37.994L6.4807 41.2827Z" fill={tipColor} />
    </svg>
  );
}

function EditCheckIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="44" height="44" rx="22" fill="#D1D1D1" fillOpacity="0.4" />
      <path d="M15 22L20 27L30 17" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
