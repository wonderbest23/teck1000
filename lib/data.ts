export { hardwareItems, materials } from "@/lib/catalogData";
import { calculateQuote } from "@/lib/quote";
import type { FurnitureInput, Order, OrderStatus, ProductTemplate } from "@/lib/types";

export const productTemplates: ProductTemplate[] = [
  {
    slug: "desk",
    name: "맞춤 책상",
    description: "책상 높이 기준으로 상판/다리/서랍 조합을 맞추는 홈오피스 기본 데스크입니다.",
    imageHint: "홈오피스 데스크",
    imageSrc: "/images/custom-shelf.svg",
    minWidth: 900,
    maxWidth: 2200,
  },
  {
    slug: "living_cabinet",
    name: "거실 인테리어장",
    description: "하부 도어 수납 + 상부 오픈 진열을 조합하는 거실 벽면 인테리어장(TV장·장식장)입니다.",
    imageHint: "거실 인테리어장",
    imageSrc: "/images/custom-shelf.svg",
    minWidth: 800,
    maxWidth: 3000,
  },
  {
    slug: "custom_shelf",
    name: "맞춤 선반장",
    description: "도면 없이 사이즈와 선반 개수만 입력하는 기본 수납 선반장입니다.",
    imageHint: "오픈형 선반장",
    imageSrc: "/images/custom-shelf.svg",
    minWidth: 200,
    maxWidth: 1200,
  },
  {
    slug: "gap_cabinet",
    name: "맞춤 틈새 수납장",
    description: "좁은 틈새 공간에 맞춰 문짝과 벽고정 옵션까지 계산합니다.",
    imageHint: "슬림 수납장",
    imageSrc: "/images/gap-cabinet.svg",
    minWidth: 200,
    maxWidth: 900,
  },
  {
    slug: "shoe_cabinet",
    name: "맞춤 신발장",
    description: "문짝 수와 하부 띄움까지 반영하는 현관 맞춤 신발장입니다.",
    imageHint: "신발 수납장",
    imageSrc: "/images/shoe-cabinet.svg",
    minWidth: 400,
    maxWidth: 1200,
  },
  {
    slug: "kitchen_base_cabinet",
    name: "싱크대 하부장",
    description: "주방 하부장 기준 높이와 깊이를 적용하고 문짝 수를 폭에 맞춰 제한합니다.",
    imageHint: "주방 싱크대 하부장",
    imageSrc: "/images/kitchen-base-cabinet.svg",
    minWidth: 300,
    maxWidth: 1200,
  },
  {
    slug: "kitchen_wall_cabinet",
    name: "싱크대 상부장",
    description: "주방 벽면 상부장 기준 깊이와 높이를 적용하고 문짝 조합을 제한합니다.",
    imageHint: "주방 싱크대 상부장",
    imageSrc: "/images/kitchen-wall-cabinet.svg",
    minWidth: 300,
    maxWidth: 1200,
  },
  {
    slug: "kitchen_full_set",
    name: "싱크대 상하부장 세트",
    description: "같은 폭 기준으로 하부장과 상부장을 함께 견적·재단하는 주방 기본 세트입니다.",
    imageHint: "주방 싱크대 상하부장 세트",
    imageSrc: "/images/kitchen-full-set.svg",
    minWidth: 1800,
    maxWidth: 3000,
  },
  {
    slug: "kitchen_island",
    name: "아일랜드장",
    description: "사방에서 쓰는 독립형 주방 아일랜드. 상판·하부 수납을 갖춰 조리·배치 중심으로 씁니다.",
    imageHint: "주방 아일랜드장",
    imageSrc: "/images/kitchen-base-cabinet.svg",
    minWidth: 600,
    maxWidth: 2400,
  },
  {
    slug: "built_in_wardrobe",
    name: "붙박이장",
    description: "방 전체 높이에 맞춘 붙박이장으로 폭에 따라 문짝 조합을 자동 제한합니다.",
    imageHint: "맞춤 붙박이장",
    imageSrc: "/images/built-in-wardrobe.svg",
    minWidth: 600,
    maxWidth: 2400,
  },
];

export const orderStatusLabels: Record<OrderStatus, string> = {
  draft: "견적작성중",
  submitted: "주문접수",
  reviewing: "제작검토중",
  confirmed: "제작확정",
  cutting_wait: "재단대기",
  cutting_done: "재단완료",
  edging_wait: "엣지대기",
  edging_done: "엣지완료",
  packing: "포장중",
  shipping: "배송중",
  completed: "완료",
  cancelled: "취소",
};

