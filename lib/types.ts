export type ProductType =
  | "custom_shelf"
  | "gap_cabinet"
  | "shoe_cabinet"
  | "kitchen_base_cabinet"
  | "kitchen_wall_cabinet"
  | "kitchen_full_set"
  | "kitchen_island"
  | "built_in_wardrobe";
export type OrderStatus =
  | "draft"
  | "submitted"
  | "reviewing"
  | "confirmed"
  | "cutting_wait"
  | "cutting_done"
  | "edging_wait"
  | "edging_done"
  | "packing"
  | "shipping"
  | "completed"
  | "cancelled";

export type FurnitureInput = {
  productType: ProductType;
  width_mm: number;
  height_mm: number;
  depth_mm: number;
  color: string;
  material: string;
  has_door: boolean;
  shelf_count: number;
  door_count: number;
  handle_type: string;
  delivery_type: string;
  back_panel?: boolean;
  open_type?: string;
  wall_fix_option?: boolean;
  shoe_shelf_angle?: boolean;
  bottom_space?: number;
  kitchen_template?: string;
  countertop_type?: string;
  sink_option?: string;
  faucet_option?: string;
  hood_option?: string;
  cooktop_option?: string;
  microwave_option?: string;
  drawer_module_count?: number;
  pullout_module_count?: number;
  /** 수납장(선반장/틈새장/신발장) 하단 서랍 단수 (0=없음, 최대 4) — 부품·레일 하드웨어에 반영 */
  storage_drawer_count?: number;
  /** 서랍통(서랍 몸통) 사양 — 기본 PB 15T / 자작합판 12T */
  drawer_box_spec?: "pb15" | "birch12";
  kitchen_modules_mm?: number[];
  kitchen_base_modules_mm?: number[];
  kitchen_wall_modules_mm?: number[];
  /** 주방 배치 모양: straight(일자) | l_shape(ㄱ자). 기본 straight */
  kitchen_layout_shape?: "straight" | "l_shape";
  /** ㄱ자 측면(꺾인) 다리의 하부장 모듈 폭 배열 */
  kitchen_side_modules_mm?: number[];
  /** ㄱ자 측면 다리 각 칸 종류 */
  kitchen_side_module_types?: import("@/lib/kitchen").KitchenModuleType[];
  /** ㄱ자 코너 위치(측면 다리가 붙는 쪽): left | right. 기본 right */
  kitchen_corner?: "left" | "right";
  /** ㄱ자 측면 다리 상부장 표시 여부. 기본 true */
  kitchen_side_has_wall?: boolean;
  /** 제작 작업지시서 제목칸·메모 (도면 보기에서 입력) */
  work_order_meta?: {
    siteName?: string;
    address?: string;
    date?: string;
    contact?: string;
    upperMemo?: string;
    lowerMemo?: string;
  };
  kitchen_base_height_mm?: number;
  kitchen_wall_height_mm?: number;
  kitchen_base_depth_mm?: number;
  kitchen_wall_depth_mm?: number;
  kitchen_module_types?: import("@/lib/kitchen").KitchenModuleType[];
  kitchen_drawer_counts?: number[];
  kitchen_base_shelf_counts?: number[];
  kitchen_wall_shelf_counts?: number[];
  /** 상부장 칸별 수직 설치 오프셋(mm) — 기본 설치높이에서 위(+)/아래(-)로 이동 */
  kitchen_wall_offset_mm?: number[];
  kitchen_base_hidden_indices?: number[];
  kitchen_wall_hidden_indices?: number[];
  sink_module_index?: number;
  cooktop_module_index?: number;
  hood_module_index?: number;
  microwave_module_index?: number;
  /** none | standard_100 */
  toe_kick_option?: string;
  /** flat | frame | slat */
  door_style?: "flat" | "frame" | "slat";
  /** pair | left | right | up | down | up_pair */
  door_swing?: "pair" | "left" | "right" | "up" | "down" | "up_pair";
  kitchen_door_swings?: Array<"pair" | "left" | "right" | "up" | "down" | "up_pair">;
  /** 상부장 칸별 문 열림 방향 (미설정 시 하부 kitchen_door_swings를 따름 → 상·하부 독립 편집용) */
  kitchen_wall_door_swings?: Array<"pair" | "left" | "right" | "up" | "down" | "up_pair">;
  /** 하부장 손잡이 없는 칸 인덱스 (칸별 손잡이 on/off — 전역 handle_type 위에 적용) */
  kitchen_no_handle_indices?: number[];
  /** 상부장 손잡이 없는 칸 인덱스 (상·하부 독립) */
  kitchen_wall_no_handle_indices?: number[];
  /** 붙박이장 모듈 구성 (행거/선반/서랍 모듈을 옆으로 이어 붙임) */
  wardrobe_modules_mm?: number[];
  wardrobe_module_types?: import("@/lib/wardrobe").WardrobeModuleType[];
  wardrobe_drawer_counts?: number[];
  wardrobe_shelf_counts?: number[];
  /** 붙박이장 칸별 문 열림 방향 (양개/좌/우) */
  wardrobe_door_swings?: Array<"pair" | "left" | "right" | "up" | "down" | "up_pair">;
  /** 주문 전 검증용 추가 필드 (Pre-Order Validation) */
  customer_type?: "consumer" | "professional";
  order_mode?: "direct" | "review" | "inquiry";
  leg_option?: string;
  sink_model_id?: string;
  drain_position_x_mm?: number;
  cooktop_model_id?: string;
  energy_type?: "gas" | "induction" | "hybrid";
  hood_position_x_mm?: number;
  /** 현장 사진 (mock: 식별자/URL 목록) */
  site_photos?: string[];
  /** 붙박이장 현장 실측 (좌/우 높이, 상/하 폭) */
  room_height_left_mm?: number;
  room_height_right_mm?: number;
  room_width_top_mm?: number;
  room_width_bottom_mm?: number;
  /** 주방 현장 실측 (벽 길이/수전·가스·콘센트 위치) */
  total_wall_length_mm?: number;
  water_position_x_mm?: number;
  gas_position_x_mm?: number;
  outlet_position_x_mm?: number;
};

