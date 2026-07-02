/**
 * 소매 카탈로그 — 상세페이지(모듈형 싱크대) 고정 규격·고정가 데이터.
 *
 * 견적 엔진(quote.ts)의 원가 계산과 별개로, 소비자 상세페이지에 노출되는
 * "규격 안내 / 배송비 / 방문시공비 / 옵션가"를 그대로 담은 단일 진실 모듈.
 * platformConfig.ts(공장 기준값)·kitchen.ts(견적 옵션)와 컨벤션을 맞춘다.
 *
 * ⚠️ 모든 금액 단위: 원(KRW). 규격 단위: mm.
 */

/* ────────────────────────────────────────────────────────────
 * 1) 상부장 규격
 * ──────────────────────────────────────────────────────────── */

export type DoorOpenType = "1door" | "double" | "triple";

export type WallCabinetSpec = {
  /** 노출용 코드(상세페이지 번호) */
  code: string;
  /** 상품명 */
  name: string;
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  door_type: DoorOpenType;
  /** 1도어형일 때 좌문/우문 선택 가능 */
  door_side_selectable: boolean;
  /** 내부 선반 단수 (후드장은 0) */
  shelf_count: number;
  note?: string;
};

/** 상부장(300~1200) + 후드장. 후드장 외 전 규격 D320 · H800 · 내부 2단선반. */
export const wallCabinets: WallCabinetSpec[] = [
  { code: "01", name: "300 상부장", width_mm: 300, depth_mm: 320, height_mm: 800, door_type: "1door", door_side_selectable: true, shelf_count: 2 },
  { code: "02", name: "400 상부장", width_mm: 400, depth_mm: 320, height_mm: 800, door_type: "1door", door_side_selectable: true, shelf_count: 2 },
  { code: "03", name: "500 상부장", width_mm: 500, depth_mm: 320, height_mm: 800, door_type: "1door", door_side_selectable: true, shelf_count: 2 },
  { code: "04", name: "600 상부장", width_mm: 600, depth_mm: 320, height_mm: 800, door_type: "double", door_side_selectable: false, shelf_count: 2 },
  { code: "05", name: "700 상부장", width_mm: 700, depth_mm: 320, height_mm: 800, door_type: "double", door_side_selectable: false, shelf_count: 2 },
  { code: "06", name: "800 상부장", width_mm: 800, depth_mm: 320, height_mm: 800, door_type: "double", door_side_selectable: false, shelf_count: 2 },
  { code: "07", name: "900 상부장", width_mm: 900, depth_mm: 320, height_mm: 800, door_type: "double", door_side_selectable: false, shelf_count: 2 },
  { code: "08", name: "1000 상부장", width_mm: 1000, depth_mm: 320, height_mm: 800, door_type: "double", door_side_selectable: false, shelf_count: 2 },
  { code: "09", name: "1100 상부장", width_mm: 1100, depth_mm: 320, height_mm: 800, door_type: "double", door_side_selectable: false, shelf_count: 2 },
  { code: "10", name: "1200 상부장", width_mm: 1200, depth_mm: 320, height_mm: 800, door_type: "triple", door_side_selectable: false, shelf_count: 2 },
  {
    code: "11",
    name: "600 후드장 + 슬라이딩후드",
    width_mm: 600,
    depth_mm: 320,
    height_mm: 600,
    door_type: "double",
    door_side_selectable: false,
    shelf_count: 0,
    note: "내부선반 없음 · 후드 자바라 포함(늘렸을 때 최대 60cm)",
  },
];

/** 상부장 공통 안내: 시공목·시공피스 기본 포함 */
export const wallCabinetIncludes = ["시공목", "시공피스"] as const;

export function getWallCabinet(code: string): WallCabinetSpec | undefined {
  return wallCabinets.find((c) => c.code === code);
}

/* ────────────────────────────────────────────────────────────
 * 2) 도어 색상 (11 colors · 전체 무광)
 * ──────────────────────────────────────────────────────────── */

export type DoorColor = {
  name: string;
  tone: string;
  soldOut?: boolean;
  note?: string;
};

/** 도어는 LG/한샘/팬톤 제조사 제품 중 랜덤 제작되어 출고. 우드무늬는 무늬결 상이 가능. */
export const doorColors: DoorColor[] = [
  { name: "화이트", tone: "#f2f3f5" },
  { name: "그레이", tone: "#b9bcc0" },
  { name: "베이지", tone: "#e4d9c6", soldOut: true },
  { name: "스카이블루", tone: "#aac6dc" },
  { name: "그린", tone: "#9caf8c" },
  { name: "핑크", tone: "#eabfc7" },
  { name: "옐로우", tone: "#f2b21f" },
  { name: "네이비", tone: "#26374f" },
  { name: "다크그레이", tone: "#5a5a5c" },
  { name: "블랙", tone: "#1c1c1e" },
  { name: "우드", tone: "#7a513a", note: "우드무늬는 상품 특성상 무늬결이 다를 수 있음" },
];

