import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DotPattern } from "@/components/dot-pattern";
import { BackIcon } from "@/components/stickki-icons";
import { StickkiColors } from "@/constants/stickki-theme";
import { supabase } from "@/lib/supabase";
import type { Member, Task } from "@/types";

const C = StickkiColors.light;
const EMOJIS = ["❤️", "😂", "👍", "🔥", "😮", "😢", "🎉", "👀"];

function dateAfter(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function TaskDetailScreen() {
  const { groupId, taskId } = useLocalSearchParams<{ groupId: string; taskId: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [content, setContent] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!taskId || !groupId) return;
    supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle()
      .then(({ data }) => {
        const t = data as Task | null;
        setTask(t);
        if (t) {
          setContent(t.content);
          setAssignee(t.assignee_name);
          setDueDate(t.due_date ? t.due_date.slice(0, 10) : null);
        }
      });
    supabase
      .from("groups")
      .select("members")
      .eq("id", groupId)
      .maybeSingle()
      .then(({ data }) => setMembers((data?.members as Member[]) ?? []));
  }, [taskId, groupId]);

  if (!task) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  async function handleSave() {
    if (!task || !content.trim() || saving) return;
    setSaving(true);
    await supabase
      .from("tasks")
      .update({ content: content.trim(), assignee_name: assignee, due_date: dueDate })
      .eq("id", task.id);
    router.back();
  }

  async function toggleDone() {
    if (!task) return;
    const done = task.status !== "done";
    const patch = {
      status: done ? "done" : "pending",
      completed_at: done ? new Date().toISOString() : null,
    } as const;
    setTask({ ...task, ...patch });
    await supabase.from("tasks").update(patch).eq("id", task.id);
  }

  async function togglePin() {
    if (!task) return;
    setTask({ ...task, is_pinned: !task.is_pinned });
    await supabase.from("tasks").update({ is_pinned: !task.is_pinned }).eq("id", task.id);
  }

  async function toggleReaction(emoji: string) {
    if (!task) return;
    // 웹과 동일한 0/1 토글 (인원 카운트는 출시 후 개선 항목)
    const current = task.reactions?.[emoji] ?? 0;
    const reactions = { ...(task.reactions ?? {}), [emoji]: current > 0 ? 0 : 1 };
    setTask({ ...task, reactions });
    await supabase.from("tasks").update({ reactions }).eq("id", task.id);
  }

  function confirmDelete() {
    Alert.alert("삭제", "이 포스트잇을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await supabase.from("tasks").delete().eq("id", task!.id);
          router.back();
        },
      },
    ]);
  }

  const dueChips = [
    { label: "오늘", value: dateAfter(0) },
    { label: "내일", value: dateAfter(1) },
    { label: "일주일", value: dateAfter(7) },
    { label: "없음", value: null },
  ];

  return (
    <View style={styles.root}>
      <DotPattern />
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}>
            <BackIcon />
          </Pressable>
          <Text style={styles.headerTitle}>{task.type === "todo" ? "할 일" : "쪽지"}</Text>
          <Pressable style={styles.deleteBtn} onPress={confirmDelete} hitSlop={8}>
            <Text style={styles.deleteText}>삭제</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* 내용 */}
          <View style={[styles.paper, { backgroundColor: task.color ?? "#FEF9C3" }]}>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={100}
            />
          </View>

          {/* 완료 / 핀 */}
          {task.type === "todo" ? (
            <Pressable style={styles.toggleRow} onPress={toggleDone}>
              <View style={[styles.checkbox, task.status === "done" && styles.checkboxOn]}>
                {task.status === "done" && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.toggleLabel}>
                {task.status === "done" ? "완료됨" : "완료로 표시"}
              </Text>
            </Pressable>
          ) : (
            <Pressable style={styles.toggleRow} onPress={togglePin}>
              <Text style={styles.toggleLabel}>{task.is_pinned ? "📌 고정됨" : "고정하기"}</Text>
            </Pressable>
          )}

          {/* 담당자 */}
          {task.type === "todo" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>담당자</Text>
              <View style={styles.chips}>
                {[...members.map((m) => m.name), null].map((name) => (
                  <Pressable
                    key={name ?? "none"}
                    style={[styles.chip, assignee === name && styles.chipOn]}
                    onPress={() => setAssignee(name)}
                  >
                    <Text style={[styles.chipText, assignee === name && styles.chipTextOn]}>
                      {name ?? "없음"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* 마감일 */}
          {task.type === "todo" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                마감일{dueDate ? ` · ${dueDate}` : ""}
              </Text>
              <View style={styles.chips}>
                {dueChips.map((c) => (
                  <Pressable
                    key={c.label}
                    style={[styles.chip, dueDate === c.value && styles.chipOn]}
                    onPress={() => setDueDate(c.value)}
                  >
                    <Text style={[styles.chipText, dueDate === c.value && styles.chipTextOn]}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* 리액션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>리액션</Text>
            <View style={styles.chips}>
              {EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  style={[styles.emojiBtn, (task.reactions?.[e] ?? 0) > 0 && styles.emojiOn]}
                  onPress={() => toggleReaction(e)}
                >
                  <Text style={styles.emoji}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={[styles.saveBtn, (!content.trim() || saving) && styles.disabled]}
            onPress={handleSave}
            disabled={!content.trim() || saving}
          >
            <Text style={styles.saveText}>{saving ? "저장 중..." : "저장"}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a", flex: 1 },
  deleteBtn: { paddingHorizontal: 4 },
  deleteText: { fontSize: 13, fontWeight: "600", color: "#E53935" },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, gap: 14 },
  paper: {
    borderRadius: 6,
    padding: 16,
    minHeight: 120,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  contentInput: { fontSize: 15, color: "#1a1a1a", lineHeight: 22, textAlignVertical: "top" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: C.borderMid,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: "#1a1a1a", borderColor: "#1a1a1a" },
  checkmark: { color: "#fff", fontSize: 12, fontWeight: "700" },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: C.text2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.btnSecondaryBg,
  },
  chipOn: { backgroundColor: "#1a1a1a" },
  chipText: { fontSize: 12, fontWeight: "600", color: C.text2 },
  chipTextOn: { color: "#fff" },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.btnSecondaryBg,
  },
  emojiOn: { backgroundColor: "#FEF3C7", borderWidth: 1.5, borderColor: "#F59E0B" },
  emoji: { fontSize: 18 },
  saveBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: C.btnPrimaryBg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  saveText: { color: C.btnPrimaryText, fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.3 },
});