export type ProductTemplate = {
  slug: ProductType;
  name: string;
  description: string;
  imageHint: string;
  imageSrc: string;
  minWidth: number;
  maxWidth: number;
};

export type Part = {
  name: string;
  width_mm: number;
  height_mm: number;
  quantity: number;
  material: string;
  color: string;
  note?: string;
};

export type EdgeTask = {
  part_name: string;
  front_edge: boolean;
  back_edge: boolean;
  left_edge: boolean;
  right_edge: boolean;
  total_edge_length_mm: number;
  note?: string;
};

export type HardwareTask = {
  hardware_name: string;
  spec: string;
  quantity: number;
  unit: string;
  note?: string;
};

export type Warning = {
  type: "error" | "warning" | "info";
  message: string;
};

/**
 * 현장 타공·조정·연결 항목 (공장 가공 아님 — 시공자 책임).
 * 배수/수전/가스/콘센트 구멍, 걸레받이·상판 현장 맞춤 등은 공장 재단표가 아니라 이 목록으로 분류한다.
 */
export type SiteTask = {
  category: "타공" | "조정" | "연결";
  name: string;
  quantity: number;
  /** 책임 주체 (기본 "현장 시공자") */
  responsible: string;
  note?: string;
};

export type QuoteResult = {
  input: FurnitureInput;
  parts: Part[];
  edgeTasks: EdgeTask[];
  hardwareTasks: HardwareTask[];
  /** 현장 타공·조정·연결 항목 (공장 제작 범위 밖, 시공자 작업) */
  siteTasks: SiteTask[];
  warnings: Warning[];
  boardAreaM2: number;
  edgeLengthM: number;
  sheetCount: number;
  boardCost: number;
  edgeCost: number;
  processingCost: number;
  assemblyCost: number;
  installCost: number;
  hardwareCost: number;
  packingCost: number;
  deliveryCost: number;
  marginRate: number;
  margin: number;
  totalCost: number;
  finalPrice: number;
  verdictResult?: import("@/lib/interior/types").VerdictResult;
};

export type OrderItemInput = {
  id: string;
  name: string;
  quantity: number;
  input: FurnitureInput;
  /** 주문 전 검증 스냅샷 */
  order_verdict?: "ready" | "needs_review" | "inquiry_required" | "blocked";
  checklist_confirmations?: string[];
};

export type OrderItemQuote = {
  item: OrderItemInput;
  quote: QuoteResult;
  lineTotal: number;
};

export type RequestedSchedule = {
  requested_delivery_date: string;
  requested_install_date: string;
  visit_required: boolean;
};

export type CustomerInfo = {
  name: string;
  phone: string;
  email: string;
  shipping_address: string;
  memo: string;
};

export type CompositeOrderDraft = {
  items: OrderItemInput[];
  schedule: RequestedSchedule;
  customer: CustomerInfo;
};

export type CompositeQuoteResult = {
  itemQuotes: OrderItemQuote[];
  warnings: Warning[];
  canSubmit: boolean;
  totalBoardCost: number;
  totalEdgeCost: number;
  totalProcessingCost: number;
  totalHardwareCost: number;
  totalPackingCost: number;
  totalDeliveryCost: number;
  totalPrice: number;
  boardCutPlan: BoardCutPlan;
};

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string;
  shipping_address: string;
  request_memo: string;
  product_name: string;
  status: OrderStatus;
  total_price: number;
  input: FurnitureInput;
  quote: QuoteResult;
  created_at: string;
};

export type PackingLabel = {
  box_number: number;
  total_boxes: number;
  items: string;
  caution: string;
};

export type BoardPlacement = {
  sheet_number: number;
  part_name: string;
  piece_number: number;
  x_mm: number;
  y_mm: number;
  width_mm: number;
  height_mm: number;
  rotated: boolean;
  material: string;
  color: string;
};

export type BoardSheetSummary = {
  material: string;
  color: string;
  sheet_spec_code: string;
  sheet_width_mm: number;
  sheet_height_mm: number;
  sheet_count: number;
  used_area_m2: number;
  board_area_m2: number;
  utilization_rate: number;
  waste_area_m2: number;
};

export type BoardCutPlan = {
  sheet_width_mm: number;
  sheet_height_mm: number;
  kerf_mm: number;
  factory_code?: string;
  summaries: BoardSheetSummary[];
  placements: BoardPlacement[];
};

export type CutSequenceStep = {
  order: number;
  step_code: string;
  step_label: string;
  description: string;
};

export type ManufacturingJob = {
  orderId: string;
  generated_at: string;
  factory_code: string;
  factory_label: string;
  pricing_tier: "public" | "contract";
  pricing_tier_label: string;
  parts: Part[];
  edgeTasks: EdgeTask[];
  hardwareTasks: HardwareTask[];
  boardCutPlan: BoardCutPlan;
  cutSequence: CutSequenceStep[];
  packing_rule: string;
  packingLabels: PackingLabel[];
};
