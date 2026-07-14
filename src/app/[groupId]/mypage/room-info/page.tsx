"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Group, Member } from "@/types";

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.45"/>
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.45"/>
    </svg>
  );
}

export default function RoomInfoPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [editingMotto, setEditingMotto] = useState(false);
  const [mottoInput, setMottoInput] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("groups").select("*").eq("id", groupId).single()
      .then(({ data }) => {
        if (!data) return;
        setGroup(data);
        setMottoInput(data.motto ?? "");
      });
  }, [groupId]);

  useEffect(() => {
    if (editingMotto) inputRef.current?.focus();
  }, [editingMotto]);

  async function handleSaveMotto() {
    if (!group) return;
    const newMotto = mottoInput.trim();
    const { data } = await supabase
      .from("groups")
      .update({ motto: newMotto })
      .eq("id", group.id)
      .select()
      .single();
    if (data) setGroup(data);
    setEditingMotto(false);
  }

  async function handleLeaveRoom() {
    if (!group || !user) return;
    const updated = (group.members ?? []).filter((m: Member) => m.id !== user.id);
    await supabase.from("groups").update({ members: updated }).eq("id", group.id);
    router.push("/");
  }

  if (!group) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <span className="text-sm text-gray-400">불러오는 중...</span>
      </main>
    );
  }

  const memberCount = (group.members ?? []).length;

  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* 헤더 */}
      <header className="flex items-center px-5 pb-4 relative" style={{ paddingTop: 20 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#F4F4F5" }}
        >
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M7.5 1.5L2 7.5L7.5 13.5" stroke="#1C1C1E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
        <span className="absolute left-1/2 -translate-x-1/2 font-semibold text-base" style={{ color: "#1C1C1E" }}>
          방 정보
        </span>
      </header>

      {/* 콘텐츠 */}
      <div className="flex-1 px-5 pt-4 pb-32 flex flex-col gap-6">

        {/* 가훈 섹션 */}
        <section>
          <p className="text-sm font-semibold mb-2" style={{ color: "#1C1C1E" }}>
            {group.name} 가훈
          </p>
          <div
            className="flex items-center justify-between rounded-2xl px-4 py-4"
            style={{ backgroundColor: "#F4F4F5" }}
          >
            {editingMotto ? (
              <input
                ref={inputRef}
                value={mottoInput}
                onChange={(e) => setMottoInput(e.target.value)}
                onBlur={handleSaveMotto}
                onKeyDown={(e) => e.key === "Enter" && handleSaveMotto()}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "#1C1C1E" }}
              />
            ) : (
              <span className="flex-1 text-sm" style={{ color: "#1C1C1E" }}>
                {group.motto || "가훈을 입력해주세요"}
              </span>
            )}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                setMottoInput(group.motto ?? "");
                setEditingMotto(true);
              }}
              className="ml-3 flex-shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M11.2502 5.41671L14.5835 8.75004M3.3335 16.6668H6.66683L15.4168 7.91676C15.6357 7.69789 15.8093 7.43805 15.9278 7.15208C16.0462 6.86612 16.1072 6.55962 16.1072 6.25009C16.1072 5.94056 16.0462 5.63406 15.9278 5.3481C15.8093 5.06213 15.6357 4.80229 15.4168 4.58342C15.198 4.36455 14.9381 4.19094 14.6522 4.07248C14.3662 3.95403 14.0597 3.89307 13.7502 3.89307C13.4406 3.89307 13.1341 3.95403 12.8482 4.07248C12.5622 4.19094 12.3024 4.36455 12.0835 4.58342L3.3335 13.3334V16.6668Z" stroke="#C7C7CC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.button>
          </div>
        </section>

        {/* 구성원 섹션 */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold" style={{ color: "#1C1C1E" }}>
              {group.name} 구성원
            </p>
            <span className="text-sm" style={{ color: "#8E8E93" }}>{memberCount}명</span>
          </div>
          <div className="flex flex-col gap-2">
            {(group.members ?? []).map((member: Member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-2xl py-3"
                style={{ backgroundColor: "#FFFFFF" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#E4E4E7" }}
                >
                  <UserIcon />
                </div>
                <span className="text-sm font-medium" style={{ color: "#1C1C1E" }}>
                  {member.name}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* 방 나가기 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-10 bg-white">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowLeaveConfirm(true)}
          className="w-full py-4 rounded-2xl text-sm font-semibold"
          style={{ border: "1.5px solid #E4E4E7", color: "#1C1C1E", backgroundColor: "#FFFFFF" }}
        >
          방 나가기
        </motion.button>
      </div>

      {/* 방 나가기 확인 모달 */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <>
            <motion.div
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
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="w-full rounded-3xl px-6 py-8 pointer-events-auto"
                style={{ maxWidth: 320, backgroundColor: "white", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
              >
                <div className="text-center mb-6">
                  <p className="font-semibold text-lg mb-2" style={{ color: "#1C1C1E" }}>방을 나가시겠어요?</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#8E8E93" }}>
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
                    className="w-full py-3 rounded-2xl font-semibold text-sm"
                    style={{ backgroundColor: "#F4F4F5", color: "#1C1C1E" }}
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
