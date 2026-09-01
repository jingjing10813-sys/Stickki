import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { NOTE_COLORS, StickkiColors, TODO_COLORS } from "@/constants/stickki-theme";
import { supabase } from "@/lib/supabase";

const C = StickkiColors.light;

export function AddTaskModal({
  visible,
  groupId,
  authorName,
  onClose,
}: {
  visible: boolean;
  groupId: string;
  authorName: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<"todo" | "note">("todo");
  const [content, setContent] = useState("");
  const [colorIndex, setColorIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const colors = type === "todo" ? TODO_COLORS : NOTE_COLORS;

  async function handleSubmit() {
    if (!content.trim() || saving) return;
    setSaving(true);
    await supabase.from("tasks").insert({
      group_id: groupId,
      content: content.trim(),
      type,
      assignee_name: type === "todo" ? authorName : null,
      author_name: authorName,
      status: "pending",
      position_x: Date.now(), // 웹과 동일: 정렬 키로 사용
      position_y: 0,
      rotation: Math.random() * 8 - 4,
      color: colors[colorIndex % colors.length],
      is_pinned: type === "note",
    });
    setSaving(false);
    setContent("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdropTouch} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.segment}>
            {(["todo", "note"] as const).map((t) => (
              <Pressable
                key={t}
                style={[styles.segmentBtn, type === t && styles.segmentOn]}
                onPress={() => {
                  setType(t);
                  setColorIndex(0);
                }}
              >
                <Text style={[styles.segmentText, type === t && styles.segmentTextOn]}>
                  {t === "todo" ? "할 일" : "쪽지"}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            value={content}
            onChangeText={setContent}
            placeholder={type === "todo" ? "어떤 할 일인가요?" : "어떤 쪽지를 남길까요?"}
            placeholderTextColor="#CECECE"
            multiline
            autoFocus
            maxLength={100}
          />

          <View style={styles.colorRow}>
            {colors.map((c, i) => (
              <Pressable
                key={`${c}-${i}`}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  colorIndex === i && styles.colorDotOn,
                ]}
                onPress={() => setColorIndex(i)}
              />
            ))}
          </View>

          <Pressable
            style={[styles.submit, (!content.trim() || saving) && styles.disabled]}
            onPress={handleSubmit}
            disabled={!content.trim() || saving}
          >
            <Text style={styles.submitText}>{saving ? "붙이는 중..." : "포스트잇 붙이기"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: C.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    gap: 14,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: C.btnSecondaryBg,
    borderRadius: 12,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentOn: { backgroundColor: C.bg },
  segmentText: { fontSize: 13, fontWeight: "600", color: C.text3 },
  segmentTextOn: { color: "#1a1a1a" },
  input: {
    minHeight: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    fontSize: 14,
    color: "#1a1a1a",
    textAlignVertical: "top",
  },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  colorDotOn: { borderWidth: 2.5, borderColor: "rgba(0,0,0,0.4)" },
  submit: {
    height: 48,
    borderRadius: 16,
    backgroundColor: C.btnPrimaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: C.btnPrimaryText, fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.3 },
});
