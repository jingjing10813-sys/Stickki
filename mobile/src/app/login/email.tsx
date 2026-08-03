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
import { BackIcon, EyeIcon, EyeOffIcon } from "@/components/stickki-icons";
import { StickkiColors } from "@/constants/stickki-theme";
import { supabase } from "@/lib/supabase";

const C = StickkiColors.light;

export default function EmailLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  async function handleLogin() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setNeedsConfirmation(false);
    setResendMessage("");
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      if (loginError.message?.toLowerCase().includes("email not confirmed")) {
        setNeedsConfirmation(true);
        setError("이메일 인증이 아직 완료되지 않았어요.");
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않아요.");
      }
      setLoading(false);
    } else {
      // 세션이 생기면 index의 게이트가 홈으로 보냄
      router.replace("/");
    }
  }

  async function handleResend() {
    setResending(true);
    setResendMessage("");
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    setResendMessage(
      resendError ? "재전송에 실패했어요. 잠시 후 다시 시도해주세요." : "인증 메일을 다시 보냈어요."
    );
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

          <View style={styles.logoArea}>
            <Text style={styles.wordmark}>Stickki</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>이메일 로그인</Text>

            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
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
              returnKeyType="next"
            />

            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput, error ? styles.inputError : null]}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError("");
                }}
                placeholder="비밀번호 입력"
                placeholderTextColor="#CECECE"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable
                style={styles.eyeToggle}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </Pressable>
            </View>

            {error !== "" && <Text style={styles.errorText}>{error}</Text>}

            {needsConfirmation && (
              <View style={styles.resendRow}>
                <Pressable onPress={handleResend} disabled={resending}>
                  <Text style={[styles.resendButton, resending && styles.disabledText]}>
                    {resending ? "재전송 중..." : "인증 메일 다시 받기"}
                  </Text>
                </Pressable>
                {resendMessage !== "" && <Text style={styles.resendMessage}>{resendMessage}</Text>}
              </View>
            )}

            <Pressable
              style={[styles.submit, !canSubmit && styles.submitDisabled]}
              onPress={handleLogin}
              disabled={!canSubmit}
            >
              {loading ? (
                <ActivityIndicator color="#F4F4F5" />
              ) : (
                <Text style={styles.submitText}>로그인</Text>
              )}
            </Pressable>

            <Text style={styles.signupRow}>
              아직 계정이 없나요?{" "}
              <Text style={styles.signupLink} onPress={() => router.push("/signup")}>
                회원가입
              </Text>
            </Text>
            <Text style={styles.signupRow}>
              <Text style={styles.signupLink} onPress={() => router.push("/reset-password")}>
                비밀번호를 잊으셨나요?
              </Text>
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
    paddingHorizontal: 24,
  },
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
  logoArea: {
    alignItems: "center",
    paddingTop: "15%",
  },
  wordmark: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#1a1a1a",
  },
  form: {
    marginTop: 64,
    gap: 12,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
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
  inputError: {
    borderColor: "#E53935",
  },
  passwordWrap: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeToggle: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  errorText: {
    fontSize: 12,
    color: "#E53935",
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resendButton: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
    textDecorationLine: "underline",
  },
  disabledText: {
    opacity: 0.4,
  },
  resendMessage: {
    fontSize: 12,
    color: "#6b6b6b",
  },
  submit: {
    height: 48,
    borderRadius: 16,
    backgroundColor: "#27272A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitDisabled: {
    opacity: 0.3,
  },
  submitText: {
    color: "#F4F4F5",
    fontSize: 14,
    fontWeight: "600",
  },
  signupRow: {
    textAlign: "center",
    fontSize: 14,
    color: "#6b6b6b",
    marginTop: 4,
  },
  signupLink: {
    fontWeight: "600",
    color: "#1a1a1a",
    textDecorationLine: "underline",
  },
});