export const doorFinishNote =
  "전체 도어 무광. 도어는 LG·한샘·팬톤 제조사 제품 중 랜덤 제작되어 출고됩니다.";

/* ────────────────────────────────────────────────────────────
 * 3) 택배 배송비 (수도권 외 지역은 택배만 가능)
 *    상부장 / 하부장(개수대·조리대·가스대) / 추가구성(뒷선반·걸레받이)
 * ──────────────────────────────────────────────────────────── */

/** 사이즈(폭 mm) → 배송비(원). 평균 부과 기준이며 지역에 따라 감액/추가 가능. */
export const wallCabinetShipping: Record<number, number> = {
  300: 10000, 400: 10000, 500: 11000, 600: 14000, 700: 15000,
  800: 17000, 900: 19000, 1000: 21000, 1100: 24000, 1200: 26000,
};

export const baseCabinetShipping: Record<number, number> = {
  300: 11000, 400: 14000, 500: 17000, 600: 19000, 700: 24000,
  800: 26000, 900: 28000, 1000: 31000, 1100: 34000, 1200: 36000,
};

/** 뒷선반·걸레받이 등 추가구성: 폭 구간별 배송비 */
export const extraPartShipping: { minWidthMm: number; maxWidthMm: number; price: number }[] = [
  { minWidthMm: 300, maxWidthMm: 600, price: 5000 },
  { minWidthMm: 700, maxWidthMm: 1000, price: 7000 },
  { minWidthMm: 1100, maxWidthMm: 1900, price: 11000 },
  { minWidthMm: 2000, maxWidthMm: 2400, price: 17000 },
];

export function getExtraPartShipping(widthMm: number): number | undefined {
  return extraPartShipping.find((r) => widthMm >= r.minWidthMm && widthMm <= r.maxWidthMm)?.price;
}

/**
 * 폭(mm)에 해당하는 배송비를 사이즈 테이블에서 조회.
 * 표에 없는 폭(임의 모듈 폭)은 가까운 상위 구간으로 스냅하고, 상·하한은 클램프한다.
 */
export function shippingForWidth(table: Record<number, number>, widthMm: number): number {
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (keys.length === 0) return 0;
  const min = keys[0];
  const max = keys[keys.length - 1];
  if (widthMm <= min) return table[min];
  if (widthMm >= max) return table[max];
  const key = keys.find((k) => k >= widthMm) ?? max;
  return table[key];
}

/** 상부장 폭(mm) → 택배 배송비 */
export const wallCabinetShippingFor = (widthMm: number) => shippingForWidth(wallCabinetShipping, widthMm);
/** 하부장(개수대·조리대·가스대) 폭(mm) → 택배 배송비 */
export const baseCabinetShippingFor = (widthMm: number) => shippingForWidth(baseCabinetShipping, widthMm);

/** 택배 배송 기간(영업일) 및 배송 불가 지역 */
export const shippingPolicy = {
  courierLeadDaysBusiness: [6, 8] as const,
  installLeadDaysBusiness: [6, 15] as const,
  /** 화물 택배로 배송 · 묶음배송 불가 · 착불(제품 수령 시 기사에게 전달) */
  freightNote: "제품 특성상 화물 택배로 배송되며 묶음 배송이 어렵고, 배송비는 착불로 부과됩니다.",
  undeliverableAreas: ["제주도 일부", "도서산간 일부", "섬지역"],
  /** 엘리베이터 없는 2층 이상/지하층은 1층 적재, 추가비용(사다리차·주차 등) 고객 부담 */
  noElevatorNote: "엘리베이터 없는 2층 이상 건물·지하층은 1층 적재. 사다리차·주차료 등 발생 시 고객 부담.",
} as const;

/* ────────────────────────────────────────────────────────────
 * 4) 방문 시공 (신청 가능: 서울 · 경기 · 인천)
 * ──────────────────────────────────────────────────────────── */

/** 총 구매 사이즈(mm) 구간별 시공비. sink=개수대/조리대, wall=상부장(시공목 포함) */
export type InstallTier = {
  label: string;
  /** 구간 하한(mm, 포함) */
  minWidthMm: number;
  /** 구간 상한(mm, 포함). 마지막 구간은 Infinity 취급 */
  maxWidthMm: number;
  sinkPrice: number;
  wallPrice: number;
};

