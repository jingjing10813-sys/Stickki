import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DotPattern } from "@/components/dot-pattern";
import { StickkiColors } from "@/constants/stickki-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const C = StickkiColors.light;

type Group = {
  id: string;
  name: string;
  motto: string;
  invite_code: string;
  members: { id: string; name: string }[];
};

/** 보드 자리 화면 — 방 정보/멤버 확인용. 포스트잇 보드는 2주차 후반 작업 */
export default function GroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { signOut } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    supabase
      .from("groups")
      .select("id, name, motto, invite_code, members")
      .eq("id", groupId)
      .maybeSingle()
      .then(({ data }) => {
        setGroup((data as Group | null) ?? null);
        setLoading(false);
      });
  }, [groupId]);

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.desc}>방을 찾을 수 없어요</Text>
        <Pressable style={styles.btn} onPress={() => router.replace("/onboarding")}>
          <Text style={styles.btnText}>온보딩으로</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <DotPattern />
      <SafeAreaView style={[styles.center, { flex: 1 }]}>
        <Text style={styles.title}>{group.name}</Text>
        <Text style={styles.motto}>“{group.motto}”</Text>
        <Text style={styles.desc}>초대코드: {group.invite_code}</Text>
        <Text style={styles.desc}>
          멤버 {group.members.length}명: {group.members.map((m) => m.name).join(", ")}
        </Text>
        <Text style={styles.note}>포스트잇 보드가 여기 들어옵니다 (2주차 후반)</Text>
        <Pressable style={styles.btn} onPress={signOut}>
          <Text style={styles.btnText}>로그아웃</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: "800", color: "#1a1a1a" },
  motto: { fontSize: 15, color: C.text2, fontStyle: "italic" },
  desc: { fontSize: 13, color: C.text2 },
  note: { fontSize: 12, color: C.text3, marginTop: 12 },
  btn: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.btnSecondaryBg,
  },
  btnText: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
});
