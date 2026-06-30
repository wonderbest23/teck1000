# ㅇ23ㅇ.docx vs 현재 코드 갭 분석

> 작성일: 2026-06-22  
> 기준 문서: `ㅇ23ㅇ.docx` (동방씽크 플랫폼 마스터·견적·공정 스펙)  
> 대상 코드: `teck1000` (Next.js MVP)

---

## 1. 요약

| 구분 | 적용률(추정) | 상태 |
|------|-------------|------|
| 치수·모듈 규칙 (주방/현관/붙박이) | **~85%** | Phase 1 반영 완료 |
| 원판·재단 (kerf, trim, 1220×2440) | **~75%** | 코드 상수화, DB 마스터 준비 |
| 견적 엔진 (자재+엣지+공정+마진) | **~60%** | 구조 있음, 단가·인시 미연동 |
| 5대 마스터 DB | **~40%** | 마이그레이션 파일만, 런타임 미연동 |
| 공급사·계약가·공장 변수 | **~10%** | 미구현 |
| 3D·UI·주문 흐름 | **기존 MVP** | doc 범위 밖, 별도 로드맵 |

**종합 적용률: 약 55%** (비즈니스 핵심 치수·규칙은 반영, 운영·DB·단가 연동은 미완)

---

## 2. 문서 권장값 vs 코드 현황

### 2.1 원판·재단

| 항목 | 문서 | 현재 | 갭 |
|------|------|------|-----|
| 표준 원판 | 1220×2440 | `BOARD_STANDARDS` | ✅ |
| kerf | 3.2mm | `cutting.ts` / `platformConfig` | ✅ |
| trim | 공장별 변수 (기본 10mm) | 상수 10mm, DB `process_standards` 시드 | ⚠️ 공장별 오버라이드 UI 없음 |
| 대체 규격 | 910×1820, 1525×3050 | 910×1820 시드만 | ❌ 1525×3050 미반영 |
| usable 영역 계산 | trim 반영 | `getUsableSheetSizeMm()` | ✅ |

### 2.2 주방 모듈

| 항목 | 문서 | 현재 | 갭 |
|------|------|------|-----|
| 하부 높이×깊이 | 900×600 | `KITCHEN_STANDARDS` 전역 사용 | ✅ |
| 상부 높이×깊이 | 768×340 | 동일 | ✅ |
| 모듈 폭 | 150~1000, 프리셋 스냅 | `snapKitchenModuleWidthMm` | ✅ |
| 상부 설치 높이 | 하부+간격 | `getKitchenWallInstallBottomMm()` (1450mm) | ✅ |
| 상판·싱크·가전 옵션 | 품목 마스터 | `lib/kitchen.ts` 하드코딩 가격 | ⚠️ DB `hardware_items` 미연동 |

### 2.3 현관·붙박이

| 항목 | 문서 | 현재 | 갭 |
|------|------|------|-----|
| 신발장 깊이 | 350mm (최소 250) | `ENTRANCE_STANDARDS` | ✅ |
| 신발장 최소 높이 | 2100 | 동일 | ✅ |
| 붙박이 깊이 | 600 (500~650) | `WARDROBE_STANDARDS` | ✅ |
| 붙박이 최소 높이 | 2100 | 동일 | ✅ |
| SPS-KHFC 규칙 | 문서 규격 | `lib/rules.ts` 경고 | ✅ (MVP 수준) |

### 2.4 견적 공식

| 항목 | 문서 | 현재 | 갭 |
|------|------|------|-----|
| 자재비 | m² × 단가 | `materials` mock | ⚠️ 시트 단가·등급 미사용 |
| 엣지비 | m당 단가 | 180원/m (`QUOTE_DEFAULTS`) | ⚠️ `edge_bands` 테이블 미연동 |
| 하드웨어 | 품목별 | mock `hardwareItems` | ⚠️ `contract_price` 미사용 |
| 재단비 | 건당 | 15,000원 고정 | ⚠️ 원판 수·난이도 미반영 |
| 조립비 | 세트당 | 20,000원 고정 | ⚠️ 인시 기반 미반영 |
| 운송비 | 건당 | 30,000원 고정 | ✅ (단가만 변수화 필요) |
| 마진 | 예시 15% | `marginRate: 0.15` (기존 35%에서 변경) | ⚠️ **비즈니스 확인 필요** |
| 포장비 | 규칙 있음 | `packingBasePrice` 등 상수 | ⚠️ 부품 수 연동 부분만 |

---

## 3. 5대 마스터 DB

