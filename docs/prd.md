**제품 요구사항 정의서 (PRD) - Together
1. 제품 개요**
• **한 줄 정의:** 공동생활 갈등을 줄이기 위해 할 일을 시각화하고 "말없이" 소통하는 Apple HIG 스타일의 화이트보드형 관리 서비스.
• **핵심 가치:** "말해야 하는 구조"를 "보이는 구조"로 전환. 아날로그 포스트잇 UX를 통한 자연스러운 행동 유도.
**2. 디자인 가이드 (Apple HIG & Typography 기반)
 시각적 원칙 (Visual Principles)**
• **Theme:** 다크 모드(`SystemBackground`) 기반의 고급스러운 Glassmorphism.
• **배경:** 은은한 **닷(Dot) 패턴** 화이트보드.
• **타이포그래피:**
    ◦ **국문:** `Pretendard` (깔끔하고 신뢰감 있는 인상)
    ◦ **영문/숫자:** `Urbanist` (세련되고 기하학적인 Modern Sans-serif)
    ◦ **가훈(Motto):** 포인트가 되는 '손글씨' 계열 폰트 사용.
• **효과:** `backdrop-filter: blur(20px)`, `rounded-3xl` (24px 이상), `shadow-2xl` (Soft Layered Shadow).
 **컴포넌트 상세 (Layout & UI)**
• **상단 헤더:** 스크롤 시 뒤가 비치는 블러 처리된 상단 바. 좌측에 **방 이름**, 중앙에 **가훈(Motto)** 배치.
• **타임로그 필터:** iOS 스타일의 **Segmented Control** (오늘, 어제, 이번 주, 전체). 쫀득한 슬라이딩 애니메이션 적용.
• **포스트잇 카드:**
    ◦ **비율:** **4:3 또는 1:1** 고정 규격.
    ◦ **배치:** **Masonry Layout** 기반의 자유로운 흩뿌리기. 카드끼리 자연스럽게 겹치도록 배치.
    ◦ **구분:** 할 일(`todo`)은 캐릭터 스티커, 쪽지(`note`)는 상단 중앙 레드 핀(Pin) 부착.
**인터랙션 및 애니메이션 (Motion)**
• **Spring Physics:** 모든 움직임에 `framer-motion`의 `type: "spring"` (stiffness: 300, damping: 30) 적용.
• **할 일 등록:** 종이가 팔랑거리며(Fluttering) 붙은 후, 캐릭터 스티커가 왼쪽에서 오른쪽으로 부드럽게 부착.
• **쪽지 남기기:** 화면 밖에서 빠르게 날아와 핀이 '쾅' 찍히는(Stomping) 강력한 모션.
**3. 핵심 기능 (MVP)**
1. **화이트보드 홈:** 가훈 실시간 수정 및 기간별 타임로그 필터링.
2. **할 일(Todo) 관리:** 담당자 지정, 완료 체크(체크 시 투명도 조절 및 흐림 처리).
3. **쪽지(Note) 남기기:** 자유로운 텍스트 입력 및 핀 고정 모션.
4. **실시간 동기화:** Supabase Realtime을 통한 전 사용자 화면 즉시 업데이트.
**4. 데이터 구조 (Schema)**

| **테이블** | **필드** | **타입** | **설명** |
| --- | --- | --- | --- |
| **Groups** | `id`, `name`, `motto` | string | 방 ID, 이름, **가훈** |
| **Tasks** | `id`, `content`, `type` | string | `todo` 또는 `note` 구분 |
|  | `assignee_id`, `status` | string | 담당자, `pending` / `done` |
|  | `created_at`, `completed_at` | datetime | 생성 및 완료 시점 |

**5. 사용자 플로우 (User Flow)**
1. **온보딩:** Apple 스타일의 깔끔한 입력창을 통해 방 이름과 가훈 설정.
2. **메인:** 흩뿌려진 포스트잇 확인 및 필터 칩을 통한 내역 탐색.
3. **액션:** FAB 클릭 -> '할 일' 또는 '쪽지' 선택 -> 특유의 모션과 함께 등록.
