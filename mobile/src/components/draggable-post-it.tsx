import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import type { Task } from "@/types";

/** 보드 포스트잇: 탭=상세, 길게 눌러 드래그=자리교환/휴지통 삭제 */
export function DraggablePostIt({
  task,
  left,
  top,
  size,
  onTap,
  onToggleDone,
  onDragStart,
  onDrop,
}: {
  task: Task;
  left: number;
  top: number;
  size: number;
  onTap: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onDragStart: (id: string) => void;
  onDrop: (task: Task, dx: number, dy: number, absoluteY: number) => void;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const active = useSharedValue(false);

  const pan = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart(() => {
      active.value = true;
      runOnJS(onDragStart)(task.id);
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(onDrop)(task, e.translationX, e.translationY, e.absoluteY);
    })
    .onFinalize(() => {
      active.value = false;
      tx.value = withSpring(0);
      ty.value = withSpring(0);
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${task.rotation ?? 0}deg` },
      { scale: withSpring(active.value ? 1.07 : 1) },
    ],
    zIndex: active.value ? 10 : 1,
    elevation: active.value ? 12 : 3,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.card,
          { left, top, width: size, height: size, backgroundColor: task.color ?? "#FEF9C3" },
          task.status === "done" && styles.cardDone,
          animStyle,
        ]}
      >
        <Pressable style={styles.inner} onPress={() => onTap(task)}>
          {task.type === "note" && <View style={styles.pin} />}
          {task.type === "todo" && (
            <Pressable
              style={[styles.checkbox, task.status === "done" && styles.checkboxOn]}
              onPress={() => onToggleDone(task)}
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
          <View style={styles.footer}>
            {task.assignee_name ? <Text style={styles.assignee}>{task.assignee_name}</Text> : null}
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
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    borderRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  inner: { flex: 1, padding: 12 },
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
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  assignee: { fontSize: 11, color: "rgba(20,20,20,0.5)", fontWeight: "600" },
  reactions: { fontSize: 11 },
});
