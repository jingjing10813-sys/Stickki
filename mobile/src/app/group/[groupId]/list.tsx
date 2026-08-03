import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DotPattern } from "@/components/dot-pattern";
import { BackIcon } from "@/components/stickki-icons";
import { StickkiColors } from "@/constants/stickki-theme";
import { supabase } from "@/lib/supabase";
import type { Task } from "@/types";

const C = StickkiColors.light;
const FILTERS = [
  { key: "all", label: "전체" },
  { key: "todo", label: "할 일" },
  { key: "note", label: "쪽지" },
  { key: "done", label: "완료" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function ListScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    if (!groupId) return;
    supabase
      .from("tasks")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTasks((data as Task[]) ?? []));

    const channel = supabase
      .channel(`list-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `group_id=eq.${groupId}` },
        async () => {
          const { data } = await supabase
            .from("tasks")
            .select("*")
            .eq("group_id", groupId)
            .order("created_at", { ascending: false });
          setTasks((data as Task[]) ?? []);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "done") return tasks.filter((t) => t.status === "done");
    return tasks.filter((t) => t.type === filter && t.status !== "done");
  }, [tasks, filter]);

  return (
    <View style={styles.root}>
      <DotPattern />
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}>
            <BackIcon />
          </Pressable>
          <Text style={styles.headerTitle}>목록</Text>
        </View>

        <View style={styles.tabs}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.tab, filter === f.key && styles.tabOn]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.tabText, filter === f.key && styles.tabTextOn]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>여기엔 아직 아무것도 없어요</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/group/${groupId}/task/${item.id}`)}
            >
              <View style={[styles.colorBar, { backgroundColor: item.color ?? "#FEF9C3" }]} />
              <View style={styles.rowBody}>
                <Text
                  style={[styles.rowText, item.status === "done" && styles.rowTextDone]}
                  numberOfLines={2}
                >
                  {item.content}
                </Text>
                <Text style={styles.rowMeta}>
                  {item.type === "todo" ? "할 일" : "쪽지"}
                  {item.assignee_name ? ` · ${item.assignee_name}` : ""} ·{" "}
                  {formatDate(item.created_at)}
                  {item.due_date ? ` · ~${formatDate(item.due_date)}` : ""}
                </Text>
              </View>
              {item.status === "done" && <Text style={styles.doneBadge}>완료</Text>}
            </Pressable>
          )}
        />
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
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 24, paddingBottom: 12 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.btnSecondaryBg,
  },
  tabOn: { backgroundColor: "#1a1a1a" },
  tabText: { fontSize: 12, fontWeight: "600", color: C.text3 },
  tabTextOn: { color: "#fff" },
  listContent: { paddingHorizontal: 24, paddingBottom: 40, gap: 10 },
  empty: { textAlign: "center", marginTop: 80, fontSize: 13, color: C.text3 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgElevated,
    padding: 12,
  },
  colorBar: { width: 6, alignSelf: "stretch", borderRadius: 3 },
  rowBody: { flex: 1, gap: 3 },
  rowText: { fontSize: 14, color: "#1a1a1a", lineHeight: 20 },
  rowTextDone: { textDecorationLine: "line-through", color: C.text3 },
  rowMeta: { fontSize: 11, color: C.text3 },
  doneBadge: { fontSize: 11, fontWeight: "700", color: "#16A34A" },
});
