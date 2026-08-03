import { Canvas, Path, useCanvasRef } from "@shopify/react-native-skia";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { DotPattern } from "@/components/dot-pattern";
import { PEN_COLORS, PROFILE_COLORS, StickkiColors } from "@/constants/stickki-theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const C = StickkiColors.light;
const STROKE_WIDTH = 7;

type Stroke = { d: string; color: string };

/** 온보딩 프로필 그리기 — 웹 profile-setup 캔버스의 Skia 구현 */
export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { width } = useWindowDimensions();
  const canvasSize = Math.min(width - 48, 340);

  const canvasRef = useCanvasRef();
  const [name, setName] = useState("스티끼");
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[2]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke | null>(null);
  const [saving, setSaving] = useState(false);

  const pan = Gesture.Pan()
    .minDistance(1)
    .onBegin((e) => {
      setCurrent({ d: `M ${e.x} ${e.y}`, color: penColor });
    })
    .onUpdate((e) => {
      setCurrent((c) => (c ? { ...c, d: `${c.d} L ${e.x} ${e.y}` } : c));
    })
    .onFinalize(() => {
      setCurrent((c) => {
        if (c) setStrokes((s) => [...s, c]);
        return null;
      });
    })
    .runOnJS(true);

  const hasDrawing = strokes.length > 0 || current !== null;

  async function handleSave() {
    if (!user || !hasDrawing || saving) return;
    const image = canvasRef.current?.makeImageSnapshot();
    if (!image) return;
    setSaving(true);
    const avatar = `data:image/png;base64,${image.encodeToBase64()}`;
    const color = PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)];
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, name: name.trim() || "스티끼", avatar, color });
    if (!error) {
      await refreshProfile();
      router.replace("/");
      return;
    }
    setSaving(false);
  }

  return (
    <View style={styles.root}>
      <DotPattern />
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>내 얼굴을 그려주세요!</Text>
        <Text style={styles.desc}>포스트잇에 붙을 나만의 캐릭터예요</Text>

        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="이름"
          placeholderTextColor="#CECECE"
          maxLength={10}
        />

        <GestureDetector gesture={pan}>
          <View style={[styles.canvasWrap, { width: canvasSize, height: canvasSize }]}>
            <Canvas ref={canvasRef} style={{ width: canvasSize, height: canvasSize }}>
              {strokes.map((s, i) => (
                <Path
                  key={i}
                  path={s.d}
                  color={s.color}
                  style="stroke"
                  strokeWidth={STROKE_WIDTH}
                  strokeCap="round"
                  strokeJoin="round"
                />
              ))}
              {current && (
                <Path
                  path={current.d}
                  color={current.color}
                  style="stroke"
                  strokeWidth={STROKE_WIDTH}
                  strokeCap="round"
                  strokeJoin="round"
                />
              )}
            </Canvas>
          </View>
        </GestureDetector>

        <View style={styles.tools}>
          {PEN_COLORS.map((c) => (
            <Pressable
              key={c}
              style={[styles.pen, { backgroundColor: c }, penColor === c && styles.penActive]}
              onPress={() => setPenColor(c)}
            />
          ))}
          <Pressable style={styles.clearBtn} onPress={() => setStrokes([])}>
            <Text style={styles.clearText}>지우기</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.saveBtn, (!hasDrawing || saving) && styles.disabled]}
          onPress={handleSave}
          disabled={!hasDrawing || saving}
        >
          {saving ? (
            <ActivityIndicator color={C.btnPrimaryText} />
          ) : (
            <Text style={styles.saveText}>완료</Text>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  desc: { fontSize: 13, color: C.text3, marginTop: 4 },
  nameInput: {
    marginTop: 16,
    width: 180,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    backgroundColor: C.bg,
  },
  canvasWrap: {
    marginTop: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderMid,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  tools: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 },
  pen: { width: 32, height: 32, borderRadius: 16 },
  penActive: { borderWidth: 3, borderColor: "rgba(0,0,0,0.25)" },
  clearBtn: {
    marginLeft: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.btnSecondaryBg,
  },
  clearText: { fontSize: 12, fontWeight: "600", color: "#1a1a1a" },
  saveBtn: {
    marginTop: 24,
    width: "100%",
    height: 48,
    borderRadius: 16,
    backgroundColor: C.btnPrimaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: C.btnPrimaryText, fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.3 },
});
