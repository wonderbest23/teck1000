import {
  KITCHEN_TOE_KICK_M,
  KITCHEN_WALL_BOTTOM_M,
} from "@/components/preview3d/constants";
import type { SceneFrame, KitchenModulePart } from "@/components/preview3d/types";
import {
  clampModuleIndex,
  getKitchenSetDimensions,
  getKitchenTemplate,
  normalizeKitchenLayerWidths,
  normalizeKitchenModules,
} from "@/lib/kitchen";
import type { FurnitureInput } from "@/lib/types";
import { ENTRANCE_STANDARDS, WARDROBE_STANDARDS } from "@/lib/platformConfig";
import { getKitchenFullSetModelScale } from "@/components/preview3d/camera/fitCamera";
import { getModuleCenterX } from "@/components/preview3d/kitchen/moduleLayout";

function frameFromBox(widthM: number, heightM: number, depthM: number, centerY = heightM / 2): SceneFrame {
  return {
    widthM,
    heightM,
    depthM,
    center: [0, centerY, 0],
    target: [0, centerY, 0],
    minDistance: 1.4,
    maxDistance: 8,
  };
}

export function getKitchenBaseFrame(input: FurnitureInput): SceneFrame {
  const w = Math.max(input.width_mm, 300) / 1000;
  const h = Math.max(input.height_mm, 700) / 1000;
  const d = Math.max(input.depth_mm, 500) / 1000;
  const totalH = KITCHEN_TOE_KICK_M + h + 0.06;
  return frameFromBox(w, totalH, d, totalH / 2);
}

export function getKitchenWallFrame(input: FurnitureInput): SceneFrame {
  const w = Math.max(input.width_mm, 300) / 1000;
  const h = Math.max(input.height_mm, 300) / 1000;
  const d = Math.max(input.depth_mm, 280) / 1000;
  const centerY = KITCHEN_WALL_BOTTOM_M + h / 2;
  const totalH = KITCHEN_WALL_BOTTOM_M + h + 0.15;
  return frameFromBox(w, totalH, d, centerY);
}

export function getKitchenFullFrame(input: FurnitureInput): SceneFrame {
  const template = getKitchenTemplate(input.kitchen_template);
  const layout = normalizeKitchenModules(template, input.kitchen_modules_mm, input.kitchen_module_types);
  const baseModules = normalizeKitchenLayerWidths(layout.modules, input.kitchen_base_modules_mm);
  const wallModules = normalizeKitchenLayerWidths(layout.modules, input.kitchen_wall_modules_mm);
  const baseWidthM = baseModules.reduce((sum, width) => sum + width, 0) / 1000;
  const wallWidthM = wallModules.reduce((sum, width) => sum + width, 0) / 1000;
  const w = Math.max(layout.width_mm / 1000, baseWidthM, wallWidthM);
  const dimensions = getKitchenSetDimensions(input, template);
  // ㄱ자: 렌더러와 동일하게 (메인+측면) 폭 기준으로 스케일해야 화면 중앙/전체가 맞는다
  const isL = input.kitchen_layout_shape === "l_shape" && (input.kitchen_side_modules_mm?.length ?? 0) > 0;
  const sideWidthM = isL ? (input.kitchen_side_modules_mm ?? []).reduce((sum, value) => sum + value, 0) / 1000 : 0;
  const scaleWidthM = w + sideWidthM;
  const modelScale = getKitchenFullSetModelScale(scaleWidthM);
  const contentH = KITCHEN_WALL_BOTTOM_M + dimensions.wallHeightMm / 1000 + 0.06;
  const scaledH = contentH * modelScale;
  const centerY = scaledH / 2;
  // ㄱ자는 측면이 깊이(Z)로 뻗어 기울인 화면에서 위아래를 더 차지 → 프레임 높이/폭을 키워 전체가 보이게
  const depthExtentM = (Math.max(dimensions.baseDepthMm, dimensions.wallDepthMm) / 1000 + sideWidthM) * modelScale;
  const frameWidthM = Math.max(w * modelScale, scaleWidthM * modelScale * 0.86);
  const frameHeightM = scaledH + (isL ? depthExtentM * 0.6 : 0);

  return {
    widthM: frameWidthM,
    heightM: frameHeightM,
    depthM: depthExtentM,
    center: [0, centerY, 0],
    target: [0, centerY, 0],
    minDistance: 1.4,
    maxDistance: 10,
  };
}

