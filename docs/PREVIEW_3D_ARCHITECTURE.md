# 3D 미리보기(Preview) 구조 정리

동방씽크 주문 화면의 **실시간 3D 미리보기** 시스템 전체 구조 문서.
제품(주방 세트/하부장/상부장/붙박이장/신발장/선반)을 3D로 그리고, 사용자가 직접 편집하면 값이 견적·부품표로 흐른다.

> 위치: `components/preview3d/` (엔진) · `components/Preview3D.tsx` (재노출 wrapper: `export { Preview3D } from "./preview3d/Preview3D"`)

---

## 1. 큰 그림 (데이터 흐름)

```
FurnitureInput (lib/types.ts)   ← 하나의 설계 상태 객체
        │
        ▼
┌─────────────────────────────────────────────┐
│  Preview3D.tsx  (컨트롤러 / R3F Canvas)        │
│   - 편집 상태(선택·드래그·undo/redo) 관리        │
│   - editor 훅들(useKitchenEditor 등) 연결       │
│   - 조명·카메라·OrbitControls 세팅              │
│        │  props(PreviewRendererProps)          │
│        ▼                                       │
│   Renderer (제품별, rendererRegistry로 선택)    │
│        - 3D 지오메트리 렌더 + Html 오버레이       │
└─────────────────────────────────────────────┘
        │  onInputChange(nextInput)
        ▼
  commitInputChange → 상위(QuoteBuilder / PhotoStudio)로 전달
        │
        ▼
  calculateQuote(input) (lib/quote.ts) → 견적·부품·절단표
```

- **단일 소스**: 모든 형상/옵션은 `FurnitureInput` 하나에 담긴다. 3D·견적·도면이 전부 이 객체를 읽는다("허상 없음" 원칙).
- **편집 → 반영**: 3D에서 조작하면 `onInputChange`로 새 `FurnitureInput`을 올려보내고, 상위가 상태를 갱신 → 재렌더 → 견적 재계산.

---

## 2. 진입점 & 소비처

| 파일 | 역할 |
|---|---|
| `components/Preview3D.tsx` | 재노출 wrapper (한 줄) |
| `components/preview3d/Preview3D.tsx` | **메인 컨트롤러**. Canvas·조명·카메라·편집상태·undo/redo. 제품 단품 미리보기 |
| `components/preview3d/RoomScene.tsx` | **방 배치 뷰**. 바닥/벽 있는 방 안에 여러 가구를 배치(QuoteBuilder에서 사용). `editable` prop으로 **보기/수정 모드** 분리 — 보기 모드는 선택·핸들·배지 등 편집 UI 전부 숨김 |
| `components/preview3d/controls/SceneSizePanel.tsx` | **우측 고정 통합 패널**(IKEA식). 선택한 가구/칸의 가로·높이·깊이(−/＋·직접입력) + 소재 스와치 + 회전/복제/삭제 액션. 내용(rows)은 호출부(RoomScene)가 데이터로 구성 |

