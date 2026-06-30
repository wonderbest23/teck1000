# 맞춤가구 플랫폼 — 사이트 구조 & 3D 미리보기 정리

> 다른 AI에게 컨텍스트로 넘기기 위한 문서입니다.  
> 프로젝트: `custom-furniture-platform` (Next.js App Router + TypeScript + Tailwind)

---

## 1. 한 줄 요약

사용자가 **상품 선택 → 3D 미리보기로 확인 → 옵션 변경 → 자동 견적 → 장바구니/주문** 흐름으로 맞춤가구를 주문하는 MVP입니다.  
핵심 UX는 **「미리보기 먼저, 아래에서 선택」** 단일 컬럼 구조입니다.

---

## 2. 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| 3D 미리보기 | Three.js, @react-three/fiber, @react-three/drei |
| 상태 | React `useState` (전역 상태관리 없음) |
| 데이터 | 로컬 mock (`lib/data.ts`) — Supabase 스키마는 있으나 MVP는 클라이언트 중심 |

---

## 3. 사이트 라우트 맵

```
/                          홈 (상품 소개, MVP 상품 카드)
/custom                    상품 목록 (7종)
/custom/[productSlug]      ★ 견적/미리보기 메인 페이지 (QuoteBuilder)
/custom/order              복수 주문 빌더
/cart                      장바구니
/quote/[quoteId]           견적 상세
/order/[orderId]           주문 상세
/my/orders                 내 주문 목록
/admin                     관리자 대시
/admin/orders              주문 관리
/admin/orders/[orderId]    주문 상세
/admin/manufacturing/[orderId]  제작지시서 (재단/엣지/부속)
/admin/materials           자재 관리
/admin/templates           템플릿 관리
```

### 미리보기가 실제로 쓰이는 곳

| 경로 | 컴포넌트 | 비고 |
|------|----------|------|
| `/custom/[productSlug]` | `QuoteBuilder` → `Preview3D` | **유일한 3D 미리보기 진입점** |
| `components/Preview2D.tsx` | 존재하나 **현재 미사용** | 초기 2D 정면 스케치용 |

---

## 4. 상품 종류 (ProductType)

`lib/types.ts` → `lib/data.ts`의 `productTemplates`

| slug | 이름 | 미리보기 특징 |
|------|------|---------------|
| `custom_shelf` | 맞춤 선반장 | 단일 박스 + 선반 |
| `gap_cabinet` | 틈새 수납장 | 단일 박스 + 문짝 |
| `shoe_cabinet` | 맞춤 신발장 | 단일 박스 + 문짝 |
| `kitchen_base_cabinet` | 싱크대 하부장 | 단일 박스 (주방 규격) |
| `kitchen_wall_cabinet` | 싱크대 상부장 | 단일 박스 (얕은 깊이) |
| `kitchen_full_set` | ★ 싱크대 상하부장 세트 | **모듈 편집 3D** (핵심) |
| `built_in_wardrobe` | 붙박이장 | 단일 박스 + 문짝 |

주방 세트 URL 예: `/custom/kitchen_full_set`

---

## 5. 페이지 UX 구조 (QuoteBuilder)

파일: `components/QuoteBuilder.tsx`

```
┌─────────────────────────────────────┐
│  제목: "미리보고 바로 맞춤하기"      │
├─────────────────────────────────────┤
│  Preview3D (variant="hero")         │  ← 최상단, 전체 폭
│  [3D 캔버스]              [+]       │  ← 주방만: 옆에 장 추가
├─────────────────────────────────────┤
│  소재 스와치 (가로 스크롤)           │
├─────────────────────────────────────┤
│  주방 기본 규격 칩 (1800/2400/3000)  │  ← kitchen_full_set만
├─────────────────────────────────────┤
│  [상세 옵션 펼치기] 아코디언         │
│    - 주방 설비 (상판/싱크/후드 등)   │
│    - 사이즈, 문짝, 배송 등           │
├─────────────────────────────────────┤
│  고정 하단 바: 견적 금액 + 장바구니   │
└─────────────────────────────────────┘
```

### 상태 흐름

```
FurnitureInput (useState)
    ↓
Preview3D (input, onInputChange)     ← 3D에서 주방 모듈 편집 시 역방향 갱신
    ↓
calculateQuote(input) (useMemo)      ← lib/quote.ts
    ↓
견적 금액 / 파트 리스트 / 제작지시서 연동
```

