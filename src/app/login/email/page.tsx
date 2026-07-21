"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { StickkiWordmarkWithTape, BackButtonIcon } from "@/components/ui/StickkiLogos";

function PasswordEyeToggle({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute flex items-center justify-center"
      style={{ right: 14, top: "50%", transform: "translateY(-50%)" }}
    >
      {visible ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z" stroke="#A3A3A3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="3" stroke="#A3A3A3" strokeWidth="1.6"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 3L21 21" stroke="#A3A3A3" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M10.6 5.1C11 5.05 11.5 5 12 5C18.5 5 22 12 22 12C22 12 21.1 13.7 19.3 15.4M6.5 6.6C3.7 8.5 2 12 2 12C2 12 5.5 19 12 19C13.9 19 15.5 18.4 16.8 17.6" stroke="#A3A3A3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9.9 10C9.6 10.4 9.4 10.9 9.4 11.5C9.4 13 10.5 14.1 12 14.1C12.6 14.1 13.1 13.9 13.5 13.6" stroke="#A3A3A3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

export default function EmailLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    setNeedsConfirmation(false);
    setResendMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message?.toLowerCase().includes("email not confirmed")) {
        setNeedsConfirmation(true);
        setError("이메일 인증이 아직 완료되지 않았어요.");
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않아요.");
      }
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  async function handleResend() {
    setResending(true);
    setResendMessage("");
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    setResendMessage(resendError ? "재전송에 실패했어요. 잠시 후 다시 시도해주세요." : "인증 메일을 다시 보냈어요.");
  }

  async function handleKakaoLogin() {
    await supabase.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo: window.location.origin + "/" } });
  }
  async function handleNaverLogin() {
    await supabase.auth.signInWithOAuth({ provider: "naver" as never, options: { redirectTo: window.location.origin + "/" } });
  }
  async function handleAppleLogin() {
    await supabase.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: window.location.origin + "/" } });
  }
  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/" } });
  }

  return (
    <main className="min-h-screen dot-pattern flex flex-col px-6 relative overflow-hidden">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="absolute flex items-center justify-center"
        style={{ top: 53, left: 22 }}
      >
        <BackButtonIcon className="glass rounded-full" />
      </button>

      {/* 로고 영역 */}
      <div style={{ paddingTop: "calc(15vh - 20px)", display: "flex", justifyContent: "center" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
        >
          <StickkiWordmarkWithTape style={{ width: 140, height: 47, color: "#1a1a1a" }} />
        </motion.div>
      </div>

      {/* 폼 */}
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.05 }}
        onSubmit={handleLogin}
        className="flex flex-col gap-3"
        style={{ marginTop: 64 }}
      >
        <p className="font-sans font-semibold" style={{ fontSize: 16, color: "#1a1a1a" }}>이메일 로그인</p>

        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="이메일 입력"
          className="w-full px-4 text-sm outline-none placeholder:text-[#CECECE] mt-1"
          style={{
            height: 48,
            borderRadius: 16,
            border: `1px solid ${error ? "#E53935" : "rgba(0,0,0,0.1)"}`,
            color: "#1a1a1a",
          }}
          required
        />

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="비밀번호 입력"
            className="w-full pl-4 pr-11 text-sm outline-none placeholder:text-[#CECECE]"
            style={{
              height: 48,
              borderRadius: 16,
              border: `1px solid ${error ? "#E53935" : "rgba(0,0,0,0.1)"}`,
              color: "#1a1a1a",
            }}
            required
          />
          <PasswordEyeToggle visible={showPassword} onClick={() => setShowPassword((v) => !v)} />
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-left"
            style={{ color: "#E53935" }}
          >
            {error}
          </motion.p>
        )}

        {needsConfirmation && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-xs font-semibold underline underline-offset-2 disabled:opacity-40"
              style={{ color: "#1a1a1a" }}
            >
              {resending ? "재전송 중..." : "인증 메일 다시 받기"}
            </button>
            {resendMessage && (
              <span className="text-xs" style={{ color: "#6b6b6b" }}>{resendMessage}</span>
            )}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={loading || !email.trim() || !password}
          className="w-full font-semibold text-sm rounded-2xl disabled:opacity-30 flex items-center justify-center mt-1"
          style={{ height: 48, backgroundColor: "#27272A", color: "#F4F4F5" }}
        >
          {loading ? "로그인 중..." : "로그인"}
        </motion.button>

        <p className="text-center text-sm mt-1" style={{ color: "#6b6b6b" }}>
          아직 계정이 없나요?{" "}
          <Link href="/signup" className="font-semibold underline underline-offset-2" style={{ color: "#1a1a1a" }}>
            회원가입
          </Link>
        </p>
      </motion.form>

      <div className="flex-1" />

      {/* SNS 로그인 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.1 }}
        className="flex flex-col items-center gap-4"
        style={{ paddingBottom: 130 }}
      >
        <p className="text-xs" style={{ color: "#CECECE" }}>SNS 계정으로 로그인</p>
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleKakaoLogin}
            className="rounded-full flex items-center justify-center"
            style={{ width: 50, height: 50, backgroundColor: "#FEE500" }}
          >
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
              <path d="M9 2.5C4.85 2.5 1.5 5.15 1.5 8.42C1.5 10.53 2.9 12.38 5 13.44C4.85 14.02 4.42 15.6 4.33 15.97C4.22 16.42 4.5 16.42 4.68 16.3C4.83 16.2 6.9 14.8 7.8 14.2C8.19 14.26 8.59 14.29 9 14.29C13.15 14.29 16.5 11.64 16.5 8.42C16.5 5.15 13.15 2.5 9 2.5Z" fill="rgba(0,0,0,0.85)"/>
            </svg>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleNaverLogin}
            className="rounded-full flex items-center justify-center"
            style={{ width: 50, height: 50, backgroundColor: "#03C75A" }}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M10.8491 8.56267L4.91687 0H0V16H5.15088V7.436L11.0831 16H16V0H10.8491V8.56267Z" fill="white"/>
            </svg>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleAppleLogin}
            className="rounded-full flex items-center justify-center"
            style={{ width: 50, height: 50, backgroundColor: "#000" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21.2806 18.424C20.9328 19.2275 20.5211 19.9672 20.0441 20.6473C19.3938 21.5743 18.8614 22.216 18.4511 22.5724C17.8151 23.1573 17.1336 23.4569 16.4039 23.4739C15.88 23.4739 15.2483 23.3248 14.5129 23.0224C13.775 22.7214 13.097 22.5724 12.477 22.5724C11.8268 22.5724 11.1294 22.7214 10.3835 23.0224C9.63644 23.3248 9.03463 23.4824 8.5745 23.498C7.87472 23.5278 7.17722 23.2198 6.48099 22.5724C6.03662 22.1848 5.48081 21.5204 4.81496 20.5791C4.10057 19.574 3.51323 18.4084 3.0531 17.0795C2.56032 15.6442 2.31329 14.2543 2.31329 12.9087C2.31329 11.3673 2.64636 10.0379 3.31348 8.92386C3.83778 8.02902 4.53528 7.32314 5.40826 6.80495C6.28124 6.28675 7.2245 6.02269 8.2403 6.00579C8.79611 6.00579 9.52499 6.17772 10.4308 6.51561C11.334 6.85464 11.9139 7.02656 12.1682 7.02656C12.3583 7.02656 13.0026 6.82553 14.0948 6.42475C15.1276 6.05307 15.9993 5.89917 16.7134 5.95979C18.6485 6.11596 20.1023 6.87877 21.0691 8.25305C19.3385 9.30165 18.4824 10.7703 18.4994 12.6544C18.515 14.122 19.0474 15.3432 20.0937 16.3129C20.5679 16.7629 21.0975 17.1108 21.6867 17.3578C21.5589 17.7283 21.424 18.0833 21.2806 18.424V18.424ZM16.8426 0.960146C16.8426 2.11041 16.4224 3.1844 15.5847 4.17848C14.5739 5.36025 13.3513 6.04313 12.0254 5.93537C12.0085 5.79738 11.9987 5.65214 11.9987 5.49952C11.9987 4.39527 12.4794 3.21351 13.3331 2.24725C13.7593 1.75802 14.3013 1.35123 14.9586 1.02673C15.6146 0.707068 16.235 0.530288 16.8185 0.500015C16.8355 0.653787 16.8426 0.807569 16.8426 0.960131V0.960146Z" fill="white"/>
            </svg>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleGoogleLogin}
            className="rounded-full flex items-center justify-center"
            style={{ width: 50, height: 50, backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.1)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M23.04 12.2614C23.04 11.4459 22.9668 10.6618 22.8309 9.90909H12V14.3575H18.1891C17.9225 15.795 17.1123 17.013 15.8943 17.8284V20.7139H19.6109C21.7855 18.7118 23.04 15.7636 23.04 12.2614Z" fill="#4285F4"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M12 23.4998C15.105 23.4998 17.7081 22.4701 19.6109 20.7137L15.8943 17.8282C14.8645 18.5182 13.5472 18.926 12 18.926C9.00474 18.926 6.46951 16.903 5.56519 14.1848H1.72314V17.1644C3.61542 20.9228 7.50451 23.4998 12 23.4998Z" fill="#34A853"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M5.56523 14.1851C5.33523 13.4951 5.20455 12.758 5.20455 12.0001C5.20455 11.2421 5.33523 10.5051 5.56523 9.81506V6.83551H1.72318C0.944318 8.38801 0.5 10.1444 0.5 12.0001C0.5 13.8557 0.944318 15.6121 1.72318 17.1646L5.56523 14.1851Z" fill="#FBBC05"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M12 5.07386C13.6884 5.07386 15.2043 5.65409 16.3961 6.79364L19.6945 3.49523C17.7029 1.63955 15.0997 0.5 12 0.5C7.50451 0.5 3.61542 3.07705 1.72314 6.83545L5.56519 9.815C6.46951 7.09682 9.00474 5.07386 12 5.07386Z" fill="#EA4335"/>
            </svg>
          </motion.button>
        </div>
      </motion.div>
    </main>
  );
}