export const installTiers: InstallTier[] = [
  { label: "800 미만", minWidthMm: 0, maxWidthMm: 899, sinkPrice: 50000, wallPrice: 30000 },
  { label: "900~1200", minWidthMm: 900, maxWidthMm: 1200, sinkPrice: 60000, wallPrice: 30000 },
  { label: "1800", minWidthMm: 1201, maxWidthMm: 1800, sinkPrice: 80000, wallPrice: 40000 },
  { label: "2400", minWidthMm: 1801, maxWidthMm: 2400, sinkPrice: 100000, wallPrice: 50000 },
  { label: "3600", minWidthMm: 2401, maxWidthMm: 3600, sinkPrice: 120000, wallPrice: 60000 },
];

export const installServiceableRegions = ["서울", "경기", "인천"] as const;

export function getInstallTier(totalWidthMm: number): InstallTier | undefined {
  return installTiers.find((t) => totalWidthMm >= t.minWidthMm && totalWidthMm <= t.maxWidthMm);
}

/** 층별 추가비: 엘리베이터 없는 3층 이상 → 10,000원부터, 층당 5,000원 추가 */
export const installFloorSurcharge = {
  appliesFromFloor: 3,
  baseSurcharge: 10000,
  perFloorSurcharge: 5000,
} as const;

/** 방문시공 3만원 추가 지역 (톨게이트 비용 별도 발생 지역 포함) */
export const installRegionSurcharge = {
  price: 30000,
  regions: [
    "동두천", "포천", "연천", "가평", "양평", "평택", "안성", "강화", "여주", "이천",
    "파주", "오산", "김포", "안산(제부도·대부도·선신면 일대)", "경기 광주", "양주",
    "하남", "구리", "남양주", "영종도(톨게이트 비용 추가)",
  ],
} as const;

/** 기존 제품 철거비 (1층까지 하역 · 최종 수거 여부는 현장 협의) */
export const removalTiers: { minWidthMm: number; maxWidthMm: number; price: number }[] = [
  { minWidthMm: 0, maxWidthMm: 1400, price: 20000 },
  { minWidthMm: 1500, maxWidthMm: 2300, price: 40000 },
  { minWidthMm: 2400, maxWidthMm: 3600, price: 60000 },
];

export function getRemovalPrice(totalWidthMm: number): number | undefined {
  return removalTiers.find((t) => totalWidthMm >= t.minWidthMm && totalWidthMm <= t.maxWidthMm)?.price;
}

/* ────────────────────────────────────────────────────────────
 * 5) 후드장 타공 (고객센터 추가 상담)
 * ──────────────────────────────────────────────────────────── */

export const hoodDrillingOption = {
  price: 40000,
  holeDiameterMm: 12,
  note: "자바라 구멍·전선 구멍 각각 확인 필요. 중앙 기준점 기준, 원형 외 모양 타공 불가. 타공 위치 ± 오차 발생 가능.",
} as const;

/* ────────────────────────────────────────────────────────────
 * 6) EP 마감판넬 (End Panel · 두께 18mm · 고객센터 추가 상담)
 * ──────────────────────────────────────────────────────────── */

export type EpPanelSpec = {
  target: string;
  width_mm: number;
  height_mm: number;
  price: number;
  backShelf?: "미적용" | "적용";
};

export const epPanels: EpPanelSpec[] = [
  { target: "상부장", width_mm: 320, height_mm: 800, price: 40000 },
  { target: "후드장", width_mm: 320, height_mm: 600, price: 40000 },
  { target: "후드장", width_mm: 320, height_mm: 650, price: 40000 },
  { target: "하부장", width_mm: 600, height_mm: 820, price: 65000, backShelf: "미적용" },
  { target: "하부장", width_mm: 650, height_mm: 820, price: 65000, backShelf: "적용" },
  { target: "가스대", width_mm: 600, height_mm: 675, price: 65000, backShelf: "미적용" },
  { target: "가스대", width_mm: 650, height_mm: 675, price: 65000, backShelf: "적용" },
];

/** EP 마감판넬 판당 단가 — 상부장·후드장 40,000원 / 하부장·가스대 65,000원 */
export function epUnitPrice(kind: "wall" | "hood" | "base" | "gas"): number {
  return kind === "wall" || kind === "hood" ? 40000 : 65000;
}