> **캔버스 안 통합 UI(QuoteBuilder)**: 좌상단 글래스 툴바(보기/수정 모드·치수·문열림·자동정렬·undo/redo) · 우측 SceneSizePanel · 하단 "＋ 가구 추가" 플로팅 시트. 미리보기 아래 카드(belowCanvas)는 제거 — 편집 기능은 전부 미리보기 안에 있다. 가구 1개뿐이면 3D 이름표 숨김.
>
> **패널 알림(PanelNotice)**: 선택 가구가 주문 불가/주의면 사유를 패널 상단에 표시(`validateOrderInput` 결과 중 `missing_input` 제외 — 필수 입력 안내는 하단 CTA·검수 탭 몫). 이슈 코드별 **원클릭 해결**(`ISSUE_QUICK_FIXES` in QuoteBuilder: MISSING_BASE_SUPPORT→걸레받이 추가 등) + 규격(productRules) 이탈 시 "권장값으로 맞추기"(주방 세트는 kitchen_base_height/depth도 함께 보정해야 normalizeInput에 안 덮인다). **모바일(<640px)에선 패널·가구추가 시트가 미리보기를 가리지 않게 섹션 아래(belowCanvas)로 내려간다** — 사이즈 패널은 QuoteBuilder가 host div를 만들고 RoomScene이 `mobilePanelHost`로 받아 `createPortal`로 inline variant를 렌더(데스크톱 overlay variant는 `max-sm:hidden`). 가구추가 시트 내용(`addSheetBody`)은 데스크톱 플로팅(반투명)과 모바일 belowCanvas 카드가 공유.
>
> RoomScene도 ㄱ자 **측면 다리 칸 편집** 지원(선택/폭/추가/삭제 — Preview3D와 동일한 렌더러 계약, `sideSel` 상태는 메인 칸 선택과 상호 배타). 푸터 상태 표기는 주문 검증 verdict(`ORDER_VERDICT_LABELS`) 기준으로 CTA와 통일. 상단 카테고리에서 '소재' 제거(패널 스와치로 대체).
>
> **벽부착 제약(현실 규칙)**: 싱크대·붙박이장 등 `WALL_BOUND_TYPES`(QuoteBuilder)는 벽에서 떨어질 수 없다 — 이동하면 `projectToWall`로 가장 가까운 벽에 등을 붙이고(rotY 자동), 옆벽으로 끌면 자동 회전. 회전 버튼은 "다음 벽으로 이동"(뒤→오른쪽→앞→왼쪽 순환). 아일랜드(kitchen_island)만 방 중앙 허용. 배치가 바뀌면 350ms 디바운스 후 카메라 프레임이 따라잡는다(RoomScene `placementsSig`).
| `components/QuoteBuilder.tsx` | 고객 구성 화면. Preview3D / RoomScene 사용 |
| `components/admin/KitchenPhotoStudio.tsx` | 관리자 "사진→3D·도면" 스튜디오. Preview3D + KitchenDrawingView 사용 |
| `components/admin/KitchenDrawingView.tsx` | **2D 도면 뷰**(평면도+정면도, SVG). 3D 대체 보기 |

---

## 3. 디렉터리 맵 (`components/preview3d/`)

```
Preview3D.tsx              메인 컨트롤러(Canvas/조명/카메라/편집상태)
RoomScene.tsx              방 배치 뷰(벽·바닥 + 다중 가구)
PreviewErrorBoundary.tsx   렌더 에러 시 폴백
PreviewUnsupported.tsx     미지원 제품 안내
types.ts                   PreviewRendererProps 등 공용 타입(렌더러 계약)
constants.ts               주방 치수 상수(걸레받이/상부장 설치높이 등, m 단위)
materials.ts               소재 프리셋(색·엣지·마감 gloss/matte/wood)
roomLayout.ts              방 배치(footprint/placement/정렬 가이드) 계산

camera/
  CameraRig.tsx            프레임에 맞춰 카메라 핏(자유/고정)
  FrontCameraRig.tsx       정면 고정 리그
  SmoothFrontCameraRig.tsx 부드러운 정면 전환
  fitCamera.ts             퍼스펙티브/직교 카메라 → 프레임 맞춤 계산
  sceneFrame.ts            제품별 SceneFrame(폭·높이·중심·타깃) 산출 ★ㄱ자 인식

controls/
  useKitchenEditor.ts      주방세트 편집(선택/드래그/추가·삭제/폭·높이/undo)
  useBaseKitchenEditor.ts  하부장 단품 편집
  useWardrobeEditor.ts     붙박이장 편집
  useStorageEditor.ts      신발장/선반 등 편집
  usePreviewInteraction.ts 터치/포인터 상호작용(회전·핀치)
  PreviewOverlayControls.tsx  화면 위 버튼(뷰/undo 등)
  Kitchen3DEditDock.tsx    주방 편집 도크 UI
  WardrobeSelectionPanel.tsx / StorageSelectionPanel.tsx / StorageSceneControls.tsx
  PreviewVerdictBadge.tsx  주문 가능/불가 배지
  SinkDrainBadge.tsx       배수 위치 배지

kitchen/
  KitchenModules.tsx       하부장/상부장 캐비닛 3D 컴포넌트(문·서랍·선반·손잡이)
  moduleLayout.ts          칸 위치 계산(중심 X, 비율↔인덱스 등)
  sinkFixtureSpec.ts       싱크볼 규격 스펙

modes/
  visibilityModes.ts       뷰모드(도어 열기/투명/엑스레이 등) 표시 규칙

primitives/
  index.tsx                Panel/Trim/RoundedBox/FinishProvider/StudioRectLights 등 저수준
  DimensionMarkers.tsx     치수 마커

renderers/
  rendererRegistry.ts      productType → Renderer 매핑 ★
  KitchenFullSetRenderer.tsx  주방 세트(★ㄱ자 포함) 메인 렌더러
  KitchenBaseRenderer.tsx     하부장 단품 / 아일랜드
  KitchenWallRenderer.tsx     상부장 단품
  KitchenFixtures.tsx         싱크/수전/쿡탑/후드/전자레인지 3D 픽스처
  WardrobeRenderer.tsx        붙박이장
  ShoeCabinetRenderer.tsx     신발장
  ShelfRenderer.tsx           선반/틈새장
```

