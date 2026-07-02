"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { FinishProvider, PreviewRoom, StudioEnvironment } from "@/components/preview3d/primitives";
import { getMaterialPreset, materialPresets } from "@/components/preview3d/materials";
import { getPreviewRenderer } from "@/components/preview3d/renderers/rendererRegistry";
import { CameraRig } from "@/components/preview3d/camera/CameraRig";
import { getFootprint, type Footprint, type Placement, type RoomItem } from "@/components/preview3d/roomLayout";
import { useKitchenEditor } from "@/components/preview3d/controls/useKitchenEditor";
import { SceneSizePanel, type PanelActions, type PanelNotice, type SizeGroup } from "@/components/preview3d/controls/SceneSizePanel";
import { materials as materialCatalog } from "@/lib/data";
import type { DoorSwing, KitchenModulePart, PreviewEditTarget } from "@/components/preview3d/types";
import { KITCHEN_STANDARDS } from "@/lib/platformConfig";
import { getKitchenSetDimensions, KITCHEN_DIMENSION_LIMITS } from "@/lib/kitchen";
import type { KitchenModuleType } from "@/lib/kitchen";
import type { FurnitureInput } from "@/lib/types";

// 선택된 주방 칸을 3D에서 클릭 편집할 때 DraggableItem에 넘기는 상호작용 묶음
type KitchenInteractive = {
  selectedModuleIndex: number | null;
  selectedModulePart: KitchenModulePart;
  onSelectModule: (index: number, part: KitchenModulePart, target?: PreviewEditTarget) => void;
  onAddModule: (part: KitchenModulePart) => void;
  onRemoveModule: (part: KitchenModulePart) => void;
  onModuleWidthChange?: (widthMm: number) => void;
  onModuleHeightChange?: (heightMm: number) => void;
  onModuleDepthChange?: (depthMm: number) => void;
  onShelfCountChange?: (shelfCount: number) => void;
  onDrawerCountChange?: (drawerCount: number) => void;
  onDoorSwingChange?: (swing: DoorSwing) => void;
  onHandleChange?: (hasHandle: boolean) => void;
  onRestoreModulePart?: (index: number, part: KitchenModulePart) => void;
  // ㄱ자(L형) 측면 다리 칸 편집
  selectedSideIndex?: number | null;
  onSelectSideModule?: (index: number) => void;
  onAddSideModule?: () => void;
  onRemoveSideModule?: () => void;
  onSideModuleWidthChange?: (widthMm: number) => void;
};

const clampW = (mm: number) => Math.min(3000, Math.max(150, Math.round(mm)));
const clampH = (mm: number) => Math.min(2800, Math.max(120, Math.round(mm)));

/** 화면 폭에 따라 핸들 크기 보정 — 모바일/좁은 화면에선 distanceFactor를 낮춰(=더 크게) 손가락으로 누르기 쉽게 */
function useHandleFactor(base: number) {
  const [factor, setFactor] = useState(base);
  useEffect(() => {
    const update = () => setFactor(window.innerWidth < 640 ? base * 0.66 : window.innerWidth < 1024 ? base * 0.82 : base);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [base]);
  return factor;
}

/** 크기 조절 핸들 — 끌어서 그 축의 치수를 늘리고 줄임 (가로/깊이=양방향 화살표, 높이=상하 화살표) */
/** 방금 추가한 가구를 가리키는 파란 펄스 테두리 */
function HighlightBox({ centerY, w, h, d }: { centerY: number; w: number; h: number; d: number }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (matRef.current) matRef.current.opacity = 0.55 + 0.4 * Math.sin(state.clock.elapsedTime * 5);
  });
  return (
    <mesh position={[0, centerY, 0]}>
      <boxGeometry args={[w * 1.05, h * 1.05, d * 1.07]} />
      <meshBasicMaterial ref={matRef} color="#2563eb" wireframe transparent opacity={0.9} depthTest={false} />
    </mesh>
  );
}

function ResizeHandle({ position, label, dir, onStart }: { position: [number, number, number]; label: string; dir: "h" | "v"; onStart: (e: { stopPropagation: () => void; clientX: number; clientY: number }) => void }) {
  const factor = useHandleFactor(5);
  return (
    <Html position={position} center distanceFactor={factor} zIndexRange={[40, 30]}>
      <button
        type="button"
        title={`${label} 조절 — 드래그`}
        aria-label={`${label} 조절`}
        onPointerDown={(e) => { e.stopPropagation(); onStart(e); }}
        onClick={(e) => e.stopPropagation()}
        className={`grid h-7 w-7 place-items-center rounded-full bg-amber-500 text-white shadow-md ring-2 ring-white/90 touch-none ${dir === "v" ? "cursor-ns-resize" : "cursor-ew-resize"}`}
      >
        {dir === "v" ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" /></svg>
        )}
      </button>
    </Html>
  );
}