export const epPanelPolicy = {
  thicknessMm: 18,
  /** 하부장 EP 적용 시 판넬 1개당 몸통 폭 20mm 감소 (한쪽 -20, 양쪽 -40) */
  bodyWidthReductionPerPanelMm: 20,
  /** 스텐 상판 제품은 EP 마감 판넬 적용 불가. PT상판·인조대리석 상판은 가능. */
  notAllowedWithStainlessTop: true,
  hoodNote: "후드장 EP 적용 시 함께 구매한 상부장 몸통 폭이 20mm씩 줄어듭니다.",
} as const;

/* ────────────────────────────────────────────────────────────
 * 7) 부속 및 악세사리 (고객센터 추가 상담)
 * ──────────────────────────────────────────────────────────── */

export type AccessoryItem = {
  name: string;
  price: number;
  soldOut?: boolean;
  note?: string;
};

/** 부속/악세사리 이름으로 가격 조회 (없으면 0) */
export function accessoryPriceByName(name: string): number {
  return accessories.find((a) => a.name === name)?.price ?? 0;
}

export const accessories: AccessoryItem[] = [
  { name: "수절판", price: 19000, soldOut: true },
  { name: "칼꽂이", price: 12000 },
  { name: "방열판", price: 30000 },
  { name: "상부장 스텐 선반", price: 49000 },
  { name: "하부장 정리 선반", price: 35000, note: "600 개수대 사용 불가" },
  { name: "바구니", price: 20000, note: "점보볼에만 사용 가능" },
  { name: "세제 통", price: 25000, note: "타공하여 사용 · 무료타공/별도문의(기본 좌측 설치)" },
  { name: "싱크 조절 다리 1ea", price: 5000, note: "제품구매 시 기본 제공 · 추가 필요 시 구매. 다리 길이 12~19cm" },
  { name: "배수구 연결 호스 1m", price: 10000, note: "기본 호스(60cm)가 짧아 연장 필요 시" },
  { name: "배수구 일자 연결대 1ea", price: 8000, note: "기본 호스와 추가 구매 호스 연결용" },
  { name: "수전 연결 호스 1ea", price: 15000, note: "냉수·온수 별도. 기본 호스(70cm) 연장 필요 시" },
  { name: "수전 막음 캡 1ea", price: 9000, note: "냉수만 사용하는 설치 시 온수 호스 막음 (예: 사무실 탕비실)" },
  { name: "조절 밸브 1ea", price: 15000 },
];

/* ────────────────────────────────────────────────────────────
 * 7.5) 제품 사양 · 마감 상세 (상세페이지 안내용 — 견적 엔진 사실과 일치)
 * ──────────────────────────────────────────────────────────── */

export const productSpecs = [
  { name: "자재 등급", value: "친환경 E0 등급 보드", note: "새집증후군 유발물질(포름알데히드) 방출 최소 등급 — 실내 주방가구 기준" },
  { name: "도어", value: "PET 도어 (UV 하이그로시 / 슈퍼매트 무광)", note: "오염에 강하고 변색이 적은 PET 필름 마감 · LPM 무늬목 선택 가능" },
  { name: "경첩", value: "댐핑(소프트클로징) 경첩", note: "문짝 1개당 2개 기본 — 서서히 닫혀 소음·충격 방지" },
  { name: "몸통", value: "백색 멜라민 합판", note: "도어 색상과 무관하게 몸통은 위생적인 백색 마감" },
  { name: "상판", value: "PT(포스트포밍) / 스테인리스 선택", note: "싱크볼·쿡탑 타공은 현장 시공 기준" },
  { name: "걸레받이", value: "전면 기본 100mm · 측면 선택", note: "바닥 수평에 맞춰 현장 맞춤 절단" },
  { name: "내부 선반", value: "상부장 2단 선반 기본", note: "선반다보 방식 — 높이 조절 가능" },
] as const;

/* ────────────────────────────────────────────────────────────
 * 8) 주문 · 취소 · 반품 정책
 * ──────────────────────────────────────────────────────────── */

export const orderPolicy = {
  madeToOrder: true,
  /** 수도권(서울/경기/인천) 택배 가능. 그 외 지방은 화물 착불(다량 주문 시). */
  courierRegions: ["서울", "경기", "인천"],
  /** 주문 후 취소는 주문 시점으로부터 이틀(2일) 이내에만 가능 */
  cancelWindowDays: 2,
  /** 제품 수령 후 불량 확인·연락 기한(일) */
  defectReportDays: 3,
  variantReturnAllowed: false, // 변심 반품 및 교환 불가
  customerCenter: { tel: "02-861-2005", mobile: "010-8700-2888", hours: "월~금 9시~17시" },
} as const;
