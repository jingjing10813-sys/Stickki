"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Group, Member, Task } from "@/types";
import { useTheme } from "@/lib/theme";

const AVATARS = ["🐶","🐱","🐻","🦊","🐸","🐼","🐨","🐯","🐧","🦁","🐮","🐷","🐙","🦋","🐺","🦝"];
const AVATAR_COLORS: Record<string, string> = {
  "🐶": "#FF9F43", "🐱": "#FF9FF3", "🐻": "#C8A882", "🦊": "#FF6B6B",
  "🐸": "#6BCB77", "🐼": "#A8A8A8", "🐨": "#B8C4D0", "🐯": "#FECA57",
  "🐧": "#48DBFB", "🦁": "#FFD166", "🐮": "#E8D5B7", "🐷": "#FFB8C6",
  "🐙": "#C77DFF", "🦋": "#54A0FF", "🐺": "#9EAAB5", "🦝": "#7B8FA1",
};

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
  const [nameInput, setNameInput] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    setNameInput(profile.name);
    setSelectedAvatar(profile.avatar);

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

  async function handleSave() {
    if (!group || !me || !user || !nameInput.trim()) return;
    const oldName = me.name;
    const newName = nameInput.trim();
    const newColor = AVATAR_COLORS[selectedAvatar] ?? me.color;

    await supabase.from("profiles").update({ name: newName, avatar: selectedAvatar, color: newColor }).eq("id", user.id);
    await refreshProfile();

    const updatedMembers = (group.members ?? []).map((m) =>
      m.id === user.id ? { ...m, name: newName, avatar: selectedAvatar, color: newColor } : m
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

  async function handleCopyCode() {
    if (!group?.invite_code) return;
    await navigator.clipboard.writeText(group.invite_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  const doneTasks = myTasks.filter((t) => t.type === "todo" && t.status === "done");
  const pendingTasks = myTasks.filter((t) => t.type === "todo" && t.status === "pending");
  const receivedNotes = myTasks.filter((t) => t.type === "note");

  const myPageBg: React.CSSProperties = {
    backgroundColor: "#FFFFFF",
    backgroundImage: "radial-gradient(circle, #E5E7EB 1.5px, transparent 1.5px)",
    backgroundSize: "24px 24px",
  };

  if (!group || !me) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={myPageBg}>
        <span className="t-text-faint text-sm">불러오는 중...</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col" style={myPageBg}>
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 pb-4" style={{ paddingTop: "calc(var(--spacing) * 4)" }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="w-9 h-9 glass rounded-full flex items-center justify-center"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M8 2L2 8L8 14" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
        <span className="font-display font-bold t-text text-sm">마이페이지</span>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggle}
          className="w-9 h-9 glass rounded-full flex items-center justify-center"
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
              className="w-20 h-20 rounded-full flex items-center justify-center text-5xl"
              style={{ backgroundColor: "var(--card)", border: "1.5px solid var(--border-color)" }}
            >
              {me.avatar}
            </motion.div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setNameInput(me.name); setSelectedAvatar(me.avatar); setShowEditModal(true); }}
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--card)", border: "1.5px solid var(--border-color)" }}
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <path d="M2 10.5L4.5 10L10.5 4L10 3.5L4 9.5L2 10.5Z" fill="currentColor" opacity="0.6"/>
                <path d="M10 3.5L10.5 4L11.5 3L11 2.5L10 3.5Z" fill="currentColor" opacity="0.6"/>
              </svg>
            </motion.button>
          </div>
          <p className="font-display font-bold t-text text-xl mb-0.5">{me.name}</p>
          <p className="t-text-faint text-sm">{user?.email}</p>
        </div>

        {/* ── 통계 row ── */}
        <div className="flex" style={{ gap: 10 }}>
          {[
            { label: "진행중", count: pendingTasks.length },
            { label: "완료",   count: doneTasks.length },
            { label: "받은 쪽지", count: receivedNotes.length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex-1 flex flex-col items-center"
              style={{ backgroundColor: "rgba(228, 228, 231, 0.5)", borderRadius: 10, padding: "14px 10px", gap: 6 }}
            >
              <p className="font-bold text-xl t-text leading-none">{stat.count}</p>
              <p className="text-xs t-text-faint">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── 기본 섹션 ── */}
        <div>
          <p className="t-text-muted text-xs font-semibold mb-2 px-1">기본</p>
          <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E4E4E7", borderRadius: 20, overflow: "hidden" }}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowInviteSheet(true)}
              className="w-full flex items-center justify-between"
              style={{ padding: "16px 20px" }}
            >
              <span className="t-text text-sm font-medium">초대 코드</span>
              <ChevronRight />
            </motion.button>
            <div style={{ height: 1, backgroundColor: "#E4E4E7", marginLeft: 10, marginRight: 10 }} />
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowRoomInfo(true)}
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
          <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E4E4E7", borderRadius: 20, overflow: "hidden" }}>
            {/* 알림설정 */}
            <div className="flex items-center justify-between" style={{ padding: "16px 20px" }}>
              <span className="t-text text-sm font-medium">알림설정</span>
              <button
                onClick={() => setNotifEnabled((v) => !v)}
                className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
                style={{ backgroundColor: notifEnabled ? "#1C1C1E" : "#D1D5DB" }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                  style={{ transform: notifEnabled ? "translateX(20px)" : "translateX(0px)" }}
                />
              </button>
            </div>
            <div style={{ height: 1, backgroundColor: "#E4E4E7", marginLeft: 10, marginRight: 10 }} />
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
            <div style={{ height: 1, backgroundColor: "#E4E4E7", marginLeft: 10, marginRight: 10 }} />
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
            <div style={{ height: 1, backgroundColor: "#E4E4E7", marginLeft: 10, marginRight: 10 }} />
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

      {/* 초대 코드 시트 */}
      <AnimatePresence>
        {showInviteSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
          >
            <div
              className="absolute inset-0"
              style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.4)" }}
              onClick={() => setShowInviteSheet(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="relative w-full max-w-lg t-elevated rounded-t-3xl pt-3 pb-10 px-5 z-10"
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: "var(--border-mid)" }} />
              <p className="font-display font-bold t-text text-lg text-center mb-6">초대 코드</p>
              <div
                className="rounded-2xl px-5 py-5 mb-4 text-center"
                style={{ backgroundColor: "var(--canvas)", border: "1px solid var(--border-color)" }}
              >
                <p className="font-mono font-bold text-3xl t-text tracking-widest">{group.invite_code}</p>
              </div>
              <p className="t-text-faint text-xs text-center mb-5">친구에게 이 코드를 공유하면 방에 초대할 수 있어요</p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCopyCode}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm t-btn-primary"
              >
                {codeCopied ? "복사됨 ✓" : "코드 복사"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 방 정보 시트 */}
      <AnimatePresence>
        {showRoomInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
          >
            <div
              className="absolute inset-0"
              style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.4)" }}
              onClick={() => setShowRoomInfo(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="relative w-full max-w-lg t-elevated rounded-t-3xl pt-3 pb-10 px-5 z-10"
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: "var(--border-mid)" }} />
              <p className="font-display font-bold t-text text-lg text-center mb-6">방 정보</p>
              <div className="space-y-3">
                <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: "var(--canvas)", border: "1px solid var(--border-color)" }}>
                  <p className="t-text-faint text-xs mb-1">방 이름</p>
                  <p className="t-text font-semibold text-base">{group.name}</p>
                </div>
                {group.motto && (
                  <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: "var(--canvas)", border: "1px solid var(--border-color)" }}>
                    <p className="t-text-faint text-xs mb-1">방 소개</p>
                    <p className="t-text text-sm">{group.motto}</p>
                  </div>
                )}
                <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: "var(--canvas)", border: "1px solid var(--border-color)" }}>
                  <p className="t-text-faint text-xs mb-2">멤버 ({(group.members ?? []).length}명)</p>
                  <div className="flex flex-wrap gap-2">
                    {(group.members ?? []).map((m) => (
                      <div key={m.id} className="flex items-center gap-1.5">
                        <span className="text-base">{m.avatar}</span>
                        <span className="t-text text-sm">{m.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border-color)" }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setShowRoomInfo(false); setShowLeaveConfirm(true); }}
                  className="w-full py-3.5 rounded-2xl font-semibold text-sm"
                  style={{ backgroundColor: "rgba(229,57,53,0.08)", color: "#E53935" }}
                >
                  방 나가기
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 정보 수정 모달 */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
          >
            <div
              className="absolute inset-0"
              style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.4)" }}
              onClick={() => setShowEditModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="relative w-full max-w-lg t-elevated rounded-t-3xl pt-3 pb-10 px-5 z-10"
              style={{ boxShadow: "0 -20px 60px rgba(0,0,0,0.3)" }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: "var(--border-mid)" }} />

              <div className="flex justify-center mb-5">
                <motion.div
                  key={selectedAvatar}
                  initial={{ scale: 0.7 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-5xl"
                  style={{
                    background: (AVATAR_COLORS[selectedAvatar] ?? me.color) + "88",
                    boxShadow: `0 4px 20px ${(AVATAR_COLORS[selectedAvatar] ?? me.color)}44`,
                  }}
                >
                  {selectedAvatar}
                </motion.div>
              </div>

              <div className="grid grid-cols-8 gap-1.5 mb-5">
                {AVATARS.map((av) => (
                  <motion.button
                    key={av}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setSelectedAvatar(av)}
                    className="w-full aspect-square rounded-xl flex items-center justify-center text-xl"
                    style={{
                      background: selectedAvatar === av ? "var(--card-hover)" : "var(--card)",
                      boxShadow: selectedAvatar === av ? "0 0 0 2px var(--btn-primary-bg)" : "none",
                    }}
                  >
                    {av}
                  </motion.button>
                ))}
              </div>

              <p className="t-text font-semibold text-sm mb-2">이름</p>
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className="w-full t-card rounded-2xl px-4 py-3 t-text text-sm outline-none mb-4"
                style={{ border: "1px solid var(--border-color)" }}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3.5 rounded-2xl t-btn-secondary font-semibold text-sm"
                >
                  취소
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={!nameInput.trim()}
                  className="flex-1 py-3.5 rounded-2xl t-btn-primary font-semibold text-sm disabled:opacity-30"
                >
                  저장
                </motion.button>
              </div>
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
