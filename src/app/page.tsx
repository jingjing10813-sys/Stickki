"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

type Step = "landing" | "create-name" | "create-motto" | "join";

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function OnboardingPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("landing");
  const [roomName, setRoomName] = useState("");
  const [motto, setMotto] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinError, setJoinError] = useState(false);

  async function handleCreate() {
    if (!roomName.trim() || !motto.trim()) return;
    setLoading(true);
    let code = generateInviteCode();
    const { data, error } = await supabase
      .from("groups")
      .insert({ name: roomName.trim(), motto: motto.trim(), invite_code: code, members: [] })
      .select()
      .single();
    if (error) {
      code = generateInviteCode();
      const retry = await supabase
        .from("groups")
        .insert({ name: roomName.trim(), motto: motto.trim(), invite_code: code, members: [] })
        .select()
        .single();
      if (retry.error) { setLoading(false); return; }
      router.push(`/${retry.data.id}`);
      return;
    }
    router.push(`/${data.id}`);
  }

  async function handleJoin() {
    if (!inviteInput.trim()) return;
    setLoading(true);
    setJoinError(false);
    const { data } = await supabase
      .from("groups")
      .select("id")
      .eq("invite_code", inviteInput.trim().toUpperCase())
      .single();
    setLoading(false);
    if (!data) { setJoinError(true); return; }
    router.push(`/${data.id}`);
  }

  if (authLoading) {
    return (
      <main className="min-h-screen dot-pattern flex items-center justify-center">
        <span className="t-text-faint text-sm">불러오는 중...</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen t-bg flex flex-col items-center justify-center p-6">
      <AnimatePresence mode="wait">

        {/* ── LANDING ── */}
        {step === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-sm flex flex-col items-center gap-6"
          >
            <motion.div
              initial={{ rotate: -3 }}
              animate={{ rotate: -2 }}
              className="w-full t-elevated rounded-2xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.1)]"
              style={{ aspectRatio: "4/3" }}
            >
              <p className="font-motto text-5xl t-text mb-2" style={{ opacity: 0.8 }}>Stickki</p>
              <p className="font-motto text-lg t-text-muted">우리 사이,<br/>더 끈끈하게.</p>
            </motion.div>

            <div className="w-full flex flex-col gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep("create-name")}
                className="w-full t-btn-primary font-semibold py-4 rounded-full text-base"
              >
                새 집 만들기
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep("join")}
                className="w-full t-btn-secondary font-semibold py-4 rounded-full text-base"
              >
                초대코드로 입장
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── CREATE: 집 이름 ── */}
        {step === "create-name" && (
          <motion.div
            key="create-name"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-sm flex flex-col items-center gap-8"
          >
            <ProgressDots total={2} current={0} />
            <motion.div
              animate={{ rotate: -1.5 }}
              className="w-full t-elevated rounded-2xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
              style={{ aspectRatio: "4/3" }}
            >
              <div className="h-full flex flex-col justify-between">
                <div>
                  <p className="font-motto text-2xl t-text-muted mb-6">우리 집 이름은...</p>
                  <input
                    autoFocus
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && roomName.trim() && setStep("create-motto")}
                    placeholder="예: 스티키하우스"
                    className="font-motto text-3xl t-text w-full outline-none t-text-faint bg-transparent"
                  />
                </div>
                <div className="space-y-3">
                  <div className="w-full h-px t-border" style={{ backgroundColor: "var(--border-color)" }} />
                  <div className="w-3/4 h-px" style={{ backgroundColor: "var(--border-color)" }} />
                </div>
              </div>
            </motion.div>
            <div className="w-full flex gap-2">
              <button
                onClick={() => setStep("landing")}
                className="w-12 h-14 flex items-center justify-center rounded-full t-btn-secondary"
              >
                ←
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => roomName.trim() && setStep("create-motto")}
                disabled={!roomName.trim()}
                className="flex-1 t-btn-primary font-semibold py-4 rounded-full disabled:opacity-30"
              >
                Continue
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── CREATE: 가훈 ── */}
        {step === "create-motto" && (
          <motion.div
            key="create-motto"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-sm flex flex-col items-center gap-8"
          >
            <ProgressDots total={2} current={1} />
            <motion.div
              animate={{ rotate: -1 }}
              className="w-full t-elevated rounded-2xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
              style={{ aspectRatio: "4/3" }}
            >
              <div className="h-full flex flex-col justify-between">
                <div>
                  <p className="font-motto text-2xl t-text-muted mb-6">우리 집 가훈은...</p>
                  <textarea
                    autoFocus
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder={"예: 뭉치면 끈끈해지고\n흩어지면 다시 붙는다 !"}
                    rows={2}
                    className="font-motto text-3xl t-text w-full outline-none t-text-faint bg-transparent resize-none overflow-hidden"
                  />
                </div>
                <div className="space-y-3">
                  <div className="w-full h-px" style={{ backgroundColor: "var(--border-color)" }} />
                  <div className="w-2/3 h-px" style={{ backgroundColor: "var(--border-color)" }} />
                </div>
              </div>
            </motion.div>
            <div className="w-full flex gap-2">
              <button
                onClick={() => setStep("create-name")}
                className="w-12 h-14 flex items-center justify-center rounded-full t-btn-secondary"
              >
                ←
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                disabled={!motto.trim() || loading}
                className="flex-1 t-btn-primary font-semibold py-4 rounded-full disabled:opacity-30"
              >
                {loading ? "만드는 중..." : "시작하기 →"}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── JOIN ── */}
        {step === "join" && (
          <motion.div
            key="join"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-sm flex flex-col items-center gap-8"
          >
            <motion.div
              animate={{ rotate: 1.5 }}
              className="w-full t-elevated rounded-2xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
              style={{ aspectRatio: "4/3" }}
            >
              <div className="h-full flex flex-col justify-between">
                <div>
                  <p className="font-motto text-2xl t-text-muted mb-6">초대코드를 입력해요</p>
                  <input
                    autoFocus
                    value={inviteInput}
                    onChange={(e) => { setInviteInput(e.target.value.toUpperCase()); setJoinError(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="예: A1B2C3"
                    maxLength={6}
                    className="font-display font-bold text-4xl t-text w-full outline-none bg-transparent tracking-widest"
                  />
                  {joinError && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-sans text-sm text-red-400 mt-3"
                    >
                      코드를 찾을 수 없어요. 다시 확인해주세요.
                    </motion.p>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="w-full h-px" style={{ backgroundColor: "var(--border-color)" }} />
                  <div className="w-1/2 h-px" style={{ backgroundColor: "var(--border-color)" }} />
                </div>
              </div>
            </motion.div>
            <div className="w-full flex gap-2">
              <button
                onClick={() => setStep("landing")}
                className="w-12 h-14 flex items-center justify-center rounded-full t-btn-secondary"
              >
                ←
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleJoin}
                disabled={inviteInput.length < 6 || loading}
                className="flex-1 t-btn-primary font-semibold py-4 rounded-full disabled:opacity-30"
              >
                {loading ? "찾는 중..." : "입장하기 →"}
              </motion.button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </main>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 rounded-full transition-all"
          style={{
            width: i === current ? 24 : 8,
            backgroundColor: i <= current ? "var(--btn-primary-bg)" : "var(--border-color)",
          }}
        />
      ))}
    </div>
  );
}
