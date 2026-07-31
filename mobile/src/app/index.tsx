import { Redirect } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DotPattern } from "@/components/dot-pattern";
import { StickkiColors } from "@/constants/stickki-theme";
import { useAuth } from "@/lib/auth-context";

const C = StickkiColors.light;

/**
 * 인증 게이트 — 웹 proxy.ts의 역할.
 * 세션 없으면 로그인으로, 있으면 홈(임시 화면 — 온보딩/보드 포팅 전까지).
 */
export default function IndexScreen() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.root}>
      <DotPattern />
      <SafeAreaView style={[styles.center, styles.flex]}>
        <Text style={styles.title}>로그인 성공 🎉</Text>
        <Text style={styles.desc}>{user.email}</Text>
        <Text style={styles.desc}>
          {profile ? `프로필: ${profile.name}` : "프로필 없음 — 온보딩 화면은 다음 단계"}
        </Text>
        <Text style={styles.note}>여기에 온보딩/보드 화면이 들어옵니다 (2주차 작업)</Text>
        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>로그아웃</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  desc: {
    fontSize: 14,
    color: C.text2,
  },
  note: {
    fontSize: 12,
    color: C.text3,
    marginTop: 8,
  },
  signOut: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.btnSecondaryBg,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
  },
});
