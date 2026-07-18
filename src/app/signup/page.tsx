"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { StickkiWordmarkWithTape } from "@/components/ui/StickkiLogos";

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
    <main className="min-h-screen dot-pattern flex flex-col items-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="w-full max-w-sm"
        style={{ paddingTop: "calc(10vh - 20px)" }}
      >
        <div className="flex justify-center mb-10">
          <StickkiWordmarkWithTape style={{ width: 140, height: 47, color: "#1a1a1a" }} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none placeholder:text-[#CECECE]"
            style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#1a1a1a" }}
            required
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)"
            minLength={6}
            className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none placeholder:text-[#CECECE]"
            style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#1a1a1a" }}
            required
          />

          {/* 동의 조항 */}
          <div className="flex flex-col gap-3 rounded-2xl px-4 py-4 mt-1" style={{ border: "1px solid rgba(0,0,0,0.1)" }}>
            <button type="button" onClick={() => handleAgreeAll(!agreeAll)} className="flex items-center gap-3">
              <CheckCircle checked={agreeAll} />
              <span className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>전체 동의</span>
            </button>

            <div className="h-px" style={{ backgroundColor: "rgba(0,0,0,0.1)" }} />

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => handleIndividual("terms", !agreeTerms)} className="flex items-center gap-3">
                <CheckCircle checked={agreeTerms} small />
                <span className="text-xs" style={{ color: "#6b6b6b" }}>서비스 이용약관 동의 <span style={{ color: "#E53935" }}>(필수)</span></span>
              </button>
              <span className="text-xs underline underline-offset-2 cursor-pointer" style={{ color: "#CECECE" }}>보기</span>
            </div>

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => handleIndividual("privacy", !agreePrivacy)} className="flex items-center gap-3">
                <CheckCircle checked={agreePrivacy} small />
                <span className="text-xs" style={{ color: "#6b6b6b" }}>개인정보 처리방침 동의 <span style={{ color: "#E53935" }}>(필수)</span></span>
              </button>
              <span className="text-xs underline underline-offset-2 cursor-pointer" style={{ color: "#CECECE" }}>보기</span>
            </div>

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => handleIndividual("marketing", !agreeMarketing)} className="flex items-center gap-3">
                <CheckCircle checked={agreeMarketing} small />
                <span className="text-xs" style={{ color: "#6b6b6b" }}>마케팅 정보 수신 동의 <span style={{ color: "#CECECE" }}>(선택)</span></span>
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
            className="w-full py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-30 mt-1"
            style={{ backgroundColor: "#27272A", color: "#F4F4F5" }}
          >
            {loading ? "가입 중..." : "시작하기"}
          </motion.button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "#6b6b6b" }}>
          이미 계정이 있나요?{" "}
          <Link href="/login" className="font-semibold underline underline-offset-2" style={{ color: "#1a1a1a" }}>
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