---

## 4. 렌더러 선택 (제품 → 컴포넌트)

`renderers/rendererRegistry.ts` 의 매핑으로 `getPreviewRenderer(productType)` 이 결정:

| productType | Renderer |
|---|---|
| `kitchen_base_cabinet`, `kitchen_island` | `KitchenBaseRenderer` |
| `kitchen_wall_cabinet` | `KitchenWallRenderer` |
| `kitchen_full_set` | `KitchenFullSetRenderer` |
| `built_in_wardrobe` | `WardrobeRenderer` |
| `shoe_cabinet` | `ShoeCabinetRenderer` |
| `custom_shelf`, `gap_cabinet` | `ShelfRenderer` |

모든 렌더러는 동일한 `PreviewRendererProps`(`types.ts`)를 받는다 → 컨트롤러(Preview3D)는 제품에 무관하게 같은 계약으로 동작.

---

## 5. Preview3D.tsx 레이아웃 (화면 구성)

```
<div rounded-3xl ...>                       ← 카드 컨테이너 (isHero면 테두리 없음)
  ├ (헤더) 소재/문짝디자인 요약 · 치수 표기      ← isHero=false일 때만
  └ <PreviewErrorBoundary>
      <div ref=sceneRef 관계형 컨테이너>       ← 높이: hero h-[min(62vh,560px)] / 일반 mt-4 h-[min(52vh,420px)]
        <Canvas>                             ← @react-three/fiber
          <color background #f8fafc>
          [조명]  ── 6절 참고
          <PerspectiveCamera fov=34(주방)/38>
          <CameraRig frame=activeFrame>       ← 선택 모듈 있으면 포커스 프레임
          <FinishProvider material>
            <Renderer ...PreviewRendererProps/>  ← 제품별 3D
          </FinishProvider>
          <OrbitControls .../>               ← 회전/줌/팬(자유뷰)
        </Canvas>
        [오버레이 UI] undo/redo·뷰버튼·배지 등 (Canvas 위 절대배치 div)
      </div>
    </PreviewErrorBoundary>
</div>
```

- **좌표계**: X=가로(폭), Y=높이, Z=깊이(+Z가 앞/방 안쪽, −Z가 뒷벽). 단위 = m(미터). mm는 `/1000`.
- **오버레이**: 3D 안의 버튼/치수 뱃지는 drei `<Html>`(빌보드). 카드 위 버튼은 일반 절대배치 div.

---

## 6. 조명 (Lighting) — 현재 세팅

**원칙: 그림자·면광원 없이 "공간 전체를 고르게".** (좌우 벽/면이 밝기로 갈라지던 문제를 제거)

`Preview3D.tsx` 와 `RoomScene.tsx` 동일 구성:

```jsx
<Canvas gl={{ toneMapping: ACESFilmic, toneMappingExposure: 0.95 }}>  // shadows 끔
  <ambientLight intensity={1.0} />                       // 전체 균일 베이스
  <hemisphereLight args={["#fff", "#f1f5f9", 0.55]} />   // 부드러운 상/하 채움
  <directionalLight position={[0, 6, 0.5]} intensity={0.3} />  // 정수리에서만(그림자 없음)
```

핵심 결정 사항:
- **castShadow / `shadows` / ContactShadows 제거** → 그림자 맵 경계선 없음. (RoomScene은 접지용 ContactShadows만 소량 유지)
- **StudioRectLights(면광원) 제거** → 벽·장에 사각형 조명 자국 없음.
- **Environment의 Lightformer 줄무늬광 제거** → 광택면 줄무늬 반사 없음.
- **좌우 방향 광원 제거, 위(top-down)에서만** 약하게 → 세로면(문·측판)은 각도에 무관하게 균일 → **좌우 갈라짐 없음**.
- `StudioRectLights`(primitives/index.tsx)는 `scale` 프롭으로 강도 조절 가능하게 남겨둠(현재 미사용).