---

## 6. 핵심 데이터 타입

### FurnitureInput (`lib/types.ts`)

미리보기와 견적의 **단일 진실 소스(Single Source of Truth)**.

```ts
// 공통
productType, width_mm, height_mm, depth_mm
material, color, has_door, shelf_count, door_count
handle_type, delivery_type, assembly_type

// 주방 세트 전용 (kitchen_full_set)
kitchen_template?: string
kitchen_modules_mm?: number[]           // 모듈별 폭 mm (예: [600,600,600])
kitchen_module_types?: ("door"|"drawer"|"pullout"|"open")[]
sink_module_index, cooktop_module_index
hood_module_index, microwave_module_index
countertop_type, sink_option, faucet_option
hood_option, cooktop_option, microwave_option
drawer_module_count, pullout_module_count
```

### 주방 템플릿 (`lib/kitchen.ts`)

- `kitchen_1800_basic` — 600×3모듈
- `kitchen_2400_standard` — 600×4모듈
- `kitchen_3000_family` — 600×5모듈

유틸:
- `normalizeKitchenModules()` — 모듈 배열 정규화, 총 폭 계산
- `deriveModuleTypeCounts()` — 서랍/레일장 개수
- `clampModuleIndex()` — 설비 인덱스 범위 보정

---

## 7. Preview3D 상세 (`components/Preview3D.tsx` ~1000줄)

### Props

```ts
Preview3D({
  input: FurnitureInput,
  onInputChange?: (input) => void,  // 주방 편집 시 필수
  variant?: "default" | "hero",     // hero = QuoteBuilder용 간소 UI
})
```

### 제품별 3D 분기

```
input.productType === "kitchen_full_set"
  → 주방 세트 모드 (모듈 편집, 정면 카메라)
else
  → SimpleCabinet 기반 단일 가구 (OrbitControls 자유 회전)
```

### 주방 세트 3D 구조

```
Preview3D
├── Canvas
│   ├── 카메라 (2모드)
│   │   ├── 정면 고정: OrthographicCamera + KitchenFrontCamera
│   │   └── 자유 시점: PerspectiveCamera + KitchenPerspectiveFit + OrbitControls
│   ├── CabinetModel
│   │   ├── KitchenBaseModule × N   (하부장, 모듈별)
│   │   ├── KitchenWallModule × N   (상부장, 1문·얕은깊이·하단손잡이)
│   │   ├── 상판 Trim
│   │   └── 설비 (싱크/쿡탑/수전/후드/전자레인지) — 드래그로 위치 이동
│   ├── ContactShadows, Environment
│   └── OrbitControls (자유 시점일 때만)
├── [자유 시점 / 정면 고정] 토글 버튼 (우상단)
├── [+] 장 추가 버튼 (캔버스 오른쪽)
└── 편집 패널 (캔버스 아래)
    ├── N번 장 선택 · 삭제
    └── 유형: 도어장 / 서랍장 / 레일장 / 오픈장
```

### 주방 편집 인터랙션

| 동작 | 구현 |
|------|------|
| 모듈 선택 | 3D 하부장 클릭 → `selectedModuleIndex` |
| 모듈 이동 | 좌우 드래그 → 스냅 → `moveKitchenModule()` |
| 장 추가 | `+` 버튼 → 선택 장 **오른쪽**에 600mm 모듈 삽입 |
| 장 삭제 | 하단 패널 삭제 버튼 |
| 유형 변경 | 하단 4버튼 (door/drawer/pullout/open) |
| 설비 이동 | 싱크/쿡탑/후드/전자레인지 3D 드래그 |
| 카메라 | 기본 정면 전체 fit / 토글 시 자유 회전 |

### 3D 하위 컴포넌트 (같은 파일 내)

| 함수 | 역할 |
|------|------|
| `CabinetModel` | productType별 3D 분기 |
| `KitchenBaseModule` | 하부장 1모듈 (선택/드래그 히트박스) |
| `KitchenWallModule` | 상부장 1모듈 (단일 문짝, 깊이 320mm) |
| `SimpleCabinet` | 일반 가구 / 하부장 본체 |
| `KitchenFrontCamera` | 직교 카메라 전체 fit (모바일 여백 확대) |
| `KitchenPerspectiveFit` | 자유시점 초기 거리 fit |
| `Panel`, `Doors`, `Trim` 등 | 박스/문짝/손잡이 메시 |

