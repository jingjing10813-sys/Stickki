"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Group } from "@/types";

function CopyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3C6.477 3 2 6.477 2 10.8c0 2.717 1.686 5.1 4.236 6.553l-1.08 3.932a.3.3 0 00.456.322l4.698-3.117C10.76 18.563 11.374 18.6 12 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z"
        fill="#1A1A1A"
      />
    </svg>
  );
}

export default function InviteCodePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.from("groups").select("*").eq("id", groupId).single()
      .then(({ data }) => { if (data) setGroup(data); });
  }, [groupId]);

  async function handleCopy() {
    if (!group?.invite_code) return;
    await navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!group?.invite_code) return;
    if (navigator.share) {
      await navigator.share({ text: `초대 코드: ${group.invite_code}` });
    } else {
      handleCopy();
    }
  }

  if (!group) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <span className="text-sm text-gray-400">불러오는 중...</span>
      </main>
    );
  }

  const codeChars = (group.invite_code ?? "").split("");

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
          초대코드
        </span>
      </header>

      {/* 콘텐츠 */}
      <div className="flex-1 px-5 pt-4 flex flex-col items-center">

        {/* 그룹명 */}
        <p className="text-base font-semibold mb-5" style={{ color: "#1C1C1E" }}>
          {group.name} 초대코드
        </p>

        {/* 코드 박스 */}
        <div
          className="flex items-center justify-center gap-2 px-6 py-5 rounded-2xl mb-6"
          style={{ backgroundColor: "#F4F4F5" }}
        >
          {codeChars.map((char, i) => (
            <span
              key={i}
              className="text-2xl font-bold"
              style={{ color: "#1C1C1E", minWidth: 28, textAlign: "center" }}
            >
              {char}
            </span>
          ))}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-4 mb-8">
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleShare}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#F9D000" }}
            >
              <KakaoIcon />
            </motion.button>
          </div>
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleCopy}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#F4F4F5" }}
            >
              {copied ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L20 7" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <CopyIcon />
              )}
            </motion.button>
          </div>
        </div>

        {/* 구분선 */}
        <div className="self-stretch -mx-5" style={{ height: 12, backgroundColor: "#F4F4F5" }} />

        {/* 안내사항 */}
        <div className="w-full pt-6">
          <p className="text-base font-semibold mb-3" style={{ color: "#1C1C1E" }}>안내사항</p>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm" style={{ color: "#8E8E93" }}>
              함께 생활하는 사람에게 초대 코드를 공유해 주세요.
            </p>
            <p className="text-sm" style={{ color: "#8E8E93" }}>
              생성된 초대코드는 변경할 수 없어요.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
