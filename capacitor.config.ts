import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.stickki.app",
  appName: "Stickki",
  webDir: "capacitor-shell",
  server: {
    // 스파이크: 배포된 웹앱을 원격 로드해 실기기 웹뷰 체감 확인용.
    // 정식 출시 빌드는 정적 번들 방식으로 전환 필요 (오프라인 + 심사 대응)
    url: "https://stickki-project.vercel.app",
  },
  ios: {
    contentInset: "never",
  },
};

export default config;
