"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않아요.");
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <main className="min-h-screen dot-pattern flex flex-col items-center justify-center px-5">
      {/* 장식용 포스트잇들 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, rotate: -8, y: -20 }}
          animate={{ opacity: 1, rotate: -8, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 24 }}
          className="absolute top-16 -left-4 w-28 h-28 rounded-xl"
          style={{ backgroundColor: "#FFF9C4", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
        />
        <motion.div
          initial={{ opacity: 0, rotate: 12, y: -20 }}
          animate={{ opacity: 1, rotate: 12, y: 0 }}
          transition={{ delay: 0.18, type: "spring", stiffness: 200, damping: 24 }}
          className="absolute top-24 -right-6 w-24 h-24 rounded-xl"
          style={{ backgroundColor: "#F8BBD9", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
        />
        <motion.div
          initial={{ opacity: 0, rotate: 6, y: 20 }}
          animate={{ opacity: 1, rotate: 6, y: 0 }}
          transition={{ delay: 0.24, type: "spring", stiffness: 200, damping: 24 }}
          className="absolute bottom-24 -left-3 w-20 h-20 rounded-xl"
          style={{ backgroundColor: "#B2EBF2", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
        />
        <motion.div
          initial={{ opacity: 0, rotate: -10, y: 20 }}
          animate={{ opacity: 1, rotate: -10, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 24 }}
          className="absolute bottom-32 -right-4 w-24 h-24 rounded-xl"
          style={{ backgroundColor: "#C8E6C9", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="w-full max-w-sm relative"
      >
        {/* 로고 */}
        <div className="text-center mb-10">
          <h1 className="font-display font-bold t-text text-4xl tracking-tight mb-2">
            Stickki
          </h1>
          <p className="font-motto t-text-muted text-base">우리 사이, 더 끈끈하게.</p>
        </div>

        {/* 폼 카드 */}
        <div
          className="t-elevated rounded-3xl px-6 py-8"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}
        >
          <h2 className="font-display font-bold t-text text-xl mb-6">로그인</h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="t-text-muted text-xs font-medium">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@stickki.com"
                className="w-full t-card rounded-2xl px-4 py-3.5 t-text text-sm outline-none transition-colors"
                style={{ border: "1px solid var(--border-color)" }}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="t-text-muted text-xs font-medium">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full t-card rounded-2xl px-4 py-3.5 t-text text-sm outline-none transition-colors"
                style={{ border: "1px solid var(--border-color)" }}
                required
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-center"
                style={{ color: "#E53935" }}
              >
                {error}
              </motion.p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full py-4 rounded-2xl t-btn-primary font-semibold text-sm disabled:opacity-30 mt-2"
            >
              {loading ? "로그인 중..." : "로그인하기"}
            </motion.button>
          </form>
        </div>

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
