"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");

    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message ?? "회원가입에 실패했어요. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    router.push("/");
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
          style={{ backgroundColor: "#FFECB3", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
        />
        <motion.div
          initial={{ opacity: 0, rotate: 12 }}
          animate={{ opacity: 1, rotate: 12 }}
          transition={{ delay: 0.18, type: "spring", stiffness: 200, damping: 24 }}
          className="absolute top-24 -right-6 w-24 h-24 rounded-xl"
          style={{ backgroundColor: "#E1BEE7", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
        />
        <motion.div
          initial={{ opacity: 0, rotate: 6 }}
          animate={{ opacity: 1, rotate: 6 }}
          transition={{ delay: 0.24, type: "spring", stiffness: 200, damping: 24 }}
          className="absolute bottom-24 -left-3 w-20 h-20 rounded-xl"
          style={{ backgroundColor: "#FFCCBC", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="w-full max-w-sm relative"
      >
        <div className="text-center mb-8">
          <h1 className="font-display font-bold t-text text-4xl tracking-tight mb-2">Stickki</h1>
          <p className="font-motto t-text-muted text-base">우리 사이, 더 끈끈하게.</p>
        </div>

        <div
          className="t-elevated rounded-3xl px-6 py-8"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}
        >
          <h2 className="font-display font-bold t-text text-xl mb-6">회원가입</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="t-text-muted text-xs font-medium">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@stickki.com"
                className="w-full t-card rounded-2xl px-4 py-3.5 t-text text-sm outline-none"
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
                placeholder="6자 이상"
                minLength={6}
                className="w-full t-card rounded-2xl px-4 py-3.5 t-text text-sm outline-none"
                style={{ border: "1px solid var(--border-color)" }}
                required
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-center"
                  style={{ color: "#E53935" }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full py-4 rounded-2xl t-btn-primary font-semibold text-sm disabled:opacity-30 mt-2"
            >
              {loading ? "가입 중..." : "시작하기 ✦"}
            </motion.button>
          </form>
        </div>

        <p className="text-center t-text-muted text-sm mt-6">
          이미 계정이 있나요?{" "}
          <Link href="/login" className="t-text font-semibold underline underline-offset-2">
            로그인
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
