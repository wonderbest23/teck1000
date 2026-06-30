import { generateBoardCutPlan } from "@/lib/cutting";
import { ENTRANCE_STANDARDS, KITCHEN_STANDARDS, WARDROBE_STANDARDS } from "@/lib/platformConfig";
import { defaultInput, getProduct } from "@/lib/data";
import { clampModuleIndex, deriveModuleTypeCounts, getKitchenSetDimensions, getKitchenTemplate, normalizeKitchenLayerWidths, normalizeKitchenModules } from "@/lib/kitchen";
import { calculateQuote } from "@/lib/quote";
import { getSafeDoorCount, productRules } from "@/lib/rules";
import type {
  CompositeOrderDraft,
  CompositeQuoteResult,
  CustomerInfo,
  FurnitureInput,
  OrderItemInput,
  Part,
  ProductType,
  RequestedSchedule,
  Warning,
} from "@/lib/types";

const MIN_LEAD_DAYS = 7;
const MIN_INSTALL_GAP_DAYS = 1;

export function createDefaultInput(productType: ProductType): FurnitureInput {
  if (productType === "kitchen_base_cabinet") {
    return normalizeFurnitureInput({ ...defaultInput, productType, width_mm: 900, height_mm: KITCHEN_STANDARDS.baseHeightMm, depth_mm: KITCHEN_STANDARDS.baseDepthMm, has_door: true, door_count: 3, shelf_count: 1, material: "UV 하이그로시 화이트", color: "화이트" });
  }
  if (productType === "kitchen_wall_cabinet") {
    return normalizeFurnitureInput({ ...defaultInput, productType, width_mm: 900, height_mm: KITCHEN_STANDARDS.wallHeightMm, depth_mm: KITCHEN_STANDARDS.wallDepthMm, has_door: true, door_count: 3, shelf_count: 1 });
  }
  if (productType === "kitchen_full_set") {
    return normalizeFurnitureInput({
      ...defaultInput,
      productType,
      width_mm: 2400,
      height_mm: KITCHEN_STANDARDS.baseHeightMm,
      depth_mm: KITCHEN_STANDARDS.baseDepthMm,
      kitchen_base_height_mm: KITCHEN_STANDARDS.baseHeightMm,
      kitchen_base_depth_mm: KITCHEN_STANDARDS.baseDepthMm,
      kitchen_wall_height_mm: KITCHEN_STANDARDS.wallHeightMm,
      kitchen_wall_depth_mm: KITCHEN_STANDARDS.wallDepthMm,
      has_door: true,
      door_count: 4,
      shelf_count: 1,
      material: "UV 하이그로시 화이트",
      color: "화이트",
      kitchen_template: "kitchen_2400_standard",
      countertop_type: "none",
      toe_kick_option: "none",
      sink_option: "single_780",
      faucet_option: "basic_cobra",
      hood_option: "haatz_slide_600",
      cooktop_option: "gas_3burner_560",
      microwave_option: "none",
      drawer_module_count: 1,
      pullout_module_count: 0,
      kitchen_modules_mm: [600, 600, 600, 600],
      kitchen_base_modules_mm: [600, 600, 600, 600],
      kitchen_wall_modules_mm: [600, 600, 600, 600],
      kitchen_module_types: ["drawer", "door", "door", "door"],
      kitchen_drawer_counts: [3, 3, 3, 3],
      kitchen_base_shelf_counts: [1, 1, 1, 1],
      kitchen_wall_shelf_counts: [1, 1, 1, 1],
      kitchen_door_swings: ["pair", "pair", "pair", "pair"],
      sink_module_index: 2,
      cooktop_module_index: 0,
      hood_module_index: 0,
      microwave_module_index: 3,
    });
  }
  if (productType === "built_in_wardrobe") {
    return normalizeFurnitureInput({ ...defaultInput, productType, width_mm: 1800, height_mm: WARDROBE_STANDARDS.minTotalHeightMm, depth_mm: WARDROBE_STANDARDS.preferredDepthMm, has_door: true, door_count: 4, shelf_count: 5, material: "LPM 라이트오크", color: "라이트오크" });
  }
  if (productType === "shoe_cabinet") {
    return normalizeFurnitureInput({ ...defaultInput, productType, width_mm: 900, height_mm: ENTRANCE_STANDARDS.minTotalHeightMm, depth_mm: ENTRANCE_STANDARDS.preferredDepthMm, has_door: true, door_count: 3, shelf_count: 4 });
  }
  if (productType === "gap_cabinet") {
    return normalizeFurnitureInput({ ...defaultInput, productType, width_mm: 420, height_mm: 1800, depth_mm: 300, has_door: true, door_count: 1, shelf_count: 4 });
  }
  return normalizeFurnitureInput({ ...defaultInput, productType, has_door: false, door_count: 0 });
}

