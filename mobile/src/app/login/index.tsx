import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DotPattern } from "@/components/dot-pattern";
import {
  AppleLogo,
  KakaoLogo,
  StickkiCharacterNo,
  StickkiWordmark,
} from "@/components/stickki-icons";
import { StickkiColors } from "@/constants/stickki-theme";
import { supabase } from "@/lib/supabase";

const C = StickkiColors.light;

function notReady() {
  Alert.alert("준비 중", "소셜 로그인은 곧 열려요. 지금은 이메일로 시작해주세요!");
}

export default function LoginScreen() {
  const router = useRouter();
  const [kakaoLoading, setKakaoLoading] = useState(false);

  async function signInWithKakao() {
    if (kakaoLoading) return;
    setKakaoLoading(true);
    try {
      const redirectTo = Linking.createURL("login");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) {
        Alert.alert("로그인 실패", "카카오 로그인을 시작할 수 없어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== "success") return; // 사용자가 취소

      const code = new URL(result.url).searchParams.get("code");
      if (!code) {
        Alert.alert("로그인 실패", "카카오 인증 정보를 받지 못했어요. 다시 시도해주세요.");
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        Alert.alert("로그인 실패", "세션 생성에 실패했어요. 다시 시도해주세요.");
        return;
      }

      // 세션이 생기면 index의 게이트가 홈/프로필설정으로 보냄
      router.replace("/");
    } finally {
      setKakaoLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <DotPattern />
      <SafeAreaView style={styles.safe}>
        {/* 로고 + 오른쪽 끝에 걸친 캐릭터 (웹과 동일 배치) */}
        <View style={styles.logoArea}>
          <StickkiWordmark width={175} />
          <Text style={styles.tagline}>우리사이, 더 끈끈하게</Text>
        </View>
        <View style={styles.character} pointerEvents="none">
          <StickkiCharacterNo size={47} />
        </View>

        <View style={styles.spacer} />

        <View style={styles.buttons}>
          <Text style={styles.caption}>지금 가입하고 끈끈한 공동생활 시작하기</Text>

          <Pressable style={[styles.button, styles.appleButton]} onPress={notReady}>
            <AppleLogo />
            <Text style={styles.appleText}>애플로 시작하기</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.kakaoButton, kakaoLoading && styles.buttonDisabled]}
            onPress={signInWithKakao}
            disabled={kakaoLoading}
          >
            <KakaoLogo />
            <Text style={styles.kakaoText}>
              {kakaoLoading ? "카카오로 로그인 중..." : "카카오로 시작하기"}
            </Text>
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
  character: {
    position: "absolute",
    right: -13,
    top: "31%",
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
  buttonDisabled: {
    opacity: 0.6,
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
