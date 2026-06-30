"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Html, Lightformer, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { FinishProvider, PreviewRoom, StudioRectLights } from "@/components/preview3d/primitives";
import { getMaterialPreset, materialPresets } from "@/components/preview3d/materials";
import { getPreviewRenderer } from "@/components/preview3d/renderers/rendererRegistry";
import { CameraRig } from "@/components/preview3d/camera/CameraRig";
import { getFootprint, type Footprint, type Placement, type RoomItem } from "@/components/preview3d/roomLayout";
import { useKitchenEditor } from "@/components/preview3d/controls/useKitchenEditor";
import type { DoorSwing, KitchenModulePart, PreviewEditTarget } from "@/components/preview3d/types";
import { KITCHEN_STANDARDS } from "@/lib/platformConfig";
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
  const factor = useHandleFactor(6);
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
  const moveFactor = useHandleFactor(6);
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
      {/* 이름표 — 어떤 가구인지 식별(선택 안 됐을 때만, 비클릭) */}
      {!selected && !highlight && (
        <Html position={[0, topY + 0.1, 0]} center distanceFactor={7} zIndexRange={[20, 10]}>
          <div style={{ pointerEvents: "none" }} className="whitespace-nowrap rounded bg-slate-900/75 px-1.5 py-0.5 text-[9px] font-black text-white">{item.name}</div>
        </Html>
      )}
      {/* 클릭 히트박스 — 선택만 (드래그 X). 주방 칸 클릭 편집 중에는 칸 클릭을 가리지 않도록 끔 */}
      {!kitchen && (
        <mesh position={[0, centerY, 0]} onPointerDown={selectOnly}>
          <boxGeometry args={[footprint.widthM, boxHeight, footprint.depthM]} />
          <meshBasicMaterial transparent opacity={selected ? 0.06 : 0} depthWrite={false} color="#06b6d4" />
        </mesh>
      )}
      {selected && (
        <>
          <mesh position={[0, centerY, 0]}>
            <boxGeometry args={[footprint.widthM * 1.02, boxHeight * 1.02, footprint.depthM * 1.04]} />
            <meshBasicMaterial color="#06b6d4" wireframe transparent opacity={0.9} depthTest={false} />
          </mesh>
          {/* 이동 핸들 — 레이어 중앙. 이 동그라미를 끌어야만 움직인다 */}
          <Html position={[0, centerY, 0]} center distanceFactor={moveFactor} zIndexRange={[40, 30]}>
            <button
              type="button"
              title="드래그해서 이동"
              aria-label="드래그해서 이동"
              onPointerDown={(e) => {
                e.stopPropagation();
                startHandleDrag(e);
              }}
              onClick={(e) => e.stopPropagation()}
              className="grid h-12 w-12 cursor-grab touch-none place-items-center rounded-full bg-cyan-600 text-white shadow-xl ring-4 ring-white/90 active:cursor-grabbing"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
  onSelect,
  onMove,
  onMoveEnd,
  onResize,
  onCommitItem,
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
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, z: number) => void;
  onMoveEnd: () => void;
  onResize: (id: string, patch: Partial<FurnitureInput>, center?: { x: number; z: number }, dir?: { x: number; z: number }) => void;
  onCommitItem: (id: string, input: FurnitureInput) => void;
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
      prevSelRef.current = selectedId;
    }
  }, [selectedId, kEditor]);

  const moduleIdx = kEditor.selectedModuleIndex;
  const ki = selectedKitchen?.input;
  const dockVisible = Boolean(selectedKitchen) && moduleIdx !== null && ki != null;
  const moduleCount = kEditor.kitchenLayout?.modules.length ?? 1;
  const commitKi = (next: FurnitureInput) => { if (selectedKitchen) onCommitItem(selectedKitchen.id, next); };

  // 주방(상하부장)은 간편 모드에서도 칸을 클릭해 편집할 수 있어야 한다(유일한 편집 수단)
  const kitchenInteractive: KitchenInteractive | undefined = selectedKitchen
    ? {
        selectedModuleIndex: moduleIdx,
        selectedModulePart: partSel,
        onSelectModule: (index, part) => {
          if (kEditor.consumeLayerClickSuppression()) return;
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

  return (
    <div className="relative h-full min-h-[340px] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-white">
      <Canvas shadows dpr={[1, 2]} gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }} onPointerMissed={() => onSelect(null)}>
        <color attach="background" args={["#f8fafc"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 3]} intensity={1.7} castShadow shadow-mapSize={[1024, 1024]} />
        <hemisphereLight args={["#ffffff", "#e2e8f0", 0.3]} />
        <StudioRectLights />
        {/* 고광택(UV하이그로시) 반사용 환경 — 정면에 밝은 띠를 둬 광택 표면에 선명한 반사 줄무늬가 생기게 */}
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={3} form="rect" position={[0, 4, 7]} scale={[7, 7, 1]} />
          <Lightformer intensity={2.4} form="rect" position={[-2.6, 3, 6]} scale={[0.8, 7, 1]} />
          <Lightformer intensity={2.4} form="rect" position={[2.6, 3, 6]} scale={[0.8, 7, 1]} />
          <Lightformer intensity={1.4} form="rect" position={[0, 7, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 6, 1]} />
        </Environment>
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
            showDimensions={showDimensions}
            doorsOpen={doorsOpen}
          />
        ))}
        <ContactShadows position={[0, 0.001, centerZ]} opacity={0.2} scale={Math.max(roomW, roomD) + 2} blur={2.6} far={3} />
        <OrbitControls makeDefault enablePan={false} target={frame.target} minDistance={frame.minDistance} maxDistance={frame.maxDistance} />
      </Canvas>

      {/* 칸 편집은 3D 미리보기 안의 인라인 컨트롤로 통일 — 셀(칸)을 누르면 좌우 ＋칸추가 · 단수 · 삭제 · 상부장 추가가 그 칸에 바로 뜸 (하단 도크 제거) */}
      {selectedKitchen && moduleIdx === null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center">
          <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-black text-white shadow">칸(문짝)을 누르면 옆에 ＋ 추가·삭제 버튼이 떠요</span>
        </div>
      )}
    </div>
  );
}
