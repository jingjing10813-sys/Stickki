import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DotPattern } from "@/components/dot-pattern";
import { AppleLogo, KakaoLogo } from "@/components/stickki-icons";
import { StickkiColors } from "@/constants/stickki-theme";

const C = StickkiColors.light;

function notReady() {
  Alert.alert("준비 중", "소셜 로그인은 곧 열려요. 지금은 이메일로 시작해주세요!");
}

export default function LoginScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <DotPattern />
      <SafeAreaView style={styles.safe}>
        {/* 로고 영역 — 워드마크 SVG 포팅 전까지 텍스트 로고 */}
        <View style={styles.logoArea}>
          <Text style={styles.wordmark}>Stickki</Text>
          <Text style={styles.tagline}>우리사이, 더 끈끈하게</Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.buttons}>
          <Text style={styles.caption}>지금 가입하고 끈끈한 공동생활 시작하기</Text>

          <Pressable style={[styles.button, styles.appleButton]} onPress={notReady}>
            <AppleLogo />
            <Text style={styles.appleText}>애플로 시작하기</Text>
          </Pressable>

          <Pressable style={[styles.button, styles.kakaoButton]} onPress={notReady}>
            <KakaoLogo />
            <Text style={styles.kakaoText}>카카오로 시작하기</Text>
          </Pressable>

          <Pressable style={styles.emailLink} onPress={() => router.push("/login/email")}>
            <Text style={styles.emailLinkText}>이메일로 로그인하기</Text>
          </Pressable>
        </View>
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
    paddingHorizontal: 24,
  },
  logoArea: {
    alignItems: "center",
    paddingTop: "19%",
  },
  wordmark: {
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#1a1a1a",
  },
  tagline: {
    fontSize: 14,
    marginTop: 6,
    color: C.text3,
  },
  spacer: {
    flex: 1,
  },
  buttons: {
    gap: 12,
    paddingBottom: 34,
  },
  caption: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    color: C.text4,
    marginBottom: 4,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  appleButton: {
    backgroundColor: "#000",
  },
  appleText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  kakaoButton: {
    backgroundColor: "#FEE500",
  },
  kakaoText: {
    color: "rgba(0,0,0,0.85)",
    fontSize: 14,
    fontWeight: "600",
  },
  emailLink: {
    alignItems: "center",
    paddingTop: 4,
  },
  emailLinkText: {
    fontSize: 12,
    fontWeight: "500",
    color: C.text4,
    textDecorationLine: "underline",
  },
});
