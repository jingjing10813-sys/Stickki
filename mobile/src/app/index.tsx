import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { StickkiColors } from "@/constants/stickki-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const C = StickkiColors.light;

/**
 * 인증/라우팅 게이트 — 웹 proxy.ts + 자동 복귀 로직.
 * RLS 덕에 groups select 결과가 곧 "내가 속한 방"이라 별도 필터 불필요.
 */
export default function IndexScreen() {
  const { user, profile, loading } = useAuth();
  const [groupId, setGroupId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("groups")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => setGroupId(data?.[0]?.id ?? null));
  }, [user]);

  if (loading || (user && groupId === undefined)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (!profile) return <Redirect href="/profile-setup" />;
  if (groupId) return <Redirect href={`/group/${groupId}`} />;
  return <Redirect href="/onboarding" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
});
