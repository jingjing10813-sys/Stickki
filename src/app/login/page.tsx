"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
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

  return (
    <main className="min-h-screen dot-pattern flex flex-col items-center justify-center px-5">
      {/* 장식용 포스트잇들 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, rotate: -8 }}
          animate={{ opacity: 1, rotate: -8 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 24 }}
          className="absolute top-16 -left-4 w-28 h-28 rounded-xl"
          style={{ backgroundColor: "#FFF9C4", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
        />
        <motion.div
          initial={{ opacity: 0, rotate: 12 }}
          animate={{ opacity: 1, rotate: 12 }}
          transition={{ delay: 0.18, type: "spring", stiffness: 200, damping: 24 }}
          className="absolute top-24 -right-6 w-24 h-24 rounded-xl"
          style={{ backgroundColor: "#F8BBD9", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
        />
        <motion.div
          initial={{ opacity: 0, rotate: 6 }}
          animate={{ opacity: 1, rotate: 6 }}
          transition={{ delay: 0.24, type: "spring", stiffness: 200, damping: 24 }}
          className="absolute bottom-24 -left-3 w-20 h-20 rounded-xl"
          style={{ backgroundColor: "#B2EBF2", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
        />
        <motion.div
          initial={{ opacity: 0, rotate: -10 }}
          animate={{ opacity: 1, rotate: -10 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 24 }}
          className="absolute bottom-32 -right-4 w-24 h-24 rounded-xl"
          style={{ backgroundColor: "#C8E6C9", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="w-full max-w-sm relative flex flex-col items-center"
      >
        {/* 로고 */}
        <div className="text-center mb-16">
          <h1 className="font-display font-bold t-text text-5xl tracking-tight mb-3">Stickki</h1>
          <p className="font-motto t-text-muted text-base">우리 사이, 더 끈끈하게.</p>
        </div>

        {/* 소셜 버튼 3개 */}
        <div className="flex flex-col gap-3 w-full">
          {/* 카카오 */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleKakaoLogin}
            className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-semibold text-sm"
            style={{ backgroundColor: "#FEE500", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", color: "rgba(0,0,0,0.85)" }}
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M9 1.5C4.86 1.5 1.5 4.08 1.5 7.26c0 2.04 1.32 3.84 3.3 4.86l-.84 3.12a.19.19 0 0 0 .285.21L7.8 13.2c.39.06.78.09 1.2.09 4.14 0 7.5-2.58 7.5-5.76S13.14 1.5 9 1.5z"
                fill="rgba(0,0,0,0.85)"/>
            </svg>
            카카오로 시작하기
          </motion.button>

          {/* 애플 */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAppleLogin}
            className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-semibold text-sm text-white"
            style={{ backgroundColor: "#000", boxShadow: "0 2px 12px rgba(0,0,0,0.18)" }}
          >
            <svg width="16" height="19" viewBox="0 0 15 18" fill="none">
              <path d="M12.27 9.54c-.02-2.1 1.72-3.12 1.8-3.17-1-1.44-2.54-1.64-3.08-1.66-1.32-.13-2.58.78-3.25.78-.67 0-1.7-.76-2.8-.74C3.5 4.77 2.06 5.64 1.28 7c-1.6 2.76-.41 6.84 1.14 9.08.76 1.1 1.66 2.32 2.84 2.28 1.14-.05 1.57-.73 2.95-.73 1.38 0 1.77.73 2.97.71 1.23-.02 2.01-1.1 2.76-2.2.87-1.27 1.23-2.5 1.25-2.56-.03-.01-2.39-.91-2.42-3.04zM10.18 3.1C10.8 2.35 11.2 1.3 11.08.24c-.9.04-2 .6-2.64 1.34-.58.66-1.08 1.72-.94 2.74.99.07 2-.5 2.68-1.22z" fill="white"/>
            </svg>
            Apple로 시작하기
          </motion.button>

          {/* 구글 */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleGoogleLogin}
            className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-semibold text-sm t-text t-elevated"
            style={{ border: "1px solid var(--border-color)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
              <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
              <path d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.6 0-14.2 4.3-17.7 11.7z" fill="#FF3D00"/>
              <path d="M24 45c5.8 0 10.7-1.9 14.5-5.2l-6.7-5.5C29.9 36 27.1 37 24 37c-5.9 0-10.7-3.1-11.8-7.5l-7 5.4C8.4 41.1 15.7 45 24 45z" fill="#4CAF50"/>
              <path d="M44.5 20H24v8.5h11.8c-.6 2.8-2.3 5.2-4.8 6.8l6.7 5.5C41.9 37.3 45 31.2 45 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
            </svg>
            Google로 시작하기
          </motion.button>
        </div>

        {/* 이메일 로그인 */}
        <div className="flex items-center gap-3 w-full mt-6 mb-5">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-color)" }} />
          <span className="t-text-faint text-xs">또는</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-color)" }} />
        </div>

        <Link href="/login/email" className="w-full">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="w-full h-12 rounded-2xl flex items-center justify-center t-text-muted text-sm font-medium t-card"
            style={{ border: "1px solid var(--border-color)" }}
          >
            이메일로 로그인
          </motion.div>
        </Link>

        <p className="text-center t-text-muted text-sm mt-6">
          아직 계정이 없나요?{" "}
          <Link href="/signup" className="t-text font-semibold underline underline-offset-2">
            회원가입
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