### 카메라 상수

```ts
KITCHEN_WALL_BOTTOM_M = 1.3   // 상부장 하단 높이
KITCHEN_WALL_HEIGHT_M = 0.7   // 상부장 높이
KITCHEN_SCENE_HEIGHT_M = 2.05 // 전체 씬 높이 (fit 기준)
```

---

## 8. 견적/제작 연동

```
FurnitureInput
    → lib/quote.ts (calculateQuote)
        → parts, edgeTasks, hardwareTasks, warnings, finalPrice
    → lib/cutting.ts (재단 리스트)
    → lib/manufacturing.ts (제작지시서)
    → lib/order.ts (주문 정규화)
```

주방 모듈 변경 시 `Preview3D.applyKitchenChange()`가  
`kitchen_modules_mm`, `kitchen_module_types`, `width_mm`, `door_count` 등을 한꺼번에 갱신 → 견적 자동 재계산.

---

## 9. 파일 트리 (미리보기 관련만)

```
teck1000/
├── app/
│   ├── layout.tsx                    # AppHeader
│   ├── page.tsx                      # 홈
│   └── custom/
│       ├── page.tsx                  # 상품 목록
│       └── [productSlug]/page.tsx    # ★ QuoteBuilder 마운트
├── components/
│   ├── Preview3D.tsx                 # ★ 3D 미리보기 (핵심)
│   ├── Preview2D.tsx                 # 미사용
│   ├── QuoteBuilder.tsx              # ★ 견적 UI + Preview3D 래퍼
│   ├── ProductCard.tsx
│   └── AppHeader.tsx
├── lib/
│   ├── types.ts                      # FurnitureInput, ProductType
│   ├── data.ts                       # 상품/소재/기본값
│   ├── kitchen.ts                    # 주방 템플릿/모듈 유틸
│   ├── quote.ts                      # 견적 계산
│   ├── rules.ts                      # 문짝 수 제한 등
│   ├── order.ts
│   ├── cutting.ts
│   └── manufacturing.ts
└── docs/
    └── PREVIEW_AND_SITE_STRUCTURE.md # 이 문서
```

---

## 10. 현재 UX 의도 & 알려진 이슈

### 의도한 UX
- 모바일에서 **상·하부장 전체가 한 화면에** 보여야 함
- 편집은 **3D 직접 조작** (표/오버레이 드래그 X)
- `+`는 **미리보기 옆 단일 아이콘** (왼쪽/오른쪽 텍스트 버튼 X)
- 상부장은 하부장과 **시각적으로 구분** (얕은 깊이, 1문, 손잡이 하단)

### 최근 수정 이력
- 정면 직교 카메라로 모바일 잘림 개선
- 자유시점 토글 복구 (기본은 정면 고정)
- 상부장 `KitchenWallModule` 분리
- 편집 패널을 3D 오버레이 → **캔버스 아래**로 이동

### AI에게 개선 요청 시 자주 나오는 불만
1. 모바일에서 하단/전체가 잘림
2. 선택 시 카메라가 풀려 전체 구성이 안 보임
3. 상부장이 하부장처럼 보임
4. 편집 단계가 복잡함

---

## 11. AI에게 물어볼 때 추천 프롬프트 템플릿

```
이 프로젝트는 Next.js 맞춤가구 MVP입니다.
docs/PREVIEW_AND_SITE_STRUCTURE.md 구조를 기준으로,

[요청 내용 예시]
- Preview3D.tsx 주방 모바일 카메라 fit 개선
- KitchenWallModule 상부장 형태를 실제 주방 상부장에 맞게 수정
- QuoteBuilder UX 단순화

제약:
- FurnitureInput이 단일 상태 소스
- 주방 편집은 Preview3D ↔ onInputChange 양방향
- variant="hero"일 때 UI 최소화 유지
```

---

## 12. 로컬 실행

```bash
npm install
npm run dev        # http://localhost:3000
# 주방 미리보기: http://localhost:3000/custom/kitchen_full_set
```
