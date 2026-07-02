import { calculateSummarySheetCost } from "@/lib/boardPricing";
import { hardwareItems } from "@/lib/catalogData";
import { generateBoardCutPlan } from "@/lib/cutting";
import { clampModuleIndex, deriveModuleTypeCounts, getCooktopOption, getCountertopOption, getFaucetOption, getHoodOption, getHoodSpec, getKitchenSetDimensions, getKitchenTemplate, getMicrowaveOption, getSinkOption, hasToeKickEnabled, isLShapeKitchen, kitchenModuleTypeLabels, normalizeKitchenLayerWidths, normalizeKitchenModules, normalizeKitchenSideModules, type KitchenModuleType } from "@/lib/kitchen";
import { getBoardThicknessMm, getProductMarginRate, getQuoteConfig, PROCESS_QUOTE_STANDARDS } from "@/lib/platformConfig";
import { validateFurnitureInput } from "@/lib/interior/validatePreview";
import { getActiveProcessProfile } from "@/lib/processStandards";
import { generateRuleWarnings, getSafeDoorCount } from "@/lib/rules";
import { alignWardrobeCounts, getWardrobeDrawerCountLimits, normalizeWardrobeModules } from "@/lib/wardrobe";
import type { EdgeTask, FurnitureInput, HardwareTask, Part, ProductType, QuoteResult, SiteTask, Warning } from "@/lib/types";

const BOARD_THICKNESS_MM = getBoardThicknessMm();

/** 문짝 디자인별 추가 가공비(짝당) — 프레임/루버는 가공 공수가 늘어난다. */
const DOOR_STYLE_SURCHARGE_WON: Record<string, number> = { flat: 0, frame: 12000, slat: 18000 };

function doorStyleLabel(style?: string) {
  return style === "frame" ? "프레임" : style === "slat" ? "루버" : "민자";
}

function doorSwingLabel(swing?: string) {
  switch (swing) {
    case "left":
      return "좌측 경첩(우로 열림)";
    case "right":
      return "우측 경첩(좌로 열림)";
    case "up":
      return "상향 개폐";
    case "down":
      return "하향 개폐";
    case "up_pair":
      return "2단 상향";
    default:
      return "양개(좌우)";
  }
}

