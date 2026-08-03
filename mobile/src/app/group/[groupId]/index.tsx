import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddTaskModal } from "@/components/add-task-modal";
import { DotPattern } from "@/components/dot-pattern";
import { StickkiColors } from "@/constants/stickki-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Group, Task } from "@/types";

const C = StickkiColors.light;
const GAP = 14;

/** task.id 기반 결정적 지터 — 웹 getPos의 흩뿌리기 축약판 */
function jitter(id: string, range: number) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % (range * 2)) - range;
}

export default function GroupBoardScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { width } = useWindowDimensions();

  const [group, setGroup] = useState<Group | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingMotto, setEditingMotto] = useState(false);
  const [mottoDraft, setMottoDraft] = useState("");

  const cardSize = (width - 48 - GAP) / 2;

  const fetchTasks = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("group_id", groupId)
      .order("position_x", { ascending: true });
    setTasks((data as Task[]) ?? []);
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    let mounted = true;

    supabase
      .from("groups")
      .select("id, name, motto, invite_code, members")
      .eq("id", groupId)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setGroup((data as Group | null) ?? null);
        setLoading(false);
      });
    fetchTasks();

    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `group_id=eq.${groupId}` },
        // 단순화: 이벤트 병합 대신 재조회 (데이터 작음)
        () => fetchTasks()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "groups", filter: `id=eq.${groupId}` },
        (payload) => setGroup((g) => (g ? { ...g, ...(payload.new as Partial<Group>) } : g))
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchTasks]);

  async function saveMotto() {
    setEditingMotto(false);
    const next = mottoDraft.trim();
    if (!group || !next || next === group.motto) return;
    setGroup({ ...group, motto: next });
    await supabase.from("groups").update({ motto: next }).eq("id", group.id);
  }

  async function toggleDone(task: Task) {
    const done = task.status !== "done";
    setTasks((ts) =>
      ts.map((t) =>
        t.id === task.id
          ? { ...t, status: done ? "done" : "pending", completed_at: done ? new Date().toISOString() : null }
          : t
      )
    );
    await supabase
      .from("tasks")
      .update({ status: done ? "done" : "pending", completed_at: done ? new Date().toISOString() : null })
      .eq("id", task.id);
  }

  function confirmDelete(task: Task) {
    Alert.alert("포스트잇 삭제", "이 포스트잇을 떼어낼까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          setTasks((ts) => ts.filter((t) => t.id !== task.id));
          await supabase.from("tasks").delete().eq("id", task.id);
        },
      },
    ]);
  }

  const boardHeight = useMemo(
    () => Math.ceil(tasks.length / 2) * (cardSize + GAP) + 120,
    [tasks.length, cardSize]
  );

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
        <Text style={styles.faint}>방을 찾을 수 없어요</Text>
        <Pressable style={styles.smallBtn} onPress={() => router.replace("/onboarding")}>
          <Text style={styles.smallBtnText}>온보딩으로</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <DotPattern />
      <SafeAreaView style={styles.flex}>
        {/* 헤더: 방 이름 + 가훈(탭하여 수정) */}
        <View style={styles.header}>
          <Text style={styles.roomName}>{group.name}</Text>
          {editingMotto ? (
            <TextInput
              style={styles.mottoInput}
              value={mottoDraft}
              onChangeText={setMottoDraft}
              onBlur={saveMotto}
              onSubmitEditing={saveMotto}
              autoFocus
              maxLength={30}
            />
          ) : (
            <Pressable
              onPress={() => {
                setMottoDraft(group.motto);
                setEditingMotto(true);
              }}
            >
              <Text style={styles.motto}>“{group.motto}”</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.mypageBtn}
            onPress={() => router.push(`/group/${group.id}/list`)}
            hitSlop={8}
          >
            <Text style={styles.mypageIcon}>☰</Text>
          </Pressable>
          <Pressable
            style={[styles.mypageBtn, styles.noAutoMargin]}
            onPress={() => router.push(`/group/${group.id}/mypage`)}
            hitSlop={8}
          >
            <Text style={styles.mypageIcon}>👤</Text>
          </Pressable>
        </View>

        {/* 보드 */}
        <ScrollView contentContainerStyle={{ height: boardHeight }}>
          {tasks.map((task, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            return (
              <Pressable
                key={task.id}
                onPress={() => router.push(`/group/${group.id}/task/${task.id}`)}
                onLongPress={() => confirmDelete(task)}
                style={[
                  styles.card,
                  {
                    width: cardSize,
                    height: cardSize,
                    backgroundColor: task.color ?? "#FEF9C3",
                    left: 24 + col * (cardSize + GAP) + jitter(task.id, 6),
                    top: 16 + row * (cardSize + GAP) + jitter(task.id + "y", 6),
                    transform: [{ rotate: `${task.rotation ?? 0}deg` }],
                  },
                  task.status === "done" && styles.cardDone,
                ]}
              >
                {task.type === "note" && <View style={styles.pin} />}
                {task.type === "todo" && (
                  <Pressable
                    style={[styles.checkbox, task.status === "done" && styles.checkboxOn]}
                    onPress={() => toggleDone(task)}
                    hitSlop={8}
                  >
                    {task.status === "done" && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>
                )}
                <Text
                  style={[styles.cardText, task.status === "done" && styles.cardTextDone]}
                  numberOfLines={4}
                >
                  {task.content}
                </Text>
                <View style={styles.cardFooter}>
                  {task.assignee_name ? (
                    <Text style={styles.assignee}>{task.assignee_name}</Text>
                  ) : null}
                  {Object.entries(task.reactions ?? {}).some(([, v]) => v > 0) && (
                    <Text style={styles.reactions}>
                      {Object.entries(task.reactions ?? {})
                        .filter(([, v]) => v > 0)
                        .map(([e]) => e)
                        .join(" ")}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
          {tasks.length === 0 && (
            <View style={[styles.center, { paddingTop: 120 }]}>
              <Text style={styles.faint}>아직 붙은 포스트잇이 없어요</Text>
              <Text style={styles.faint}>+ 버튼으로 첫 포스트잇을 붙여보세요!</Text>
            </View>
          )}
        </ScrollView>

        {/* FAB */}
        <Pressable style={styles.fab} onPress={() => setShowAdd(true)}>
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>

        <AddTaskModal
          visible={showAdd}
          groupId={group.id}
          authorName={profile?.name ?? "스티끼"}
          onClose={() => setShowAdd(false)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  roomName: { fontSize: 18, fontWeight: "800", color: "#1a1a1a" },
  mypageBtn: {
    marginLeft: "auto",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.btnSecondaryBg,
  },
  mypageIcon: { fontSize: 15, color: "#1a1a1a" },
  noAutoMargin: { marginLeft: 0 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reactions: { fontSize: 11 },
  motto: { fontSize: 13, color: C.text3, fontStyle: "italic" },
  mottoInput: {
    flex: 1,
    fontSize: 13,
    color: "#1a1a1a",
    borderBottomWidth: 1,
    borderColor: C.borderMid,
    paddingVertical: 2,
  },
  card: {
    position: "absolute",
    borderRadius: 4,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardDone: { opacity: 0.55 },
  pin: {
    position: "absolute",
    top: -5,
    alignSelf: "center",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#B91C1C",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  checkboxOn: { backgroundColor: "#1a1a1a", borderColor: "#1a1a1a" },
  checkmark: { color: "#fff", fontSize: 11, fontWeight: "700" },
  cardText: { fontSize: 13, color: "#1a1a1a", lineHeight: 19, flex: 1 },
  cardTextDone: { textDecorationLine: "line-through", color: "rgba(20,20,20,0.5)" },
  assignee: { fontSize: 11, color: "rgba(20,20,20,0.5)", fontWeight: "600" },
  faint: { fontSize: 13, color: C.text3 },
  smallBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.btnSecondaryBg,
  },
  smallBtnText: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.fabBg,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabIcon: { color: C.fabIcon, fontSize: 28, fontWeight: "400", marginTop: -2 },
});