| 마스터 | 테이블 | 시드 | 런타임 로드 |
|--------|--------|------|-------------|
| 판재 | `board_sheet_specs` | ✅ | ❌ (`lib/data.ts` mock) |
| 도어 마감 | `door_finish_masters` | ✅ | ❌ |
| 모듈 표준 | `module_standards` | ✅ | ❌ (`platformConfig` TS) |
| 하드웨어 | `hardware_items` 확장 컬럼 | 스키마만 | ❌ |
| 공정 | `process_standards` | ✅ | ❌ |
| 플랫폼 설정 | `platform_settings` | ✅ | ❌ (`getQuoteConfig()` 로컬) |

**갭**: 마이그레이션 `0002_platform_masters.sql` 작성 완료. 앱은 아직 TypeScript 상수만 참조.

---

## 4. 미지정 변수 (문서 명시)

다음은 문서에서 **관리자·공급사 입력**으로 남겨둔 항목이며 코드에도 미구현:

- 엣지 공개 단가 (색·두께별)
- LPM/PET 도어 시트 계약가
- 공정 인시 (재단·엣지·조립·설치)
- 공장별 trim, kerf 실측값
- 1525×3050 등 대형 원판
- 마진율 정책 (채널·품목별)

---

## 5. Phase별 로드맵

### Phase 1 — 코드 상수 통일 ✅ (완료)

- [x] `lib/platformConfig.ts` 신규
- [x] `kitchen.ts`, `rules.ts`, `cutting.ts`, `quote.ts` 연동
- [x] `Preview3D`, `QuoteBuilder`, `order.ts`, `data.ts` 기본 치수 통일
- [x] `npm run build` 통과

### Phase 2 — 갭 문서 ✅ (본 문서)

### Phase 3 — DB 마이그레이션 ✅ (로컬 Postgres)

**적용 완료**

```bash
npm run db:up          # Postgres 컨테이너 + 0001~0003 마이그레이션
npm run db:migrate     # 이미 떠 있는 DB에만 마이그레이션
```

- `.env.local` — `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- `GET/PATCH /api/platform/config` — 설정 DB 로드·저장
- `GET /api/platform/health` — 연결 확인
- `/admin/factory` — DB 연동 설정 UI

**Supabase 전체 스택** (`supabase start`)은 ECR rate limit으로 이미지 pull 실패 가능 → Postgres 단독으로 Phase 3 달성.

**남은 갭**: `@supabase/supabase-js` Auth/RLS, 원격 `supabase link` + `db push`

### Phase 4 — 견적 정밀화 ✅ (코드 반영)

- [x] `lib/boardPricing.ts` — 시트 장당 단가·규격 매핑 (1220×2440, 910×1820 등)
- [x] `lib/cutting.ts` — 자재별 최적 원판 규격 선택, trim 반영 절단 영역
- [x] `lib/quote.ts` — 장당 판재비, 인시 기반 조립·재단·주방 설치비
- [x] `platformConfig` — `PROCESS_QUOTE_STANDARDS`, `PRODUCT_MARGIN_RATES`
- [x] 관리자 자재/주문 상세, 견적 하단 요약 UI

**남은 갭**: DB `board_sheet_specs` 런타임 로드, 1525×3050 규격, 품목별 마진 관리자 UI

### Phase 5 — 운영·공급사 ✅ (코드 반영)

- [x] `lib/processStandards.ts` — 공장별 kerf·trim·cut_sequence·포장 규칙
- [x] `lib/pricingTier.ts` — 공개가 / 계약가 이중 단가
- [x] `lib/boardPricing.ts` — 장당 공개·계약 단가
- [x] `lib/manufacturing.ts` — 재단 공정 순서(cut_sequence) 출력
- [x] `/admin/factory` — 공장·단가 프로필 설정 UI
- [x] 제작지시서 — 공정 순서·공장·단가 정책 표시

**남은 갭**: DB `process_standards` 런타임 로드, 설정 영구 저장(Phase 3 Docker)

---

## 6. 리스크·확인 사항

1. **마진 35% → 15%**: doc 반영이나 체감 견적이 크게 낮아짐. 영업 정책 확인 필요.
2. **상부장 768mm**: 기존 UI/고객 기대(700mm)와 다를 수 있음 — 카탈로그 문구 정합성 검토.
3. **DB 없이 배포**: MVP는 mock 데이터로 동작. Phase 3 전까지 관리자 화면 변경이 견적에 반영되지 않음.
4. **3D 메시**: 치수는 맞으나 PBR·glTF 실사재는 장기 과제 (`PREVIEW_AND_SITE_STRUCTURE.md` 참고).

---

## 7. 관련 파일

```
lib/platformConfig.ts      — Phase 1 단일 진실 공급원 (TS)
lib/kitchen.ts             — 주방 템플릿·옵션
lib/rules.ts               — 치수 검증·경고
lib/cutting.ts             — 재단 플랜
lib/quote.ts               — 견적 산출
supabase/migrations/0002_platform_masters.sql
docs/PREVIEW_AND_SITE_STRUCTURE.md
```
