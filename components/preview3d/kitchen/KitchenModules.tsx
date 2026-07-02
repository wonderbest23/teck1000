"use client";

import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRef } from "react";
import type { Group } from "three";
import { KITCHEN_TOE_KICK_M } from "@/components/preview3d/constants";
import { lighten } from "@/components/preview3d/materials";
import { shouldShowInteriorHints } from "@/components/preview3d/modes/visibilityModes";
import type { SinkFixtureSpec } from "@/components/preview3d/kitchen/sinkFixtureSpec";
import { CARCASS_FINISH, Doors, DrainPlaceholder, Panel, SimpleCabinet, Trim } from "@/components/preview3d/primitives";
import type { DoorStyle, DoorSwing, MaterialColors, PreviewEditTarget, PreviewViewMode } from "@/components/preview3d/types";
import type { KitchenModuleType } from "@/lib/kitchen";

export function LegsAndToeKick({
  width,
  depth,
  material,
  hasToeKick,
}: {
  width: number;
  depth: number;
  material: MaterialColors;
  hasToeKick: boolean;
}) {
  const legInset = 0.06;
  const legW = 0.038;
  const footW = 0.062;
  const legH = KITCHEN_TOE_KICK_M;
  const legY = legH / 2;
  const usableWidth = Math.max(width - legInset * 2, 0.1);
  const xCount = Math.max(2, Math.ceil(usableWidth / 0.65) + 1);
  const xPositions = Array.from({ length: xCount }, (_, index) => {
    if (xCount === 1) return 0;
    return -width / 2 + legInset + (usableWidth * index) / (xCount - 1);
  });
  const zPositions = [depth / 2 - Math.min(Math.max(depth * 0.14, 0.07), 0.1), -depth / 2 + legInset];
  const legPositions: [number, number, number][] = xPositions.flatMap((x) => zPositions.map((z) => [x, legY, z] as [number, number, number]));

  return (
    <group>
      {hasToeKick && (
        <group>
          <Panel
            size={[width * 0.94, KITCHEN_TOE_KICK_M * 0.84, 0.028]}
            position={[0, KITCHEN_TOE_KICK_M * 0.42, depth / 2 - 0.048]}
            color={lighten(material.color)}
            edge={material.edge}
          />
          <Panel
            size={[0.018, KITCHEN_TOE_KICK_M * 0.78, depth * 0.22]}
            position={[-width / 2 + 0.036, KITCHEN_TOE_KICK_M * 0.39, depth / 2 - depth * 0.13]}
            color={lighten(material.color)}
            edge={material.edge}
          />
          <Panel
            size={[0.018, KITCHEN_TOE_KICK_M * 0.78, depth * 0.22]}
            position={[width / 2 - 0.036, KITCHEN_TOE_KICK_M * 0.39, depth / 2 - depth * 0.13]}
            color={lighten(material.color)}
            edge={material.edge}
          />
        </group>
      )}
      {legPositions.map(([x, y, z], index) => (
        <group key={`leg-${index}`} position={[x, y, z]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[legW / 2, legW / 2, legH, 18]} />
            <meshStandardMaterial color="#475569" roughness={0.52} metalness={0.18} />
          </mesh>
          <mesh position={[0, -legH / 2 + 0.006, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[footW / 2, footW / 2, 0.012, 20]} />
            <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.12} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function resolveDoorCount(moduleType: KitchenModuleType, doorCount: number) {
  if (moduleType === "open" || moduleType === "cooktop" || moduleType === "gas" || moduleType === "microwave" || moduleType === "oven" || moduleType === "dishwasher") {
    return 0;
  }
  if (moduleType === "drawer") return 0;
  return Math.max(1, doorCount);
}

function clampDrawerCount(value?: number) {
  return Math.min(3, Math.max(1, Math.round(value ?? 3)));
}

function AnimatedDrawerStack({
  width,
  height,
  depth,
  material,
  count,
  active,
  mode,
  showHandles = true,
}: {
  width: number;
  height: number;
  depth: number;
  material: MaterialColors;
  count: number;
  active: boolean;
  mode: "drawer" | "pullout";
  showHandles?: boolean;
}) {
  const refs = useRef<Array<Group | null>>([]);
  const safeCount = mode === "pullout" ? 2 : clampDrawerCount(count);
  const gap = 0.01;
  const frontZ = depth / 2 + 0.034;
  const faceHeight = Math.max((height - gap * (safeCount + 1)) / safeCount, 0.08);

  useFrame((_, delta) => {
    refs.current.forEach((group, index) => {
      if (!group) return;
      const stagger = safeCount <= 1 ? 1 : 1 - index * 0.16;
      const target = active ? depth * (mode === "pullout" ? 0.36 : 0.26) * Math.max(0.55, stagger) : 0;
      group.position.z += (frontZ + target - group.position.z) * Math.min(1, delta * 9);
    });
  });

  return (
    <group>
      {Array.from({ length: safeCount }).map((_, index) => {
        const y = height - gap - faceHeight / 2 - index * (faceHeight + gap);
        return (
          <group
            key={`${mode}-${index}`}
            ref={(node) => {
              refs.current[index] = node;
            }}
            position={[0, y, frontZ]}
          >
            <Panel
              size={[width * 0.9, faceHeight, 0.018]}
              position={[0, 0, 0]}
              color={material.color}
              edge={material.edge}
            />
            {showHandles && (
              <Trim
                size={[width * 0.42, 0.018, 0.026]}
                position={[0, -faceHeight * 0.24, 0.024]}
                color={material.edge}
              />
            )}
            <Trim
              size={[width * 0.82, 0.012, depth * 0.42]}
              position={[0, -faceHeight * 0.02, -depth * 0.2]}
              color={lighten(material.color)}
            />
            {[-1, 1].map((side) => (
              <Trim
                key={`rail-${side}`}
                size={[0.014, 0.014, depth * 0.46]}
                position={[side * width * 0.41, -faceHeight * 0.02, -depth * 0.2]}
                color="#94a3b8"
              />
            ))}
            {active && (
              <Trim
                size={[width * 0.82, 0.012, depth * 0.32]}
                position={[0, -faceHeight * 0.02, -depth * 0.16]}
                color={lighten(material.color)}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

function AnimatedOpenShelfCue({
  width,
  height,
  depth,
  material,
  active,
}: {
  width: number;
  height: number;
  depth: number;
  material: MaterialColors;
  active: boolean;
}) {
  const ref = useRef<Group>(null);
  const frontZ = depth / 2 + 0.02;

  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = active ? frontZ + depth * 0.1 : frontZ - 0.02;
    ref.current.position.z += (target - ref.current.position.z) * Math.min(1, delta * 8);
  });

  return (
    <group ref={ref} position={[0, height * 0.48, frontZ - 0.02]}>
      <Trim size={[width * 0.9, 0.012, 0.012]} position={[0, height * 0.15, 0]} color={lighten(material.color)} />
      <Trim size={[width * 0.9, 0.012, 0.012]} position={[0, -height * 0.15, 0]} color={lighten(material.color)} />
    </group>
  );
}

// ===== 가전/특수장 외형 (싱크·쿡탑·가스·오븐·전자레인지·식기세척기·레일장) =====
const APPLIANCE_DARK = "#222a33";
const APPLIANCE_GLASS = "#0e1722";
const APPLIANCE_METAL = "#aeb6bf";

/** 싱크장 — 카운터 위 싱크볼 (수전은 KitchenFixtures의 실제 옵션 1개만 렌더) */
function SinkBowl({ width, height, depth }: { width: number; height: number; depth: number }) {
  const topY = height + 0.012;
  const bw = Math.min(width * 0.66, 0.56);
  const bd = depth * 0.6;
  return (
    <group>
      <mesh position={[0, topY - 0.07, 0.02]}>
        <boxGeometry args={[bw, 0.14, bd]} />
        <meshStandardMaterial color="#8c97a4" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0, topY, 0.02]}>
        <boxGeometry args={[bw + 0.03, 0.014, bd + 0.03]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** 쿡탑장/가스장 — 카운터 위 상판 + 화구 (하부엔 서랍) */
function CooktopTop({ width, height, depth, gas }: { width: number; height: number; depth: number; gas: boolean }) {
  const topY = height + 0.016;
  const sw = Math.min(width * 0.84, 0.74);
  const sd = depth * 0.66;
  const pts: Array<[number, number]> = [
    [-sw * 0.23, sd * 0.2], [sw * 0.23, sd * 0.2],
    [-sw * 0.23, -sd * 0.22], [sw * 0.23, -sd * 0.22],
  ];
  return (
    <group position={[0, topY, 0.02]}>
      <mesh>
        <boxGeometry args={[sw, 0.012, sd]} />
        <meshStandardMaterial color={gas ? "#15181d" : "#0a0a0c"} metalness={0.35} roughness={0.35} />
      </mesh>
      {pts.map(([px, pz], i) => (
        <group key={i} position={[px, 0.012, pz]}>
          {gas ? (
            <>
              <mesh><cylinderGeometry args={[0.04, 0.044, 0.016, 18]} /><meshStandardMaterial color="#060606" /></mesh>
              <mesh position={[0, 0.013, 0]}><cylinderGeometry args={[0.018, 0.018, 0.012, 12]} /><meshStandardMaterial color={APPLIANCE_METAL} metalness={0.6} /></mesh>
            </>
          ) : (
            <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.05, 0.0035, 8, 28]} /><meshStandardMaterial color="#3a414e" /></mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/** 오븐장 — 유리문 + 상단 컨트롤 노브 + 손잡이 */
function OvenFront({ width, height, depth }: { width: number; height: number; depth: number }) {
  const fz = depth / 2 + 0.024;
  const w = width * 0.9;
  return (
    <group position={[0, 0, fz]}>
      <Panel size={[w, height * 0.16, 0.018]} position={[0, height * 0.9, 0]} color={APPLIANCE_DARK} edge="#11161c" />
      {[-0.32, -0.11, 0.11, 0.32].map((fx, i) => (
        <mesh key={i} position={[w * fx, height * 0.9, 0.016]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.018, 14]} />
          <meshStandardMaterial color={APPLIANCE_METAL} metalness={0.7} roughness={0.25} />
        </mesh>
      ))}
      <Panel size={[w, height * 0.62, 0.016]} position={[0, height * 0.4, 0]} color={APPLIANCE_GLASS} edge="#0c1118" />
      <Panel size={[w * 0.74, height * 0.4, 0.01]} position={[0, height * 0.36, 0.012]} color="#1a2735" edge="#0c1118" transparent opacity={0.9} />
      <Trim size={[w * 0.82, 0.022, 0.03]} position={[0, height * 0.73, 0.03]} color={APPLIANCE_METAL} />
    </group>
  );
}

/** 전자레인지장 — 상부 가전(유리문+컨트롤), 하부 도어 */
function MicrowaveFront({ width, height, depth, material }: { width: number; height: number; depth: number; material: MaterialColors }) {
  const fz = depth / 2 + 0.024;
  const w = width * 0.9;
  const yMid = height * 0.66;
  const h = height * 0.4;
  return (
    <group position={[0, 0, fz]}>
      {/* 상부 전자레인지 본체 */}
      <Panel size={[w, h, 0.018]} position={[0, yMid, 0]} color={APPLIANCE_DARK} edge="#11161c" />
      <Panel size={[w * 0.62, h * 0.82, 0.012]} position={[-w * 0.13, yMid, 0.012]} color={APPLIANCE_GLASS} edge="#0c1118" />
      <Panel size={[w * 0.24, h * 0.82, 0.012]} position={[w * 0.3, yMid, 0.012]} color="#2b3640" edge="#11161c" />
      {[0.22, 0.04, -0.14].map((fy, i) => (
        <Trim key={i} size={[w * 0.16, 0.012, 0.014]} position={[w * 0.3, yMid + h * fy, 0.02]} color="#586470" />
      ))}
      <Trim size={[0.018, h * 0.7, 0.03]} position={[w * 0.16, yMid, 0.03]} color={APPLIANCE_METAL} />
      {/* 하부 도어 */}
      <Panel size={[w, height * 0.42, 0.018]} position={[0, height * 0.22, 0]} color={material.color} edge={material.edge} />
      <Trim size={[w * 0.5, 0.02, 0.028]} position={[0, height * 0.4, 0.03]} color={material.edge} />
    </group>
  );
}

/** 식기세척기장 — 풀 전면 패널 + 상단 컨트롤 스트립 + 손잡이 홈 */
function DishwasherFront({ width, height, depth, material }: { width: number; height: number; depth: number; material: MaterialColors }) {
  const fz = depth / 2 + 0.024;
  const w = width * 0.92;
  return (
    <group position={[0, 0, fz]}>
      <Panel size={[w, height * 0.92, 0.018]} position={[0, height * 0.5, 0]} color={material.color} edge={material.edge} />
      <Trim size={[w, height * 0.05, 0.02]} position={[0, height * 0.93, 0.012]} color={APPLIANCE_DARK} />
      <Trim size={[w * 0.9, 0.016, 0.028]} position={[0, height * 0.85, 0.03]} color={APPLIANCE_METAL} />
      <Trim size={[w * 0.13, 0.02, 0.012]} position={[0, height * 0.5, 0.02]} color="#8b95a1" />
    </group>
  );
}

/** 레일장(키큰 인출장) — 단일 키큰 전면 + 열리면 와이어 바스켓이 함께 나옴 */
function PulloutLarder({ width, height, depth, material, active, showHandles }: { width: number; height: number; depth: number; material: MaterialColors; active: boolean; showHandles: boolean }) {
  const ref = useRef<Group>(null);
  const frontZ = depth / 2 + 0.03;
  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = active ? frontZ + depth * 0.52 : frontZ;
    ref.current.position.z += (target - ref.current.position.z) * Math.min(1, delta * 8);
  });
  const baskets = [0.24, 0.42, 0.6, 0.78];
  return (
    <group ref={ref} position={[0, 0, frontZ]}>
      <Panel size={[width * 0.92, height - 0.02, 0.02]} position={[0, height / 2, 0]} color={material.color} edge={material.edge} />
      {showHandles && <Trim size={[0.02, height * 0.5, 0.03]} position={[width * 0.4, height / 2, 0.03]} color={material.edge} />}
      {baskets.map((fy, i) => (
        <group key={i} position={[0, height * fy, -depth * 0.34]}>
          <Trim size={[width * 0.74, 0.05, 0.012]} position={[0, -0.025, 0.16]} color="#c7ced6" />
          <Trim size={[width * 0.74, 0.05, 0.012]} position={[0, -0.025, -0.16]} color="#c7ced6" />
          <Trim size={[width * 0.74, 0.012, 0.32]} position={[0, -0.05, 0]} color={APPLIANCE_METAL} />
        </group>
      ))}
    </group>
  );
}

function DrawerAddIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="10" height="16" rx="1.5" />
      <path d="M4 9.5h10" />
      <path d="M4 14.5h10" />
      <path d="M9 7h0.01" />
      <path d="M9 12h0.01" />
      <path d="M9 17h0.01" />
      <path d="M18.5 8v7" />
      <path d="M15 11.5h7" />
    </svg>
  );
}

function DrawerCountInlineControls({
  width,
  height,
  depth,
  count,
  onChange,
}: {
  width: number;
  height: number;
  depth: number;
  count: number;
  onChange: (drawerCount: number) => void;
}) {
  const safeCount = clampDrawerCount(count);
  const gap = 0.01;
  const faceHeight = Math.max((height - gap * (safeCount + 1)) / safeCount, 0.08);
  const x = -width / 2 - 0.08;
  const z = depth / 2 + 0.22;
  const yPositions = Array.from({ length: safeCount }, (_, index) => height - gap - faceHeight / 2 - index * (faceHeight + gap));

  return (
    <group>
      {safeCount < 3 && (
        <Html position={[x, height + 0.04, z]} center distanceFactor={1.7} zIndexRange={[34, 24]}>
          <button
            type="button"
            title="서랍 한 단 추가"
            aria-label="서랍 한 단 추가"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onChange(safeCount + 1);
            }}
            className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-white shadow-lg ring-2 ring-white/80 transition hover:scale-105"
          >
            <DrawerAddIcon />
          </button>
        </Html>
      )}
      {yPositions.map((y, index) => {
        return (
          <Html key={`drawer-remove-${index}`} position={[x, y, z]} center distanceFactor={1.7} zIndexRange={[34, 24]}>
            <button
              type="button"
              title="서랍 한 단 삭제"
              aria-label="서랍 한 단 삭제"
              disabled={safeCount <= 1}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                if (safeCount > 1) onChange(safeCount - 1);
              }}
              className="grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-[13px] font-black leading-none text-white shadow-lg ring-2 ring-white/80 disabled:opacity-35"
            >
              ×
            </button>
          </Html>
        );
      })}
    </group>
  );
}

function ShelfInlineControls({
  width,
  height,
  depth,
  count,
  onChange,
  placement = "base",
}: {
  width: number;
  height: number;
  depth: number;
  count: number;
  onChange: (shelfCount: number) => void;
  placement?: "base" | "wall";
}) {
  const safeCount = Math.min(8, Math.max(0, Math.round(count)));
  const x = -width / 2 + Math.min(Math.max(width * 0.18, 0.07), 0.14);
  const y = placement === "wall" ? height - 0.1 : 0.12;
  const z = depth / 2 + 0.18;

  return (
    <Html position={[x, y, z]} center distanceFactor={1.8} zIndexRange={[33, 23]}>
      <div
        className="flex h-8 items-center overflow-hidden rounded-full border border-white/75 bg-slate-950/88 shadow-lg backdrop-blur-md"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          title="선반 삭제"
          aria-label="선반 삭제"
          disabled={safeCount <= 0}
          onClick={(event) => {
            event.stopPropagation();
            if (safeCount > 0) onChange(safeCount - 1);
          }}
          className="grid h-8 w-8 place-items-center text-[17px] font-black leading-none text-white transition hover:bg-white/12 disabled:text-white/25 disabled:hover:bg-transparent"
        >
          -
        </button>
        <div className="h-5 w-px bg-white/20" />
        <button
          type="button"
          title="선반 추가"
          aria-label="선반 추가"
          disabled={safeCount >= 8}
          onClick={(event) => {
            event.stopPropagation();
            if (safeCount < 8) onChange(safeCount + 1);
          }}
          className="grid h-8 w-8 place-items-center text-[17px] font-black leading-none text-white transition hover:bg-white/12 disabled:text-white/25 disabled:hover:bg-transparent"
        >
          +
        </button>
      </div>
    </Html>
  );
}

export function KitchenBaseModule({
  width,
  height,
  depth,
  x,
  y,
  material,
  doorStyle,
  moduleType,
  doorCount = 2,
  drawerCount = 3,
  shelfCount = 1,
  showHandles,
  selected,
  dragging,
  selectedTarget = "module",
  interactive = true,
  hasToeKick = false,
  viewMode,
  doorSwing = "pair",
  sinkSpec,
  onPointerDown,
  onSelectTarget,
  onDrawerCountChange,
  onShelfCountChange,
  onEditStart,
  onEditEnd,
}: {
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  material: MaterialColors;
  doorStyle: DoorStyle;
  moduleType: KitchenModuleType;
  doorCount?: number;
  drawerCount?: number;
  shelfCount?: number;
  showHandles: boolean;
  selected: boolean;
  dragging: boolean;
  selectedTarget?: PreviewEditTarget;
  interactive?: boolean;
  hasToeKick?: boolean;
  viewMode: PreviewViewMode;
  doorSwing?: DoorSwing;
  sinkSpec?: SinkFixtureSpec;
  onPointerDown?: (clientX: number, clientY: number) => void;
  onSelectTarget?: (target: PreviewEditTarget) => void;
  onDrawerCountChange?: (drawerCount: number) => void;
  onShelfCountChange?: (shelfCount: number) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}) {
  const frontZ = depth / 2 + 0.03;
  const resolvedDoorCount = resolveDoorCount(moduleType, doorCount);
  const bodyOffsetY = KITCHEN_TOE_KICK_M;
  const showInterior = shouldShowInteriorHints(viewMode) || selected;
  const handleHitboxCount = Math.min(Math.max(resolvedDoorCount, 0), 2);
  const animateOpen = selected && !dragging && selectedTarget === "module";
  // 문열기 모드 — 문짝뿐 아니라 서랍·풀아웃·오픈장도 함께 열어 내부를 보여준다
  const openAll = animateOpen || viewMode === "doors_open";

  return (
    <group position={[x, y, 0]}>
      <group position={[0, bodyOffsetY, 0]}>
        <SimpleCabinet
          width={width}
          height={height}
          depth={depth}
          shelfCount={Math.max(0, shelfCount)}
          doorCount={resolvedDoorCount}
          material={material}
          doorStyle={doorStyle}
          showHandles={showHandles && moduleType !== "open"}
          viewMode={viewMode}
          showInterior={showInterior}
          doorSwing={doorSwing}
          animatedOpen={animateOpen && resolvedDoorCount > 0}
        />
        {moduleType === "drawer" && (
          <AnimatedDrawerStack width={width} height={height} depth={depth} material={material} count={drawerCount} active={openAll} mode="drawer" showHandles={showHandles} />
        )}
        {selected && selectedTarget === "module" && onShelfCountChange && !["drawer", "pullout", "microwave", "oven", "dishwasher"].includes(moduleType) && (
          <ShelfInlineControls
            width={width}
            height={height}
            depth={depth}
            count={shelfCount}
            onChange={onShelfCountChange}
            placement="base"
          />
        )}
        {moduleType === "drawer" && selected && selectedTarget === "module" && onDrawerCountChange && (
          <DrawerCountInlineControls
            width={width}
            height={height}
            depth={depth}
            count={drawerCount}
            onChange={onDrawerCountChange}
          />
        )}
        {moduleType === "pullout" && (
          <PulloutLarder width={width} height={height} depth={depth} material={material} active={openAll} showHandles={showHandles} />
        )}
        {moduleType === "open" && (
          <AnimatedOpenShelfCue width={width} height={height} depth={depth} material={material} active={openAll} />
        )}
        {/* 쿡탑·가스장: 하부 서랍 + 카운터 위 상판/화구 */}
        {(moduleType === "cooktop" || moduleType === "gas") && (
          <>
            <AnimatedDrawerStack width={width} height={height} depth={depth} material={material} count={2} active={openAll} mode="drawer" showHandles={showHandles} />
            <CooktopTop width={width} height={height} depth={depth} gas={moduleType === "gas"} />
          </>
        )}
        {moduleType === "oven" && <OvenFront width={width} height={height} depth={depth} />}
        {moduleType === "microwave" && <MicrowaveFront width={width} height={height} depth={depth} material={material} />}
        {moduleType === "dishwasher" && <DishwasherFront width={width} height={height} depth={depth} material={material} />}
        {(moduleType === "sink_base" || sinkSpec) && (
          <>
            <SinkBowl width={width} height={height} depth={depth} />
            <group position={[0, height + 0.012, 0.02]}><DrainPlaceholder status="unknown" /></group>
          </>
        )}
      </group>
      <LegsAndToeKick width={width} depth={depth} material={material} hasToeKick={hasToeKick} />
      {interactive && (
        <mesh
          position={[0, bodyOffsetY + height / 2, depth / 2 + 0.05]}
          onPointerDown={
            onPointerDown
              ? (event) => {
                  event.stopPropagation();
                  onPointerDown(event.clientX, event.clientY);
                }
              : undefined
          }
          onClick={(event) => {
            event.stopPropagation();
            onSelectTarget?.("module");
          }}
          onPointerUp={
            onPointerDown
              ? (event) => {
                  event.stopPropagation();
                  onEditEnd?.();
                }
              : undefined
          }
          onPointerCancel={
            onPointerDown
              ? (event) => {
                  event.stopPropagation();
                  onEditEnd?.();
                }
              : undefined
          }
        >
          <boxGeometry args={[Math.max(width * 0.95, 0.05), Math.max(height * 0.95, 0.08), 0.12]} />
          <meshStandardMaterial color={selected ? "#0ea5e9" : "#38bdf8"} transparent opacity={selected ? (dragging ? 0.28 : 0.16) : 0.04} />
        </mesh>
      )}
      {interactive && showHandles && resolvedDoorCount > 0 && onSelectTarget && (
        <group position={[0, bodyOffsetY + height / 2, depth / 2 + 0.13]}>
          {Array.from({ length: handleHitboxCount }).map((_, index) => {
            const side = doorSwing === "right" || (doorSwing === "pair" && index % 2 === 1) ? -1 : 1;
            const xOffset = handleHitboxCount === 1 ? width * 0.32 * side : (index === 0 ? width * 0.18 : -width * 0.18);
            return (
              <mesh
                key={`handle-hit-${index}`}
                position={[xOffset, 0, 0]}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectTarget("handle");
                }}
              >
                <boxGeometry args={[Math.max(width * 0.14, 0.06), Math.max(height * 0.36, 0.12), 0.08]} />
                <meshStandardMaterial color="#f59e0b" transparent opacity={selected && selectedTarget === "handle" ? 0.22 : 0.001} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}

export function KitchenWallModule({
  width,
  height,
  depth,
  x,
  y,
  material,
  doorStyle,
  showHandles,
  shelfCount = 1,
  hideDoor = false,
  viewMode,
  selected = false,
  dragging = false,
  selectedTarget = "module",
  interactive = false,
  doorSwing = "pair",
  onPointerDown,
  onSelectTarget,
  onShelfCountChange,
  onEditStart,
  onEditEnd,
}: {
  width: number;
  height: number;
  depth: number;
  x: number;
  y: number;
  material: MaterialColors;
  doorStyle: DoorStyle;
  showHandles: boolean;
  shelfCount?: number;
  hideDoor?: boolean;
  viewMode: PreviewViewMode;
  selected?: boolean;
  dragging?: boolean;
  selectedTarget?: PreviewEditTarget;
  interactive?: boolean;
  doorSwing?: DoorSwing;
  onPointerDown?: (clientX: number, clientY: number) => void;
  onSelectTarget?: (target: PreviewEditTarget) => void;
  onShelfCountChange?: (shelfCount: number) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}) {
  const t = 0.016;
  const innerWidth = Math.max(width - t * 2, 0.04);

  return (
    <group position={[x, y, 0]}>
      {/* 몸통 = 백색 멜라민 합판(carcass) — 문짝만 선택 소재 */}
      <Panel size={[t, height, depth]} position={[-width / 2 + t / 2, height / 2, 0]} color={CARCASS_FINISH.color} edge={CARCASS_FINISH.edge} carcass />
      <Panel size={[t, height, depth]} position={[width / 2 - t / 2, height / 2, 0]} color={CARCASS_FINISH.color} edge={CARCASS_FINISH.edge} carcass />
      <Panel size={[innerWidth, t, depth]} position={[0, height - t / 2, 0]} color={CARCASS_FINISH.color} edge={CARCASS_FINISH.edge} carcass />
      <Panel size={[innerWidth, t, depth]} position={[0, t / 2, 0]} color={CARCASS_FINISH.color} edge={CARCASS_FINISH.edge} carcass />
      <Panel size={[width, height, t * 0.55]} position={[0, height / 2, -depth / 2 + t * 0.28]} color={CARCASS_FINISH.color} edge={CARCASS_FINISH.edge} carcass />
      {Array.from({ length: Math.max(0, shelfCount) }).map((_, index) => (
        <Panel
          key={`wall-shelf-${index}`}
          size={[innerWidth, t, depth * 0.9]}
          position={[0, t + ((height - t * 2) * (index + 1)) / (Math.max(0, shelfCount) + 1), 0.01]}
          color={CARCASS_FINISH.color}
          edge={CARCASS_FINISH.edge}
          carcass
        />
      ))}
      {selected && selectedTarget === "module" && onShelfCountChange && (
        <ShelfInlineControls
          width={width}
          height={height}
          depth={depth}
          count={shelfCount}
          onChange={onShelfCountChange}
          placement="wall"
        />
      )}
      {!hideDoor && (
        <Doors
          count={doorSwing === "pair" || doorSwing === "up_pair" ? 2 : 1}
          width={width}
          height={height}
          depth={depth}
          thickness={t}
          material={material}
          doorStyle={doorStyle}
          showHandles={showHandles}
          viewMode={viewMode}
          doorSwing={doorSwing}
          animatedOpen={selected && !dragging && selectedTarget === "module"}
        />
      )}
      {interactive && (onPointerDown || onSelectTarget) && (
        <mesh
          position={[0, height / 2, depth / 2 + 0.05]}
          onPointerDown={
            onPointerDown
              ? (event) => {
                  event.stopPropagation();
                  onPointerDown(event.clientX, event.clientY);
                }
              : undefined
          }
          onClick={(event) => {
            event.stopPropagation();
            onSelectTarget?.("module");
          }}
          onPointerUp={
            onPointerDown
              ? (event) => {
                  event.stopPropagation();
                  onEditEnd?.();
                }
              : undefined
          }
          onPointerCancel={
            onPointerDown
              ? (event) => {
                  event.stopPropagation();
                  onEditEnd?.();
                }
              : undefined
          }
        >
          <boxGeometry args={[Math.max(width * 0.95, 0.05), Math.max(height * 0.95, 0.08), 0.12]} />
          <meshStandardMaterial color={selected ? "#0ea5e9" : "#38bdf8"} transparent opacity={selected ? (dragging ? 0.28 : 0.16) : 0.04} />
        </mesh>
      )}
      {interactive && showHandles && onSelectTarget && (
        <mesh
          position={[0, height * 0.12, depth / 2 + 0.13]}
          onClick={(event) => {
            event.stopPropagation();
            onSelectTarget("handle");
          }}
        >
          <boxGeometry args={[Math.max(width * 0.42, 0.1), Math.max(height * 0.16, 0.08), 0.08]} />
          <meshStandardMaterial color="#f59e0b" transparent opacity={selected && selectedTarget === "handle" ? 0.22 : 0.001} />
        </mesh>
      )}
    </group>
  );
}