function clampPositive(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getHardwarePrice(name: string) {
  return hardwareItems.find((item) => item.name === name)?.unit_price ?? 0;
}

function bodyParts(input: FurnitureInput, shelfName = "선반", includeBack = true): Part[] {
  const innerWidth = Math.max(input.width_mm - BOARD_THICKNESS_MM * 2, 1);
  const base = {
    material: input.material,
    color: input.color,
  };

  const parts: Part[] = [
    { name: "좌측판", width_mm: input.height_mm, height_mm: input.depth_mm, quantity: 1, ...base },
    { name: "우측판", width_mm: input.height_mm, height_mm: input.depth_mm, quantity: 1, ...base },
    { name: "상판", width_mm: innerWidth, height_mm: input.depth_mm, quantity: 1, ...base },
    { name: "하판", width_mm: innerWidth, height_mm: input.depth_mm, quantity: 1, ...base },
    { name: shelfName, width_mm: innerWidth, height_mm: input.depth_mm, quantity: input.shelf_count, ...base },
  ];

  if (includeBack) {
    parts.push({ name: "뒷판", width_mm: input.width_mm, height_mm: input.height_mm, quantity: 1, ...base, note: "MVP 기준 동일 자재 산정" });
  }

  return parts;
}

function doorParts(input: FurnitureInput): Part[] {
  if (!input.has_door || input.door_count <= 0) return [];
  const doorTotalWidth = Math.max(input.width_mm - 4, 1);
  return [
    {
      name: "문짝",
      width_mm: Math.floor(doorTotalWidth / input.door_count),
      height_mm: Math.max(input.height_mm - 4, 1),
      quantity: input.door_count,
      material: input.material,
      color: input.color,
      note: `${doorStyleLabel(input.door_style)} · ${doorSwingLabel(input.door_swing)} · 4면 엣지`,
    },
  ];
}

/** 수납장(선반/틈새/신발장) 하단 서랍 부품 — 앞판 + 서랍통(사양: PB15T/자작12T) + 바닥. 레일은 하드웨어 목록에서. */
function storageDrawerParts(input: FurnitureInput): Part[] {
  const count = Math.min(4, Math.max(0, Math.round(input.storage_drawer_count ?? 0)));
  if (count === 0) return [];
  const inner = Math.max(input.width_mm - BOARD_THICKNESS_MM * 2, 1);
  const box = input.drawer_box_spec === "birch12"
    ? { material: "자작합판 12T", color: "자작" }
    : { material: "PB 15T", color: "화이트" };
  return [
    { name: "서랍 앞판", width_mm: Math.max(inner - 4, 1), height_mm: 180, quantity: count, material: input.material, color: input.color, note: `하단 서랍 ${count}단 · ${doorStyleLabel(input.door_style)} · 4면 엣지` },
    { name: "서랍통 측판", width_mm: Math.max(input.depth_mm - 50, 1), height_mm: 120, quantity: count * 2, ...box, note: "서랍통 좌우" },
    { name: "서랍통 앞뒤판", width_mm: Math.max(inner - 40, 1), height_mm: 120, quantity: count * 2, ...box, note: "서랍통 전후" },
    { name: "서랍통 바닥", width_mm: Math.max(inner - 20, 1), height_mm: Math.max(input.depth_mm - 50, 1), quantity: count, ...box, note: "서랍 바닥판" },
  ];
}

/** 수납장 문 부품 — 여닫이(경첩식) 또는 슬라이딩 도어 2짝. 하단 서랍 구역만큼 문 높이를 차감한다. */
function storageDoorParts(input: FurnitureInput): Part[] {
  const drawerCount = Math.min(4, Math.max(0, Math.round(input.storage_drawer_count ?? 0)));
  const doorHeight = Math.max(input.height_mm - (drawerCount > 0 ? drawerCount * 200 + 18 : 0) - 4, 1);
  if ((input.open_type ?? "").includes("슬라이딩")) {
    if (!input.has_door) return [];
    return [
      {
        name: "슬라이딩 도어",
        width_mm: Math.max(Math.floor((input.width_mm + 40) / 2), 1),
        height_mm: doorHeight,
        quantity: 2,
        material: input.material,
        color: input.color,
        note: `알루미늄 프레임 슬라이딩 · ${doorStyleLabel(input.door_style)}`,
      },
    ];
  }
  return doorParts({ ...input, height_mm: doorHeight + 4 });
}

function prefixParts(parts: Part[], prefix: string): Part[] {
  return parts.map((part) => ({ ...part, name: `${prefix} ${part.name}` }));
}

function moduleBodyParts(input: FurnitureInput, widthMm: number, heightMm: number, depthMm: number, shelfCount: number, prefix: string, includeBack = true): Part[] {
  return prefixParts(
    bodyParts({ ...input, width_mm: widthMm, height_mm: heightMm, depth_mm: depthMm, shelf_count: shelfCount }, "선반", includeBack),
    prefix,
  );
}

export function generateParts(productType: ProductType, input: FurnitureInput): Part[] {
  if (productType === "custom_shelf") {
    // 문짝(여닫이/슬라이딩)·하단 서랍도 부품에 포함 — 미리보기에 보이면 부품표에도 있어야 한다(허상 없음)
    return [...bodyParts(input, "선반", Boolean(input.back_panel)), ...storageDoorParts(input), ...storageDrawerParts(input)];
  }

  if (productType === "gap_cabinet") {
    return [...bodyParts(input, "선반", true), ...storageDoorParts(input), ...storageDrawerParts(input)];
  }

  if (productType === "kitchen_base_cabinet") {
    const toeKick = hasToeKickEnabled(input.toe_kick_option);
    return [
      ...bodyParts(input, "내부 선반", false),
      { name: "뒷보강대", width_mm: Math.max(input.width_mm - BOARD_THICKNESS_MM * 2, 1), height_mm: 90, quantity: 1, material: input.material, color: input.color, note: "주방 하부장 상부 보강" },
      { name: "걸레받이", width_mm: input.width_mm, height_mm: 100, quantity: toeKick ? 1 : 0, material: input.material, color: input.color, note: "하부 띄움/걸레받이" },
      ...doorParts({ ...input, has_door: true }),
    ];
  }

  if (productType === "kitchen_wall_cabinet") {
    return [
      ...bodyParts(input, "상부장 선반", true),
      { name: "벽고정 보강대", width_mm: Math.max(input.width_mm - BOARD_THICKNESS_MM * 2, 1), height_mm: 80, quantity: 1, material: input.material, color: input.color, note: "상부장 벽고정용 보강" },
      ...doorParts({ ...input, has_door: true }),
    ];
  }

  if (productType === "kitchen_full_set") {
    const template = getKitchenTemplate(input.kitchen_template);
    const dimensions = getKitchenSetDimensions(input, template);
    const kitchenLayout = normalizeKitchenModules(template, input.kitchen_modules_mm, input.kitchen_module_types);
    const modules = kitchenLayout.modules;
    const baseModules = normalizeKitchenLayerWidths(modules, input.kitchen_base_modules_mm);
    const wallModules = normalizeKitchenLayerWidths(modules, input.kitchen_wall_modules_mm);
    const moduleTypes = kitchenLayout.moduleTypes;
    const moduleTypeCounts = deriveModuleTypeCounts(moduleTypes);
    const totalWidth = Math.max(
      baseModules.reduce((sum, width) => sum + width, 0),
      wallModules.reduce((sum, width) => sum + width, 0),
    );
    const countertop = getCountertopOption(input.countertop_type);
    const sink = getSinkOption(input.sink_option);
    const hood = getHoodOption(input.hood_option);
    const cooktop = getCooktopOption(input.cooktop_option);
    const microwave = getMicrowaveOption(input.microwave_option);
    const sinkModuleIndex = clampModuleIndex(input.sink_module_index ?? template.sinkModuleIndex, modules.length - 1);
    const cooktopModuleIndex = clampModuleIndex(input.cooktop_module_index ?? template.cooktopModuleIndex, modules.length - 1);
    const hoodModuleIndex = clampModuleIndex(input.hood_module_index ?? cooktopModuleIndex, modules.length - 1);
    const microwaveModuleIndex = clampModuleIndex(input.microwave_module_index ?? modules.length - 1, modules.length - 1);
    const hiddenBase = new Set(input.kitchen_base_hidden_indices ?? []);
    const hiddenWall = new Set(input.kitchen_wall_hidden_indices ?? []);
    const baseParts = modules.flatMap((_, index) => {
      if (hiddenBase.has(index)) return [];
      const moduleWidth = baseModules[index] ?? modules[index];
      const moduleType = moduleTypes[index] ?? "door";
      const drawerCount = Math.min(3, Math.max(1, Math.round(input.kitchen_drawer_counts?.[index] ?? 3)));
      const baseShelfCount = Math.min(8, Math.max(0, Math.round(input.kitchen_base_shelf_counts?.[index] ?? input.shelf_count ?? 1)));
      const frontPartNameByType: Record<KitchenModuleType, string> = {
        door: "문짝",
        drawer: "서랍 앞판",
        pullout: "레일장 앞판",
        open: "오픈장",
        sink_base: "싱크 앞판",
        cooktop: "쿡탑 전면",
        gas: "가스 전면",
        microwave: "전자레인지 전면",
        oven: "오븐 전면",
        dishwasher: "식기세척기 전면",
      };
      const frontQuantityByType: Record<KitchenModuleType, number> = {
        door: 2,
        drawer: 3,
        pullout: 2,
        open: 0,
        sink_base: 2,
        cooktop: 0,
        gas: 0,
        microwave: 1,
        oven: 1,
        dishwasher: 1,
      };
      // A4: 싱크 칸인데 종류가 서랍/도어면 싱크장으로 간주 (BOM 충돌 방지 — 싱크 앞판만 생성)
      const sinkOnThis = sink.id !== "none" && index === sinkModuleIndex;
      const effType: KitchenModuleType = sinkOnThis ? "sink_base" : moduleType;
      // A1: 문 1/2짝(좌·우=1짝, 양개=2짝)을 절단·수량·폭에 반영
      const swing = input.kitchen_door_swings?.[index] ?? "pair";
      let frontQuantity: number;
      let frontWidth: number;
      let frontHeight: number;
      if (effType === "drawer") {
        frontQuantity = drawerCount;
        frontWidth = Math.max(moduleWidth - 4, 1); // 서랍 앞판은 칸 전체 폭 (이전 절반폭 오류 수정)
        frontHeight = Math.max(Math.floor((dimensions.baseHeightMm - 4) / drawerCount), 1);
      } else if (effType === "door") {
        frontQuantity = swing === "pair" ? 2 : 1;
        frontWidth = frontQuantity === 1 ? Math.max(moduleWidth - 4, 1) : Math.floor((moduleWidth - 4) / 2);
        frontHeight = dimensions.baseHeightMm - 4;
      } else {
        frontQuantity = frontQuantityByType[effType];
        frontWidth = frontQuantity >= 2 ? Math.floor((moduleWidth - 4) / 2) : Math.max(moduleWidth - 4, 1);
        frontHeight = dimensions.baseHeightMm - 4;
      }
      const swingNote = effType === "door" ? (swing === "pair" ? "양개 2짝" : swing === "left" ? "좌경첩 1짝" : swing === "right" ? "우경첩 1짝" : String(swing)) : "";
      return [
      ...moduleBodyParts(input, moduleWidth, dimensions.baseHeightMm, dimensions.baseDepthMm, baseShelfCount, `하부장 ${index + 1}`, false),
      { name: `하부장 ${index + 1} 뒷보강대`, width_mm: Math.max(moduleWidth - BOARD_THICKNESS_MM * 2, 1), height_mm: 90, quantity: 1, material: input.material, color: input.color, note: "상부 보강" },
      {
        name: `하부장 ${index + 1} ${frontPartNameByType[effType]}`,
        width_mm: frontWidth,
        height_mm: frontHeight,
        quantity: frontQuantity,
        material: input.material,
        color: input.color,
        note: sinkOnThis ? "싱크볼 하부장" : `${kitchenModuleTypeLabels[effType]} 전면${swingNote ? ` · ${swingNote}` : ""}`,
      },
    ];
    });
    const drawerRailCount = moduleTypes.reduce((sum, moduleType, index) => {
      if (moduleType !== "drawer") return sum;
      return sum + Math.min(3, Math.max(1, Math.round(input.kitchen_drawer_counts?.[index] ?? 3)));
    }, 0);
    // 침니/타워형 후드는 독립 설치 → 해당 칸 상부장(몸통/문짝) 부품 자체를 만들지 않음
    const hoodReplacesCabinet = hood.id !== "none" && (() => { const s = getHoodSpec(input.hood_option).shape; return s === "chimney" || s === "tower"; })();
    const wallParts = modules.flatMap((_, index) => {
      const moduleWidth = wallModules[index] ?? modules[index];
      const wallShelfCount = Math.min(8, Math.max(0, Math.round(input.kitchen_wall_shelf_counts?.[index] ?? 1)));
      return (hiddenWall.has(index) || (hoodReplacesCabinet && index === hoodModuleIndex)) ? [] : [
      ...moduleBodyParts(input, moduleWidth, dimensions.wallHeightMm, dimensions.wallDepthMm, wallShelfCount, `상부장 ${index + 1}`, true),
      { name: `상부장 ${index + 1} 벽고정 보강대`, width_mm: Math.max(moduleWidth - BOARD_THICKNESS_MM * 2, 1), height_mm: 80, quantity: 1, material: input.material, color: input.color, note: "벽고정용 보강" },
      ...(() => {
        const wallSwing = input.kitchen_wall_door_swings?.[index] ?? input.kitchen_door_swings?.[index] ?? "pair";
        const wallLeaves = wallSwing === "pair" ? 2 : 1;
        return [{
          name: `상부장 ${index + 1} 문짝`,
          width_mm: wallLeaves === 1 ? Math.max(moduleWidth - 4, 1) : Math.floor((moduleWidth - 4) / 2),
          height_mm: dimensions.wallHeightMm - 4,
          quantity: wallLeaves,
          material: input.material,
          color: input.color,
          note: `상부장 문짝 · ${wallSwing === "pair" ? "양개 2짝" : wallSwing === "left" ? "좌경첩 1짝" : "우경첩 1짝"}`,
        }];
      })(),
    ];
    });
    // ㄱ자 측면(꺾인) 다리 부품
    const isL = isLShapeKitchen(input);
    const sideLayout = normalizeKitchenSideModules(input.kitchen_side_modules_mm, input.kitchen_side_module_types);
    const sideHasWall = input.kitchen_side_has_wall !== false;
    const sideTotalWidth = sideLayout.modules.reduce((sum, width) => sum + width, 0);
    const sideBaseParts: Part[] = isL
      ? sideLayout.modules.flatMap((moduleWidth, index) => {
          const moduleType = sideLayout.moduleTypes[index] ?? "door";
          return [
            ...moduleBodyParts(input, moduleWidth, dimensions.baseHeightMm, dimensions.baseDepthMm, 1, `측면 하부장 ${index + 1}`, false),
            { name: `측면 하부장 ${index + 1} 뒷보강대`, width_mm: Math.max(moduleWidth - BOARD_THICKNESS_MM * 2, 1), height_mm: 90, quantity: 1, material: input.material, color: input.color, note: "ㄱ자 측면 상부 보강" },
            { name: `측면 하부장 ${index + 1} 전면`, width_mm: Math.floor((moduleWidth - 4) / 2), height_mm: dimensions.baseHeightMm - 4, quantity: moduleType === "open" ? 0 : 2, material: input.material, color: input.color, note: "ㄱ자 측면 전면" },
          ];
        })
      : [];
    const sideWallParts: Part[] = isL && sideHasWall
      ? sideLayout.modules.flatMap((moduleWidth, index) => [
          ...moduleBodyParts(input, moduleWidth, dimensions.wallHeightMm, dimensions.wallDepthMm, 1, `측면 상부장 ${index + 1}`, true),
          { name: `측면 상부장 ${index + 1} 문짝`, width_mm: Math.floor((moduleWidth - 4) / 2), height_mm: dimensions.wallHeightMm - 4, quantity: 2, material: input.material, color: input.color, note: "ㄱ자 측면 상부장 문짝" },
        ])
      : [];
    const kitchenParts: Part[] = [
      ...baseParts,
      ...wallParts,
      ...sideBaseParts,
      ...sideWallParts,
      { name: "ㄱ자 코너 연결재", width_mm: dimensions.baseDepthMm, height_mm: dimensions.baseHeightMm, quantity: isL ? 1 : 0, material: input.material, color: input.color, note: "코너 마감/연결 패널 (블라인드 코너)" },
      { name: "측면 상판", width_mm: sideTotalWidth, height_mm: dimensions.baseDepthMm, quantity: isL && countertop.id !== "none" ? 1 : 0, material: countertop.material, color: countertop.color, note: `${countertop.name} (ㄱ자 측면)` },
      { name: "측면 하부장 걸레받이", width_mm: sideTotalWidth, height_mm: 100, quantity: isL && hasToeKickEnabled(input.toe_kick_option) ? 1 : 0, material: input.material, color: input.color, note: "ㄱ자 측면 하부 걸레받이" },
      { name: "하부장 걸레받이", width_mm: totalWidth, height_mm: 100, quantity: hasToeKickEnabled(input.toe_kick_option) ? 1 : 0, material: input.material, color: input.color, note: "전체 하부 걸레받이" },
      { name: "상판", width_mm: totalWidth, height_mm: dimensions.baseDepthMm, quantity: countertop.id === "none" ? 0 : 1, material: countertop.material, color: countertop.color, note: countertop.name },
      // ⚠️ 배수/수전/쿡탑/후드 덕트 타공은 공장 가공이 아니라 현장 타공(시공자) — generateSiteTasks로 분리. 재단표에 넣지 않는다.
      { name: "가스렌지 자리 비움", width_mm: 600, height_mm: dimensions.baseDepthMm, quantity: cooktop.id === "free_standing_range" ? 1 : 0, material: "가전 품목", color: "-", note: `하부장 ${cooktopModuleIndex + 1} 프리스탠딩 가스렌지 설치 공간` },
      { name: "후드 제품", width_mm: 600, height_mm: 300, quantity: hood.id === "none" ? 0 : 1, material: hood.material, color: hood.color, note: hood.name },
      { name: "전자레인지장", width_mm: 600, height_mm: microwave.id === "tall_mw_600" ? 2100 : 450, quantity: microwave.id === "none" ? 0 : 1, material: microwave.material, color: microwave.color, note: `${microwave.name} / ${microwaveModuleIndex + 1}번 모듈 기준` },
      { name: "서랍 레일 세트", width_mm: 500, height_mm: 500, quantity: drawerRailCount, material: "부속 품목", color: "-", note: "서랍 1단당 1세트" },
      { name: "인출식 레일 세트", width_mm: 500, height_mm: 500, quantity: moduleTypeCounts.pullout, material: "부속 품목", color: "-", note: "레일장 모듈당 1세트" },
    ];
    return kitchenParts.filter((part) => part.quantity > 0);
  }

  if (productType === "built_in_wardrobe") {
    const layout = normalizeWardrobeModules(input.wardrobe_modules_mm, input.wardrobe_module_types, input.width_mm);
    const drawerCounts = alignWardrobeCounts(input.wardrobe_drawer_counts, layout.modules.length, 4, 2, 6);
    const shelfCounts = alignWardrobeCounts(input.wardrobe_shelf_counts, layout.modules.length, 4, 1, 10);
    const sliding = input.open_type?.includes("슬라이딩") ?? false;
    const h = input.height_mm;
    const d = input.depth_mm;
    const base = { material: input.material, color: input.color };
    const parts: Part[] = [];

    layout.modules.forEach((moduleWidth, index) => {
      const type = layout.moduleTypes[index];
      const swing = input.wardrobe_door_swings?.[index] ?? "pair";
      const inner = Math.max(moduleWidth - BOARD_THICKNESS_MM * 2, 1);
      const prefix = `${index + 1}번 칸(${type === "drawer" ? "서랍장" : type === "shelf" ? "선반장" : type === "hang2" ? "2단행거" : "행거장"})`;

      parts.push({ name: `${prefix} 좌측판`, width_mm: h, height_mm: d, quantity: 1, ...base });
      parts.push({ name: `${prefix} 우측판`, width_mm: h, height_mm: d, quantity: 1, ...base });
      parts.push({ name: `${prefix} 상판`, width_mm: inner, height_mm: d, quantity: 1, ...base });
      parts.push({ name: `${prefix} 하판`, width_mm: inner, height_mm: d, quantity: 1, ...base });
      parts.push({ name: `${prefix} 뒷판`, width_mm: moduleWidth, height_mm: h, quantity: 1, ...base, note: "동일 자재 산정" });

      if (type === "shelf") {
        parts.push({ name: `${prefix} 선반`, width_mm: inner, height_mm: d, quantity: shelfCounts[index], ...base });
      } else if (type === "drawer") {
        const drawerLimits = getWardrobeDrawerCountLimits(h);
        const count = Math.min(drawerLimits.max, Math.max(drawerLimits.min, drawerCounts[index]));
        const zone = drawerLimits.zoneMm;
        parts.push({ name: `${prefix} 서랍 앞판`, width_mm: inner, height_mm: Math.max(Math.floor(zone / count), 1), quantity: count, ...base, note: `${count}단 서랍 전면(하부 ${zone}mm 구역) · ${doorStyleLabel(input.door_style)}` });
        parts.push({ name: `${prefix} 서랍통 측판`, width_mm: Math.max(d - 40, 1), height_mm: 150, quantity: count * 2, ...base, note: "서랍통 좌우" });
        parts.push({ name: `${prefix} 서랍통 바닥`, width_mm: inner, height_mm: Math.max(d - 40, 1), quantity: count, ...base, note: "서랍 바닥판" });
        if (h - zone > 300) {
          parts.push({ name: `${prefix} 상부 옷봉`, width_mm: Math.max(inner - 40, 1), height_mm: 30, quantity: 1, material: "금속 부속", color: "크롬", note: "서랍 상부 행거 / 브라켓 포함" });
        }
      } else {
        const rodCount = type === "hang2" ? 2 : 1;
        parts.push({ name: `${prefix} 옷봉`, width_mm: Math.max(inner - 40, 1), height_mm: 30, quantity: rodCount, material: "금속 부속", color: "크롬", note: "원판 재단 제외 / 옷봉 브라켓 포함" });
        parts.push({ name: `${prefix} 상부 선반`, width_mm: inner, height_mm: d, quantity: 1, ...base, note: "행거 칸 상부 마감 선반" });
      }

      if (type !== "drawer" && !sliding) {
        const leaves = moduleWidth > 700 ? 2 : 1;
        parts.push({
          name: `${prefix} 문짝`,
          width_mm: Math.floor((moduleWidth - 4) / leaves),
          height_mm: Math.max(h - 4, 1),
          quantity: leaves,
          ...base,
          note: `${doorStyleLabel(input.door_style)} · ${doorSwingLabel(swing)} · 4면 엣지`,
        });
      }
    });

    if (sliding) {
      const panelCount = 2;
      parts.push({
        name: "슬라이딩 도어",
        width_mm: Math.max(Math.floor((layout.width_mm + 40) / panelCount), 1),
        height_mm: Math.max(h - 20, 1),
        quantity: panelCount,
        ...base,
        note: `알루미늄 프레임 슬라이딩 · ${doorStyleLabel(input.door_style)}`,
      });
    }

    return parts;
  }

  // shoe_cabinet
  const shoeBody = bodyParts({ ...input, shelf_count: input.shelf_count }, "신발 선반", true);
  const shoeParts: Part[] = [...shoeBody, ...storageDoorParts({ ...input, has_door: true }), ...storageDrawerParts(input)];
  if (input.shoe_shelf_angle) {
    shoeParts.forEach((part) => {
      if (part.name === "신발 선반") part.note = "경사 선반(15° 기울임) 가공";
    });
  }
  if ((input.bottom_space ?? 0) > 0) {
    shoeParts.push({ name: "하부 받침대", width_mm: input.width_mm, height_mm: input.bottom_space ?? 0, quantity: 1, material: input.material, color: input.color, note: `하부 띄움 ${input.bottom_space}mm 받침` });
  }
  return shoeParts;
}

export function generateEdgeTasks(parts: Part[], productType: ProductType): EdgeTask[] {
  return parts.map((part) => {
    if (part.material === "금속 부속") {
      return { part_name: part.name, front_edge: false, back_edge: false, left_edge: false, right_edge: false, total_edge_length_mm: 0, note: "엣지 없음" };
    }

    if (part.name.includes("뒷판")) {
      return { part_name: part.name, front_edge: false, back_edge: false, left_edge: false, right_edge: false, total_edge_length_mm: 0, note: "엣지 없음" };
    }

    if (part.name.includes("문짝") || part.name.includes("슬라이딩 도어") || part.name.includes("앞판")) {
      return {
        part_name: part.name,
        front_edge: true,
        back_edge: true,
        left_edge: true,
        right_edge: true,
        total_edge_length_mm: (part.width_mm + part.height_mm) * 2 * part.quantity,
        note: "전면 4면 전체 엣지",
      };
    }

    const note = productType === "shoe_cabinet" && part.name === "신발 선반" ? "앞쪽 1면 엣지" : "몸통 앞쪽 1면 엣지";
    return {
      part_name: part.name,
      front_edge: true,
      back_edge: false,
      left_edge: false,
      right_edge: false,
      total_edge_length_mm: part.width_mm * part.quantity,
      note,
    };
  });
}

export function generateHardwareList(productType: ProductType, input: FurnitureInput, parts: Part[]): HardwareTask[] {
  const partCount = parts.reduce((sum, part) => sum + part.quantity, 0);
  const doorCount = parts.filter((part) => part.name.includes("문짝")).reduce((sum, part) => sum + part.quantity, 0);
  const shelfCount = parts.filter((part) => part.name.includes("선반")).reduce((sum, part) => sum + part.quantity, 0);
  const tasks: HardwareTask[] = [
    { hardware_name: "조립 피스", spec: "일반", quantity: Math.ceil(partCount * 6), unit: "개", note: "부품 수 기준 자동 산정" },
    { hardware_name: "목심", spec: "8mm", quantity: Math.ceil(partCount * 4), unit: "개" },
    { hardware_name: "선반다보", spec: "5mm", quantity: shelfCount * 4, unit: "개", note: "선반 1개당 4개" },
  ];

  if (doorCount > 0) {
    // 칸별 손잡이 없음(상·하부 독립) 만큼 손잡이 수량 차감 — 경첩은 문짝마다 필요하므로 유지
    const isKitchenSet = productType === "kitchen_full_set";
    const baseNoHandle = new Set(isKitchenSet ? input.kitchen_no_handle_indices ?? [] : []);
    const wallNoHandle = new Set(isKitchenSet ? input.kitchen_wall_no_handle_indices ?? [] : []);
    const baseNoHandleLeaves = (input.kitchen_module_types ?? []).reduce((sum, moduleType, index) => {
      if (!baseNoHandle.has(index)) return sum;
      if (moduleType !== "door" && moduleType !== "sink_base") return sum;
      return sum + ((input.kitchen_door_swings?.[index] ?? "pair") === "pair" ? 2 : 1);
    }, 0);
    const wallNoHandleLeaves = (input.kitchen_wall_modules_mm ?? input.kitchen_modules_mm ?? []).reduce((sum: number, _w, index) => {
      if (!wallNoHandle.has(index)) return sum;
      const wallSwing = input.kitchen_wall_door_swings?.[index] ?? input.kitchen_door_swings?.[index] ?? "pair";
      return sum + (wallSwing === "pair" ? 2 : 1);
    }, 0);
    const handleCount = Math.max(0, doorCount - baseNoHandleLeaves - wallNoHandleLeaves);
    tasks.push({ hardware_name: input.handle_type === "댐핑" ? "댐핑 경첩" : "일반 경첩", spec: input.handle_type, quantity: doorCount * 2, unit: "개", note: "문짝 1개당 2개" });
    if (handleCount > 0) tasks.push({ hardware_name: "손잡이", spec: input.handle_type, quantity: handleCount, unit: "개", note: "문짝 1개당 1개 (손잡이 없는 칸 제외)" });
  }

  // 수납장(선반/틈새/신발장) 하단 서랍 레일 + 슬라이딩 도어 철물
  if (productType === "custom_shelf" || productType === "gap_cabinet" || productType === "shoe_cabinet") {
    const storageDrawers = Math.min(4, Math.max(0, Math.round(input.storage_drawer_count ?? 0)));
    if (storageDrawers > 0) {
      tasks.push({ hardware_name: "서랍 레일", spec: input.drawer_box_spec === "birch12" ? "볼레일 (자작 서랍통)" : "볼레일", quantity: storageDrawers, unit: "조", note: "서랍 1단당 1조" });
    }
    if (input.has_door && (input.open_type ?? "").includes("슬라이딩")) {
      tasks.push({ hardware_name: "슬라이딩 레일 세트", spec: "상하 알루미늄 레일", quantity: 1, unit: "세트", note: "슬라이딩 도어 2짝 기준" });
      tasks.push({ hardware_name: "슬라이딩 도어 롤러", spec: "하부 롤러", quantity: 4, unit: "개", note: "도어 1짝당 2개" });
    }
  }

  if (input.height_mm >= 1800 || input.wall_fix_option || productType === "kitchen_wall_cabinet" || productType === "kitchen_full_set") {
    tasks.push({ hardware_name: "벽고정 브라켓", spec: "L형", quantity: productType === "kitchen_full_set" ? 4 : 2, unit: "개", note: "전도/상부장 고정용" });
  }

  // 다리(레그) 지지: 선택 시 부품·비용에 반영 (걸레받이 대체 — 유령 옵션 방지)
  if ((productType === "kitchen_full_set" || productType === "kitchen_base_cabinet") && input.leg_option && input.leg_option !== "none") {
    const legName = input.leg_option === "hidden_legs" ? "숨김 다리" : "조절 다리";
    const baseModuleCount =
      productType === "kitchen_full_set"
        ? normalizeKitchenModules(getKitchenTemplate(input.kitchen_template), input.kitchen_modules_mm, input.kitchen_module_types).modules.length
        : 1;
    tasks.push({ hardware_name: legName, spec: input.leg_option === "hidden_legs" ? "숨김형" : "조절형", quantity: Math.max(1, baseModuleCount) * 4, unit: "개", note: "하부장 1칸당 4개" });
  }

  if (productType === "kitchen_full_set") {
    const template = getKitchenTemplate(input.kitchen_template);
    const kitchenLayout = normalizeKitchenModules(template, input.kitchen_modules_mm, input.kitchen_module_types);
    const moduleTypeCounts = deriveModuleTypeCounts(kitchenLayout.moduleTypes);
    const drawerRailCount = kitchenLayout.moduleTypes.reduce((sum, moduleType, index) => {
      if (moduleType !== "drawer") return sum;
      return sum + Math.min(3, Math.max(1, Math.round(input.kitchen_drawer_counts?.[index] ?? 3)));
    }, 0);
    const sink = getSinkOption(input.sink_option);
    const faucet = getFaucetOption(input.faucet_option);
    const hood = getHoodOption(input.hood_option);
    const cooktop = getCooktopOption(input.cooktop_option);
    const microwave = getMicrowaveOption(input.microwave_option);
    if (sink.id !== "none") tasks.push({ hardware_name: sink.name, spec: "싱크볼", quantity: 1, unit: "개", note: "상판 타공 필요" });
    if (faucet.id !== "none") tasks.push({ hardware_name: faucet.name, spec: "수전", quantity: 1, unit: "개", note: "수전 타공 필요" });
    if (hood.id !== "none") tasks.push({ hardware_name: hood.name, spec: "후드", quantity: 1, unit: "개", note: "상부장/벽체 배기 확인" });
    if (cooktop.id !== "none") tasks.push({ hardware_name: cooktop.name, spec: "쿡탑/가스렌지", quantity: 1, unit: "개", note: cooktop.id === "free_standing_range" ? "하부장 자리 비움" : "상판 타공 필요" });
    if (microwave.id !== "none") tasks.push({ hardware_name: microwave.name, spec: "전자레인지장", quantity: 1, unit: "개", note: "콘센트 위치 확인" });
    if (drawerRailCount > 0) tasks.push({ hardware_name: "서랍 레일", spec: "볼레일/언더레일", quantity: drawerRailCount, unit: "조", note: "서랍 1단당 1조" });
    if (moduleTypeCounts.pullout > 0) tasks.push({ hardware_name: "인출식 레일", spec: "레일장", quantity: moduleTypeCounts.pullout * 2, unit: "조", note: "인출식 레일장" });
    tasks.push({ hardware_name: "배수구 부속", spec: "기본 배수 세트", quantity: sink.id === "none" ? 0 : 1, unit: "세트", note: "싱크볼 선택 시 필요" });
  }

  if (productType === "built_in_wardrobe") {
    const layout = normalizeWardrobeModules(input.wardrobe_modules_mm, input.wardrobe_module_types, input.width_mm);
    const drawerCounts = alignWardrobeCounts(input.wardrobe_drawer_counts, layout.modules.length, 4, 2, 6);
    const sliding = input.open_type?.includes("슬라이딩") ?? false;
    const drawerRailCount = layout.moduleTypes.reduce((sum, type, index) => (type === "drawer" ? sum + drawerCounts[index] : sum), 0);
    const rodCount = layout.moduleTypes.reduce((sum, type) => (type === "hang" ? sum + 1 : type === "hang2" ? sum + 2 : sum), 0);
    if (drawerRailCount > 0) tasks.push({ hardware_name: "서랍 레일", spec: "볼레일", quantity: drawerRailCount, unit: "조", note: "서랍 1단당 1조" });
    if (rodCount > 0) {
      tasks.push({ hardware_name: "옷봉", spec: "32파이 크롬", quantity: rodCount, unit: "개", note: "행거 칸당" });
      tasks.push({ hardware_name: "옷봉 브라켓", spec: "플랜지", quantity: rodCount * 2, unit: "개", note: "옷봉 1개당 2개" });
    }
    if (sliding) {
      tasks.push({ hardware_name: "슬라이딩 레일 세트", spec: "상하 알루미늄 레일", quantity: 1, unit: "세트", note: "슬라이딩 도어 2짝 기준" });
      tasks.push({ hardware_name: "슬라이딩 도어 롤러", spec: "하부 롤러", quantity: 4, unit: "개", note: "도어 1짝당 2개" });
    }
  }

  if (productType === "shoe_cabinet" && (input.bottom_space ?? 0) > 0) {
    tasks.push({ hardware_name: "조절 다리", spec: `H${input.bottom_space}`, quantity: 4, unit: "개", note: "하부 띄움 받침" });
  }

  return tasks;
}

/**
 * 현장 타공·조정·연결 항목 (공장 가공 아님 — 시공자 책임).
 * 정책: 배수/수전/가스/콘센트 구멍, 걸레받이·상판 현장 맞춤 등은 공장 재단표가 아니라 이 목록으로 분류한다.
 */
export function generateSiteTasks(productType: ProductType, input: FurnitureInput): SiteTask[] {
  const tasks: SiteTask[] = [];
  const R = "현장 시공자";

  if (productType === "kitchen_full_set") {
    const template = getKitchenTemplate(input.kitchen_template);
    const layout = normalizeKitchenModules(template, input.kitchen_modules_mm, input.kitchen_module_types);
    const maxIdx = Math.max(0, layout.modules.length - 1);
    const sink = getSinkOption(input.sink_option);
    const faucet = getFaucetOption(input.faucet_option);
    const cooktop = getCooktopOption(input.cooktop_option);
    const hood = getHoodOption(input.hood_option);
    const sinkIdx = clampModuleIndex(input.sink_module_index ?? template.sinkModuleIndex, maxIdx);
    const cooktopIdx = clampModuleIndex(input.cooktop_module_index ?? template.cooktopModuleIndex, maxIdx);

    if (sink.id !== "none") {
      tasks.push({ category: "타공", name: "싱크볼·배수구 타공", quantity: 1, responsible: R, note: `${sink.name} / 하부장 ${sinkIdx + 1}번 — 상판 싱크 타공 + 하부 배수구 타공 (현장 배관 위치 기준)` });
    }
    if (faucet.id !== "none") {
      tasks.push({ category: "타공", name: "수전 타공", quantity: 1, responsible: R, note: `${faucet.name} — 상판/싱크 수전 홀 현장 타공` });
    }
    if (cooktop.id !== "none" && cooktop.id !== "free_standing_range") {
      tasks.push({ category: "타공", name: "쿡탑 타공", quantity: 1, responsible: R, note: `${cooktop.name} / 하부장 ${cooktopIdx + 1}번 — 상판 쿡탑 타공` });
    }
    if (cooktop.id === "free_standing_range") {
      tasks.push({ category: "연결", name: "가스렌지 설치·연결", quantity: 1, responsible: R, note: `하부장 ${cooktopIdx + 1}번 자리 비움 — 프리스탠딩 가스렌지 현장 설치/연결` });
    }
    if (hood.id !== "none") {
      tasks.push({ category: "연결", name: "후드 배기 덕트 타공·연결", quantity: 1, responsible: R, note: `${hood.name} — 배기 덕트 현장 타공/연결` });
    }
  }

  // 주방 계열 공통 현장 작업 (정책 문서: 콘센트/벽면/걸레받이/상판/배관 연결)
  if (productType === "kitchen_full_set" || productType === "kitchen_base_cabinet") {
    tasks.push(
      { category: "타공", name: "콘센트 간섭부 타공", quantity: 1, responsible: R, note: "기존 콘센트 위치 간섭 시 측·뒷판 현장 타공" },
      { category: "조정", name: "걸레받이 현장 맞춤 절단", quantity: 1, responsible: R, note: "바닥 수평에 맞춰 현장 절단" },
      { category: "조정", name: "상판 현장 미세 조정", quantity: 1, responsible: R, note: "벽 라인·돌출부에 맞춰 현장 재단/마감" },
      { category: "조정", name: "벽면 수평·돌출부 조정", quantity: 1, responsible: R, note: "벽 돌출/수평 불량 현장 조정" },
      { category: "연결", name: "배관·수전·전기·가스 연결", quantity: 1, responsible: R, note: "설치 시 시공자 연결 (제품 제작 범위 외)" },
    );
  } else if (productType === "kitchen_wall_cabinet") {
    tasks.push({ category: "타공", name: "후드/배기 간섭부 확인", quantity: 1, responsible: R, note: "상부장 설치 시 배기 덕트·콘센트 간섭 현장 확인" });
  }

  return tasks;
}

export function generateWarnings(productType: ProductType, input: FurnitureInput): Warning[] {
  const warnings: Warning[] = [...generateRuleWarnings(input)];

  if (input.height_mm >= 1800 && input.depth_mm < 300) warnings.push({ type: "warning", message: "높이에 비해 깊이가 얕아 전도 위험이 있습니다. 벽고정을 권장합니다." });
  if (input.width_mm < 300 && input.height_mm >= 1800) warnings.push({ type: "info", message: "폭이 좁고 높은 제품입니다. 벽고정 옵션을 추천합니다." });
  if (input.shelf_count > 0 && input.height_mm / (input.shelf_count + 1) < 200) warnings.push({ type: "warning", message: "선반 간격이 200mm 미만일 수 있어 사용성이 낮아질 수 있습니다." });
  if (input.has_door && input.width_mm < 250) warnings.push({ type: "error", message: "문짝이 있는 제품은 가로 250mm 미만으로 제작하기 어렵습니다." });
  if (productType === "kitchen_base_cabinet" && input.depth_mm < 550) warnings.push({ type: "warning", message: "주방 하부장은 배관/상판 기준 때문에 깊이 550mm 이상을 권장합니다." });
  if (productType === "kitchen_wall_cabinet" && input.height_mm > 800) warnings.push({ type: "info", message: "상부장 높이가 높은 편입니다. 설치 높이와 손이 닿는 범위를 확인해주세요." });
  if (productType === "kitchen_full_set") {
    const template = getKitchenTemplate(input.kitchen_template);
    const dimensions = getKitchenSetDimensions(input, template);
    const kitchenLayout = normalizeKitchenModules(template, input.kitchen_modules_mm, input.kitchen_module_types);
    const moduleTypeCounts = deriveModuleTypeCounts(kitchenLayout.moduleTypes);
    warnings.push({ type: "info", message: `${template.name} 기준으로 하부장 ${dimensions.baseHeightMm}x${dimensions.baseDepthMm}, 상부장 ${dimensions.wallHeightMm}x${dimensions.wallDepthMm} 구성을 함께 산정합니다.` });
    warnings.push({ type: "info", message: `현재 모듈 ${kitchenLayout.modules.length}칸 / 총 폭 ${kitchenLayout.width_mm}mm로 계산됩니다.` });
    if (getSinkOption(input.sink_option).id !== "none" && getCountertopOption(input.countertop_type).id === "none") {
      warnings.push({ type: "warning", message: "싱크볼을 선택한 경우 상판 포함 여부를 확인해주세요." });
    }
    if (getCooktopOption(input.cooktop_option).id !== "none" && getCountertopOption(input.countertop_type).id === "none") {
      warnings.push({ type: "warning", message: "쿡탑/가스렌지를 선택한 경우 상판 타공 또는 자리 비움 조건을 확인해주세요." });
    }
    if (moduleTypeCounts.drawer + moduleTypeCounts.pullout > kitchenLayout.modules.length - 1) {
      warnings.push({ type: "warning", message: "서랍/레일 모듈 비중이 높습니다. 싱크볼 하부장 및 배관 점검 공간을 확인해주세요." });
    }
  }
  if (productType === "built_in_wardrobe" && input.width_mm >= 2100 && input.door_count < 5) warnings.push({ type: "info", message: "폭이 넓은 붙박이장은 5개 이상 문짝 구성이 사용성과 하중 분산에 유리합니다." });

  return warnings;
}

export function calculateQuote(input: FurnitureInput): QuoteResult {
  const kitchenTemplate = input.productType === "kitchen_full_set" ? getKitchenTemplate(input.kitchen_template) : null;
  const kitchenLayout = kitchenTemplate
    ? normalizeKitchenModules(kitchenTemplate, input.kitchen_modules_mm, input.kitchen_module_types)
    : null;
  const moduleTypeCounts = kitchenLayout ? deriveModuleTypeCounts(kitchenLayout.moduleTypes) : null;
  const kitchenDimensions = kitchenTemplate ? getKitchenSetDimensions(input, kitchenTemplate) : null;
  const normalizedWidth = kitchenLayout?.width_mm ?? kitchenTemplate?.width_mm ?? clampPositive(input.width_mm);
  const maxModuleIndex = Math.max(0, (kitchenLayout?.modules.length ?? kitchenTemplate?.modules.length ?? 1) - 1);
  const defaultSinkIndex = clampModuleIndex(kitchenTemplate?.sinkModuleIndex ?? 0, maxModuleIndex);
  const defaultCooktopIndex = clampModuleIndex(kitchenTemplate?.cooktopModuleIndex ?? 0, maxModuleIndex);
  const normalizedInput = {
    ...input,
    width_mm: normalizedWidth,
    height_mm: kitchenDimensions?.baseHeightMm ?? clampPositive(input.height_mm),
    depth_mm: kitchenDimensions?.baseDepthMm ?? clampPositive(input.depth_mm),
    shelf_count: Math.max(0, Math.floor(input.shelf_count)),
    door_count: getSafeDoorCount(input.productType, normalizedWidth, input.has_door, Math.max(1, Math.floor(input.door_count || 1))),
    kitchen_template: kitchenTemplate?.id ?? input.kitchen_template,
    countertop_type: input.countertop_type ?? "none",
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
    drawer_module_count: moduleTypeCounts ? moduleTypeCounts.drawer : Math.max(0, input.drawer_module_count ?? 0),
    pullout_module_count: moduleTypeCounts ? moduleTypeCounts.pullout : Math.max(0, input.pullout_module_count ?? 0),
    sink_module_index: clampModuleIndex(input.sink_module_index ?? defaultSinkIndex, maxModuleIndex),
    cooktop_module_index: clampModuleIndex(input.cooktop_module_index ?? defaultCooktopIndex, maxModuleIndex),
    hood_module_index: clampModuleIndex(input.hood_module_index ?? input.cooktop_module_index ?? defaultCooktopIndex, maxModuleIndex),
    microwave_module_index: clampModuleIndex(input.microwave_module_index ?? maxModuleIndex, maxModuleIndex),
  };
  const parts = generateParts(normalizedInput.productType, normalizedInput);
  const edgeTasks = generateEdgeTasks(parts, normalizedInput.productType);
  const hardwareTasks = generateHardwareList(normalizedInput.productType, normalizedInput, parts);
  const siteTasks = generateSiteTasks(normalizedInput.productType, normalizedInput);
  const warnings = generateWarnings(normalizedInput.productType, normalizedInput);
  const boardCutPlan = generateBoardCutPlan(parts);

  const boardAreaM2 = parts
    .filter((part) => !["금속 부속", "상판 품목", "설비 품목", "상판 제외"].includes(part.material))
    .reduce((sum, part) => sum + (part.width_mm * part.height_mm * part.quantity) / 1_000_000, 0);
  const edgeLengthM = edgeTasks.reduce((sum, task) => sum + task.total_edge_length_mm / 1000, 0);
  const partCount = parts.reduce((sum, part) => sum + part.quantity, 0);
  const sheetCount = boardCutPlan.summaries.reduce((sum, summary) => sum + summary.sheet_count, 0);
  const boardCost = boardCutPlan.summaries.reduce((sum, summary) => sum + calculateSummarySheetCost(summary), 0);
  const quoteConfig = getQuoteConfig();
  const edgeCost = edgeLengthM * quoteConfig.edgePricePerM;
  const process = PROCESS_QUOTE_STANDARDS;
  const assemblyHours = process.assemblyHoursBase + partCount * process.assemblyHoursPerPart;
  const assemblyCost = Math.round(assemblyHours * process.hourlyRateWon);
  const cuttingLaborCost = Math.round(sheetCount * process.cuttingHoursPerSheet * process.hourlyRateWon);
  const installCost =
    normalizedInput.productType === "kitchen_full_set"
      ? Math.round(getActiveProcessProfile().installHoursKitchen * process.hourlyRateWon)
      : 0;
  const processingCost =
    quoteConfig.cuttingPricePerJob +
    cuttingLaborCost +
    assemblyCost +
    installCost +
    partCount * quoteConfig.processingPricePerPart;
  const hardwareCost = hardwareTasks.reduce((sum, task) => sum + task.quantity * getHardwarePrice(task.hardware_name), 0);
  const drawerStageCount = normalizedInput.productType === "kitchen_full_set"
    ? (normalizedInput.kitchen_module_types ?? []).reduce((sum, moduleType, index) => {
        if (moduleType !== "drawer") return sum;
        return sum + Math.min(3, Math.max(1, Math.round(normalizedInput.kitchen_drawer_counts?.[index] ?? 3)));
      }, 0)
    : Math.max(0, normalizedInput.drawer_module_count ?? 0) * (normalizedInput.kitchen_drawer_counts?.[0] ?? 3);
  const kitchenOptionCost =
    normalizedInput.productType === "kitchen_full_set"
      ? getCountertopOption(normalizedInput.countertop_type).price + getSinkOption(normalizedInput.sink_option).price + getFaucetOption(normalizedInput.faucet_option).price
        + getHoodOption(normalizedInput.hood_option).price + getCooktopOption(normalizedInput.cooktop_option).price + getMicrowaveOption(normalizedInput.microwave_option).price
        + drawerStageCount * 28000 + Math.max(0, normalizedInput.pullout_module_count ?? 0) * 95000
      : 0;
  const doorLeafCount = parts
    .filter((part) => part.name.includes("문짝") || part.name.includes("슬라이딩 도어"))
    .reduce((sum, part) => sum + part.quantity, 0);
  const doorStyleCost = doorLeafCount * (DOOR_STYLE_SURCHARGE_WON[normalizedInput.door_style ?? "flat"] ?? 0);
  const packingCost =
    quoteConfig.packingBasePrice + Math.max(0, partCount - quoteConfig.freePackingPartThreshold) * quoteConfig.packingPerExtraPart;
  // 배송 방식에 따라 배송비 반영 (직접수령 0, 화물 가산 — 유령 옵션 방지)
  const deliveryCost =
    normalizedInput.delivery_type === "직접수령"
      ? 0
      : normalizedInput.delivery_type === "화물"
        ? Math.round(quoteConfig.deliveryPrice * 1.8)
        : quoteConfig.deliveryPrice;
  const marginRate = getProductMarginRate(normalizedInput.productType);
  const totalCost = boardCost + edgeCost + processingCost + hardwareCost + kitchenOptionCost + doorStyleCost + packingCost + deliveryCost;
  const margin = totalCost * marginRate;
  const verdictResult = validateFurnitureInput(normalizedInput);

  return {
    input: normalizedInput,
    parts,
    edgeTasks,
    hardwareTasks,
    siteTasks,
    warnings,
    boardAreaM2,
    edgeLengthM,
    sheetCount,
    boardCost,
    edgeCost,
    processingCost,
    assemblyCost,
    installCost,
    hardwareCost,
    packingCost,
    deliveryCost,
    marginRate,
    margin,
    totalCost,
    finalPrice: Math.ceil((totalCost + margin) / 100) * 100,
    verdictResult,
  };
}
