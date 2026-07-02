# 인수인계 — 상세페이지(모듈형 싱크대) 규격·비용 통합

상세페이지 이미지의 규격/색상/가격/정책을 제품·세트·견적·주문에 통합한 작업 요약.
Claude Code에서 이 문서를 읽고 이어서 작업하면 됩니다.

## 상태: 엔진·데이터·UI 통합 완료 / 화면 육안 확인만 남음
- 타입체크 `npx tsc --noEmit` → 에러 0
- 실제 견적 함수 실행값이 이미지 요금표와 일치 확인 (아래 검증값 참고)
- 개발 서버 렌더링/3D 미리보기 육안 확인은 미완 (샌드박스 네트워크 제한으로 여기선 실행 불가)

## 새로 만든 파일
- `lib/retailCatalog.ts` — 이미지의 단일 진실 데이터 + 조회 헬퍼
  - 상부장 규격 `wallCabinets`, 도어색상 `doorColors`
  - 배송비 `wallCabinetShipping`/`baseCabinetShipping`/`extraPartShipping` + `wallCabinetShippingFor`/`baseCabinetShippingFor`/`shippingForWidth`
  - 방문시공 `installTiers`+`getInstallTier`, 철거 `removalTiers`+`getRemovalPrice`, `installFloorSurcharge`, `installRegionSurcharge`
  - 후드타공 `hoodDrillingOption`, EP판넬 `epPanels`+`epUnitPrice`, 부속 `accessories`+`accessoryPriceByName`
  - 정책 `orderPolicy`/`shippingPolicy`/`epPanelPolicy`
- `components/RetailSpecSheet.tsx` — 규격표·색상선택·배송비/시공비 계산기·가격표(안내용)
- `app/catalog/page.tsx` — `/catalog` 라우트

## 수정한 파일
- `lib/types.ts`
  - `FurnitureInput`에 `ep_panel_sides?`, `hood_drilling?`, `accessory_ids?`
  - `QuoteResult`에 `epPanelCost`, `hoodDrillingCost`, `accessoryCost`
  - `OrderServices` 타입 신설, `CompositeOrderDraft.services?`
  - `CompositeQuoteResult`에 `installCost`,`removalCost`,`floorSurcharge`,`regionSurcharge`,`serviceCost`
- `lib/quote.ts` — 택배비를 사이즈 표 기반(`estimateCatalogCourierCost`)으로 계산 + EP/타공/부속 비용을 `totalCost`·리턴에 반영
- `lib/order.ts` — `calculateOrderServices()` 신설, 주방세트/하부/상부 총폭 기준으로 시공·철거·지역·층별비 계산해 `totalPrice`에 합산. 주문 생성(`orderStore`/`orderRepo`)은 `quote.totalPrice`를 쓰므로 자동 반영됨
- `lib/catalog.ts` — `roomAddPresets` 확장: 상부장 300~1200 + 후드장600(D320/H800), 하부장 300~1200
- `lib/kitchen.ts` — `kitchenTemplates`에 이미지 구성예시 2종 추가 (`kitchen_1800_sink_gas`, `kitchen_2700_counter_sink`)
- `components/QuoteBuilder.tsx` — fixtures 섹션에 EP·후드타공·부속 선택 UI(주방 제품)
- `components/MultiOrderBuilder.tsx` — 장바구니에 방문시공/철거/지역/층수 서비스 옵션 + 금액 분해 표시

## 검증값 (실제 엔진 실행)
- 상부장600 + EP양쪽 + 타공 + 칼꽂이 → EP 80,000 / 타공 40,000 / 부속 12,000 = 132,000 (마진15% 포함 최종 +151,800)
- 총폭 2400 주문 + 시공+지역+철거+5층(무엘베) → 시공 150,000 / 층별 20,000 / 지역 30,000 / 철거 60,000 = **260,000**
- 배송비 상부장1200=26,000 · 하부장1200=36,000

## 남은 일 (Claude Code에서 이어서)
1. `npm run dev` 후 육안 확인
   - `/catalog`, `/cart`, 상품 설정화면(상부장/하부장/세트)
   - **확인 포인트: 상부장 "단품" 설정화면에 fixtures(추가 옵션) 탭이 노출되는지** — 안 보이면 QuoteBuilder의 카테고리 탭 노출 조건에 `kitchen_wall_cabinet` 추가 필요
2. 3D 미리보기에서 새 사이즈(300/후드장600)·구성예시 세트가 정상 렌더되는지
3. (선택) 이미지 마케팅/사양 콘텐츠(E0 자재등급, PET도어·경첩, 상판 종류 상세, 걸레받이 전면/측면)를 상세페이지에 추가
4. 루트에 남은 빈 파일 `__verify.mts` 삭제 (`rm __verify.mts`)

## 참고
- 모든 가격 단위 원(KRW), 규격 mm.
- 데이터 값을 바꾸려면 `lib/retailCatalog.ts` 한 곳만 고치면 견적·UI에 함께 반영됨.
