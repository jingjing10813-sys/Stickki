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

    // 내가 받은 쪽지
    supabase.from("tasks").select("*")
      .eq("group_id", groupId)
      .eq("type", "note")
      .or(`assignee_name.eq.${profile.name},assignee_name.is.null`)
      .then(({ data }) => {
        if (data) {
          setMyTasks((prev) => {
            const noteIds = new Set(data.map((t) => t.id));
            const todos = prev.filter((t) => t.type === "todo");
            const notes = data;
            return [...todos, ...notes.filter((n) => !todos.find((t) => t.id === n.id))];
          });
        }
      });
  }, [groupId, user, profile]);

  async function handleSave() {
    if (!group || !me || !user || !nameInput.trim()) return;

    const oldName = me.name;
    const newName = nameInput.trim();

    // 프로필 업데이트
    await supabase.from("profiles").update({ name: newName, avatar: selectedAvatar }).eq("id", user.id);
    await refreshProfile();

    // 그룹 멤버 업데이트
    const updatedMembers = (group.members ?? []).map((m) =>
      m.id === user.id ? { ...m, name: newName, avatar: selectedAvatar } : m
    );
    const { data } = await supabase.from("groups").update({ members: updatedMembers })
      .eq("id", group.id).select().single();
    if (data) {
      setGroup(data);
      const updatedMe = updatedMembers.find((m) => m.id === user.id)!;
      setMe(updatedMe);
    }

    // 할일 assignee_name 업데이트
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
    await signOut();
    router.push("/login");
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
      <header className="flex items-center justify-between px-5 pt-12 pb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="w-9 h-9 glass rounded-full flex items-center justify-center"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M8 2L2 8L8 14" stroke="currentColor" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="t-text"/>
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
              <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.7" className="t-text"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.7" className="t-text"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 10.5A6 6 0 015.5 2.5a6 6 0 000 11A6 6 0 0013.5 10.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" className="t-text"/>
            </svg>
          )}
        </motion.button>
      </header>

      <div className="flex-1 px-5 pb-10 space-y-4 overflow-auto">
        {/* 프로필 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="glass rounded-3xl p-5"
        >
          <div className="flex flex-col items-center gap-3 mb-5">
            <motion.div
              key={selectedAvatar}
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-5xl"
              style={{
                background: me.color + "99",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              }}
            >
              {selectedAvatar}
            </motion.div>

            <AnimatePresence mode="wait">
              {editingName ? (
                <motion.div
                  key="editing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 w-full"
                >
                  <div className="grid grid-cols-8 gap-1.5 w-full">
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
                  <div className="flex gap-2 w-full">
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
                <motion.button
                  key="display"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setEditingName(true)}
                  className="flex items-center gap-1.5 group"
                >
                  <span className="font-display font-bold t-text text-xl">{me.name}</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="t-text-faint">
                    <path d="M2 10.5L4.5 10L10.5 4L10 3.5L4 9.5L2 10.5Z" fill="currentColor"/>
                    <path d="M10 3.5L10.5 4L11.5 3L11 2.5L10 3.5Z" fill="currentColor"/>
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>

            {!editingName && (
              <p className="t-text-muted text-xs">{user?.email}</p>
            )}
          </div>

          {/* 통계 */}
          {!editingName && (
            <div className="flex gap-3">
              <div className="flex-1 t-card rounded-2xl p-3 text-center">
                <p className="t-text font-bold text-2xl">{pendingTasks.length}</p>
                <p className="t-text-muted text-xs mt-0.5">진행 중</p>
              </div>
              <div className="flex-1 t-card rounded-2xl p-3 text-center">
                <p className="t-text font-bold text-2xl">{doneTasks.length}</p>
                <p className="t-text-muted text-xs mt-0.5">완료</p>
              </div>
              <div className="flex-1 t-card rounded-2xl p-3 text-center">
                <p className="t-text font-bold text-2xl">{receivedNotes.length}</p>
                <p className="t-text-muted text-xs mt-0.5">받은 쪽지</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* 남은 할 일 */}
        {pendingTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.08 }}
            className="glass rounded-3xl p-4"
          >
            <p className="t-text-muted text-xs font-medium mb-3 px-1">남은 할 일</p>
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 px-1 py-1.5">
                  <div
                    className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                    style={{ borderColor: me.color }}
                  />
                  <span className="t-text-sub text-sm flex-1">{task.content}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 로그아웃 */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28, delay: 0.14 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSignOut}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm"
          style={{
            backgroundColor: "rgba(229,57,53,0.08)",
            color: "#E53935",
          }}
        >
          로그아웃
        </motion.button>
      </div>
    </main>
  );
}
