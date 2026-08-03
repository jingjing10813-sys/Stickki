import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

type Step = "email" | "code" | "password";

/** 비밀번호 재설정: 메일로 인증번호 -> 확인 -> 새 비밀번호 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const passwordValid = password.length >= 6 && password.length <= 20;
  const passwordsMatch = password.length > 0 && password === passwordConfirm;

  async function handleSendCode() {
    if (!emailValid || loading) return;
    setLoading(true);
    setError("");
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (sendError) {
      setError("메일 전송에 실패했어요. 이메일을 확인해주세요.");
      return;
    }
    setStep("code");
  }

  async function handleVerify() {
    if (code.trim().length < 6 || loading) return;
    setLoading(true);
    setError("");
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "recovery",
    });
    setLoading(false);
    if (verifyError) {
      setError("인증번호가 올바르지 않아요.");
      return;
    }
    setStep("password");
  }

  async function handleReset() {
    if (!passwordValid || !passwordsMatch || loading) return;
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("비밀번호 변경에 실패했어요. 다시 시도해주세요.");
      return;
    }
    Alert.alert("완료", "비밀번호가 변경됐어요!");
    router.replace("/");
  }

  return (
    <View style={styles.root}>
      <DotPattern />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}>
            <BackIcon />
          </Pressable>

          <Text style={styles.title}>비밀번호 재설정</Text>

          {step === "email" && (
            <>
              <Text style={styles.desc}>가입한 이메일로 인증번호를 보내드려요</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError("");
                }}
                placeholder="이메일 입력"
                placeholderTextColor="#CECECE"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <Primary
                label="인증번호 받기"
                disabled={!emailValid}
                loading={loading}
                onPress={handleSendCode}
              />
            </>
          )}

          {step === "code" && (
            <>
              <Text style={styles.desc}>{email} 로 보낸 인증번호 6자리를 입력해주세요</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={(v) => {
                  setCode(v);
                  setError("");
                }}
                placeholder="인증번호 6자리"
                placeholderTextColor="#CECECE"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <Primary
                label="인증받기"
                disabled={code.trim().length < 6}
                loading={loading}
                onPress={handleVerify}
              />
            </>
          )}

          {step === "password" && (
            <>
              <Text style={styles.desc}>새 비밀번호를 설정해주세요 (6~20자)</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="새 비밀번호"
                placeholderTextColor="#CECECE"
                secureTextEntry
                autoCapitalize="none"
                autoFocus
              />
              <TextInput
                style={[
                  styles.input,
                  passwordConfirm.length > 0 && !passwordsMatch && styles.inputError,
                ]}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                placeholder="새 비밀번호 확인"
                placeholderTextColor="#CECECE"
                secureTextEntry
                autoCapitalize="none"
              />
              <Primary
                label="비밀번호 변경"
                disabled={!passwordValid || !passwordsMatch}
                loading={loading}
                onPress={handleReset}
              />
            </>
          )}

          {error !== "" && <Text style={styles.errorText}>{error}</Text>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Primary({
  label,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.submit, (disabled || loading) && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator color="#F4F4F5" /> : <Text style={styles.submitText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 72, gap: 12 },
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
  title: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  desc: { fontSize: 13, color: C.text3, lineHeight: 19 },
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
  submit: {
    height: 48,
    borderRadius: 16,
    backgroundColor: "#27272A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: { color: "#F4F4F5", fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.3 },
});
