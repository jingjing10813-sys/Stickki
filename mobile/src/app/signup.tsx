import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DotPattern } from "@/components/dot-pattern";
import { BackIcon, EyeIcon, EyeOffIcon } from "@/components/stickki-icons";
import { StickkiColors } from "@/constants/stickki-theme";
import { supabase } from "@/lib/supabase";

const C = StickkiColors.light;

/** 회원가입 — 이메일 OTP 인증 후 비밀번호 설정 (웹 signup 플로우 포팅) */
export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpMessage, setOtpMessage] = useState("");

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailFormatValid = /\S+@\S+\.\S+/.test(email.trim());
  const passwordValid = password.length >= 6 && password.length <= 20;
  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const requiredAgreed = agreeTerms && agreePrivacy;
  const agreeAll = agreeTerms && agreePrivacy && agreeMarketing;
  const canSubmit = emailVerified && passwordValid && passwordsMatch && requiredAgreed && !loading;

  async function handleSendOtp() {
    if (!emailFormatValid || sendingOtp) return;
    setSendingOtp(true);
    setOtpError("");
    setOtpMessage("");
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setSendingOtp(false);
    if (sendError) {
      setOtpError("인증번호 전송에 실패했어요. 잠시 후 다시 시도해주세요.");
      return;
    }
    setOtpSent(true);
    setOtpMessage("인증번호를 보냈어요. 메일함을 확인해주세요!");
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim() || verifyingOtp) return;
    setVerifyingOtp(true);
    setOtpError("");
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
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
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("회원가입에 실패했어요. 다시 시도해주세요.");
      setLoading(false);
      return;
    }
    router.replace("/");
  }

  function handleAgreeAll(next: boolean) {
    setAgreeTerms(next);
    setAgreePrivacy(next);
    setAgreeMarketing(next);
  }

  return (
    <View style={styles.root}>
      <DotPattern />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}>
            <BackIcon />
          </Pressable>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>회원가입</Text>

            {/* 이메일 + 인증 요청 */}
            <Text style={styles.label}>이메일</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flexInput, emailVerified && styles.inputDone]}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setOtpError("");
                }}
                placeholder="이메일 입력"
                placeholderTextColor="#CECECE"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!emailVerified}
              />
              <Pressable
                style={[
                  styles.sideBtn,
                  (!emailFormatValid || emailVerified || sendingOtp) && styles.disabled,
                ]}
                onPress={handleSendOtp}
                disabled={!emailFormatValid || emailVerified || sendingOtp}
              >
                {sendingOtp ? (
                  <ActivityIndicator size="small" color={C.btnPrimaryText} />
                ) : (
                  <Text style={styles.sideBtnText}>{otpSent ? "재전송" : "인증요청"}</Text>
                )}
              </Pressable>
            </View>

            {/* 인증번호 입력 */}
            {otpSent && !emailVerified && (
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flexInput, otpError ? styles.inputError : null]}
                  value={otpCode}
                  onChangeText={(v) => {
                    setOtpCode(v);
                    setOtpError("");
                  }}
                  placeholder="인증번호 6자리"
                  placeholderTextColor="#CECECE"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Pressable
                  style={[styles.sideBtn, (otpCode.trim().length < 6 || verifyingOtp) && styles.disabled]}
                  onPress={handleVerifyOtp}
                  disabled={otpCode.trim().length < 6 || verifyingOtp}
                >
                  {verifyingOtp ? (
                    <ActivityIndicator size="small" color={C.btnPrimaryText} />
                  ) : (
                    <Text style={styles.sideBtnText}>인증받기</Text>
                  )}
                </Pressable>
              </View>
            )}
            {emailVerified && <Text style={styles.doneText}>이메일 인증 완료 ✓</Text>}
            {otpMessage !== "" && !emailVerified && <Text style={styles.hint}>{otpMessage}</Text>}
            {otpError !== "" && <Text style={styles.errorText}>{otpError}</Text>}

            {/* 비밀번호 */}
            <Text style={styles.label}>비밀번호</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="비밀번호 (6~20자)"
                placeholderTextColor="#CECECE"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                style={styles.eyeToggle}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </Pressable>
            </View>
            <TextInput
              style={[
                styles.input,
                passwordConfirm.length > 0 && !passwordsMatch && styles.inputError,
              ]}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호 확인"
              placeholderTextColor="#CECECE"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            {passwordConfirm.length > 0 && !passwordsMatch && (
              <Text style={styles.errorText}>비밀번호가 일치하지 않아요.</Text>
            )}

            {/* 약관 동의 */}
            <View style={styles.agreeBox}>
              <AgreeRow
                label="전체 동의"
                checked={agreeAll}
                onToggle={() => handleAgreeAll(!agreeAll)}
                bold
              />
              <View style={styles.divider} />
              <AgreeRow
                label="[필수] 서비스 이용약관 동의"
                checked={agreeTerms}
                onToggle={() => setAgreeTerms((v) => !v)}
              />
              <AgreeRow
                label="[필수] 개인정보 수집·이용 동의"
                checked={agreePrivacy}
                onToggle={() => setAgreePrivacy((v) => !v)}
              />
              <AgreeRow
                label="[선택] 마케팅 정보 수신 동의"
                checked={agreeMarketing}
                onToggle={() => setAgreeMarketing((v) => !v)}
              />
            </View>

            {error !== "" && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[styles.submit, !canSubmit && styles.disabled]}
              onPress={handleSignUp}
              disabled={!canSubmit}
            >
              {loading ? (
                <ActivityIndicator color="#F4F4F5" />
              ) : (
                <Text style={styles.submitText}>스티끼 시작하기</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function AgreeRow({
  label,
  checked,
  onToggle,
  bold,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  bold?: boolean;
}) {
  return (
    <Pressable style={styles.agreeRow} onPress={onToggle} hitSlop={4}>
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.agreeLabel, bold && styles.agreeBold]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1 },
  flex: { flex: 1 },
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
  scroll: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40, gap: 10 },
  title: { fontSize: 22, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600", color: C.text2, marginTop: 8 },
  row: { flexDirection: "row", gap: 8 },
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
  flexInput: { flex: 1 },
  inputError: { borderColor: "#E53935" },
  inputDone: { opacity: 0.5 },
  sideBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: C.btnPrimaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  sideBtnText: { color: C.btnPrimaryText, fontSize: 13, fontWeight: "600" },
  doneText: { fontSize: 12, color: "#16A34A", fontWeight: "600" },
  hint: { fontSize: 12, color: C.text3 },
  errorText: { fontSize: 12, color: "#E53935" },
  passwordWrap: { position: "relative" },
  passwordInput: { paddingRight: 44 },
  eyeToggle: { position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" },
  agreeBox: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  divider: { height: 1, backgroundColor: C.border },
  agreeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.borderMid,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: "#1a1a1a", borderColor: "#1a1a1a" },
  checkmark: { color: "#fff", fontSize: 12, fontWeight: "700" },
  agreeLabel: { fontSize: 13, color: C.text2 },
  agreeBold: { fontWeight: "700", color: "#1a1a1a" },
  submit: {
    marginTop: 16,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#27272A",
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#F4F4F5", fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.3 },
});