export function normalizeFurnitureInput(input: FurnitureInput): FurnitureInput {
  const rules = productRules[input.productType];
  const kitchenTemplate = input.productType === "kitchen_full_set" ? getKitchenTemplate(input.kitchen_template) : null;
  const kitchenLayout = kitchenTemplate
    ? normalizeKitchenModules(kitchenTemplate, input.kitchen_modules_mm, input.kitchen_module_types)
    : null;
  const moduleTypeCounts = kitchenLayout ? deriveModuleTypeCounts(kitchenLayout.moduleTypes) : null;
  const kitchenDimensions = kitchenTemplate ? getKitchenSetDimensions(input, kitchenTemplate) : null;
  const hasDoor = rules.allowsDoorless ? input.has_door : true;
  const width = kitchenLayout?.width_mm ?? kitchenTemplate?.width_mm ?? input.width_mm;
  const height = kitchenDimensions?.baseHeightMm ?? input.height_mm ?? 0;
  const depth = kitchenDimensions?.baseDepthMm ?? input.depth_mm ?? 0;
  const maxModuleIndex = Math.max(0, (kitchenLayout?.modules.length ?? kitchenTemplate?.modules.length ?? 1) - 1);
  const defaultSinkIndex = clampModuleIndex(kitchenTemplate?.sinkModuleIndex ?? 0, maxModuleIndex);
  const defaultCooktopIndex = clampModuleIndex(kitchenTemplate?.cooktopModuleIndex ?? 0, maxModuleIndex);
  const normalizedDrawerCounts = kitchenLayout
    ? kitchenLayout.modules.map((_, index) => Math.min(3, Math.max(1, Math.round(input.kitchen_drawer_counts?.[index] ?? 3))))
    : input.kitchen_drawer_counts;
  const normalizedBaseShelfCounts = kitchenLayout
    ? kitchenLayout.modules.map((_, index) => Math.min(8, Math.max(0, Math.round(input.kitchen_base_shelf_counts?.[index] ?? input.shelf_count ?? 1))))
    : input.kitchen_base_shelf_counts;
  const normalizedWallShelfCounts = kitchenLayout
    ? kitchenLayout.modules.map((_, index) => Math.min(8, Math.max(0, Math.round(input.kitchen_wall_shelf_counts?.[index] ?? 1))))
    : input.kitchen_wall_shelf_counts;
  const normalizedDoorSwings = kitchenLayout
    ? kitchenLayout.modules.map((_, index) => input.kitchen_door_swings?.[index] ?? "pair")
    : input.kitchen_door_swings;
  return {
    ...input,
    width_mm: Math.max(0, Math.floor(width || 0)),
    height_mm: Math.max(0, Math.floor(height)),
    depth_mm: Math.max(0, Math.floor(depth)),
    shelf_count: Math.max(0, Math.floor(input.shelf_count || 0)),
    has_door: hasDoor,
    door_count: getSafeDoorCount(input.productType, width, hasDoor, Math.max(1, Math.floor(input.door_count || 1))),
    kitchen_template: kitchenTemplate?.id ?? input.kitchen_template,
    countertop_type: input.countertop_type ?? "none",
    toe_kick_option: input.toe_kick_option ?? "none",
    sink_option: input.sink_option ?? "single_780",
    faucet_option: input.faucet_option ?? "basic_cobra",
    hood_option: input.hood_option ?? "haatz_slide_600",
    cooktop_option: input.cooktop_option ?? "gas_3burner_560",
    microwave_option: input.microwave_option ?? "none",
    kitchen_modules_mm: kitchenLayout?.modules ?? input.kitchen_modules_mm,
    kitchen_base_modules_mm: kitchenLayout ? normalizeKitchenLayerWidths(kitchenLayout.modules, input.kitchen_base_modules_mm) : input.kitchen_base_modules_mm,
    kitchen_wall_modules_mm: kitchenLayout ? normalizeKitchenLayerWidths(kitchenLayout.modules, input.kitchen_wall_modules_mm) : input.kitchen_wall_modules_mm,
    kitchen_base_height_mm: kitchenDimensions?.baseHeightMm ?? input.kitchen_base_height_mm,
    kitchen_base_depth_mm: kitchenDimensions?.baseDepthMm ?? input.kitchen_base_depth_mm,
    kitchen_wall_height_mm: kitchenDimensions?.wallHeightMm ?? input.kitchen_wall_height_mm,
    kitchen_wall_depth_mm: kitchenDimensions?.wallDepthMm ?? input.kitchen_wall_depth_mm,
    kitchen_module_types: kitchenLayout?.moduleTypes ?? input.kitchen_module_types,
    kitchen_drawer_counts: normalizedDrawerCounts,
    kitchen_base_shelf_counts: normalizedBaseShelfCounts,
    kitchen_wall_shelf_counts: normalizedWallShelfCounts,
    kitchen_door_swings: normalizedDoorSwings,
    drawer_module_count: moduleTypeCounts ? moduleTypeCounts.drawer : Math.max(0, Math.floor(input.drawer_module_count ?? 0)),
    pullout_module_count: moduleTypeCounts ? moduleTypeCounts.pullout : Math.max(0, Math.floor(input.pullout_module_count ?? 0)),
    sink_module_index: clampModuleIndex(input.sink_module_index ?? defaultSinkIndex, maxModuleIndex),
    cooktop_module_index: clampModuleIndex(input.cooktop_module_index ?? defaultCooktopIndex, maxModuleIndex),
    hood_module_index: clampModuleIndex(input.hood_module_index ?? input.cooktop_module_index ?? defaultCooktopIndex, maxModuleIndex),
    microwave_module_index: clampModuleIndex(input.microwave_module_index ?? maxModuleIndex, maxModuleIndex),
  };
}

