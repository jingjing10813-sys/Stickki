"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { StickkiWordmarkWithTape, BackButtonIcon } from "@/components/ui/StickkiLogos";

const EMAIL_DOMAINS = ["gmail.com", "naver.com", "daum.net", "kakao.com", "nate.com", "직접입력"];

const TERMS_TEXT = `제1조 (목적)
이 약관은 스티끼(Stickki, 이하 "서비스")를 이용함에 있어 서비스와 이용자의 권리, 의무 및 책임사항을 정하는 것을 목적으로 합니다.

제2조 (서비스의 제공)
서비스는 함께 생활하는 사람들이 할 일과 메모를 공유할 수 있는 그룹 스티커 메모 기능을 제공합니다. 이용자는 그룹을 생성하거나 초대코드를 통해 기존 그룹에 참여할 수 있습니다.

제3조 (이용자의 의무)
이용자는 타인의 권리를 침해하거나 서비스 운영을 방해하는 게시물을 작성해서는 안 되며, 자신의 계정 정보를 안전하게 관리할 책임이 있습니다.

제4조 (게시물의 관리)
그룹 내에서 작성된 메모와 할 일은 해당 그룹 구성원 모두에게 공유됩니다. 이용자는 게시물 작성 시 이 점을 유의해야 합니다.

제5조 (서비스 변경 및 중단)
서비스는 운영상, 기술상의 필요에 따라 제공하는 서비스의 전부 또는 일부를 변경하거나 중단할 수 있으며, 이 경우 사전에 공지합니다.

제6조 (책임의 제한)
서비스는 이용자가 게시한 정보의 신뢰성, 정확성에 대해 책임을 지지 않습니다.`;

const PRIVACY_TEXT = `1. 수집하는 개인정보 항목
서비스는 회원가입 및 서비스 제공을 위해 이메일 주소, 비밀번호(암호화 저장), 프로필 이름 및 이미지를 수집합니다.

2. 개인정보의 수집 및 이용 목적
- 회원 가입 의사 확인 및 본인 식별
- 그룹 및 메모 기능 등 서비스 제공
- 서비스 부정 이용 방지 및 고객 문의 대응

3. 개인정보의 보유 및 이용 기간
이용자가 회원 탈퇴를 요청하는 경우 지체 없이 파기합니다. 다만 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.

4. 개인정보의 제3자 제공
서비스는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다. 다만 법령에 근거가 있거나 이용자가 속한 그룹 구성원에게 프로필 정보가 공유되는 경우는 예외로 합니다.

5. 이용자의 권리
이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있으며 회원 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다.`;

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

