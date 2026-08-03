import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DotPattern } from "@/components/dot-pattern";
import { BackIcon } from "@/components/stickki-icons";
import { StickkiColors } from "@/constants/stickki-theme";
import { supabase } from "@/lib/supabase";

const C = StickkiColors.light;

type Step = "landing" | "create-name" | "create-motto" | "join";

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("landing");
  const [roomName, setRoomName] = useState("");
  const [motto, setMotto] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!roomName.trim() || !motto.trim() || loading) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("create_group", {
      g_name: roomName.trim(),
      g_motto: motto.trim(),
    });
    setLoading(false);
    if (!error && data?.id) {
      router.replace(`/group/${data.id}`);
    }
  }

  async function handleJoin() {
    if (inviteInput.trim().length < 6 || loading) return;
    setLoading(true);
    setJoinError("");
    const { data, error } = await supabase.rpc("join_group_with_code", {
      code: inviteInput.trim(),
    });
    setLoading(false);
    if (error || !data) {
      setJoinError("존재하지 않는 집입니다");
      return;
    }
    router.replace(`/group/${data}`);
  }

  function goBack() {
    setJoinError("");
    setStep(step === "create-motto" ? "create-name" : "landing");
  }

  return (
    <View style={styles.root}>
      <DotPattern />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {step !== "landing" && (
            <Pressable style={styles.back} onPress={goBack} hitSlop={8}>
              <BackIcon />
            </Pressable>
          )}

          {step === "landing" && (
            <View style={styles.center}>
              <Text style={styles.title}>스티끼에 오신 걸 환영해요!</Text>
              <Text style={styles.desc}>함께 사는 사람들과 방을 만들어보세요</Text>
              <View style={styles.buttons}>
                <Pressable style={styles.primaryBtn} onPress={() => setStep("create-name")}>
                  <Text style={styles.primaryText}>새 집 만들기</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={() => setStep("join")}>
                  <Text style={styles.secondaryText}>초대코드로 입장하기</Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === "create-name" && (
            <StepInput
              title="우리 집 이름을 지어주세요"
              placeholder="집 이름 입력"
              value={roomName}
              onChange={setRoomName}
              buttonLabel="다음"
              onSubmit={() => roomName.trim() && setStep("create-motto")}
            />
          )}

          {step === "create-motto" && (
            <StepInput
              title="우리 집 가훈을 정해주세요"
              placeholder="가훈 입력"
              value={motto}
              onChange={setMotto}
              buttonLabel={loading ? "만드는 중..." : "집 만들기"}
              onSubmit={handleCreate}
            />
          )}

          {step === "join" && (
            <StepInput
              title="초대코드를 입력해주세요"
              placeholder="6자리 코드"
              value={inviteInput}
              onChange={(v) => {
                setInviteInput(v.toUpperCase());
                setJoinError("");
              }}
              buttonLabel={loading ? "입장 중..." : "입장하기"}
              onSubmit={handleJoin}
              error={joinError}
              maxLength={6}
            />
          )}

          {loading && <ActivityIndicator style={styles.spinner} />}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function StepInput({
  title,
  placeholder,
  value,
  onChange,
  buttonLabel,
  onSubmit,
  error,
  maxLength,
}: {
  title: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  buttonLabel: string;
  onSubmit: () => void;
  error?: string;
  maxLength?: number;
}) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.stepTitle}>{title}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#CECECE"
        autoCapitalize={maxLength ? "characters" : "none"}
        maxLength={maxLength}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        autoFocus
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable
        style={[styles.primaryBtn, !value.trim() && styles.disabled]}
        onPress={onSubmit}
        disabled={!value.trim()}
      >
        <Text style={styles.primaryText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1 },
  flex: { flex: 1, paddingHorizontal: 24 },
  back: {
    position: "absolute",
    top: 12,
    left: 22,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  desc: { fontSize: 14, color: C.text3 },
  buttons: { width: "100%", gap: 12, marginTop: 32 },
  stepWrap: { marginTop: "35%", gap: 14 },
  stepTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  input: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#1a1a1a",
    backgroundColor: C.bg,
  },
  inputError: { borderColor: "#E53935" },
  errorText: { fontSize: 12, color: "#E53935" },
  primaryBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: C.btnPrimaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: C.btnPrimaryText, fontSize: 14, fontWeight: "600" },
  secondaryBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: C.btnSecondaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#1a1a1a", fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.3 },
  spinner: { position: "absolute", alignSelf: "center", top: "50%" },
});
