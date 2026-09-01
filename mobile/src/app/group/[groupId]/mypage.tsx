import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DotPattern } from "@/components/dot-pattern";
import { BackIcon } from "@/components/stickki-icons";
import { StickkiColors } from "@/constants/stickki-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Group } from "@/types";

const C = StickkiColors.light;

export default function MyPageScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (!groupId) return;
    supabase
      .from("groups")
      .select("id, name, motto, invite_code, members")
      .eq("id", groupId)
      .maybeSingle()
      .then(({ data }) => setGroup((data as Group | null) ?? null));
  }, [groupId]);

  function confirmLeave() {
    Alert.alert("방 나가기", "이 방에서 나갈까요?\n작성한 포스트잇은 방에 남아요.", [
      { text: "취소", style: "cancel" },
      {
        text: "나가기",
        style: "destructive",
        onPress: async () => {
          if (!group) return;
          await supabase.rpc("leave_group", { g: group.id });
          router.replace("/");
        },
      },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "계정 탈퇴",
      "탈퇴하면 계정과 프로필이 완전히 삭제되고 복구할 수 없어요.\n정말 탈퇴할까요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.rpc("delete_account");
            if (error) {
              Alert.alert("오류", "탈퇴 처리에 실패했어요. 잠시 후 다시 시도해주세요.");
              return;
            }
            await signOut();
            router.replace("/login");
          },
        },
      ]
    );
  }

  return (
    <View style={styles.root}>
      <DotPattern />
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}>
            <BackIcon />
          </Pressable>
          <Text style={styles.headerTitle}>마이페이지</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* 프로필 */}
          <View style={styles.profileCard}>
            {profile?.avatar?.startsWith("data:") ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} contentFit="contain" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarEmoji}>{profile?.avatar ?? "🐶"}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.name ?? "스티끼"}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
            <Pressable style={styles.editBtn} onPress={() => router.push("/profile-setup")}>
              <Text style={styles.editBtnText}>수정</Text>
            </Pressable>
          </View>

          {/* 초대코드 */}
          {group && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>초대코드</Text>
              <Text style={styles.inviteCode}>{group.invite_code}</Text>
              <Text style={styles.sectionDesc}>
                함께 사는 사람에게 이 코드를 알려주면 방에 들어올 수 있어요
              </Text>
            </View>
          )}

          {/* 멤버 */}
          {group && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>멤버 {group.members.length}명</Text>
              <Text style={styles.sectionDesc}>
                {group.members.map((m) => m.name).join(", ")}
              </Text>
            </View>
          )}

          {/* 액션 */}
          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={confirmLeave}>
              <Text style={styles.actionText}>방 나가기</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={signOut}>
              <Text style={styles.actionText}>로그아웃</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={confirmDeleteAccount}>
              <Text style={[styles.actionText, styles.danger]}>계정 탈퇴</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    gap: 12,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, gap: 14 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgElevated,
    padding: 16,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 28 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  profileEmail: { fontSize: 12, color: C.text3, marginTop: 2 },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.btnSecondaryBg,
  },
  editBtnText: { fontSize: 12, fontWeight: "600", color: "#1a1a1a" },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgElevated,
    padding: 16,
    gap: 6,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#1a1a1a" },
  inviteCode: { fontSize: 24, fontWeight: "800", letterSpacing: 4, color: "#1a1a1a" },
  sectionDesc: { fontSize: 12, color: C.text3, lineHeight: 18 },
  actions: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgElevated,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  actionText: { fontSize: 14, color: "#1a1a1a" },
  danger: { color: "#E53935", fontWeight: "600" },
});
