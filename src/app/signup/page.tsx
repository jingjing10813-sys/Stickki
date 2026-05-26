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

  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  function handleAgreeAll(checked: boolean) {
    setAgreeAll(checked);
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
    setAgreeMarketing(checked);
  }

  function handleIndividual(key: "terms" | "privacy" | "marketing", checked: boolean) {
    if (key === "terms") setAgreeTerms(checked);
    if (key === "privacy") setAgreePrivacy(checked);
    if (key === "marketing") setAgreeMarketing(checked);
    const next = {
      terms: key === "terms" ? checked : agreeTerms,
      privacy: key === "privacy" ? checked : agreePrivacy,
      marketing: key === "marketing" ? checked : agreeMarketing,
    };
    setAgreeAll(next.terms && next.privacy && next.marketing);
  }

  const requiredAgreed = agreeTerms && agreePrivacy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password || !requiredAgreed) return;
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

            {/* 동의 조항 */}
            <div
              className="flex flex-col gap-3 rounded-2xl px-4 py-4 mt-1"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border-color)" }}
            >
              {/* 전체 동의 */}
              <button
                type="button"
                onClick={() => handleAgreeAll(!agreeAll)}
                className="flex items-center gap-3"
              >
                <CheckCircle checked={agreeAll} />
                <span className="t-text text-sm font-semibold">전체 동의</span>
              </button>

              <div className="h-px" style={{ backgroundColor: "var(--border-color)" }} />

              {/* 이용약관 (필수) */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleIndividual("terms", !agreeTerms)}
                  className="flex items-center gap-3"
                >
                  <CheckCircle checked={agreeTerms} small />
                  <span className="t-text-muted text-xs">서비스 이용약관 동의 <span style={{ color: "#E53935" }}>(필수)</span></span>
                </button>
                <span className="t-text-faint text-xs underline underline-offset-2 cursor-pointer">보기</span>
              </div>

              {/* 개인정보 처리방침 (필수) */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleIndividual("privacy", !agreePrivacy)}
                  className="flex items-center gap-3"
                >
                  <CheckCircle checked={agreePrivacy} small />
                  <span className="t-text-muted text-xs">개인정보 처리방침 동의 <span style={{ color: "#E53935" }}>(필수)</span></span>
                </button>
                <span className="t-text-faint text-xs underline underline-offset-2 cursor-pointer">보기</span>
              </div>

              {/* 마케팅 수신 (선택) */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleIndividual("marketing", !agreeMarketing)}
                  className="flex items-center gap-3"
                >
                  <CheckCircle checked={agreeMarketing} small />
                  <span className="t-text-muted text-xs">마케팅 정보 수신 동의 <span className="t-text-faint">(선택)</span></span>
                </button>
              </div>
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
              disabled={loading || !email.trim() || !password || !requiredAgreed}
              className="w-full py-4 rounded-2xl t-btn-primary font-semibold text-sm disabled:opacity-30 mt-1"
            >
              {loading ? "가입 중..." : "시작하기"}
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

function CheckCircle({ checked, small }: { checked: boolean; small?: boolean }) {
  const size = small ? 18 : 22;
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full transition-all"
      style={{
        width: size,
        height: size,
        backgroundColor: checked ? "#000" : "transparent",
        border: checked ? "2px solid #000" : "2px solid var(--border-color)",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      {checked && (
        <svg width={small ? 9 : 11} height={small ? 7 : 8} viewBox="0 0 11 8" fill="none">
          <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}
