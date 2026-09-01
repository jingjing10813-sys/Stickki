import { Image } from "expo-image";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { Member } from "@/types";

/** 보드 상단 멤버 아바타 줄 — 웹 MemberBar의 RN 구현 */
export function MemberBar({ members }: { members: Member[] }) {
  if (!members.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.container}
    >
      {members.map((m) => (
        <View key={m.id} style={styles.member}>
          <View style={[styles.avatarRing, { borderColor: m.color ?? "#FF6B6B" }]}>
            {m.avatar?.startsWith("data:") ? (
              <Image source={{ uri: m.avatar }} style={styles.avatarImg} contentFit="contain" />
            ) : (
              <Text style={styles.avatarEmoji}>{m.avatar ?? "🐶"}</Text>
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {m.name}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 0 },
  row: { paddingHorizontal: 24, paddingBottom: 10, gap: 14 },
  member: { alignItems: "center", gap: 3, width: 48 },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 38, height: 38 },
  avatarEmoji: { fontSize: 22 },
  name: { fontSize: 10, fontWeight: "600", color: "rgba(20,20,20,0.6)", maxWidth: 48 },
});
