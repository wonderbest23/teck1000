/** 한국 종합인테리어 플랫폼 즉시 도입 기준서 — 공통 타입 */

export type VerdictLevel = "가능" | "주의" | "불가" | "제작문의";

export type ValueStatus = VerdictLevel | "미등록";

export type SourceLevel =
  | "ks_or_sps"
  | "manufacturer_catalog"
  | "manufacturer_product_page"
  | "distributor_listing";

export type SourceMeta = {
  source_level: SourceLevel;
  source_name: string;
  source_url?: string;
  source_snapshot_date?: string;
  public_confirmed: boolean;
  notes?: string;
};

export type ValidationIssue = {
  verdict: VerdictLevel;
  code: string;
  message: string;
  field?: string;
  source_status?: ValueStatus;
};

export type VerdictResult = {
  verdict: VerdictLevel;
  issues: ValidationIssue[];
  canAutoApprove: boolean;
  canSubmitOrder: boolean;
};

export type RoomMeasurement = {
  wall_width_bottom_mm?: number;
  wall_width_mid_mm?: number;
  wall_width_top_mm?: number;
  depth_left_mm?: number;
  depth_mid_mm?: number;
  depth_right_mm?: number;
  ceiling_left_mm?: number;
  ceiling_mid_mm?: number;
  ceiling_right_mm?: number;
  hot_water_x_mm?: number;
  hot_water_y_mm?: number;
  cold_water_x_mm?: number;
  cold_water_y_mm?: number;
  drain_x_mm?: number;
  drain_y_mm?: number;
  drain_type?: "wall" | "floor";
  outlet_x_mm?: number;
  outlet_y_mm?: number;
};

export type PreviewRequest = {
  project_type: "kitchen" | "wardrobe" | "storage" | "custom";
  room_measurement?: RoomMeasurement;
  plant_id?: string;
  appliances?: import("@/lib/interior/pipeline/types").ApplianceSlot[];
  require_cut_finalization?: boolean;
  input: import("@/lib/types").FurnitureInput;
};

export type PreviewResponse = {
  verdict: VerdictLevel;
  issues: ValidationIssue[];
  can_submit: boolean;
  quote_preview?: {
    final_price: number;
    sheet_count: number;
    margin_rate: number;
  };
  validation_log: ValidationIssue[];
  pipeline_stages?: import("@/lib/interior/pipeline/types").PipelineStageResult[];
};
