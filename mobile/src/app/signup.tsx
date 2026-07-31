import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DotPattern } from "@/components/dot-pattern";
import { BackIcon } from "@/components/stickki-icons";
import { StickkiColors } from "@/constants/stickki-theme";

const C = StickkiColors.light;

/** 회원가입(이메일 OTP) 화면 — Supabase 메일 템플릿 수리 후 웹 플로우 포팅 예정 */
export default function SignupScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <DotPattern />
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
        </Pressable>
        <View style={styles.center}>
          <Text style={styles.title}>회원가입 준비 중</Text>
          <Text style={styles.desc}>
            이메일 인증(OTP) 가입은 서버 설정 수리 후 열려요.{"\n"}지금은 기존 계정으로 로그인해주세요.
          </Text>
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  desc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: C.text3,
  },
});
