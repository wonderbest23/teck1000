import {
  clampModuleIndex,
  getCooktopOption,
  getHoodSpec,
  getKitchenSetDimensions,
  getKitchenTemplate,
  getMicrowaveOption,
  getSinkMinCabinetWidthMm,
  getSinkOption,
  normalizeKitchenLayerWidths,
  normalizeKitchenModules,
  normalizeKitchenSideModules,
} from "@/lib/kitchen";
import { getKitchenWallInstallBottomMm } from "@/lib/platformConfig";
import type { FurnitureInput } from "@/lib/types";
import type { OrderIssue } from "../types";

/** 설비(싱크/쿡탑/후드/전자레인지)·ㄱ자가 칸 폭·높이상 물리적으로 가능한지 검증 */
export function validateKitchenFixtures(input: FurnitureInput, issues: OrderIssue[]) {
  if (input.productType !== "kitchen_full_set") return;

  const template = getKitchenTemplate(input.kitchen_template);
  const layout = normalizeKitchenModules(template, input.kitchen_modules_mm, input.kitchen_module_types);
  const n = layout.modules.length;
  if (n === 0) return;
  const maxIndex = n - 1;
  const baseModules = normalizeKitchenLayerWidths(layout.modules, input.kitchen_base_modules_mm);
  const wallModules = normalizeKitchenLayerWidths(layout.modules, input.kitchen_wall_modules_mm);
  const dim = getKitchenSetDimensions(input, template);

  // 싱크볼: 칸 폭이 싱크 규격보다 좁으면 설치 불가
  const sink = getSinkOption(input.sink_option);
  if (sink.id !== "none") {
    const i = clampModuleIndex(input.sink_module_index ?? template.sinkModuleIndex, maxIndex);
    const need = getSinkMinCabinetWidthMm(sink.id);
    if (baseModules[i] < need) {
      issues.push({
        code: "SINK_WIDER_THAN_MODULE",
        level: "error",
        message: `${i + 1}번 칸 폭(${baseModules[i]}mm)이 선택한 싱크볼(최소 ${need}mm)보다 좁아 설치할 수 없습니다. 칸 폭을 넓히거나 작은 싱크볼을 선택하세요.`,
        field: "sink_module_index",
        blocksOrder: true,
        source: "factory_rule",
      });
    }
  }

  // 쿡탑/레인지: 600mm 이상 칸 필요
  const cooktop = getCooktopOption(input.cooktop_option);
  if (cooktop.id !== "none") {
    const i = clampModuleIndex(input.cooktop_module_index ?? template.cooktopModuleIndex, maxIndex);
    if (baseModules[i] < 600) {
      issues.push({
        code: "COOKTOP_MODULE_TOO_NARROW",
        level: "error",
        message: `${i + 1}번 칸 폭(${baseModules[i]}mm)이 쿡탑/레인지(최소 600mm)보다 좁습니다. 칸 폭을 넓혀주세요.`,
        field: "cooktop_module_index",
        blocksOrder: true,
        source: "factory_rule",
      });
    }
  }

  // 후드: 상부 칸 폭보다 크면 설치 불가 (특히 900 대형 후드)
  if ((input.hood_option ?? "none") !== "none") {
    const hoodW = getHoodSpec(input.hood_option).widthMm;
    const i = clampModuleIndex(input.hood_module_index ?? input.cooktop_module_index ?? template.cooktopModuleIndex, maxIndex);
    if (wallModules[i] < hoodW) {
      issues.push({
        code: "HOOD_WIDER_THAN_MODULE",
        level: "error",
        message: `선택한 후드(${hoodW}mm)가 ${i + 1}번 상부 칸 폭(${wallModules[i]}mm)보다 큽니다. 상부 칸을 넓히거나 작은 후드를 선택하세요.`,
        field: "hood_option",
        blocksOrder: true,
        source: "factory_rule",
      });
    }
  }

  // 전자레인지장: 600mm 이상 칸 필요 + 키큰장(2100)은 높이 확인
  const microwave = getMicrowaveOption(input.microwave_option);
  if (microwave.id !== "none") {
    const i = clampModuleIndex(input.microwave_module_index ?? maxIndex, maxIndex);
    if (baseModules[i] < 600) {
      issues.push({
        code: "MICROWAVE_MODULE_TOO_NARROW",
        level: "error",
        message: `${i + 1}번 칸 폭(${baseModules[i]}mm)이 전자레인지장(최소 600mm)보다 좁습니다.`,
        field: "microwave_option",
        blocksOrder: true,
        source: "factory_rule",
      });
    }
    if (microwave.id === "tall_mw_600") {
      const availTopMm = getKitchenWallInstallBottomMm() + dim.wallHeightMm;
      if (availTopMm < 2100) {
        issues.push({
          code: "TALL_MICROWAVE_HEIGHT",
          level: "warning",
          message: `키큰 전자레인지장(2100mm)에 비해 상부 설치 높이(약 ${Math.round(availTopMm)}mm)가 낮습니다. 상부장 높이를 키우거나 일반형으로 변경, 또는 검수가 필요합니다.`,
          field: "microwave_option",
          blocksOrder: false,
          requiresReview: true,
          source: "factory_rule",
        });
      }
    }
  }

  // ㄱ자: 측면 칸이 비어 있으면 불가
  if (input.kitchen_layout_shape === "l_shape") {
    const side = normalizeKitchenSideModules(input.kitchen_side_modules_mm, input.kitchen_side_module_types);
    if (side.modules.length === 0) {
      issues.push({
        code: "LSHAPE_NO_SIDE_MODULES",
        level: "error",
        message: "ㄱ자 배치인데 측면 칸이 비어 있습니다. 측면 칸을 추가하거나 일자형으로 바꿔주세요.",
        field: "kitchen_side_modules_mm",
        blocksOrder: true,
        source: "factory_rule",
      });
    }
  }
}
