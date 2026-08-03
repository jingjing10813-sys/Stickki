import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { DraggablePostIt } from "@/components/draggable-post-it";
import { StickkiColors } from "@/constants/stickki-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Group, Task } from "@/types";

const C = StickkiColors.light;
const GAP = 14;
const BOARD_PAD_TOP = 16;
const TRASH_ZONE = 120; // 화면 하단 삭제 영역 높이

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
  const { width, height } = useWindowDimensions();

  const [group, setGroup] = useState<Group | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingMotto, setEditingMotto] = useState(false);
  const [mottoDraft, setMottoDraft] = useState("");
  const [dragging, setDragging] = useState(false);

  const cardSize = (width - 48 - GAP) / 2;

  const slotOf = useCallback(
    (i: number) => ({
      left: 24 + (i % 2) * (cardSize + GAP),
      top: BOARD_PAD_TOP + Math.floor(i / 2) * (cardSize + GAP),
    }),
    [cardSize]
  );

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
    const patch = {
      status: done ? "done" : "pending",
      completed_at: done ? new Date().toISOString() : null,
    } as const;
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
    await supabase.from("tasks").update(patch).eq("id", task.id);
  }

  async function handleDrop(task: Task, dx: number, dy: number, absoluteY: number) {
    setDragging(false);

    // 휴지통 영역에 드롭 → 삭제
    if (absoluteY > height - TRASH_ZONE) {
      setTasks((ts) => ts.filter((t) => t.id !== task.id));
      await supabase.from("tasks").delete().eq("id", task.id);
      return;
    }

    // 드롭 지점의 슬롯 계산 → 두 카드 자리 교환 (웹과 동일한 스왑 방식)
    const i = tasks.findIndex((t) => t.id === task.id);
    if (i < 0) return;
    const src = slotOf(i);
    const centerX = src.left + cardSize / 2 + dx;
    const centerY = src.top + cardSize / 2 + dy;
    const col = centerX > 24 + cardSize + GAP / 2 ? 1 : 0;
    const maxRow = Math.ceil(tasks.length / 2) - 1;
    const row = Math.min(
      Math.max(Math.round((centerY - BOARD_PAD_TOP - cardSize / 2) / (cardSize + GAP)), 0),
      maxRow
    );
    const j = Math.min(row * 2 + col, tasks.length - 1);
    if (j === i) return;

    const a = tasks[i];
    const b = tasks[j];
    const next = [...tasks];
    next[i] = { ...b, position_x: a.position_x, position_y: a.position_y };
    next[j] = { ...a, position_x: b.position_x, position_y: b.position_y };
    setTasks(next);
    await Promise.all([
      supabase
        .from("tasks")
        .update({ position_x: b.position_x, position_y: b.position_y })
        .eq("id", a.id),
      supabase
        .from("tasks")
        .update({ position_x: a.position_x, position_y: a.position_y })
        .eq("id", b.id),
    ]);
  }

  const boardHeight = useMemo(
    () => Math.ceil(tasks.length / 2) * (cardSize + GAP) + 160,
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
        {/* 헤더: 방 이름 + 가훈(탭하여 수정) + 목록/마이페이지 */}
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
            style={styles.headerBtn}
            onPress={() => router.push(`/group/${group.id}/list`)}
            hitSlop={8}
          >
            <Text style={styles.headerBtnIcon}>☰</Text>
          </Pressable>
          <Pressable
            style={[styles.headerBtn, styles.noAutoMargin]}
            onPress={() => router.push(`/group/${group.id}/mypage`)}
            hitSlop={8}
          >
            <Text style={styles.headerBtnIcon}>👤</Text>
          </Pressable>
        </View>

        {/* 보드 */}
        <ScrollView contentContainerStyle={{ height: boardHeight }} scrollEnabled={!dragging}>
          {tasks.map((task, i) => {
            const slot = slotOf(i);
            return (
              <DraggablePostIt
                key={task.id}
                task={task}
                size={cardSize}
                left={slot.left + jitter(task.id, 6)}
                top={slot.top + jitter(task.id + "y", 6)}
                onTap={(t) => router.push(`/group/${group.id}/task/${t.id}`)}
                onToggleDone={toggleDone}
                onDragStart={() => setDragging(true)}
                onDrop={handleDrop}
              />
            );
          })}
          {tasks.length === 0 && (
            <View style={[styles.center, { paddingTop: 120 }]}>
              <Text style={styles.faint}>아직 붙은 포스트잇이 없어요</Text>
              <Text style={styles.faint}>+ 버튼으로 첫 포스트잇을 붙여보세요!</Text>
            </View>
          )}
        </ScrollView>

        {/* 드래그 중 휴지통 존 / 평소 FAB */}
        {dragging ? (
          <View style={styles.trashZone} pointerEvents="none">
            <Text style={styles.trashIcon}>🗑️</Text>
            <Text style={styles.trashText}>여기로 끌면 삭제돼요</Text>
          </View>
        ) : (
          <Pressable style={styles.fab} onPress={() => setShowAdd(true)}>
            <Text style={styles.fabIcon}>+</Text>
          </Pressable>
        )}

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
  motto: { fontSize: 13, color: C.text3, fontStyle: "italic" },
  mottoInput: {
    flex: 1,
    fontSize: 13,
    color: "#1a1a1a",
    borderBottomWidth: 1,
    borderColor: C.borderMid,
    paddingVertical: 2,
  },
  headerBtn: {
    marginLeft: "auto",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.btnSecondaryBg,
  },
  noAutoMargin: { marginLeft: 0 },
  headerBtnIcon: { fontSize: 15, color: "#1a1a1a" },
  faint: { fontSize: 13, color: C.text3 },
  smallBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.btnSecondaryBg,
  },
  smallBtnText: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  trashZone: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(229,57,53,0.12)",
    borderTopWidth: 1,
    borderColor: "rgba(229,57,53,0.3)",
  },
  trashIcon: { fontSize: 26 },
  trashText: { fontSize: 12, fontWeight: "600", color: "#B91C1C" },
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