function DraggableItem({
  item,
  footprint,
  placement,
  selected,
  onSelect,
  onMove,
  onMoveEnd,
  onResize,
  kitchen,
  highlight,
  expert,
  editable = true,
  showName = true,
  showDimensions,
  doorsOpen,
}: {
  item: RoomItem;
  footprint: Footprint;
  placement: Placement;
  selected: boolean;
  kitchen?: KitchenInteractive;
  highlight?: boolean;
  expert?: boolean;
  /** 수정 모드 여부 — false(보기 모드)면 선택/핸들/배지 등 편집 UI 전부 숨김 */
  editable?: boolean;
  /** 이름표 표시 — 가구가 1개뿐이면 불필요해 숨김(툴바 가림 방지) */
  showName?: boolean;
  showDimensions?: boolean;
  doorsOpen?: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, z: number) => void;
  onMoveEnd: () => void;
  onResize: (id: string, patch: Partial<FurnitureInput>, center?: { x: number; z: number }, dir?: { x: number; z: number }) => void;
}) {
  const { camera, gl } = useThree();
  const helpers = useMemo(
    () => ({ plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ray: new THREE.Raycaster(), v2: new THREE.Vector2(), hit: new THREE.Vector3() }),
    [],
  );
  const moveFactor = useHandleFactor(5);
  const Renderer = getPreviewRenderer(item.input.productType);
  if (!Renderer) return null;

  function toWorld(clientX: number, clientY: number) {
    const rect = gl.domElement.getBoundingClientRect();
    helpers.v2.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    helpers.ray.setFromCamera(helpers.v2, camera);
    return helpers.ray.ray.intersectPlane(helpers.plane, helpers.hit);
  }

  // 몸체 클릭 = 선택만 (이동 아님)
  function selectOnly(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    onSelect(item.id);
  }

  // 동그라미 핸들 드래그 = 이동 (잡은 지점 기준 오프셋 유지)
  function startHandleDrag(event: { stopPropagation: () => void; clientX: number; clientY: number }) {
    event.stopPropagation();
    onSelect(item.id);
    const start = toWorld(event.clientX, event.clientY);
    const offX = start ? placement.x - start.x : 0;
    const offZ = start ? placement.z - start.z : 0;
    function move(ev: PointerEvent) {
      const p = toWorld(ev.clientX, ev.clientY);
      if (p) onMove(item.id, p.x + offX, p.z + offZ);
    }
    function up() {
      onMoveEnd();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const bottomY = footprint.baseY;
  const boxHeight = Math.max(footprint.topY - bottomY, 0.4);
  const centerY = bottomY + boxHeight / 2;
  const topY = footprint.topY;
  const resizable = item.input.productType !== "kitchen_full_set";

  // 가로/깊이 핸들 — 잡은 쪽만 늘어나고 반대편 모서리는 고정(앵커). sign=+1:오른쪽/앞, -1:왼쪽/뒤. 회전 반영.
  function startResizeEdge(axis: "x" | "z", sign: 1 | -1, event: { stopPropagation: () => void; clientX: number; clientY: number }) {
    event.stopPropagation();
    onSelect(item.id);
    const rot = placement.rotY;
    const base = axis === "x" ? { x: Math.cos(rot), z: -Math.sin(rot) } : { x: Math.sin(rot), z: Math.cos(rot) };
    const dir = { x: base.x * sign, z: base.z * sign }; // 잡은 쪽으로 향하는 방향
    const half = (axis === "x" ? footprint.widthM : footprint.depthM) / 2;
    // 반대편(잡은 쪽의 −면) 모서리 = 고정 앵커
    const anchor = { x: placement.x - dir.x * half, z: placement.z - dir.z * half };
    function move(ev: PointerEvent) {
      const p = toWorld(ev.clientX, ev.clientY);
      if (!p) return;
      const size = (p.x - anchor.x) * dir.x + (p.z - anchor.z) * dir.z; // 앵커→포인터의 축방향 거리
      const sizeMm = clampW(Math.max(0.12, size) * 1000);
      const nh = sizeMm / 1000 / 2;
      const center = { x: anchor.x + dir.x * nh, z: anchor.z + dir.z * nh };
      onResize(item.id, axis === "x" ? { width_mm: sizeMm } : { depth_mm: sizeMm }, center, dir);
    }
    function up() {
      onMoveEnd();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // 높이 핸들 — 화면 세로 드래그(위=커짐)
  function startResizeHeight(event: { stopPropagation: () => void; clientX: number; clientY: number }) {
    event.stopPropagation();
    onSelect(item.id);
    const startClientY = event.clientY;
    const baseH = item.input.height_mm;
    function move(ev: PointerEvent) {
      onResize(item.id, { height_mm: clampH(baseH + (startClientY - ev.clientY) * 4) });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <group position={[placement.x, 0, placement.z]} rotation={[0, placement.rotY, 0]}>
      <FinishProvider material={materialPresets[getMaterialPreset(item.input.material)]}>
      <Renderer
        input={item.input}
        viewMode={doorsOpen ? "doors_open" : "exterior"}
        doorStyle={item.input.door_style ?? "flat"}
        frontView
        selectedModuleIndex={kitchen ? kitchen.selectedModuleIndex : null}
        selectedModulePart={kitchen?.selectedModulePart}
        selectedEditTarget="module"
        activeDragTarget={null}
        dragRatio={null}
        showDimensions={showDimensions}
        onSelectModule={kitchen ? kitchen.onSelectModule : () => {}}
        onAddModule={kitchen?.onAddModule}
        onRemoveModule={kitchen?.onRemoveModule}
        onModuleWidthChange={kitchen?.onModuleWidthChange}
        onModuleHeightChange={kitchen?.onModuleHeightChange}
        onModuleDepthChange={kitchen?.onModuleDepthChange}
        onShelfCountChange={kitchen?.onShelfCountChange}
        onDrawerCountChange={kitchen?.onDrawerCountChange}
        onDoorSwingChange={kitchen?.onDoorSwingChange}
        onHandleChange={kitchen?.onHandleChange}
        onRestoreModulePart={kitchen?.onRestoreModulePart}
        selectedSideIndex={kitchen?.selectedSideIndex ?? null}
        onSelectSideModule={kitchen?.onSelectSideModule}
        onAddSideModule={kitchen?.onAddSideModule}
        onRemoveSideModule={kitchen?.onRemoveSideModule}
        onSideModuleWidthChange={kitchen?.onSideModuleWidthChange}
        onEditStart={() => {}}
        onEditEnd={() => {}}
        interactive={Boolean(kitchen)}
        embedded
      />
      </FinishProvider>
      {/* 방금 추가됨 — 파란 펄스 테두리 + 안내 배지 */}
      {highlight && (
        <>
          <HighlightBox centerY={centerY} w={footprint.widthM} h={boxHeight} d={footprint.depthM} />
          <Html position={[0, topY + 0.16, 0]} center distanceFactor={6} zIndexRange={[46, 36]}>
            <div style={{ pointerEvents: "none" }} className="whitespace-nowrap rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white shadow-lg ring-2 ring-white/80">+ 여기 추가됐어요</div>
          </Html>
        </>
      )}
      {/* 이름표 — 어떤 가구인지 식별(수정 모드 + 선택 안 됐을 때만, 비클릭). 보기 모드는 깨끗하게 */}
      {editable && showName && !selected && !highlight && (
        <Html position={[0, topY + 0.1, 0]} center distanceFactor={7} zIndexRange={[20, 10]}>
          <div style={{ pointerEvents: "none" }} className="whitespace-nowrap rounded bg-slate-900/75 px-1.5 py-0.5 text-[9px] font-black text-white">{item.name}</div>
        </Html>
      )}
      {/* 클릭 히트박스 — 선택만 (드래그 X). 주방 칸 클릭 편집 중에는 칸 클릭을 가리지 않도록 끔 */}
      {editable && !kitchen && (
        <mesh position={[0, centerY, 0]} onPointerDown={selectOnly}>
          <boxGeometry args={[footprint.widthM, boxHeight, footprint.depthM]} />
          <meshBasicMaterial transparent opacity={selected ? 0.06 : 0} depthWrite={false} color="#06b6d4" />
        </mesh>
      )}
      {editable && selected && (
        <>
          <mesh position={[0, centerY, 0]}>
            <boxGeometry args={[footprint.widthM * 1.02, boxHeight * 1.02, footprint.depthM * 1.04]} />
            <meshBasicMaterial color="#06b6d4" wireframe transparent opacity={0.9} depthTest={false} />
          </mesh>
          {/* 이동 핸들 — 가구 좌상단 모서리 위(몸체·상세 UI를 가리지 않게 구석 + 작게). 이 동그라미를 끌어야만 움직인다 */}
          <Html position={[-footprint.widthM / 2, topY + 0.12, 0]} center distanceFactor={moveFactor} zIndexRange={[40, 30]}>
            <button
              type="button"
              title="드래그해서 이동"
              aria-label="드래그해서 이동"
              onPointerDown={(e) => {
                e.stopPropagation();
                startHandleDrag(e);
              }}
              onClick={(e) => e.stopPropagation()}
              className="grid h-9 w-9 cursor-grab touch-none place-items-center rounded-full bg-cyan-600 text-white shadow-lg ring-2 ring-white/90 active:cursor-grabbing"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18M3 12h18" />
                <path d="M12 3l-2.4 2.4M12 3l2.4 2.4M12 21l-2.4-2.4M12 21l2.4-2.4M3 12l2.4-2.4M3 12l2.4 2.4M21 12l-2.4-2.4M21 12l2.4 2.4" />
              </svg>
            </button>
          </Html>
          {resizable && (
            <>
              {/* 가로 — 좌·우 옆면 가운데 */}
              <ResizeHandle position={[footprint.widthM / 2 + 0.12, centerY, 0]} label="가로" dir="h" onStart={(e) => startResizeEdge("x", 1, e)} />
              <ResizeHandle position={[-footprint.widthM / 2 - 0.12, centerY, 0]} label="가로" dir="h" onStart={(e) => startResizeEdge("x", -1, e)} />
              {/* 깊이 — 앞면 가운데(하나만) */}
              <ResizeHandle position={[0, bottomY + boxHeight * 0.18, footprint.depthM / 2 + 0.12]} label="깊이" dir="h" onStart={(e) => startResizeEdge("z", 1, e)} />
              {/* 높이 — 윗면 가운데(이동 핸들보다 살짝 아래) */}
              <ResizeHandle position={[0, topY + 0.05, 0]} label="높이" dir="v" onStart={startResizeHeight} />
            </>
          )}
        </>
      )}
    </group>
  );
}

export function RoomScene({
  items,
  placements,
  selectedId,
  highlightId,
  expert,
  editable = true,
  onSelect,
  onMove,
  onMoveEnd,
  onResize,
  onCommitItem,
  onRotateItem,
  onDuplicateItem,
  onRemoveItem,
  selectedNotice,
  mobilePanelHost,
  showDimensions,
  doorsOpen,
  guides,
  floor,
}: {
  items: RoomItem[];
  placements: Record<string, Placement>;
  selectedId: string | null;
  highlightId?: string | null;
  expert?: boolean;
  /** 수정 모드 여부 — false(보기 모드)면 선택/편집 UI 없이 감상만 */
  editable?: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, z: number) => void;
  onMoveEnd: () => void;
  onResize: (id: string, patch: Partial<FurnitureInput>, center?: { x: number; z: number }, dir?: { x: number; z: number }) => void;
  onCommitItem: (id: string, input: FurnitureInput) => void;
  /** 회전·복제·삭제 — 우측 사이즈 패널의 액션 줄로 노출 */
  onRotateItem?: (id: string) => void;
  onDuplicateItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  /** 선택 가구의 주문 불가/주의 사유 — 패널 상단에 표시 */
  selectedNotice?: PanelNotice | null;
  /** 모바일용 패널 호스트 — 있으면 사이즈 패널을 이 엘리먼트(섹션 아래)에도 inline으로 포털 렌더 */
  mobilePanelHost?: HTMLElement | null;
  showDimensions?: boolean;
  doorsOpen?: boolean;
  guides: { axis: "x" | "z"; value: number }[];
  floor: { leftX: number; rightX: number; backZ: number; frontZ: number; topY: number };
}) {
  const foots = useMemo(() => Object.fromEntries(items.map((it) => [it.id, getFootprint(it.input)])), [items]);

  // ── 선택된 주방 세트의 칸(캐비닛) 클릭 편집 — 단일 useKitchenEditor로 로직 공유(비주방이면 자동 no-op) ──
  const selectedKitchen = items.find((it) => it.id === selectedId && it.input.productType === "kitchen_full_set") ?? null;
  const kitchenInputForEditor = selectedKitchen?.input ?? items[0]?.input;
  const [partSel, setPartSel] = useState<KitchenModulePart>("base");
  const [applyAll, setApplyAll] = useState(false);
  const [sideSel, setSideSel] = useState<number | null>(null); // ㄱ자 측면 다리 칸 선택(메인 칸 선택과 분리)
  const kEditor = useKitchenEditor(kitchenInputForEditor, (next) => {
    if (selectedKitchen) onCommitItem(selectedKitchen.id, next);
  });
  // 선택 가구가 바뀌면 칸 선택 초기화
  const prevSelRef = useRef<string | null>(selectedId);
  useEffect(() => {
    if (prevSelRef.current !== selectedId) {
      kEditor.clearSelectedModule();
      setPartSel("base");
      setApplyAll(false);
      setSideSel(null);
      prevSelRef.current = selectedId;
    }
  }, [selectedId, kEditor]);

  const moduleIdx = kEditor.selectedModuleIndex;
  const ki = selectedKitchen?.input;
  const dockVisible = Boolean(selectedKitchen) && moduleIdx !== null && ki != null;
  const moduleCount = kEditor.kitchenLayout?.modules.length ?? 1;
  const commitKi = (next: FurnitureInput) => { if (selectedKitchen) onCommitItem(selectedKitchen.id, next); };

  // ㄱ자(L형) 여부 — 측면 다리 편집은 L형 주방에서만
  const isLShape = Boolean(selectedKitchen && ki?.kitchen_layout_shape === "l_shape" && (ki?.kitchen_side_modules_mm?.length ?? 0) > 0);

  // 주방(상하부장)은 간편 모드에서도 칸을 클릭해 편집할 수 있어야 한다(유일한 편집 수단). 보기 모드에선 끔.
  const kitchenInteractive: KitchenInteractive | undefined = editable && selectedKitchen
    ? {
        selectedModuleIndex: moduleIdx,
        selectedModulePart: partSel,
        onSelectModule: (index, part) => {
          if (kEditor.consumeLayerClickSuppression()) return;
          setSideSel(null);
          if (kEditor.selectedModuleIndex === index && partSel === part) {
            kEditor.clearSelectedModule();
            return;
          }
          kEditor.setSelectedModuleIndex(index);
          setPartSel(part);
        },
        onAddModule: (part) => kEditor.addKitchenModule(part, "right"),
        onRemoveModule: (part) => kEditor.removeSelectedModule(part),
        onModuleWidthChange: (mm) => kEditor.updateSelectedModuleWidth(mm, partSel),
        onModuleHeightChange: (mm) => ki && commitKi({ ...ki, [partSel === "wall" ? "kitchen_wall_height_mm" : "kitchen_base_height_mm"]: mm }),
        onModuleDepthChange: (mm) => ki && commitKi({ ...ki, [partSel === "wall" ? "kitchen_wall_depth_mm" : "kitchen_base_depth_mm"]: mm }),
        onShelfCountChange: (n) => kEditor.updateSelectedShelfCount(n, partSel),
        onDrawerCountChange: (n) => kEditor.updateSelectedDrawerCount(n),
        onDoorSwingChange: (s) => kEditor.updateSelectedDoorSwing(s, partSel),
        onHandleChange: (has) => {
          if (!ki || kEditor.selectedModuleIndex === null) return;
          const key = partSel === "wall" ? "kitchen_wall_no_handle_indices" : "kitchen_no_handle_indices";
          const set = new Set(ki[key] ?? []);
          if (has) set.delete(kEditor.selectedModuleIndex);
          else set.add(kEditor.selectedModuleIndex);
          commitKi({ ...ki, [key]: Array.from(set).sort((a, b) => a - b) });
        },
        onRestoreModulePart: (index, part) => kEditor.restoreModulePart(index, part),
        // ㄱ자 측면 다리 칸 — 선택/폭/추가/삭제 (메인 칸 선택과 상호 배타)
        selectedSideIndex: isLShape ? sideSel : null,
        onSelectSideModule: isLShape
          ? (index) => {
              kEditor.clearSelectedModule();
              setSideSel((current) => (current === index ? null : index));
            }
          : undefined,
        onSideModuleWidthChange: isLShape
          ? (widthMm) => {
              if (sideSel === null || !ki) return;
              const next = [...(ki.kitchen_side_modules_mm ?? [])];
              if (sideSel >= next.length) return;
              next[sideSel] = Math.max(150, Math.min(1000, Math.round(widthMm)));
              commitKi({ ...ki, kitchen_side_modules_mm: next });
            }
          : undefined,
        onAddSideModule: isLShape
          ? () => {
              if (!ki) return;
              const mods = [...(ki.kitchen_side_modules_mm ?? [])];
              const types = [...(ki.kitchen_side_module_types ?? [])];
              if (mods.length >= 5) return;
              const refIndex = sideSel ?? mods.length - 1;
              const insertIndex = Math.min(refIndex + 1, mods.length);
              mods.splice(insertIndex, 0, mods[refIndex] ?? 600);
              types.splice(insertIndex, 0, "door");
              commitKi({ ...ki, kitchen_side_modules_mm: mods, kitchen_side_module_types: types });
              setSideSel(null);
            }
          : undefined,
        onRemoveSideModule: isLShape
          ? () => {
              if (sideSel === null || !ki) return;
              const mods = [...(ki.kitchen_side_modules_mm ?? [])];
              const types = [...(ki.kitchen_side_module_types ?? [])];
              if (mods.length <= 1) return;
              mods.splice(sideSel, 1);
              types.splice(sideSel, 1);
              commitKi({ ...ki, kitchen_side_modules_mm: mods, kitchen_side_module_types: types });
              setSideSel(null);
            }
          : undefined,
      }
    : undefined;

  // 칸 편집은 3D 미리보기 안의 인라인 컨트롤(셀 클릭 시 뜨는 +/단수/삭제/상부장)로 통일 — 하단 도크 제거.

  // 벽/그림자는 현재 방(floor)에 맞춰 실시간
  const roomW = floor.rightX - floor.leftX;
  const roomD = floor.frontZ - floor.backZ;
  const centerZ = (floor.backZ + floor.frontZ) / 2;
  const ceilingY = Math.max(2.5, floor.topY + 0.45);

  // 카메라는 '방'이 아니라 '가구(내용물)'에 맞춰 잡는다 → 방을 10평 고정으로 둬도 가구가 화면을 꽉 채운다.
  // 아이템 개수가 바뀔 때만 갱신(이동/크기조절 중엔 고정 → 안 흔들림).
  const placementsRef = useRef(placements);
  placementsRef.current = placements;
  const footsRef = useRef(foots);
  footsRef.current = foots;
  const makeFrame = () => {
    const pl = placementsRef.current;
    const ft = footsRef.current;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxTop = 0.5;
    for (const it of items) {
      const f = ft[it.id];
      if (!f) continue;
      const p = pl[it.id] ?? { x: 0, z: 0, rotY: 0 };
      const c = Math.abs(Math.cos(p.rotY));
      const s = Math.abs(Math.sin(p.rotY));
      const hx = c * f.widthM / 2 + s * f.depthM / 2;
      const hz = s * f.widthM / 2 + c * f.depthM / 2;
      minX = Math.min(minX, p.x - hx); maxX = Math.max(maxX, p.x + hx);
      minZ = Math.min(minZ, p.z - hz); maxZ = Math.max(maxZ, p.z + hz);
      maxTop = Math.max(maxTop, f.topY);
    }
    if (!Number.isFinite(minX)) { minX = -0.4; maxX = 0.4; minZ = -0.4; maxZ = 0.4; }
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const h = maxTop;
    const pad = 0.55; // 가구 둘레 여백
    return {
      widthM: maxX - minX + pad,
      heightM: h + pad,
      depthM: maxZ - minZ + pad,
      center: [cx, h * 0.55, cz] as [number, number, number],
      target: [cx, h * 0.45, cz] as [number, number, number],
      minDistance: 0.3,
      maxDistance: 40,
    };
  };
  const [frame, setFrame] = useState(makeFrame);
  useEffect(() => {
    setFrame(makeFrame());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, selectedId]);
  // 이동/회전으로 배치가 바뀌면(드래그가 멈춘 뒤 잠시 후) 카메라가 따라잡는다 — 벽으로 옮긴 가구가 화면 밖에 남지 않게.
  // 드래그 중에는 타이머가 계속 리셋되어 카메라가 흔들리지 않는다.
  const placementsSig = useMemo(
    () => items.map((it) => { const p = placements[it.id]; return p ? `${p.x.toFixed(2)},${p.z.toFixed(2)},${p.rotY.toFixed(2)}` : "-"; }).join("|"),
    [items, placements],
  );
  const skipFirstSigRef = useRef(true);
  useEffect(() => {
    if (skipFirstSigRef.current) {
      skipFirstSigRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => setFrame(makeFrame()), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementsSig]);

  // ── 우측 고정 사이즈 조절 패널 — 선택 대상에 맞는 치수 rows를 데이터로 구성 ──
  const selectedItem = items.find((it) => it.id === selectedId) ?? null;
  const panelActions: PanelActions | undefined = selectedId
    ? {
        onRotate: onRotateItem ? () => onRotateItem(selectedId) : undefined,
        onDuplicate: onDuplicateItem ? () => onDuplicateItem(selectedId) : undefined,
        onRemove: onRemoveItem ? () => onRemoveItem(selectedId) : undefined,
      }
    : undefined;
  const panelMaterials = (input: FurnitureInput, commit: (next: FurnitureInput) => void) => ({
    list: materialCatalog.map((m) => ({ name: m.name, color: m.color, tone: m.tone })),
    current: input.material,
    onSelect: (name: string, color: string) => commit({ ...input, material: name, color }),
  });
  let renderSizePanel: ((variant: "overlay" | "inline") => ReactNode) | null = null;
  if (editable && selectedKitchen && ki) {
    const dims = getKitchenSetDimensions(ki);
    const totalWidthMm = (ki.kitchen_base_modules_mm ?? ki.kitchen_modules_mm ?? []).reduce((sum, w) => sum + w, 0);
    const groups: SizeGroup[] = [];
    if (sideSel !== null && isLShape) {
      const sideMods = ki.kitchen_side_modules_mm ?? [];
      const sideWidthMm = Math.round(sideMods[sideSel] ?? 600);
      groups.push({
        heading: `측면 ${sideSel + 1}번 칸 폭`,
        rows: [{
          key: "side-width",
          label: "폭",
          value: sideWidthMm,
          min: 150,
          max: 1000,
          step: 50,
          onChange: (mm) => {
            const next = [...sideMods];
            next[sideSel] = Math.max(150, Math.min(1000, Math.round(mm)));
            commitKi({ ...ki, kitchen_side_modules_mm: next });
          },
        }],
      });
    } else if (moduleIdx !== null) {
      const layerMods = partSel === "wall" ? ki.kitchen_wall_modules_mm : ki.kitchen_base_modules_mm;
      const moduleWidthMm = Math.round(layerMods?.[moduleIdx] ?? ki.kitchen_modules_mm?.[moduleIdx] ?? KITCHEN_STANDARDS.defaultModuleWidthMm);
      // 3D 인라인 카드(SizeBadge)를 embedded에선 숨겼으므로 그 기능(선반/서랍 단수)을 패널 rows로 흡수
      const moduleType = partSel === "wall" ? "door" : (kEditor.kitchenLayout?.moduleTypes[moduleIdx] ?? "door");
      const isDrawerModule = partSel === "base" && moduleType === "drawer";
      const shelfCount = Math.round((partSel === "wall" ? ki.kitchen_wall_shelf_counts?.[moduleIdx] : ki.kitchen_base_shelf_counts?.[moduleIdx]) ?? 1);
      const drawerCount = Math.round(ki.kitchen_drawer_counts?.[moduleIdx] ?? 3);
      groups.push({
        heading: `${moduleIdx + 1}번 칸`,
        rows: [
          { key: "module-width", label: "폭", value: moduleWidthMm, min: 150, max: 1000, step: 50, onChange: (mm) => kEditor.updateSelectedModuleWidth(mm, partSel) },
          isDrawerModule
            ? { key: "module-drawer", label: "서랍", value: drawerCount, min: 1, max: 3, step: 1, onChange: (n) => kEditor.updateSelectedDrawerCount(n) }
            : { key: "module-shelf", label: "선반", value: shelfCount, min: 0, max: 8, step: 1, onChange: (n) => kEditor.updateSelectedShelfCount(n, partSel) },
        ],
      });
    }
    groups.push({
      heading: "하부장 전체",
      rows: [
        { key: "base-height", label: "높이", value: dims.baseHeightMm, min: KITCHEN_DIMENSION_LIMITS.baseHeight.min, max: KITCHEN_DIMENSION_LIMITS.baseHeight.max, step: KITCHEN_DIMENSION_LIMITS.baseHeight.step, onChange: (mm) => commitKi({ ...ki, height_mm: mm, kitchen_base_height_mm: mm }) },
        { key: "base-depth", label: "깊이", value: dims.baseDepthMm, min: KITCHEN_DIMENSION_LIMITS.baseDepth.min, max: KITCHEN_DIMENSION_LIMITS.baseDepth.max, step: KITCHEN_DIMENSION_LIMITS.baseDepth.step, onChange: (mm) => commitKi({ ...ki, kitchen_base_depth_mm: mm }) },
      ],
    });
    groups.push({
      heading: "상부장 전체",
      rows: [
        { key: "wall-height", label: "높이", value: dims.wallHeightMm, min: KITCHEN_DIMENSION_LIMITS.wallHeight.min, max: KITCHEN_DIMENSION_LIMITS.wallHeight.max, step: KITCHEN_DIMENSION_LIMITS.wallHeight.step, onChange: (mm) => commitKi({ ...ki, kitchen_wall_height_mm: mm }) },
        { key: "wall-depth", label: "깊이", value: dims.wallDepthMm, min: KITCHEN_DIMENSION_LIMITS.wallDepth.min, max: KITCHEN_DIMENSION_LIMITS.wallDepth.max, step: KITCHEN_DIMENSION_LIMITS.wallDepth.step, onChange: (mm) => commitKi({ ...ki, kitchen_wall_depth_mm: mm }) },
      ],
    });
    renderSizePanel = (variant) => (
      <SceneSizePanel
        variant={variant}
        title={
          sideSel !== null && isLShape
            ? `측면 ${sideSel + 1}번 칸`
            : moduleIdx !== null
              ? `${moduleIdx + 1}번 ${partSel === "wall" ? "상부장" : "하부장"}`
              : selectedKitchen.name
        }
        subtitle={`전체 길이 ${totalWidthMm}mm`}
        groups={groups}
        materials={panelMaterials(ki, commitKi)}
        actions={moduleIdx === null && sideSel === null ? panelActions : undefined}
        notice={selectedNotice}
        onClose={() => {
          if (sideSel !== null) setSideSel(null);
          else if (moduleIdx !== null) kEditor.clearSelectedModule();
          else onSelect(null);
        }}
      >
        {moduleIdx !== null && (() => {
          const moduleType = partSel === "wall" ? "door" : (kEditor.kitchenLayout?.moduleTypes[moduleIdx] ?? "door");
          const showSwing = partSel === "wall" || ["door", "sink_base"].includes(moduleType);
          const swing = (partSel === "wall" ? ki.kitchen_wall_door_swings?.[moduleIdx] ?? ki.kitchen_door_swings?.[moduleIdx] : ki.kitchen_door_swings?.[moduleIdx]) ?? "pair";
          const noHandleSet = (partSel === "wall" ? ki.kitchen_wall_no_handle_indices : ki.kitchen_no_handle_indices) ?? [];
          const hasHandle = !noHandleSet.includes(moduleIdx);
          return (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {([["base", "하부장"], ["wall", "상부장"]] as const).map(([part, label]) => (
                  <button
                    key={part}
                    type="button"
                    onClick={() => setPartSel(part)}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-black transition ${partSel === part ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {showSwing && (
                <div className="flex items-center gap-1">
                  <span className="w-8 shrink-0 text-[10px] font-black text-slate-500">문</span>
                  {([["pair", "2짝"], ["left", "좌개"], ["right", "우개"]] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => kEditor.updateSelectedDoorSwing(id, partSel)}
                      className={`flex-1 rounded-lg px-1.5 py-1.5 text-[10px] font-black transition ${swing === id ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="w-8 shrink-0 text-[10px] font-black text-slate-500">손잡이</span>
                {([[true, "있음"], [false, "없음"]] as const).map(([value, label]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => kitchenInteractive?.onHandleChange?.(value)}
                    className={`flex-1 rounded-lg px-1.5 py-1.5 text-[10px] font-black transition ${hasHandle === value ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => kEditor.addKitchenModule(partSel, "right")}
                  className="flex-1 rounded-lg bg-emerald-500 px-2 py-1.5 text-[10px] font-black text-white transition hover:bg-emerald-400"
                >
                  ＋ 칸 추가
                </button>
                <button
                  type="button"
                  disabled={moduleCount <= 1}
                  onClick={() => kEditor.removeSelectedModule(partSel)}
                  className="flex-1 rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-black text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:opacity-35"
                >
                  − 칸 삭제
                </button>
              </div>
            </div>
          );
        })()}
      </SceneSizePanel>
    );
  } else if (editable && selectedItem) {
    renderSizePanel = (variant) => (
      <SceneSizePanel
        variant={variant}
        title={selectedItem.name}
        groups={[{
          rows: [
            { key: "width", label: "가로", value: selectedItem.input.width_mm, min: 150, max: 3000, step: 50, onChange: (mm) => onResize(selectedItem.id, { width_mm: mm }) },
            { key: "height", label: "높이", value: selectedItem.input.height_mm, min: 120, max: 2800, step: 50, onChange: (mm) => onResize(selectedItem.id, { height_mm: mm }) },
            { key: "depth", label: "깊이", value: selectedItem.input.depth_mm, min: 150, max: 3000, step: 50, onChange: (mm) => onResize(selectedItem.id, { depth_mm: mm }) },
          ],
        }]}
        materials={panelMaterials(selectedItem.input, (next) => onCommitItem(selectedItem.id, next))}
        actions={panelActions}
        notice={selectedNotice}
        onClose={() => onSelect(null)}
      />
    );
  }

  return (
    <div className="relative h-full min-h-[340px] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-white">
      <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }} onPointerMissed={() => onSelect(null)}>
        <color attach="background" args={["#f8fafc"]} />
        {/* 벽·바닥이 고르게 — 면광원/줄무늬 환경광/그림자 제거로 좌우 갈라짐 없음 */}
        <ambientLight intensity={1.0} />
        <hemisphereLight args={["#ffffff", "#f1f5f9", 0.55]} />
        <directionalLight position={[0, 6, 0.5]} intensity={0.3} />
        {/* 하이그로시 도어 반사용 환경맵 — 확산광 밸런스는 유지(intensity 낮음) */}
        <StudioEnvironment />
        <PerspectiveCamera makeDefault fov={38} position={[2.5, 2, 3]} />
        <CameraRig frame={frame} freeView />
        <PreviewRoom extents={floor} floorY={0} topY={floor.topY} ceilingY={ceilingY} />
        {/* 정렬 가이드 — 다른 가구/벽과 맞으면 파란 선(글로우 + 또렷한 코어 + 살짝 솟은 면) */}
        {guides.map((g, i) => {
          const len = g.axis === "x" ? roomD : roomW;
          const pos: [number, number, number] = g.axis === "x" ? [g.value, 0, centerZ] : [0, 0, g.value];
          const coreSize: [number, number, number] = g.axis === "x" ? [0.012, 0.012, len] : [len, 0.012, 0.012];
          const haloSize: [number, number, number] = g.axis === "x" ? [0.05, 0.008, len] : [len, 0.008, 0.05];
          const planeRot: [number, number, number] = g.axis === "x" ? [0, 0, 0] : [0, Math.PI / 2, 0];
          return (
            <group key={`g-${g.axis}-${i}`} renderOrder={999}>
              <mesh position={[pos[0], 0.006, pos[2]]}>
                <boxGeometry args={haloSize} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={0.28} depthWrite={false} depthTest={false} />
              </mesh>
              <mesh position={[pos[0], 0.018, pos[2]]}>
                <boxGeometry args={coreSize} />
                <meshBasicMaterial color="#1d4ed8" transparent opacity={1} toneMapped={false} depthWrite={false} depthTest={false} />
              </mesh>
              <mesh position={[pos[0], 0.32, pos[2]]} rotation={planeRot}>
                <planeGeometry args={[len, 0.64]} />
                <meshBasicMaterial color="#60a5fa" transparent opacity={0.12} side={2} depthWrite={false} depthTest={false} />
              </mesh>
            </group>
          );
        })}
        {items.map((it) => (
          <DraggableItem
            key={it.id}
            item={it}
            footprint={foots[it.id]}
            placement={placements[it.id] ?? { x: 0, z: 0, rotY: 0 }}
            selected={selectedId === it.id}
            onSelect={onSelect}
            onMove={onMove}
            onMoveEnd={onMoveEnd}
            onResize={onResize}
            kitchen={selectedKitchen?.id === it.id ? kitchenInteractive : undefined}
            highlight={highlightId === it.id}
            expert={expert}
            editable={editable}
            showName={items.length > 1}
            showDimensions={showDimensions}
            doorsOpen={doorsOpen}
          />
        ))}
        <ContactShadows position={[0, 0.001, centerZ]} opacity={0.2} scale={Math.max(roomW, roomD) + 2} blur={2.6} far={3} />
        <OrbitControls makeDefault enablePan={false} target={frame.target} minDistance={frame.minDistance} maxDistance={frame.maxDistance} />
      </Canvas>

      {/* 사이즈 조절 패널 — 데스크톱: 캔버스 우측 오버레이 / 모바일: 섹션 아래 inline(미리보기를 가리지 않음) */}
      {renderSizePanel?.("overlay")}
      {mobilePanelHost && renderSizePanel && createPortal(<div className="sm:hidden">{renderSizePanel("inline")}</div>, mobilePanelHost)}

      {/* 칸 편집 안내 — 3D 인라인 컨트롤(＋추가·삭제)과 우측 패널을 함께 안내 */}
      {editable && selectedKitchen && moduleIdx === null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-30 flex justify-center">
          <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-black text-white shadow">칸(문짝)을 누르면 크기 조절 패널이 열려요</span>
        </div>
      )}
    </div>
  );
}
