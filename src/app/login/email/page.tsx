"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function EmailLoginPage() {
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
    <main className="min-h-screen dot-pattern flex flex-col px-6">

      {/* 뒤로가기 */}
      <div style={{ paddingTop: "calc(var(--spacing) * 14)" }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M8 2L2 8L8 14" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      </div>

      {/* 타이틀 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.04 }}
        className="mt-8 mb-10"
        style={{ paddingLeft: 10 }}
      >
        <h2 className="font-display font-black t-text text-3xl mb-1.5" style={{ letterSpacing: "-1px" }}>
          이메일 로그인
        </h2>
        <p className="t-text-muted text-sm">이메일과 비밀번호를 입력해주세요.</p>
      </motion.div>

      {/* 폼 */}
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.09 }}
        onSubmit={handleLogin}
        className="flex flex-col gap-3.5"
        style={{ paddingLeft: 10 }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold t-text-muted">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hello@stickki.com"
            className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none t-text"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border-color)" }}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold t-text-muted">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none t-text"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border-color)" }}
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
          className="w-full py-4 rounded-2xl font-bold text-sm text-white disabled:opacity-30 mt-1"
          style={{ backgroundColor: "#000" }}
        >
          {loading ? "로그인 중..." : "로그인하기"}
        </motion.button>
      </motion.form>

      <div className="flex-1" />

      <p className="text-center t-text-muted text-sm pb-12">
        아직 계정이 없나요?{" "}
        <Link href="/signup" className="t-text font-semibold underline underline-offset-2">
          회원가입
        </Link>
      </p>
    </main>
  );
}
