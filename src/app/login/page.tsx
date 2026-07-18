"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { StickkiLogo, StickkiWordmarkWithTape } from "@/components/ui/StickkiLogos";

export default function LoginPage() {
  const [showSplash, setShowSplash] = useState(true);

  async function handleKakaoLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: window.location.origin + "/" },
    });
  }

  async function handleAppleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: window.location.origin + "/" },
    });
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/" },
    });
  }

  async function handleNaverLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "naver" as never,
      options: { redirectTo: window.location.origin + "/" },
    });
  }

  if (showSplash) {
    return <Splash onDone={() => setShowSplash(false)} />;
  }

  return (
    <main className="min-h-screen dot-pattern flex flex-col px-6 relative overflow-hidden">

      {/* 로고 영역 */}
      <div style={{ paddingTop: "calc(19vh - 20px)", display: "flex", justifyContent: "center" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
        >
          <StickkiWordmarkWithTape style={{ width: 175, height: 59, color: "#1a1a1a" }} />
        </motion.div>
      </div>

      {/* 스페이서 */}
      <div className="flex-1" />

      {/* 소셜 로그인 */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.1 }}
        className="flex flex-col gap-3 relative"
        style={{ zIndex: 1, paddingBottom: 58 }}
      >
        <p className="text-center t-text-faint text-xs mb-1" style={{ fontWeight: 500 }}>
          지금 가입하고 끈끈한 공동생활 시작하기
        </p>

        {/* 카카오 */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleKakaoLogin}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-semibold text-sm"
          style={{ backgroundColor: "#FEE500", color: "rgba(0,0,0,0.85)" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M9.00002 0.600006C4.02917 0.600006 0 3.71296 0 7.55229C0 9.94003 1.5584 12.045 3.93152 13.297L2.93303 16.9445C2.84481 17.2668 3.21341 17.5237 3.49646 17.3369L7.87334 14.4482C8.2427 14.4839 8.61808 14.5047 9.00002 14.5047C13.9705 14.5047 17.9999 11.3918 17.9999 7.55229C17.9999 3.71296 13.9705 0.600006 9.00002 0.600006" fill="rgba(0,0,0,0.85)"/>
          </svg>
          카카오로 시작하기
        </motion.button>

        {/* 네이버 */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNaverLogin}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-semibold text-sm"
          style={{ backgroundColor: "#03C75A", color: "#fff" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10.8491 8.56267L4.91687 0H0V16H5.15088V7.436L11.0831 16H16V0H10.8491V8.56267Z" fill="white"/>
          </svg>
          네이버로 시작하기
        </motion.button>

        {/* 애플 */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleAppleLogin}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-semibold text-sm"
          style={{ backgroundColor: "#000", color: "#fff" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21.2806 18.424C20.9328 19.2275 20.5211 19.9672 20.0441 20.6473C19.3938 21.5743 18.8614 22.216 18.4511 22.5724C17.8151 23.1573 17.1336 23.4569 16.4039 23.4739C15.88 23.4739 15.2483 23.3248 14.5129 23.0224C13.775 22.7214 13.097 22.5724 12.477 22.5724C11.8268 22.5724 11.1294 22.7214 10.3835 23.0224C9.63644 23.3248 9.03463 23.4824 8.5745 23.498C7.87472 23.5278 7.17722 23.2198 6.48099 22.5724C6.03662 22.1848 5.48081 21.5204 4.81496 20.5791C4.10057 19.574 3.51323 18.4084 3.0531 17.0795C2.56032 15.6442 2.31329 14.2543 2.31329 12.9087C2.31329 11.3673 2.64636 10.0379 3.31348 8.92386C3.83778 8.02902 4.53528 7.32314 5.40826 6.80495C6.28124 6.28675 7.2245 6.02269 8.2403 6.00579C8.79611 6.00579 9.52499 6.17772 10.4308 6.51561C11.334 6.85464 11.9139 7.02656 12.1682 7.02656C12.3583 7.02656 13.0026 6.82553 14.0948 6.42475C15.1276 6.05307 15.9993 5.89917 16.7134 5.95979C18.6485 6.11596 20.1023 6.87877 21.0691 8.25305C19.3385 9.30165 18.4824 10.7703 18.4994 12.6544C18.515 14.122 19.0474 15.3432 20.0937 16.3129C20.5679 16.7629 21.0975 17.1108 21.6867 17.3578C21.5589 17.7283 21.424 18.0833 21.2806 18.424V18.424ZM16.8426 0.960146C16.8426 2.11041 16.4224 3.1844 15.5847 4.17848C14.5739 5.36025 13.3513 6.04313 12.0254 5.93537C12.0085 5.79738 11.9987 5.65214 11.9987 5.49952C11.9987 4.39527 12.4794 3.21351 13.3331 2.24725C13.7593 1.75802 14.3013 1.35123 14.9586 1.02673C15.6146 0.707068 16.235 0.530288 16.8185 0.500015C16.8355 0.653787 16.8426 0.807569 16.8426 0.960131V0.960146Z" fill="white"/>
          </svg>
          애플로 시작하기
        </motion.button>

        {/* 구글 */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleGoogleLogin}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-semibold text-sm"
          style={{ backgroundColor: "#fff", color: "rgba(20,20,20,0.85)", border: "1px solid rgba(0,0,0,0.1)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M23.04 12.2614C23.04 11.4459 22.9668 10.6618 22.8309 9.90909H12V14.3575H18.1891C17.9225 15.795 17.1123 17.013 15.8943 17.8284V20.7139H19.6109C21.7855 18.7118 23.04 15.7636 23.04 12.2614Z" fill="#4285F4"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M12 23.4998C15.105 23.4998 17.7081 22.4701 19.6109 20.7137L15.8943 17.8282C14.8645 18.5182 13.5472 18.926 12 18.926C9.00474 18.926 6.46951 16.903 5.56519 14.1848H1.72314V17.1644C3.61542 20.9228 7.50451 23.4998 12 23.4998Z" fill="#34A853"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M5.56523 14.1851C5.33523 13.4951 5.20455 12.758 5.20455 12.0001C5.20455 11.2421 5.33523 10.5051 5.56523 9.81506V6.83551H1.72318C0.944318 8.38801 0.5 10.1444 0.5 12.0001C0.5 13.8557 0.944318 15.6121 1.72318 17.1646L5.56523 14.1851Z" fill="#FBBC05"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M12 5.07386C13.6884 5.07386 15.2043 5.65409 16.3961 6.79364L19.6945 3.49523C17.7029 1.63955 15.0997 0.5 12 0.5C7.50451 0.5 3.61542 3.07705 1.72314 6.83545L5.56519 9.815C6.46951 7.09682 9.00474 5.07386 12 5.07386Z" fill="#EA4335"/>
          </svg>
          구글로 시작하기
        </motion.button>

        {/* 이메일 로그인 */}
        <div className="flex items-center justify-center pt-1">
          <Link
            href="/login/email"
            className="text-xs t-text-faint font-medium underline underline-offset-2"
          >
            이메일로 로그인하기
          </Link>
        </div>
      </motion.div>

    </main>
  );
}

const NOTE_SIZE = 191.228;
const NOTE_RADIUS = 19.1228;
const NOTE_LEFT_CENTER = 187.5 - NOTE_SIZE / 2; // 375px 폭 기준 가로 중앙
const NOTE_TOP_CENTER = 406 - NOTE_SIZE / 2; // 812px 높이 기준 세로 중앙
const NOTE_SHADOW =
  "0 5px 12px rgba(150,150,150,0.1), 0 21px 21px rgba(150,150,150,0.09), 0 48px 29px rgba(150,150,150,0.05), 0 84px 34px rgba(150,150,150,0.01)";
const NOTE_COLORS = {
  pink: { fill: "#FCE7F3", border: "#FDF2F8" },
  blue: { fill: "#DBEAFE", border: "#EFF6FF" },
  yellow: { fill: "#FEF9C3", border: "#FEFCE8" },
} as const;

function noteStyle(color: keyof typeof NOTE_COLORS): React.CSSProperties {
  const c = NOTE_COLORS[color];
  return {
    width: NOTE_SIZE,
    height: NOTE_SIZE,
    borderRadius: NOTE_RADIUS,
    backgroundColor: c.fill,
    backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 21px, rgba(150,150,150,0.15) 21px, rgba(150,150,150,0.15) 22px)",
    border: `1px solid ${c.border}`,
    boxShadow: NOTE_SHADOW,
  };
}

function Splash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"stack" | "scatter">("stack");

  useEffect(() => {
    const toScatter = setTimeout(() => setPhase("scatter"), 700);
    const toDone = setTimeout(onDone, 2400);
    return () => { clearTimeout(toScatter); clearTimeout(toDone); };
  }, [onDone]);

  return (
    <main
      className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(circle, #f3f4f6 1.5px, transparent 1.5px)",
        backgroundSize: "24px 24px",
      }}
      onClick={onDone}
    >
      {/* 핑크 노트 — 스택 시 중앙, 스캐터 시 Figma 절대좌표 */}
      <motion.div
        className="absolute"
        style={noteStyle("pink")}
        initial={{ left: NOTE_LEFT_CENTER, top: NOTE_TOP_CENTER, rotate: -10, opacity: 0 }}
        animate={
          phase === "stack"
            ? { left: NOTE_LEFT_CENTER, top: NOTE_TOP_CENTER, rotate: -10, opacity: 1 }
            : { left: -120, top: 49, rotate: -14, opacity: 1 }
        }
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
      />

      {/* 파랑 노트 — 스택 시 중앙, 스캐터 시 Figma 절대좌표 */}
      <motion.div
        className="absolute"
        style={noteStyle("blue")}
        initial={{ left: NOTE_LEFT_CENTER, top: NOTE_TOP_CENTER, rotate: 12, opacity: 0 }}
        animate={
          phase === "stack"
            ? { left: NOTE_LEFT_CENTER, top: NOTE_TOP_CENTER, rotate: 12, opacity: 1 }
            : { left: 293, top: 120, rotate: 16, opacity: 1 }
        }
        transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.05 }}
      />

      {/* 중앙: 쌓인 노란 노트 ↔ 워드마크 크로스페이드 */}
      <div className="relative" style={{ width: NOTE_SIZE, height: NOTE_SIZE }}>
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ ...noteStyle("yellow"), width: "100%", height: "100%" }}
          initial={{ opacity: 1, scale: 1, rotate: -2 }}
          animate={phase === "stack" ? { opacity: 1, scale: 1, rotate: -2 } : { opacity: 0, scale: 1, rotate: -2 }}
          transition={{ duration: 0.3 }}
        >
          <StickkiLogo style={{ width: 90, height: "auto", color: "#1a1a1a" }} />
        </motion.div>

        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={phase === "scatter" ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <StickkiWordmarkWithTape style={{ width: 175, height: 59, color: "#1a1a1a" }} />
          <p className="font-sans t-text-muted" style={{ fontSize: 14 }}>우리사이, 더 끈끈하게</p>
        </motion.div>
      </div>

      {/* 노랑 태그(우하단) — Figma 절대좌표 */}
      <motion.div
        className="absolute flex items-center justify-center"
        style={noteStyle("yellow")}
        initial={{ left: NOTE_LEFT_CENTER, top: NOTE_TOP_CENTER, opacity: 0, rotate: 10 }}
        animate={phase === "scatter" ? { left: 250, top: 529, opacity: 1, rotate: 8 } : { left: NOTE_LEFT_CENTER, top: NOTE_TOP_CENTER, opacity: 0, rotate: 10 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 20 }}
      >
        <StickkiLogo style={{ width: 90, height: "auto", color: "#1a1a1a" }} />
      </motion.div>
    </main>
  );
}