> 밝기 조절 포인트: `ambientLight.intensity`, `hemisphereLight` 3번째 인자, `toneMappingExposure`.

**환경맵(StudioEnvironment, primitives)**: three 내장 `RoomEnvironment`를 PMREM으로 구워 `scene.environment`에 세팅(네트워크 불필요). `scene.environmentIntensity=0.45`로 확산광 밸런스는 유지하고 하이그로시 도어의 **반사(스페큘러)만** 얹는다 — "회색 덩어리" 해소. 소재별 envMapIntensity: gloss 1.5 / matte 0.35 / wood 0.45 / carcass 0.3.

**몸통·문짝 재질 분리**: 실제 싱크대처럼 몸통(측판·상하판·뒷판·선반)은 선택 소재와 무관하게 **백색 멜라민 합판**(`CARCASS_FINISH` + `Panel carcass` prop, 무광 roughness 0.74)으로, 문짝·서랍 앞판만 선택 소재(UV하이그로시/무광/우드)로 렌더. 적용: primitives `SimpleCabinet`(하부장 몸통), KitchenModules 상부장 몸통.

---

## 7. 카메라 & 프레임

- `camera/sceneFrame.ts` : 제품별 `SceneFrame { widthM, heightM, depthM, center, target, min/maxDistance }` 계산.
  - `getKitchenFullFrame()` 은 **ㄱ자 인식**: 측면 길이를 포함해 스케일/프레임 높이를 키워 전체가 화면에 들어오게 함(렌더러 스케일과 일치시켜 하단 쏠림 방지).
  - 모듈 선택 시 `getKitchenModuleFocusFrame()` 로 해당 칸에 포커스.
- `camera/fitCamera.ts` : 프레임 → 카메라 거리/위치. 모바일(`width<500`)은 패딩 크게.
- `camera/CameraRig.tsx` : 매 프레임 카메라를 프레임에 맞춰 이동(자유뷰면 OrbitControls 우선).

---

## 8. 편집 시스템 (핵심)

편집 상태는 **Preview3D가 보유**, 실제 조작 로직은 **editor 훅**이 담당.

- `controls/useKitchenEditor.ts` — 주방 세트: 모듈 선택/드래그/추가·삭제/폭·높이/레이어 동기화/undo·redo.
- 렌더러는 콜백으로만 통신(직접 상태 변경 없음): `onSelectModule`, `onPrepareDragModule`, `onAddModule`, `onRemoveModule`, `onModuleWidthChange`, `onSelectFixture` …(전체는 `types.ts`의 `PreviewRendererProps`).
- **선택 상태**: `selectedModuleIndex` + `selectedModulePart`(`"base"|"wall"`) + `selectedEditTarget`(`"module"|"door"|"handle"`) + `selectedFixture`.
- **undo/redo**: `Preview3D` 내부 `undoStackRef/redoStackRef` + `commitInputChange`(서명 비교로 무변경 skip).

---

## 9. 주방 세트 & ㄱ자(L형) 구현

### 데이터 모델 (`lib/types.ts`, `FurnitureInput`)
```
kitchen_modules_mm[]         메인 런 칸 폭
kitchen_base_modules_mm[]    하부장 레이어 폭 / kitchen_wall_modules_mm[] 상부장 레이어 폭
kitchen_module_types[]       칸 종류(door/drawer/pullout/sink_base/cooktop/open …)
kitchen_layout_shape         "straight" | "l_shape"        ← ㄱ자 스위치
kitchen_side_modules_mm[]    ㄱ자 측면(꺾인) 다리 칸 폭
kitchen_side_module_types[]  측면 칸 종류
kitchen_corner               "left" | "right"  (측면이 붙는 코너)
kitchen_side_has_wall        측면 상부장 표시 여부
sink_/cooktop_/hood_module_index, *_option  설비
```
헬퍼: `lib/kitchen.ts` — `normalizeKitchenModules`, `normalizeKitchenLayerWidths`, `normalizeKitchenSideModules`, `isLShapeKitchen`, `getKitchenSetDimensions`.

