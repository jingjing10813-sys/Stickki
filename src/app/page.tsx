"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { StickkiLogo } from "@/components/ui/StickkiLogos";

type Step = "landing" | "create-name" | "create-motto" | "join" | "profile-setup";
const STEPS: Step[] = ["landing", "create-name", "create-motto", "join", "profile-setup"];
const PROFILE_COLORS = ["#FF6B6B", "#FF9F43", "#FECA57", "#48DBFB", "#FF9FF3", "#54A0FF", "#5F27CD", "#01CBC6"];
const PEN_COLORS = ["#EF4444", "#3B82F6", "#000000"];
const PANEL_HEIGHT = 740;
const PANEL_PEEK = 44;
// 0=접힘 1=기본(디폴트.png, 화면 반반) 2=풀(바텀업.png, 캔버스 확대)
const PANEL_Y = [0, -360, -650];

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function OnboardingPage() {
  const router = useRouter();
  const { loading: authLoading, user, profile, refreshProfile, signOut } = useAuth();
  const searchParams = useSearchParams();
  const previewStep = searchParams.get("step");
  const [step, setStep] = useState<Step>(
    STEPS.includes(previewStep as Step) ? (previewStep as Step) : "landing"
  );

  // 로그인 후 마지막 방으로 자동 복귀 (localStorage → DB 순으로 조회)
  // ?step= 프리뷰 파라미터가 있으면 디자인 확인용으로 리다이렉트 건너뜀
  useEffect(() => {
    if (authLoading || !user || previewStep) return;

    async function redirectToGroup() {
      const lastGroupId = localStorage.getItem("last_group_id");
      if (lastGroupId) {
        router.replace(`/${lastGroupId}`);
        return;
      }
      const { data } = await supabase
        .from("groups")
        .select("id")
        .filter("members", "cs", JSON.stringify([{ id: user!.id }]))
        .order("created_at", { ascending: false })
        .limit(1);
      const groupId = data?.[0]?.id;
      if (groupId) {
        localStorage.setItem("last_group_id", groupId);
        router.replace(`/${groupId}`);
      }
    }

    redirectToGroup();
  }, [authLoading, user, router]);
  const [roomName, setRoomName] = useState("");
  const [motto, setMotto] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinError, setJoinError] = useState(false);
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("스티끼");
  const [editingName, setEditingName] = useState(false);
  const [drawnAvatar, setDrawnAvatar] = useState<string | null>(null);
  const [sheetLevel, setSheetLevel] = useState(1);
  const [drawColor, setDrawColor] = useState(PEN_COLORS[2]);
  const [hasStrokes, setHasStrokes] = useState(false);
  const panelDragControls = useDragControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  function canvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function handleCanvasDown(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true;
    lastPointRef.current = canvasPos(e);
    setHasStrokes(true);
  }

  function handleCanvasMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !lastPointRef.current) return;
    const pos = canvasPos(e);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPointRef.current = pos;
  }

  function handleCanvasUp() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function handleConfirmDrawing() {
    const canvas = canvasRef.current;
    if (canvas) setDrawnAvatar(canvas.toDataURL("image/png"));
    setSheetLevel(0);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  useEffect(() => {
    if (!joinError) return;
    const t = setTimeout(() => setJoinError(false), 4000);
    return () => clearTimeout(t);
  }, [joinError]);

  function proceedAfterGroup(groupId: string) {
    if (!profile) {
      setPendingGroupId(groupId);
      setStep("profile-setup");
      return;
    }
    router.push(`/${groupId}`);
  }

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
      setLoading(false);
      if (retry.error) return;
      proceedAfterGroup(retry.data.id);
      return;
    }
    setLoading(false);
    proceedAfterGroup(data.id);
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
    proceedAfterGroup(data.id);
  }

  async function handleSaveProfile() {
    console.log("handleSaveProfile 호출됨", { hasUser: !!user, hasDrawnAvatar: !!drawnAvatar });
    if (!user || !drawnAvatar) {
      setSaveError(!user ? "로그인 세션이 없어요 (user=null)" : "그린 그림이 없어요 (drawnAvatar=null)");
      return;
    }
    setLoading(true);
    const color = PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)];
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      name: profileName.trim() || "스티끼",
      avatar: drawnAvatar,
      color,
    });
    if (error) {
      console.error("프로필 저장 실패:", error);
      setSaveError(error.message);
      setLoading(false);
      return;
    }
    setSaveError(null);
    await refreshProfile();
    setLoading(false);
    router.push(pendingGroupId ? `/${pendingGroupId}` : "/");
  }

  if (authLoading) {
    return (
      <main className="min-h-screen dot-pattern flex items-center justify-center">
        <span className="t-text-faint text-sm">불러오는 중...</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen dot-pattern flex flex-col items-center justify-center p-6">
      <AnimatePresence mode="wait">

        {/* ── LANDING ── */}
        {step === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
            className="flex flex-col items-center px-6"
          >
            {/* 로고 + 모토 */}
            <div className="flex flex-col items-center" style={{ marginTop: 180 }}>
              <StickkiLogo style={{ width: 150, height: "auto", color: "#1a1a1a" }} />
              <p className="font-sans text-sm mt-2" style={{ color: "#6b6b6b" }}>
                <TypewriterText text="우리사이, 더 끈끈하게" delay={500} speed={65} />
              </p>
            </div>

            <div className="flex-1" />

            {/* 캐릭터 */}
            <div className="w-full max-w-sm flex items-center gap-2" style={{ marginBottom: -4 }}>
              <CharacterGhost style={{ width: 72, height: "auto" }} />
            </div>

            {/* 버튼 */}
            <div className="w-full max-w-sm flex flex-col gap-3" style={{ marginBottom: 170 }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep("create-name")}
                className="w-full font-semibold py-3.5 rounded-2xl text-sm"
                style={{ backgroundColor: "#27272A", color: "#F4F4F5" }}
              >
                새 집 만들기
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep("join")}
                className="w-full font-semibold py-3.5 rounded-2xl text-sm"
                style={{ backgroundColor: "#E4E4E7", color: "#27272A" }}
              >
                초대코드로 입장하기
              </motion.button>
              {user && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    localStorage.removeItem("last_group_id");
                    await signOut();
                    router.push("/login");
                  }}
                  className="w-full text-sm font-medium py-2"
                  style={{ color: "#6b6b6b" }}
                >
                  다른 계정으로 로그인
                </motion.button>
              )}
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
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            {/* 뒤로가기 — Figma 절대좌표 (fixed 오버레이라 main의 padding 영향 없이 375 프레임 좌표 그대로 사용) */}
            <button
              onClick={() => setStep("landing")}
              className="absolute flex items-center justify-center"
              style={{ top: 53, left: 22 }}
            >
              <BackButtonIcon className="glass rounded-full" />
            </button>

            {/* 진행 표시 + 메모 그룹 — 화면 정중앙 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-8 pointer-events-auto">
                <ProgressDots total={3} current={0} />
                <MemoNoteSvg title={<TypewriterText text="우리집 이름은 .." speed={70} />}>
                  <input
                    autoFocus
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && roomName.trim() && setStep("create-motto")}
                    placeholder="예 : 스티키 하우스"
                    className="font-sans text-xl w-full outline-none bg-transparent placeholder:text-[#CECECE]"
                    style={{ color: "#1a1a1a" }}
                  />
                </MemoNoteSvg>
              </div>
            </div>

            {/* 버튼 — 345×48, 화면 하단 고정 */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => roomName.trim() && setStep("create-motto")}
              disabled={!roomName.trim()}
              className="font-semibold text-sm rounded-2xl disabled:opacity-30 flex items-center justify-center"
              style={{ position: "absolute", bottom: 64, left: "50%", marginLeft: -172.5, width: 345, height: 48, backgroundColor: "#27272A", color: "#F4F4F5" }}
            >
              우리집 이름 등록하기
            </motion.button>
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
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <button
              onClick={() => setStep("create-name")}
              className="absolute flex items-center justify-center"
              style={{ top: 53, left: 22 }}
            >
              <BackButtonIcon className="glass rounded-full" />
            </button>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-8 pointer-events-auto">
                <ProgressDots total={3} current={1} />
                <MemoNoteSvg title={<TypewriterText text="우리집 가훈은 .." speed={70} />}>
                  <textarea
                    autoFocus
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder={"예 : 뭉치면 끈끈해지고\n흩어지면 다시 붙는다 !"}
                    rows={3}
                    className="font-sans text-xl w-full outline-none bg-transparent resize-none placeholder:text-[#CECECE]"
                    style={{ color: "#1a1a1a" }}
                  />
                </MemoNoteSvg>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCreate}
              disabled={!motto.trim() || loading}
              className="font-semibold text-sm rounded-2xl disabled:opacity-30 flex items-center justify-center"
              style={{ position: "absolute", bottom: 64, left: "50%", marginLeft: -172.5, width: 345, height: 48, backgroundColor: "#27272A", color: "#F4F4F5" }}
            >
              {loading ? "만드는 중..." : "우리집 가훈 등록하기"}
            </motion.button>
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
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <button
              onClick={() => setStep("landing")}
              className="absolute flex items-center justify-center"
              style={{ top: 53, left: 22 }}
            >
              <BackButtonIcon className="glass rounded-full" />
            </button>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-8 pointer-events-auto">
                <ProgressDots total={3} current={0} />
                <MemoNoteSvg
                  title={<TypewriterText text="초대코드를 입력하세요" speed={70} />}
                  borderColor={joinError ? "#EF4444" : "#F5F5F5"}
                  glow={joinError}
                >
                  <input
                    autoFocus
                    value={inviteInput}
                    onChange={(e) => { setInviteInput(e.target.value.toUpperCase()); setJoinError(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="예 : A1B2C3"
                    maxLength={6}
                    className="font-sans text-xl w-full outline-none bg-transparent placeholder:text-[#CECECE]"
                    style={{ color: "#1a1a1a" }}
                  />
                </MemoNoteSvg>
              </div>
            </div>

            <AnimatePresence>
              {joinError && (
                <div
                  className="flex items-center justify-center"
                  style={{ position: "absolute", bottom: 128, left: 0, right: 0 }}
                >
                  <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    className="font-sans flex items-center justify-center text-center rounded-2xl"
                    style={{
                      width: 344,
                      height: 57,
                      fontSize: 14,
                      padding: "0 20px",
                      borderRadius: 40,
                      overflow: "hidden",
                      backgroundColor: "rgba(115,115,115,0.7)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      color: "#fff",
                    }}
                  >
                    존재하지 않는 집입니다. 코드를 다시 입력해 보세요.
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleJoin}
              disabled={inviteInput.length < 6 || loading}
              className="font-semibold text-sm rounded-2xl disabled:opacity-30 flex items-center justify-center"
              style={{ position: "absolute", bottom: 64, left: "50%", marginLeft: -172.5, width: 345, height: 48, backgroundColor: "#27272A", color: "#F4F4F5" }}
            >
              {loading ? "찾는 중..." : "초대코드 등록하기"}
            </motion.button>

            <p
              className="absolute font-sans text-xs t-text-faint"
              style={{ bottom: 32, left: "50%", transform: "translateX(-50%)" }}
            >
              혹시 초대코드가 없나요?
            </p>
          </motion.div>
        )}

        {/* ── PROFILE SETUP ── */}
        {step === "profile-setup" && (
          <motion.div
            key="profile-setup"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <button
              onClick={() => setStep("landing")}
              className="absolute flex items-center justify-center"
              style={{ top: 53, left: 22 }}
            >
              <BackButtonIcon className="glass rounded-full" />
            </button>

            <div className="absolute flex flex-col items-center px-6" style={{ top: 0, left: 0, right: 0, paddingTop: 130 }}>
              <ProgressDots total={3} current={2} />
              <p className="font-sans font-semibold t-text mt-6" style={{ fontSize: 20 }}>나만의 스티끼를 그려보세요</p>
              <p className="font-sans text-sm mt-1" style={{ color: "#6b6b6b" }}>자유롭게 그린 그림이 내 프로필이 돼요.</p>

              <motion.button
                layout
                whileTap={{ scale: 0.97 }}
                onClick={() => setSheetLevel(1)}
                className="rounded-full flex items-center justify-center"
                style={{
                  width: sheetLevel === 0 ? 200 : 140,
                  height: sheetLevel === 0 ? 200 : 140,
                  marginTop: 40,
                  backgroundColor: "#FFFFFF",
                  border: "7px solid #E5E5E5",
                  backgroundImage: drawnAvatar ? `url(${drawnAvatar})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
                }}
              />

              {drawnAvatar && (
                <div className="flex items-center gap-1.5 mt-4">
                  {editingName ? (
                    <input
                      autoFocus
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      onBlur={() => setEditingName(false)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
                      className="font-sans text-center outline-none bg-transparent"
                      style={{ color: "#6b6b6b", width: 100, fontSize: 20 }}
                    />
                  ) : (
                    <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5">
                      <span className="font-sans" style={{ color: "#6b6b6b", fontSize: 20 }}>{profileName}</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z" stroke="#A3A3A3" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

            </div>

            {drawnAvatar && sheetLevel === 0 && (
              <>
                {saveError && (
                  <p
                    className="absolute font-sans text-xs text-center"
                    style={{ bottom: 120, left: "50%", transform: "translateX(-50%)", color: "#EF4444", width: 300 }}
                  >
                    저장 실패: {saveError}
                  </p>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="font-semibold text-sm rounded-2xl disabled:opacity-30 flex items-center justify-center"
                  style={{ position: "absolute", bottom: 64, left: "50%", marginLeft: -172.5, width: 345, height: 48, backgroundColor: "#27272A", color: "#F4F4F5" }}
                >
                  {loading ? "등록 중..." : "내 스티끼 프로필 등록하기"}
                </motion.button>
              </>
            )}

            {/* 그리기 패널 — 항상 하단에 붙어있음(모달 아님, 백드롭 없음), 드래그로 3단 스냅(접힘/기본/풀) */}
            <motion.div
              drag="y"
              dragListener={false}
              dragControls={panelDragControls}
              dragConstraints={{ top: PANEL_Y[2], bottom: PANEL_Y[0] }}
              dragElastic={0.05}
              onDragEnd={(_, info) => {
                const base = PANEL_Y[sheetLevel];
                const currentY = base + info.offset.y;
                let nextLevel = sheetLevel;
                if (info.velocity.y < -500) nextLevel = Math.min(sheetLevel + 1, 2);
                else if (info.velocity.y > 500) nextLevel = Math.max(sheetLevel - 1, 0);
                else {
                  let best = 0;
                  let bestDist = Infinity;
                  PANEL_Y.forEach((y, i) => {
                    const d = Math.abs(y - currentY);
                    if (d < bestDist) { bestDist = d; best = i; }
                  });
                  nextLevel = best;
                }
                setSheetLevel(nextLevel);
              }}
              animate={{ y: PANEL_Y[sheetLevel] }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="absolute left-0 right-0 flex flex-col items-center"
              style={{ bottom: -PANEL_HEIGHT + PANEL_PEEK, height: PANEL_HEIGHT, backgroundColor: "#27272A", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 4 }}
            >
              <div
                onPointerDown={(e) => panelDragControls.start(e)}
                onClick={() => setSheetLevel((v) => (v === 0 ? 1 : 0))}
                className="w-full flex items-start justify-center"
                style={{ height: 32, paddingTop: 4, touchAction: "none", cursor: "grab" }}
              >
                <div className="rounded-full" style={{ width: 70, height: 6, backgroundColor: "rgba(255,255,255,0.3)" }} />
              </div>

              {/* 펜+캔버스+확인 — 캔버스는 레벨과 무관하게 항상 같은 엘리먼트(그림 유지), 배치만 전환 */}
              <div
                className="w-full flex items-center justify-center"
                style={{
                  flexDirection: sheetLevel === 2 ? "column" : "row",
                  gap: sheetLevel === 2 ? 0 : 24,
                  marginTop: sheetLevel === 2 ? 30 : 40,
                }}
              >
                <div
                  className="flex"
                  style={{
                    flexDirection: sheetLevel === 2 ? "row" : "column",
                    gap: sheetLevel === 2 ? 32 : 16,
                    marginBottom: sheetLevel === 2 ? 20 : 0,
                  }}
                >
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setDrawColor(c)}
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 52,
                        height: 48,
                        backgroundColor: drawColor === c ? "rgba(255,255,255,0.15)" : "transparent",
                      }}
                    >
                      <PenIcon tipColor={c} />
                    </button>
                  ))}
                </div>

                <div className="relative" style={{ width: sheetLevel === 2 ? 278 : 180, height: sheetLevel === 2 ? 340 : 220 }}>
                  <canvas
                    ref={canvasRef}
                    width={278}
                    height={340}
                    onPointerDown={handleCanvasDown}
                    onPointerMove={handleCanvasMove}
                    onPointerUp={handleCanvasUp}
                    onPointerLeave={handleCanvasUp}
                    style={{ width: "100%", height: "100%", touchAction: "none", backgroundColor: "#fff", borderRadius: 8 }}
                  />
                  {!hasStrokes && (
                    <p
                      className="absolute inset-0 flex items-center justify-center font-sans text-sm pointer-events-none"
                      style={{ color: "#CECECE" }}
                    >
                      여기에 그려주세요
                    </p>
                  )}
                  {hasStrokes && (
                    <button
                      onClick={clearCanvas}
                      className="absolute rounded-full flex items-center justify-center"
                      style={{ top: 8, left: 8, width: 24, height: 24, backgroundColor: "rgba(0,0,0,0.08)" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2L12 12M12 2L2 12" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>

                {sheetLevel === 2 && (
                  <div className="flex justify-end" style={{ width: 278, marginTop: 12 }}>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleConfirmDrawing}>
                      <CheckButtonIcon style={{ backgroundColor: "#A3A3A3", borderRadius: "50%" }} />
                    </motion.button>
                  </div>
                )}

                {sheetLevel !== 2 && (
                  <motion.button whileTap={{ scale: 0.9 }} onClick={handleConfirmDrawing}>
                    <CheckButtonIcon style={{ backgroundColor: "#A3A3A3", borderRadius: "50%" }} />
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </main>
  );
}

function TypewriterText({ text, speed = 60, delay = 0 }: { text: string; speed?: number; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    const startTimer = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(interval);
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(startTimer);
  }, [text, speed, delay]);
  return (
    <>
      {displayed}
      <motion.span
        animate={{ opacity: displayed.length < text.length ? [1, 0] : 0 }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        style={{ display: "inline-block", marginLeft: 1 }}
      >|</motion.span>
    </>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all"
          style={{
            width: i === current ? 33 : 6,
            height: 6,
            backgroundColor: i === current ? "#27272A" : "#A3A3A3",
          }}
        />
      ))}
    </div>
  );
}

function BackButtonIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect width="44" height="44" rx="22" fill="#D1D1D1" fillOpacity="0.4" />
      <path d="M25 15L18 22L25 29" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckButtonIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect width="44" height="44" rx="22" fill="#D1D1D1" fillOpacity="0.4" />
      <path d="M15 22L20 27L30 17" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PenIcon({ tipColor, className, style }: { tipColor: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="52" height="48" viewBox="0 0 52 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M13.2618 25.8279C12.5517 24.9817 12.6621 23.7202 13.5083 23.0102L35.7236 4.36935C36.5697 3.65934 37.8312 3.76971 38.5412 4.61586L46.8975 14.5744C47.6075 15.4206 47.4971 16.6821 46.6509 17.3921L24.4357 36.0329C23.5895 36.7429 22.328 36.6326 21.618 35.7864L13.2618 25.8279Z" fill="#D9D9D9" />
      <path d="M38.386 4.74611C37.676 3.89996 37.7864 2.63845 38.6325 1.92845L39.3985 1.28566C40.2447 0.575659 41.5062 0.686026 42.2162 1.53218L50.5725 11.4908C51.2825 12.3369 51.1721 13.5984 50.3259 14.3084L49.5599 14.9512C48.7137 15.6612 47.4522 15.5508 46.7422 14.7047L38.386 4.74611Z" fill={tipColor} />
      <path d="M6.4807 41.2827C5.73346 41.4397 5.10707 40.6932 5.39148 39.9846L11.3478 25.1438C11.6147 24.4788 12.495 24.3443 12.9593 24.8976L22.6526 36.4497C23.1169 37.003 22.8316 37.8466 22.1303 37.994L6.4807 41.2827Z" fill={tipColor} />
    </svg>
  );
}

function CharacterGhost({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const eyeLookSequence = [
    { x: 0, y: 0 },
    { x: 1.8, y: -1.2 },
    { x: 1.8, y: -1.2 },
    { x: 0, y: 0 },
    { x: -1.5, y: 0.8 },
    { x: -1.5, y: 0.8 },
    { x: 0.5, y: -1.5 },
    { x: 0.5, y: -1.5 },
    { x: 0, y: 0 },
  ];
  const eyeX = eyeLookSequence.map((p) => p.x);
  const eyeY = eyeLookSequence.map((p) => p.y);

  return (
    <svg width="95" height="69" viewBox="0 0 95 69" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M53.8611 64.7226C53.7592 64.7226 40.0792 64.7226 21.4672 63.0045C16.2172 62.5198 20.554 57.8501 23.3628 55.5494C27.5439 52.1247 29.9975 50.316 31.2909 48.8207C34.3715 45.2591 23.6645 39.0692 22.5591 36.1027C21.8441 34.1836 22.9398 31.9757 24.597 29.8496C29.0383 24.1515 33.6534 23.0843 37.933 22.3856C43.6731 21.4486 48.2012 22.4395 49.5735 23.0338C52.6894 24.383 55.1542 28.498 57.2247 32.4556C59.5937 36.9838 57.4214 43.6403 55.4317 46.768C53.3263 50.0774 50.1613 50.0965 49.3476 50.6156C46.647 52.3385 56.9321 59.0064 60.8533 65.3302C61.0001 66.2845 60.1585 66.4953 59.0441 66.6039C57.9297 66.7125 56.568 66.7125 53.9135 65.7856" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {/* 눈 — 시선이 이동하는 애니메이션 */}
      <motion.g
        animate={{ x: eyeX, y: eyeY }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          times: eyeLookSequence.map((_, i) => i / (eyeLookSequence.length - 1)),
        }}
      >
        <path d="M36.18 33.4395C36.18 33.4801 36.18 33.5207 36.1536 33.9244C36.1273 34.328 36.0746 35.0936 36.2422 35.7653C36.4099 36.437 36.7996 36.9917 37.2875 37.7439" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M44.0476 32.9829V39.5543" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
      <path d="M70.7085 24.6011C70.7085 24.6229 70.7085 24.6448 70.7085 26.7092C70.7085 28.7735 70.7085 32.8797 70.682 35.3327C70.6554 37.7857 70.6023 38.4611 70.5476 39.157" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M70.5476 32.9814C70.5476 32.9572 70.5476 32.933 71.7496 32.9085C72.9517 32.8839 75.3557 32.8597 76.9577 32.9206C78.5596 32.9815 79.2865 33.1283 80.5418 33.289" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M83.1256 23.9619C83.1256 24.0095 83.1256 24.0572 83.0752 26.7708C83.0248 29.4844 82.9241 34.8625 82.8016 38.0831C82.679 41.3038 82.5377 42.204 82.3921 43.9668" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M92 22.0757V22" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M92.2087 29.3164V40.7515" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <foreignObject x="-7.6" y="-7.6" width="60.7702" height="50.7978">
        <div style={{ backdropFilter: "blur(3.8px)", clipPath: "url(#character-tape-clip)", height: "100%", width: "100%" }} />
      </foreignObject>
      <rect x="37.1364" width="18" height="42.0361" transform="rotate(62.06 37.1364 0)" fill="#D9D9D9" fillOpacity="0.4" />
      <defs>
        <clipPath id="character-tape-clip" transform="translate(7.6 7.6)">
          <rect x="37.1364" width="18" height="42.0361" transform="rotate(62.06 37.1364 0)" />
        </clipPath>
      </defs>
    </svg>
  );
}

function MemoNoteSvg({
  title,
  children,
  borderColor = "#F5F5F5",
  glow = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  borderColor?: string;
  glow?: boolean;
}) {
  return (
    <svg width="333" height="320" viewBox="0 0 333 320" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter={glow ? "url(#memoNoteGlow)" : "url(#memoNoteShadow)"}>
        <rect x="20" y="20" width="293" height="200" rx="20" transform="rotate(-3 166.5 120)" fill="#fff" />
        <rect x="20" y="20" width="293" height="200" rx="20" transform="rotate(-3 166.5 120)" fill="url(#memoNotePattern)" fillOpacity="0.5" />
        <rect x="20.5" y="20.5" width="292" height="199" rx="19.5" transform="rotate(-3 166.5 120)" stroke={borderColor} strokeWidth={glow ? 1.5 : 1} fill="none" />
      </g>
      <foreignObject x="20" y="20" width="293" height="200" transform="rotate(-3 166.5 120)">
        <div style={{ width: "100%", height: "100%", padding: "32px 28px", boxSizing: "border-box" }}>
          <p className="font-sans font-normal" style={{ fontSize: 20, color: "#1a1a1a", marginBottom: 16 }}>{title}</p>
          {children}
        </div>
      </foreignObject>
      <defs>
        <filter id="memoNoteGlow" x="-20" y="-20" width="373" height="360" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset />
          <feGaussianBlur stdDeviation="12" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.937 0 0 0 0 0.267 0 0 0 0 0.267 0 0 0 0.35 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1" result="shape" />
        </filter>
        <filter id="memoNoteShadow" x="-20" y="-20" width="373" height="360" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="5.31189" />
          <feGaussianBlur stdDeviation="5.84308" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0.1 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="21.2476" />
          <feGaussianBlur stdDeviation="10.6238" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0.09 0" />
          <feBlend mode="normal" in2="effect1" result="effect2" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="47.807" />
          <feGaussianBlur stdDeviation="14.3421" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0.05 0" />
          <feBlend mode="normal" in2="effect2" result="effect3" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="83.9278" />
          <feGaussianBlur stdDeviation="16.998" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0 0.588235 0 0 0 0.01 0" />
          <feBlend mode="normal" in2="effect3" result="effect4" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect4" result="shape" />
        </filter>
        <pattern id="memoNotePattern" patternUnits="userSpaceOnUse" x="20" y="20" width="293" height="22">
          <rect y="21" width="293" height="1" fill="#CACACA" fillOpacity="0.3" />
        </pattern>
      </defs>
    </svg>
  );
}
