# Stickki(스티끼) 개발 핸드오프

같이 사는 사람들이 방을 만들고 할 일/쪽지를 포스트잇으로 주고받는 협업 앱. 이 문서는 새로 합류하는 개발자가 처음 세팅부터 "여기 왜 이렇게 돼있지?" 하는 부분까지 빠르게 파악하도록 정리한 문서.

## 1. 기술 스택
- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (Postgres DB + Auth + Realtime)
- framer-motion (애니메이션)

## 2. 저장소 & 브랜치
- GitHub: https://github.com/jingjing10813-sys/Stickki
- 작업 중인 브랜치: `feature/onboarding-switch-account` (아직 `main` 미머지)
- 정리 필요한 다른 브랜치들 — 각각 뭐가 남았는지 / main에 반영됐는지 확인부터 하고 시작하는 걸 추천:
  - `feat/login`, `feature/Design`, `design/main-page-card`, `feature/memoList`, `feature/memo-mypage`

## 3. 시작하기
```bash
git clone https://github.com/jingjing10813-sys/Stickki.git
npm install
cp .env.local.example .env.local   # 아래 키 채워넣기 (값은 담당자에게 별도로 전달받기)
npm run dev
```
필요한 env 키:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Supabase 프로젝트도 collaborator로 초대받아야 DB/Auth 설정을 직접 볼 수 있음 (담당자에게 요청).

## 4. 폴더 구조
```
src/
  app/
    page.tsx              방 생성/입장 온보딩 위저드 (?step= 으로 각 단계 미리보기 가능)
    login/, signup/        로그인·회원가입 (OTP 이메일 인증)
    [groupId]/             방 화면(포스트잇 보드) — 동적 라우트, 첫입장 튜토리얼 포함
    [groupId]/[taskId]/    할 일/쪽지 상세
    [groupId]/list/        목록 뷰
    [groupId]/mypage/      마이페이지 + 초대코드 + 방정보
    not-found.tsx          404 페이지
    proxy.ts               미들웨어 (인증 라우팅 가드)
  components/ui/           재사용 컴포넌트 (PostItCard, StickkiLogos 등 SVG 캐릭터/로고 포함)
  components/modals/       모달
  lib/                     supabase 클라이언트, auth-context, theme(다크모드)
  hooks/                   커스텀 훅
  types/                   공용 타입
화면디자인/                 Figma 목업 PNG + 실사용 SVG 원본
```

## 5. 알아두면 헤매지 않는 것들
- **`AGENTS.md`부터 읽기**: 이 프로젝트의 Next.js 버전은 학습 데이터 기준 관례와 다른 부분이 있음(`middleware.ts` 대신 `src/proxy.ts` 사용 등). 뭔가 이상하게 느껴지면 먼저 `node_modules/next/dist/docs/` 확인
- **인증 라우팅**: `src/proxy.ts`가 세션 쿠키(`sb-*-auth-token`) 없으면 `/login`으로 리다이렉트. `/login`, `/signup`만 public 예외
- **`[groupId]` 라우트는 한 단계짜리 동적 라우트**: 존재하지 않는 방 id로 들어가면 클라이언트에서 DB 조회 후 `notFound()` 호출로 진짜 404로 전환됨. 서버 응답 자체가 200으로 나가는 건 Next App Router에서 정상 동작 (버그 아님)
- **다크모드는 반드시 CSS 변수로**: `globals.css`의 `--bg`, `--card`, `--text-1` 등 + `t-text`, `t-card` 유틸 클래스 사용. 하드코딩 hex 색 쓰면 다크모드에서 깨짐 (실제로 마이페이지가 이 이유로 한 번 고쳐졌음)
- **첫 입장 튜토리얼**: `[groupId]/page.tsx`의 `tutorialStep`. `localStorage`의 `tutorial_seen_${groupId}`로 "방 + 브라우저" 단위 1회만 노출 (계정 기준 아님). `?reset-tutorial=1`로 강제 재실행
- **미리보기 경로**: `/?step=landing|create-name|create-motto|join|profile-setup|loading` — 로그인 세션 있어도 리다이렉트 없이 온보딩 각 단계 바로 확인 가능
- **디자인 작업 시**: `화면디자인/` 폴더 목업 PNG랑 픽셀 단위(사이즈/간격/radius)로 맞추는 걸 기준으로 삼아왔음. SVG 아이콘/캐릭터는 되도록 `화면디자인/svg로고/` 원본을 그대로 가져다 씀

## 6. Supabase 설정 메모
- Authentication → Providers → Email: "Confirm email" 켜져 있음 (링크 방식이 아니라 6자리 OTP 인증코드 방식 사용)
- Authentication → Emails → Magic Link 템플릿에 `{{ .Token }}` 추가되어 있어야 코드가 실제로 옴 (기본 템플릿엔 없어서 한 번 겪었던 이슈)
- 인증 메일 발신 주소가 아직 Supabase 기본 도메인 — 커스텀 도메인/SMTP 전환은 보류 중

## 7. 현재 상태
**완료**: 온보딩 위저드, 로딩·스플래시·404 화면, 포스트잇 카드 그리드, 리액션 피커, 마이페이지 다크모드 대응

**미완료/보류**:
- 방 첫입장 튜토리얼 — 화면/애니메이션은 구현되어 있으나 아직 정상 동작 확인 안 됨, QA 필요
- SNS 로그인 연결(카카오/네이버/애플/구글) — 버튼 UI와 `signInWithOAuth` 호출까진 붙어있으나 실제 연동 안 됨(각 제공자 개발자 콘솔 앱 등록 + Supabase Auth Provider 설정 필요)
- 이메일 인증 회원가입(OTP) — 플로우는 구현되어 있으나 아직 정상 동작 확인 안 됨
- 인증 메일 발신 도메인 커스터마이징
- iOS 시스템 스타일 적용 — 달력, 버튼 등 UI 컴포넌트에 iOS 네이티브 룩앤필 입히기
- 위 다른 feature 브랜치들 정리·머지
- (필요시) "진짜 첫 사용자"를 서버/계정 기준으로 판별하는 로직 — 현재는 브라우저 localStorage 기준

## 8. 배포
- Vercel에 배포되어 있음: https://stickki-project.vercel.app
- 새 개발자를 Vercel 프로젝트에 collaborator로 초대 필요
- 어느 브랜치가 자동배포 대상인지(main push 시 자동배포 여부), env 변수가 Vercel 쪽에도 별도로 설정돼 있는지는 담당자가 확인해서 알려줘야 함

## 9. 테스트 / 기타 참고
- 자동화된 테스트 코드 없음 — 지금까지 전부 수동 QA로 확인해왔음
- 개발 중 이메일 인증 테스트는 담당자 개인 이메일로 해왔음
- 새 개발자용 테스트 계정을 Supabase 대시보드(Authentication → Users → Add user, Auto Confirm User 체크)에서 별도로 만들어둠. 계정 정보(이메일/비밀번호)는 보안상 이 문서에 적지 않음 — 담당자에게 별도 채널(카톡 등)로 요청해서 전달받을 것
- `npm run dev`를 켜놓은 상태에서 같은 폴더에 `npm run build`(프로덕션 빌드)를 돌리면 `.next` 캐시가 꼬여서 멀쩡한 페이지가 404처럼 보일 수 있음 — 그럴 땐 `.next` 폴더 삭제 후 `npm run dev` 재시작

## 10. 알려진 이슈
- 없음 (발견되는 대로 이 섹션에 추가)
