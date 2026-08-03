/**
 * 웹(globals.css)의 CSS 변수 팔레트를 RN 상수로 포팅한 것.
 * 웹과 색이 어긋나면 globals.css 쪽이 원본 기준.
 */
export const StickkiColors = {
  light: {
    bg: "#ffffff",
    bgElevated: "#ffffff",
    card: "rgba(0, 0, 0, 0.04)",
    cardHover: "rgba(0, 0, 0, 0.08)",
    text1: "rgba(20, 20, 20, 1)",
    text2: "rgba(20, 20, 20, 0.65)",
    text3: "rgba(20, 20, 20, 0.4)",
    text4: "rgba(20, 20, 20, 0.2)",
    border: "rgba(0, 0, 0, 0.1)",
    borderMid: "rgba(0, 0, 0, 0.2)",
    dot: "rgba(0, 0, 0, 0.07)",
    surface: "rgba(255, 255, 255, 0.65)",
    fabBg: "#1a1a1a",
    fabIcon: "#ffffff",
    btnPrimaryBg: "#1a1a1a",
    btnPrimaryText: "#ffffff",
    btnSecondaryBg: "rgba(0, 0, 0, 0.06)",
    btnSecondaryText: "rgba(20, 20, 20, 0.5)",
  },
  dark: {
    bg: "#0d0d0f",
    bgElevated: "#1c1c1e",
    card: "rgba(255, 255, 255, 0.05)",
    cardHover: "rgba(255, 255, 255, 0.1)",
    text1: "rgba(240, 240, 240, 1)",
    text2: "rgba(240, 240, 240, 0.65)",
    text3: "rgba(240, 240, 240, 0.4)",
    text4: "rgba(240, 240, 240, 0.2)",
    border: "rgba(255, 255, 255, 0.1)",
    borderMid: "rgba(255, 255, 255, 0.25)",
    dot: "rgba(255, 255, 255, 0.07)",
    surface: "rgba(255, 255, 255, 0.05)",
    fabBg: "#ffffff",
    fabIcon: "#000000",
    btnPrimaryBg: "#ffffff",
    btnPrimaryText: "#000000",
    btnSecondaryBg: "rgba(255, 255, 255, 0.08)",
    btnSecondaryText: "rgba(240, 240, 240, 0.4)",
  },
} as const;

export type StickkiTheme = keyof typeof StickkiColors;

/** 온보딩 프로필 그리기 펜 색 (웹 page.tsx PEN_COLORS와 동일) */
export const PEN_COLORS = ["#EF4444", "#3B82F6", "#000000"] as const;

/** 포스트잇 색 (웹 PostItCard와 동일) */
export const TODO_COLORS = [
  "#FEF9C3", "#F3E8FF", "#FEF9C3", "#DBEAFE",
  "#DCFCE7", "#FEE2E2", "#FEF9C3", "#F3F4F6",
] as const;

export const NOTE_COLORS = [
  "#FEF9C3", "#FEE2E2", "#DBEAFE",
  "#DCFCE7", "#F3E8FF", "#F3F4F6", "#FEF9C3",
] as const;

/** 프로필 배정 색 8종 (웹 page.tsx PROFILE_COLORS와 동일) */
export const PROFILE_COLORS = [
  "#FF6B6B",
  "#FF9F43",
  "#FECA57",
  "#48DBFB",
  "#FF9FF3",
  "#54A0FF",
  "#5F27CD",
  "#01CBC6",
] as const;
