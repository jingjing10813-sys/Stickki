"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Group, Member, Task } from "@/types";
import { useTheme } from "@/lib/theme";

const AVATARS = ["🐶","🐱","🐻","🦊","🐸","🐼","🐨","🐯","🐧","🦁","🐮","🐷","🐙","🦋","🐺","🦝"];

export default function MyPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, toggle } = useTheme();

  const [group, setGroup] = useState<Group | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [me, setMe] = useState<Member | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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

    await supabase.from("profiles").update({ name: newName, avatar: selectedAvatar }).eq("id", user.id);
    await refreshProfile();

    const updatedMembers = (group.members ?? []).map((m) =>
      m.id === user.id ? { ...m, name: newName, avatar: selectedAvatar } : m
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
    setEditingName(false);
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

  const doneTasks = myTasks.filter((t) => t.type === "todo" && t.status === "done");
  const pendingTasks = myTasks.filter((t) => t.type === "todo" && t.status === "pending");
  const receivedNotes = myTasks.filter((t) => t.type === "note");

  if (!group || !me) {
    return (
      <main className="min-h-screen dot-pattern flex items-center justify-center">
        <span className="t-text-faint text-sm">불러오는 중...</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen dot-pattern flex flex-col">
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

      <div className="flex-1 px-5 pb-10 overflow-auto space-y-3">

        {/* ── 프로필 섹션 ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="glass rounded-3xl px-5 pt-7 pb-5"
        >
          <AnimatePresence mode="wait">
            {editingName ? (
              /* 편집 모드 */
              <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                <div className="grid grid-cols-8 gap-1.5">
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
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  className="w-full t-card rounded-2xl px-4 py-3 t-text text-center text-sm outline-none"
                  style={{ border: "1px solid var(--border-color)" }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingName(false); setNameInput(me.name); setSelectedAvatar(me.avatar); }}
                    className="flex-1 py-3 rounded-2xl t-btn-secondary font-semibold text-sm"
                  >
                    취소
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    disabled={!nameInput.trim()}
                    className="flex-1 py-3 rounded-2xl t-btn-primary font-semibold text-sm disabled:opacity-30"
                  >
                    저장
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              /* 표시 모드 */
              <motion.div key="display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                {/* 아바타 */}
                <motion.div
                  key={selectedAvatar}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-5xl mb-3"
                  style={{
                    background: me.color + "88",
                    boxShadow: `0 4px 20px ${me.color}44`,
                  }}
                >
                  {me.avatar}
                </motion.div>

                {/* 이름 */}
                <p className="font-display font-bold t-text text-2xl mb-1">{me.name}</p>
                <p className="t-text-muted text-xs mb-4">{user?.email}</p>

                {/* 내 정보 수정 버튼 */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setEditingName(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold t-text-sub"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" className="opacity-50">
                    <path d="M2 10.5L4.5 10L10.5 4L10 3.5L4 9.5L2 10.5Z" fill="currentColor"/>
                    <path d="M10 3.5L10.5 4L11.5 3L11 2.5L10 3.5Z" fill="currentColor"/>
                  </svg>
                  내 정보 수정
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── 통계 퀵 row ── */}
        {!editingName && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.05 }}
            className="rounded-3xl px-2 py-3 flex"
            style={{ backgroundColor: me.color + "22" }}
          >
            {[
              { label: "진행 중", count: pendingTasks.length, icon: "○" },
              { label: "완료",   count: doneTasks.length,   icon: "✓" },
              { label: "받은 쪽지", count: receivedNotes.length, icon: "✉" },
            ].map((stat, i) => (
              <div key={stat.label} className="flex-1 flex flex-col items-center gap-0.5 relative">
                {i > 0 && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-6 opacity-20" style={{ backgroundColor: me.color }} />
                )}
                <p className="font-bold text-xl leading-none" style={{ color: me.color }}>{stat.count}</p>
                <p className="text-[11px] font-medium" style={{ color: me.color + "bb" }}>{stat.label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── 내 활동 섹션 ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.09 }}
          className="glass rounded-3xl overflow-hidden"
        >
          <p className="t-text-muted text-xs font-medium px-4 pt-4 pb-2">내 활동</p>

          {[
            { label: "할 일",    count: pendingTasks.length,  sub: "진행 중인 항목", filter: "todo" },
            { label: "완료",     count: doneTasks.length,     sub: "완료한 항목",   filter: "done" },
            { label: "받은 쪽지", count: receivedNotes.length, sub: "받은 쪽지",    filter: "note" },
          ].map((item, i) => (
            <div key={item.label}>
              {i > 0 && <div className="mx-4" style={{ height: 1, backgroundColor: "var(--border-color)" }} />}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/${groupId}/list?filter=${item.filter}`)}
                className="w-full flex items-center justify-between px-4 py-3.5"
              >
                <div className="text-left">
                  <p className="t-text text-sm font-medium">{item.label}</p>
                  <p className="t-text-faint text-xs mt-0.5">{item.sub}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-bold px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: me.color + "22", color: me.color }}
                  >
                    {item.count}
                  </span>
                  <svg width="6" height="11" viewBox="0 0 6 11" fill="none">
                    <path d="M1 1l4 4.5L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.3"/>
                  </svg>
                </div>
              </motion.button>
            </div>
          ))}
        </motion.div>

        {/* ── 설정 섹션 ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.13 }}
          className="glass rounded-3xl overflow-hidden"
        >
          <p className="t-text-muted text-xs font-medium px-4 pt-4 pb-2">설정</p>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <p className="text-sm font-medium" style={{ color: "#E53935" }}>로그아웃</p>
            <svg width="6" height="11" viewBox="0 0 6 11" fill="none">
              <path d="M1 1l4 4.5L1 10" stroke="#E53935" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5"/>
            </svg>
          </motion.button>

          <div className="mx-4" style={{ height: 1, backgroundColor: "var(--border-color)" }} />

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowLeaveConfirm(true)}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <p className="t-text-muted text-sm font-medium">방 나가기</p>
            <svg width="6" height="11" viewBox="0 0 6 11" fill="none">
              <path d="M1 1l4 4.5L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.3"/>
            </svg>
          </motion.button>
        </motion.div>

      </div>

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
    </main>
  );
}