export const statusFlow: OrderStatus[] = [
  "submitted",
  "reviewing",
  "confirmed",
  "cutting_wait",
  "cutting_done",
  "edging_wait",
  "edging_done",
  "packing",
  "shipping",
  "completed",
];

export const defaultInput: FurnitureInput = {
  productType: "custom_shelf",
  width_mm: 800,
  height_mm: 1200,
  depth_mm: 350,
  color: "화이트",
  material: "UV 하이그로시 화이트",
  has_door: false,
  shelf_count: 3,
  door_count: 2,
  handle_type: "기본 손잡이",
  delivery_type: "택배",
  back_panel: true,
  open_type: "오픈형",
  wall_fix_option: false,
  shoe_shelf_angle: false,
  bottom_space: 80,
  door_style: "flat",
};

export function getProduct(slug: string) {
  return productTemplates.find((product) => product.slug === slug);
}

const sampleInputs: FurnitureInput[] = [
  { ...defaultInput, productType: "desk", width_mm: 1400, height_mm: 740, depth_mm: 600, has_door: false, door_count: 0, shelf_count: 1, storage_drawer_count: 3, material: "LPM 라이트오크", color: "오크" },
  { ...defaultInput, productType: "living_cabinet", width_mm: 1800, height_mm: 1800, depth_mm: 400, has_door: true, door_count: 3, shelf_count: 4, color: "그레이", material: "UV 하이그로시 그레이" },
  { ...defaultInput, productType: "gap_cabinet", width_mm: 420, height_mm: 1900, depth_mm: 280, has_door: true, door_count: 1, shelf_count: 5, wall_fix_option: true },
  { ...defaultInput, productType: "shoe_cabinet", width_mm: 900, height_mm: 2100, depth_mm: 350, has_door: true, door_count: 2, shelf_count: 4, color: "오크", material: "LPM 라이트오크" },
  { ...defaultInput, productType: "custom_shelf", width_mm: 720, height_mm: 1400, depth_mm: 320, shelf_count: 4 },
  { ...defaultInput, productType: "kitchen_base_cabinet", width_mm: 900, height_mm: 850, depth_mm: 600, has_door: true, door_count: 3, shelf_count: 1, color: "무광 화이트", material: "UV 하이그로시 화이트" },
  { ...defaultInput, productType: "kitchen_wall_cabinet", width_mm: 900, height_mm: 800, depth_mm: 340, has_door: true, door_count: 3, shelf_count: 1, color: "화이트", material: "UV 하이그로시 화이트" },
  { ...defaultInput, productType: "kitchen_full_set", width_mm: 2400, height_mm: 850, depth_mm: 600, has_door: true, door_count: 4, shelf_count: 1, color: "무광 화이트", material: "UV 하이그로시 화이트", kitchen_template: "kitchen_2400_standard", countertop_type: "none", toe_kick_option: "none", sink_option: "none", faucet_option: "none", kitchen_modules_mm: [600, 600, 600, 600], kitchen_module_types: ["drawer", "door", "door", "door"], kitchen_door_swings: ["pair", "pair", "pair", "pair"] },
  { ...defaultInput, productType: "built_in_wardrobe", width_mm: 1800, height_mm: 2100, depth_mm: 600, has_door: true, door_count: 4, shelf_count: 5, color: "오크", material: "LPM 라이트오크" },
];

export const sampleOrders: Order[] = sampleInputs.map((input, index) => {
  const product = getProduct(input.productType)!;
  const quote = calculateQuote(input);
  return {
    id: `sample-${index + 1}`,
    order_number: `20260621-000${index + 1}`,
    customer_name: ["김민지", "박준호", "이서연", "최하준", "정다은", "한서준", "윤지호", "강하늘", "오지원"][index],
    phone: "010-1234-5678",
    email: "customer@example.com",
    shipping_address: "서울시 강남구 테헤란로 100",
    request_memo: index === 0 ? "벽면 고정 가능 여부 확인 부탁드립니다." : "배송 전 연락 주세요.",
    product_name: product.name,
    status: ["reviewing", "cutting_wait", "submitted", "confirmed", "reviewing", "confirmed", "submitted", "reviewing", "submitted"][index] as OrderStatus,
    total_price: quote.finalPrice,
    input,
    quote,
    created_at: `2026-06-${21 - index}T09:00:00.000Z`,
  };
});

export function getOrder(orderId: string) {
  return sampleOrders.find((order) => order.id === orderId) ?? sampleOrders[0];
}
