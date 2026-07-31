import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth-context";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stickki",
  description: "우리 사이, 더 끈끈하게.",
  // 홈 화면 추가 시 브라우저 UI 없는 standalone 실행 (앱 체감 테스트용)
  appleWebApp: {
    capable: true,
    title: "Stickki",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // 노치 영역까지 화면을 채우고 safe-area-inset으로 여백 제어
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${urbanist.variable} h-full`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap"
        />
        {/* 테마 깜빡임 방지 */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('together-theme')||'light';document.documentElement.setAttribute('data-theme',t);})();` }} />
      </head>
      <body className="h-full antialiased">
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