export function createOrderItem(productType: ProductType, quantity = 1): OrderItemInput {
  const product = getProduct(productType);
  return {
    id: `${productType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: product?.name ?? "맞춤 상품",
    quantity,
    input: createDefaultInput(productType),
  };
}

export function createEmptyCustomer(): CustomerInfo {
  return {
    name: "",
    phone: "",
    email: "",
    shipping_address: "",
    memo: "",
  };
}

export function createDefaultSchedule(): RequestedSchedule {
  const delivery = addDays(new Date(), MIN_LEAD_DAYS);
  const install = addDays(delivery, MIN_INSTALL_GAP_DAYS);
  return {
    requested_delivery_date: toDateInputValue(delivery),
    requested_install_date: toDateInputValue(install),
    visit_required: true,
  };
}

export function getMinimumDeliveryDate() {
  return toDateInputValue(addDays(new Date(), MIN_LEAD_DAYS));
}

export function getMinimumInstallDate(deliveryDate: string) {
  const base = deliveryDate ? new Date(`${deliveryDate}T00:00:00`) : addDays(new Date(), MIN_LEAD_DAYS);
  return toDateInputValue(addDays(base, MIN_INSTALL_GAP_DAYS));
}

export function calculateCompositeQuote(draft: CompositeOrderDraft): CompositeQuoteResult {
  const itemQuotes = draft.items.map((item) => {
    const normalizedItem = { ...item, quantity: Math.max(1, Math.floor(item.quantity || 1)), input: normalizeFurnitureInput(item.input) };
    const quote = calculateQuote(normalizedItem.input);
    return {
      item: normalizedItem,
      quote,
      lineTotal: quote.finalPrice * normalizedItem.quantity,
    };
  });
  const allParts = expandCompositeParts(itemQuotes);
  const boardCutPlan = generateBoardCutPlan(allParts);
  const warnings = [...itemQuotes.flatMap((line) => line.quote.warnings), ...validateSchedule(draft.schedule), ...validateCustomer(draft.customer)];

  return {
    itemQuotes,
    warnings,
    canSubmit: draft.items.length > 0 && !warnings.some((warning) => warning.type === "error"),
    totalBoardCost: sumLine(itemQuotes, "boardCost"),
    totalEdgeCost: sumLine(itemQuotes, "edgeCost"),
    totalProcessingCost: sumLine(itemQuotes, "processingCost"),
    totalHardwareCost: sumLine(itemQuotes, "hardwareCost"),
    totalPackingCost: sumLine(itemQuotes, "packingCost"),
    totalDeliveryCost: Math.max(...itemQuotes.map((line) => line.quote.deliveryCost), 0),
    totalPrice: itemQuotes.reduce((sum, line) => sum + line.lineTotal, 0),
    boardCutPlan,
  };
}

export function buildOrderRequestSummary(draft: CompositeOrderDraft) {
  const quote = calculateCompositeQuote(draft);
  return {
    order_number: makeDraftOrderNumber(),
    created_at: new Date().toISOString(),
    draft,
    quote,
  };
}

function expandCompositeParts(itemQuotes: CompositeQuoteResult["itemQuotes"]): Part[] {
  return itemQuotes.flatMap((line, itemIndex) =>
    Array.from({ length: line.item.quantity }, (_, quantityIndex) =>
      line.quote.parts.map((part) => ({
        ...part,
        name: `${itemIndex + 1}-${quantityIndex + 1} ${line.item.name} ${part.name}`,
      })),
    ).flat(),
  );
}

function validateSchedule(schedule: RequestedSchedule): Warning[] {
  const warnings: Warning[] = [];
  const minDelivery = getMinimumDeliveryDate();
  const minInstall = getMinimumInstallDate(schedule.requested_delivery_date);

  if (!schedule.requested_delivery_date) {
    warnings.push({ type: "error", message: "희망 배송일을 선택해주세요." });
  } else if (schedule.requested_delivery_date < minDelivery) {
    warnings.push({ type: "error", message: `희망 배송일은 최소 ${MIN_LEAD_DAYS}일 이후부터 선택할 수 있습니다.` });
  }

  if (schedule.visit_required) {
    if (!schedule.requested_install_date) {
      warnings.push({ type: "error", message: "설치 요청 시 희망 설치일을 선택해주세요." });
    } else if (schedule.requested_install_date < minInstall) {
      warnings.push({ type: "error", message: "희망 설치일은 배송 희망일 다음날 이후로 선택해주세요." });
    }
  }

  return warnings;
}

function validateCustomer(customer: CustomerInfo): Warning[] {
  const warnings: Warning[] = [];
  if (!customer.name.trim()) warnings.push({ type: "error", message: "주문자명을 입력해주세요." });
  if (!customer.phone.trim()) warnings.push({ type: "error", message: "연락처를 입력해주세요." });
  if (!customer.shipping_address.trim()) warnings.push({ type: "error", message: "배송 주소를 입력해주세요." });
  if (customer.email && !customer.email.includes("@")) warnings.push({ type: "warning", message: "이메일 형식을 확인해주세요." });
  return warnings;
}

function sumLine(itemQuotes: CompositeQuoteResult["itemQuotes"], key: keyof CompositeQuoteResult["itemQuotes"][number]["quote"]) {
  return itemQuotes.reduce((sum, line) => {
    const value = line.quote[key];
    return typeof value === "number" ? sum + value * line.item.quantity : sum;
  }, 0);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeDraftOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `${year}${month}${day}-${time}`;
}