export function getKitchenModuleFocusFrame(
  input: FurnitureInput,
  moduleIndex: number,
  part: KitchenModulePart = "base",
): SceneFrame {
  const base = getKitchenFullFrame(input);
  const template = getKitchenTemplate(input.kitchen_template);
  const layout = normalizeKitchenModules(template, input.kitchen_modules_mm, input.kitchen_module_types);
  const modules = layout.modules;
  const layerModules = normalizeKitchenLayerWidths(modules, part === "wall" ? input.kitchen_wall_modules_mm : input.kitchen_base_modules_mm);
  const dimensions = getKitchenSetDimensions(input, template);
  const safeIndex = clampModuleIndex(moduleIndex, modules.length - 1);
  const totalWidthM = layerModules.reduce((sum, width) => sum + width, 0) / 1000;
  const modelScale = getKitchenFullSetModelScale(totalWidthM);
  const moduleCenterX = getModuleCenterX(layerModules, safeIndex) * modelScale;
  const moduleWidthM = (layerModules[safeIndex] / 1000) * modelScale;
  const focusWidthM = Math.min(base.widthM, Math.max(moduleWidthM * 2.4, base.widthM * 0.38));
  if (part === "wall") {
    const wallHeightM = (dimensions.wallHeightMm / 1000) * modelScale;
    const centerY = (KITCHEN_WALL_BOTTOM_M + dimensions.wallHeightMm / 1000 / 2) * modelScale;
    return {
      ...base,
      widthM: focusWidthM,
      heightM: wallHeightM,
      center: [moduleCenterX, centerY, 0],
      target: [moduleCenterX, centerY, 0],
    };
  }

  const baseHeightM = (KITCHEN_TOE_KICK_M + dimensions.baseHeightMm / 1000) * modelScale;
  const centerY = baseHeightM / 2;
  return {
    ...base,
    widthM: focusWidthM,
    heightM: baseHeightM,
    center: [moduleCenterX, centerY, 0],
    target: [moduleCenterX, centerY, 0],
  };
}

export function getTallStorageFrame(input: FurnitureInput): SceneFrame {
  const w = Math.max(input.width_mm, 400) / 1000;
  const h = Math.max(input.height_mm, 2000) / 1000;
  const d = Math.max(input.depth_mm, 400) / 1000;
  return frameFromBox(w, h, d, h / 2);
}

export function getShoeCabinetFrame(input: FurnitureInput): SceneFrame {
  const w = Math.max(input.width_mm, 400) / 1000;
  const h = Math.max(input.height_mm, ENTRANCE_STANDARDS.minTotalHeightMm) / 1000;
  const d = Math.max(input.depth_mm, ENTRANCE_STANDARDS.preferredDepthMm) / 1000;
  const bottom = (input.bottom_space ?? 0) / 1000;
  const totalH = h + bottom;
  return frameFromBox(w, totalH, d, totalH / 2);
}

export function getBoxFrame(input: FurnitureInput): SceneFrame {
  const w = Math.max(input.width_mm, 200) / 1000;
  const h = Math.max(input.height_mm, 300) / 1000;
  const d = Math.max(input.depth_mm, 150) / 1000;
  return frameFromBox(w, h, d, h / 2);
}

export function getSceneFrame(input: FurnitureInput): SceneFrame {
  switch (input.productType) {
    case "desk":
      return getBoxFrame(input);
    case "living_cabinet":
      return getBoxFrame(input);
    case "kitchen_base_cabinet":
      return getKitchenBaseFrame(input);
    case "kitchen_wall_cabinet":
      return getKitchenWallFrame(input);
    case "kitchen_full_set":
      return getKitchenFullFrame(input);
    case "built_in_wardrobe":
      return getTallStorageFrame(input);
    case "shoe_cabinet":
      return getShoeCabinetFrame(input);
    case "custom_shelf":
    case "gap_cabinet":
      return getBoxFrame(input);
    default:
      return getBoxFrame(input);
  }
}
