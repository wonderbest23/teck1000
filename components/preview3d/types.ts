import type { FurnitureInput } from "@/lib/types";

export type PreviewViewMode =
  | "exterior"
  | "interior"
  | "doors_open"
  | "doors_hidden"
  | "transparent_doors"
  | "xray";

export type DoorStyle = "flat" | "frame" | "slat";
export type DoorSwing = "pair" | "left" | "right" | "up" | "down" | "up_pair";

export type MaterialPreset =
  | "white_pb"
  | "oak_pb"
  | "gray_pb"
  | "natural_mdf"
  | "birch_plywood"
  | "walnut_plywood"
  | "black_lpm"
  | "matte_white_pet";

export type MaterialFinish = "gloss" | "matte" | "wood";
export type MaterialColors = { label: string; color: string; edge: string; accent: string; finish: MaterialFinish; texture?: string };

export type SceneFrame = {
  widthM: number;
  heightM: number;
  depthM: number;
  center: [number, number, number];
  target: [number, number, number];
  minDistance?: number;
  maxDistance?: number;
};

export type KitchenMovableKey = "sink_module_index" | "cooktop_module_index" | "hood_module_index" | "microwave_module_index";

export type KitchenModulePart = "base" | "wall";
export type KitchenFixtureTarget = "sink" | "cooktop" | "hood";
export type DragTarget = { type: "module"; moduleIndex: number; part: KitchenModulePart } | { type: "item"; itemKey: KitchenMovableKey };
export type PreviewEditTarget = "module" | "door" | "handle";
export type PreviewFeedback = { type: "added" | "removed"; moduleIndex: number; nonce: number } | null;

export type PreviewRendererProps = {
  input: FurnitureInput;
  viewMode: PreviewViewMode;
  doorStyle: DoorStyle;
  frontView: boolean;
  selectedModuleIndex: number | null;
  selectedModulePart?: KitchenModulePart;
  selectedEditTarget?: PreviewEditTarget;
  selectedFixture?: KitchenFixtureTarget | null;
  sizeBadgeHidden?: boolean;
  activeDragTarget: DragTarget | null;
  dragRatio: number | null;
  feedback?: PreviewFeedback;
  onSelectModule: (index: number, part: KitchenModulePart, target?: PreviewEditTarget) => void;
  onSelectFixture?: (fixture: KitchenFixtureTarget, index: number) => void;
  onPrepareDragModule?: (index: number, part: KitchenModulePart, clientX: number, clientY: number) => void;
  onPrepareDragItem?: (itemKey: KitchenMovableKey, moduleIndex: number, clientX: number, clientY: number) => void;
  onStartDragModule?: (index: number, part: KitchenModulePart) => void;
  onStartDragItem?: (itemKey: KitchenMovableKey, moduleIndex: number) => void;
  onAddModule?: (part: KitchenModulePart) => void;
  onRemoveModule?: (part: KitchenModulePart) => void;
  onModuleWidthChange?: (widthMm: number) => void;
  onModuleHeightChange?: (heightMm: number) => void;
  onModuleDepthChange?: (depthMm: number) => void;
  onDrawerCountChange?: (drawerCount: number) => void;
  onShelfCountChange?: (shelfCount: number) => void;
  onDoorSwingChange?: (swing: DoorSwing) => void;
  onHandleChange?: (hasHandle: boolean) => void;
  onHideSizeBadge?: () => void;
  onSyncAllWidths?: (sourcePart: KitchenModulePart) => void;
  onRestoreModulePart?: (index: number, part: KitchenModulePart) => void;
  /** 상부장 칸을 위/아래로 이동 (deltaMm: +위 / -아래) */
  onWallVerticalMove?: (index: number, deltaMm: number) => void;
  /** ㄱ자 측면 다리 편집 */
  selectedSideIndex?: number | null;
  onSelectSideModule?: (index: number) => void;
  onAddSideModule?: () => void;
  onRemoveSideModule?: () => void;
  onSideModuleWidthChange?: (widthMm: number) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  interactive?: boolean;
  /** 치수 눈금·실측 마커 표시 여부 (기본 숨김으로 캔버스 정리) */
  showDimensions?: boolean;
  /** 멀티 가구 씬(RoomScene)에 박아 그릴 때: 자기 방을 그리지 않고 실척(싱크대 modelScale=1)으로 렌더 */
  embedded?: boolean;
};