function AgreementCheck({ checked, small }: { checked: boolean; small?: boolean }) {
  const size = small ? 18 : 20;
  return (
    <div
      className="flex-shrink-0 rounded-md flex items-center justify-center"
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${checked ? "#27272A" : "#E5E5E5"}`,
        backgroundColor: checked ? "#27272A" : "transparent",
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

function PolicyModal({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative w-full rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "#fff", maxWidth: 340, maxHeight: "70vh" }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          <span className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{title}</span>
          <button onClick={onClose} className="flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L14 14M14 2L2 14" stroke="#A3A3A3" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">
          <p className="text-xs whitespace-pre-line leading-relaxed" style={{ color: "#6b6b6b" }}>{text}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [emailLocal, setEmailLocal] = useState("");
  const [domain, setDomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [openPolicy, setOpenPolicy] = useState<"terms" | "privacy" | null>(null);
  const [showAgreementSheet, setShowAgreementSheet] = useState(false);

  const agreeAll = agreeTerms && agreePrivacy && agreeMarketing;

  function handleAgreeAll(checked: boolean) {
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
    setAgreeMarketing(checked);
  }

  const isCustomDomain = domain === "직접입력";
  const emailFormatValid = !!emailLocal && !!(isCustomDomain ? customDomain : domain);
  const email = emailFormatValid ? `${emailLocal}@${isCustomDomain ? customDomain : domain}` : "";
  const passwordValid = password.length >= 6 && password.length <= 20;
  const passwordsMatch = password && password === passwordConfirm;
  const requiredAgreed = agreeTerms && agreePrivacy;
  const fieldsValid = !!email && emailVerified && passwordValid && passwordsMatch;

  async function handleSendOtp() {
    if (!emailFormatValid) return;
    setSendingOtp(true);
    setOtpError("");
    setOtpMessage("");
    const { error: otpSendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setSendingOtp(false);
    if (otpSendError) {
      setOtpError(otpSendError.message ?? "인증번호 전송에 실패했어요.");
      return;
    }
    setOtpSent(true);
    setOtpMessage("인증번호를 보냈어요.");
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim()) return;
    setVerifyingOtp(true);
    setOtpError("");
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otpCode.trim(),
      type: "email",
    });
    setVerifyingOtp(false);
    if (verifyError) {
      setOtpError("인증번호가 올바르지 않아요.");
      return;
    }
    setEmailVerified(true);
    setOtpMessage("");
  }

  async function handleSignUp() {
    if (!fieldsValid || !requiredAgreed) return;
    setLoading(true);
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message ?? "회원가입에 실패했어요. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    router.push("/");
  }

  function handleStartClick() {
    if (!fieldsValid) return;
    setShowAgreementSheet(true);
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

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.05 }}
        className="flex flex-col gap-3"
        style={{ marginTop: 64 }}
      >
        <p className="font-sans font-semibold" style={{ fontSize: 18, color: "#1a1a1a" }}>회원가입</p>

        <div className="flex items-center gap-2 mt-1">
          <input
            type="text"
            value={emailLocal}
            onChange={(e) => setEmailLocal(e.target.value)}
            placeholder="이메일 입력"
            disabled={otpSent}
            className="flex-1 min-w-0 rounded-2xl px-4 py-3.5 text-sm outline-none placeholder:text-[#CECECE] disabled:opacity-50"
            style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#1a1a1a" }}
            required
          />
          <span className="text-sm flex-shrink-0" style={{ color: "#CECECE" }}>@</span>
          {isCustomDomain ? (
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="도메인 입력"
              autoFocus
              disabled={otpSent}
              className="flex-1 min-w-0 rounded-2xl px-4 py-3.5 text-sm outline-none placeholder:text-[#CECECE] disabled:opacity-50"
              style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#1a1a1a" }}
            />
          ) : (
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={otpSent}
              className="flex-1 min-w-0 rounded-2xl px-4 py-3.5 text-sm outline-none appearance-none disabled:opacity-50"
              style={{ border: "1px solid rgba(0,0,0,0.1)", color: domain ? "#1a1a1a" : "#CECECE" }}
            >
              <option value="" disabled>선택</option>
              {EMAIL_DOMAINS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>

        {/* 이메일 인증 영역 */}
        {emailVerified ? (
          <div className="flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="8" fill="#22C55E"/>
              <path d="M4.5 8.2L6.8 10.5L11.5 5.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xs font-semibold" style={{ color: "#22C55E" }}>이메일 인증 완료</span>
          </div>
        ) : !otpSent ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleSendOtp}
            disabled={!emailFormatValid || sendingOtp}
            className="font-semibold text-sm rounded-2xl disabled:opacity-30"
            style={{ height: 44, backgroundColor: "#F4F4F5", color: "#1a1a1a" }}
          >
            {sendingOtp ? "전송 중..." : "인증받기"}
          </motion.button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="인증번호 입력"
                className="flex-1 min-w-0 rounded-2xl px-4 py-3.5 text-sm outline-none placeholder:text-[#CECECE]"
                style={{ border: `1px solid ${otpError ? "#E53935" : "rgba(0,0,0,0.1)"}`, color: "#1a1a1a" }}
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={handleVerifyOtp}
                disabled={!otpCode.trim() || verifyingOtp}
                className="flex-shrink-0 font-semibold text-sm rounded-2xl disabled:opacity-30 px-4"
                style={{ height: 48, backgroundColor: "#27272A", color: "#F4F4F5" }}
              >
                {verifyingOtp ? "확인 중..." : "인증받기"}
              </motion.button>
            </div>
            <div className="flex items-center gap-2">
              {otpError && <span className="text-xs" style={{ color: "#E53935" }}>{otpError}</span>}
              {otpMessage && !otpError && <span className="text-xs" style={{ color: "#6b6b6b" }}>{otpMessage}</span>}
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp}
                className="text-xs underline underline-offset-2 disabled:opacity-40"
                style={{ color: "#CECECE" }}
              >
                {sendingOtp ? "재전송 중..." : "인증번호 재전송"}
              </button>
            </div>
          </div>
        )}

        <div className="relative mt-1">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            className="w-full rounded-2xl pl-4 pr-11 py-3.5 text-sm outline-none placeholder:text-[#CECECE]"
            style={{ border: `1px solid ${password && !passwordValid ? "#E53935" : "rgba(0,0,0,0.1)"}`, color: "#1a1a1a" }}
            required
          />
          <PasswordEyeToggle visible={showPassword} onClick={() => setShowPassword((v) => !v)} />
        </div>
        {password && !passwordValid && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-left"
            style={{ color: "#E53935" }}
          >
            비밀번호는 6자 이상 20자 이내로 입력해주세요
          </motion.p>
        )}

        <div className="relative">
          <input
            type={showPasswordConfirm ? "text" : "password"}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="비밀번호 확인"
            className="w-full rounded-2xl pl-4 pr-11 py-3.5 text-sm outline-none placeholder:text-[#CECECE]"
            style={{ border: `1px solid ${passwordConfirm && !passwordsMatch ? "#E53935" : "rgba(0,0,0,0.1)"}`, color: "#1a1a1a" }}
            required
          />
          <PasswordEyeToggle visible={showPasswordConfirm} onClick={() => setShowPasswordConfirm((v) => !v)} />
        </div>
        {passwordConfirm && !passwordsMatch && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-left"
            style={{ color: "#E53935" }}
          >
            비밀번호가 일치하지 않아요
          </motion.p>
        )}

        <p className="text-xs leading-snug" style={{ color: "#CECECE" }}>
          비밀번호는 영문 대소문자, 숫자, 특수문자(.!@#$%)를 혼합하여 20자 이내로 입력해주세요
        </p>

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
      </motion.div>

      <div className="flex-1" />

      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.1 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleStartClick}
        disabled={loading || !fieldsValid}
        className="w-full py-4 rounded-2xl font-semibold text-sm disabled:opacity-30"
        style={{ backgroundColor: "#27272A", color: "#F4F4F5", marginBottom: 58 }}
      >
        {loading ? "가입 중..." : "스티끼 시작하기"}
      </motion.button>

      {/* 약관 동의 바텀시트 */}
      <AnimatePresence>
        {showAgreementSheet && (
          <>
            <motion.div
              key="agreement-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowAgreementSheet(false)}
            />
            <motion.div
              key="agreement-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 right-0 bottom-0 z-50 rounded-t-3xl px-6"
              style={{ backgroundColor: "#fff", paddingTop: 10, paddingBottom: 40 }}
            >
              <div className="mx-auto mb-5" style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E5E5" }} />

              <p className="font-semibold text-base mb-4" style={{ color: "#1a1a1a" }}>스티끼와 함께하려면 동의가 필요해요</p>

              <div className="flex flex-col gap-4">
                <button type="button" onClick={() => handleAgreeAll(!agreeAll)} className="flex items-center gap-2">
                  <AgreementCheck checked={agreeAll} />
                  <span className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>전체동의</span>
                </button>

                <div className="h-px" style={{ backgroundColor: "rgba(0,0,0,0.08)" }} />

                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setAgreeTerms((v) => !v)} className="flex items-center gap-2">
                    <AgreementCheck checked={agreeTerms} small />
                    <span className="text-xs" style={{ color: "#6b6b6b" }}>서비스 이용약관 동의 <span style={{ color: "#E53935" }}>(필수)</span></span>
                  </button>
                  <button type="button" onClick={() => setOpenPolicy("terms")} className="text-xs underline underline-offset-2" style={{ color: "#CECECE" }}>
                    보기
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setAgreePrivacy((v) => !v)} className="flex items-center gap-2">
                    <AgreementCheck checked={agreePrivacy} small />
                    <span className="text-xs" style={{ color: "#6b6b6b" }}>개인정보 처리방침 동의 <span style={{ color: "#E53935" }}>(필수)</span></span>
                  </button>
                  <button type="button" onClick={() => setOpenPolicy("privacy")} className="text-xs underline underline-offset-2" style={{ color: "#CECECE" }}>
                    보기
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setAgreeMarketing((v) => !v)} className="flex items-center gap-2">
                    <AgreementCheck checked={agreeMarketing} small />
                    <span className="text-xs" style={{ color: "#6b6b6b" }}>마케팅 정보 수신 동의 <span style={{ color: "#CECECE" }}>(선택)</span></span>
                  </button>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSignUp}
                disabled={loading || !requiredAgreed}
                className="w-full py-4 rounded-2xl font-semibold text-sm disabled:opacity-30 mt-6"
                style={{ backgroundColor: "#27272A", color: "#F4F4F5" }}
              >
                {loading ? "가입 중..." : "동의하고 시작하기"}
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openPolicy === "terms" && (
          <PolicyModal title="서비스 이용약관" text={TERMS_TEXT} onClose={() => setOpenPolicy(null)} />
        )}
        {openPolicy === "privacy" && (
          <PolicyModal title="개인정보 처리방침" text={PRIVACY_TEXT} onClose={() => setOpenPolicy(null)} />
        )}
      </AnimatePresence>
    </main>
  );
}
