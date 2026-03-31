"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Member } from "@/types";

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

interface MemberBarProps {
  members: Member[];
  inviteCode: string;
  onRemove: (id: string) => void;
}

export default function MemberBar({ members, inviteCode, onRemove }: MemberBarProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(inviteCode);
    } catch {
      const el = document.createElement("textarea");
      el.value = inviteCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* 초대코드 토스트 */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 px-6 py-4 rounded-3xl"
            style={{
              background: "rgba(28,28,30,0.92)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            <span className="text-white/40 text-xs font-medium tracking-wide">초대코드</span>
            <span className="font-display font-bold text-3xl text-white tracking-[0.2em]">
              {inviteCode}
            </span>
            <span className="text-white/30 text-xs">클립보드에 복사됐어요</span>
          </motion.div>
        )}
      </AnimatePresence>

      {showDetail && (
        <div className="fixed inset-0 z-30" onClick={() => setShowDetail(false)} />
      )}

      <div className="fixed bottom-8 left-6 z-40 flex items-center gap-2">
        {/* 멤버 아바타 */}
        <div className="flex items-center">
          <AnimatePresence>
            {members.map((member, i) => (
              <motion.button
                key={member.id}
                initial={{ opacity: 0, scale: 0.5, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 400, damping: 28, delay: i * 0.05 }}
                whileHover={{ y: -4, zIndex: 10, transition: { duration: 0.15 } }}
                onClick={() => setShowDetail(!showDetail)}
                className="relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm select-none"
                style={{
                  backgroundColor: member.color,
                  color: "#ffffff",
                  marginLeft: i === 0 ? 0 : -10,
                  boxShadow: `0 0 0 2.5px var(--bg), 0 2px 8px rgba(0,0,0,0.2)`,
                  zIndex: members.length - i,
                }}
                title={member.name}
              >
                {member.avatar ?? getInitial(member.name)}
              </motion.button>
            ))}
          </AnimatePresence>

          {/* 초대코드 복사 버튼 */}
          <motion.button
            whileHover={{ y: -4, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCopyCode}
            className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              marginLeft: members.length > 0 ? -10 : 0,
              backgroundColor: "var(--bg-elevated)",
              boxShadow: `0 0 0 2.5px var(--bg), 0 2px 8px rgba(0,0,0,0.15)`,
              border: "1.5px dashed var(--border-mid)",
              zIndex: 0,
            }}
            title="초대코드 복사"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="text-sm t-text-sub"
                >
                  ✓
                </motion.span>
              ) : (
                <motion.svg
                  key="link"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  width="14" height="14" viewBox="0 0 14 14" fill="none"
                >
                  <path
                    d="M8.5 5.5L5.5 8.5M6 3.5L7 2.5a3 3 0 014.243 4.243L10.5 7.5M7.5 10.5l-1 1A3 3 0 012.257 7.257L3 6.5"
                    stroke="var(--text-2)" strokeWidth="1.6" strokeLinecap="round"
                  />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* 멤버 목록 팝업 */}
        <AnimatePresence>
          {showDetail && members.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute bottom-full mb-3 left-0 glass rounded-2xl py-2 min-w-[160px]"
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors group"
                  style={{ cursor: "default" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--card)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: member.color + "99" }}
                  >
                    {member.avatar ?? getInitial(member.name)}
                  </div>
                  <span className="t-text text-sm flex-1">{member.name}</span>
                  <button
                    onClick={() => onRemove(member.id)}
                    className="opacity-0 group-hover:opacity-100 t-text-muted transition-all text-base leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