### 렌더 (`renderers/KitchenFullSetRenderer.tsx`)
- 메인 런: X축으로 하부장/상부장 모듈 나열(+ 걸레받이/상판/설비 픽스처).
- **`KitchenLShapeLeg`**: 측면 다리를 코너에 90° 회전 그룹으로 배치(+Z 방향으로 뻗음). 하부는 깊이가 같아 맞붙고, **상부는 얕아 생기는 코너 빈틈을 "코너 상부 채움장"(Panel)으로 막아** 벽처럼 연결.
- **재중심**: ㄱ자는 측면이 +Z로 뻗어 무게중심이 쏠리므로 `lOffsetZ`로 Z 재중심 → 화면 중앙.
- **측면 편집**: 회전 그룹 안에 SizeBadge(폭)·＋/－(추가·삭제)를 넣어 좌표가 자동으로 맞음. 상태는 `selectedSideIndex`(메인 선택과 분리). 핸들러 `onSelectSideModule/onAddSideModule/onRemoveSideModule/onSideModuleWidthChange`.
  - (미구현) 측면 드래그 이동(reorder)·측면 타입 3D 변경은 스튜디오 카드에서 처리.

### 견적 반영 (`lib/quote.ts`)
- `generateParts("kitchen_full_set")` 이 메인 + **측면 캐비닛/코너 연결재/측면 상판·걸레받이**를 부품·절단표에 포함 → 가격에 반영(허상 없음).

---

## 10. 소재 & 마감 (`materials.ts`, `primitives/index.tsx`)

- `materialPresets` : 프리셋별 색/엣지/마감(`gloss` 고광택 / `matte` 무광 / `wood` 텍스처).
- `FinishProvider` : 선택 소재의 마감/우드 텍스처를 하위 `Panel`에 컨텍스트로 주입.
- 무광 소재 기준으로 조명을 잡았기 때문에 과노출 없음.

---

## 11. 2D 도면 뷰 (`components/admin/KitchenDrawingView.tsx`)

3D 대신 볼 수 있는 **제작 참고 도면**(순수 SVG, 현재 `input` 기반 자동 생성):
- **평면도**: 위에서 본 배치(일자/ㄱ자). 하부장=실선, **상부장=점선 오버레이**(범례 포함), 칸 폭·종류, 메인/측면 길이·깊이 치수, 싱크/쿡탑 위치.
- **정면도**: 앞에서 본 메인 런(상·하부장), 칸 폭·종류·높이, 상판 라인.
- KitchenPhotoStudio 3단계의 **[3D 보기]/[도면 보기]** 토글로 전환.

---

## 12. 사진 → 3D 스튜디오 (`components/admin/KitchenPhotoStudio.tsx`)

- 3단계 위저드: ① 사진 업로드(자동 분석 시작) → ② AI 값 확인/수정 → ③ 3D·견적·도면.
- AI 분석 API: `app/api/photo-analyze/route.ts` (Claude 비전 `submit_kitchen_layout` 강제 툴콜, 손글씨 치수/ㄱ자/설비 유무 인식, 과거 보정 few-shot 학습).
- **설비 기본 OFF**(도면에 있을 때만) — 없는 수도/후드 자동 삽입 방지.
- **자동 저장/복원**: `localStorage("teck_photo_studio")` — 새로고침해도 설계 유지(`hydrated` 플래그로 초기값 덮어쓰기 방지). "처음부터"가 저장본까지 초기화.

---

## 13. 자주 만지는 포인트 (요약)

| 하고 싶은 것 | 파일 |
|---|---|
| 조명 밝기/그림자 | `Preview3D.tsx`, `RoomScene.tsx` (6절) |
| 카메라 프레임/줌·중앙정렬 | `camera/sceneFrame.ts`, `camera/fitCamera.ts` |
| 주방 3D 형상/ㄱ자/코너 | `renderers/KitchenFullSetRenderer.tsx`, `lib/kitchen.ts` |
| 캐비닛 문·서랍·손잡이 모양 | `kitchen/KitchenModules.tsx` |
| 편집 동작(선택·드래그·추가) | `controls/useKitchenEditor.ts`, `Preview3D.tsx` |
| 제품 추가/렌더러 연결 | `renderers/rendererRegistry.ts` + 새 Renderer |
| 견적·부품 반영 | `lib/quote.ts` |
| 2D 도면 | `components/admin/KitchenDrawingView.tsx` |

---

_이 문서는 미리보기 관련 파일을 코드 기준으로 정리한 것입니다. 세부 구현은 각 파일 주석 참고._
