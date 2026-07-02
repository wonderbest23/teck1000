"use client";

import { useEffect, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import {
  KITCHEN_COUNTERTOP_M,
  KITCHEN_TOE_KICK_M,
  KITCHEN_WALL_BOTTOM_M,
} from "@/components/preview3d/constants";
import { KitchenBaseModule, KitchenWallModule } from "@/components/preview3d/kitchen/KitchenModules";
import {
  getModuleCenterX,
  getKitchenSceneFrameScale,
  getXFromRatio,
} from "@/components/preview3d/kitchen/moduleLayout";
import { getSinkFixtureSpec } from "@/components/preview3d/kitchen/sinkFixtureSpec";
import { Panel, Trim } from "@/components/preview3d/primitives";
import { getMaterialPreset, materialPresets } from "@/components/preview3d/materials";
import type { DoorSwing, KitchenModulePart, MaterialColors, PreviewRendererProps } from "@/components/preview3d/types";
import {
  clampModuleIndex,
  getCooktopOption,
  getCountertopOption,
  getFaucetOption,
  getHoodOption,
  getHoodSpec,
  getKitchenSetDimensions,
  getKitchenTemplate,
  getMicrowaveOption,
  getSinkOption,
  hasToeKickEnabled,
  isLShapeKitchen,
  normalizeKitchenModules,
  normalizeKitchenLayerWidths,
  normalizeKitchenSideModules,
  type KitchenModuleType,
} from "@/lib/kitchen";
import {
  CooktopFixture,
  CountertopTrim,
  CountertopWithCutout,
  FaucetFixture,
  HoodFixture,
  MicrowaveFixture,
  SinkFixture,
} from "./KitchenFixtures";

function AddModuleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="9" height="14" rx="1.5" />
      <path d="M8 5v14" />
      <path d="M17.5 8v8" />
      <path d="M13.5 12h8" />
    </svg>
  );
}

function RemoveModuleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="11" height="14" rx="1.5" />
      <path d="M9.5 5v14" />
      <path d="M17 9l4 4" />
      <path d="M21 9l-4 4" />
    </svg>
  );
}

function LayerQuickActions({
  x,
  y,
  z,
  part,
  canRemove,
  onAdd,
  onRemove,
}: {
  x: number;
  y: number;
  z: number;
  part: KitchenModulePart;
  canRemove: boolean;
  onAdd?: (part: KitchenModulePart) => void;
  onRemove?: (part: KitchenModulePart) => void;
}) {
  if (!onAdd && !onRemove) return null;

  return (
    <Html position={[x, y, z]} center distanceFactor={1.8} zIndexRange={[36, 26]}>
      <div
        className="flex flex-col items-center gap-1 rounded-full border border-white/75 bg-white/90 p-1 shadow-xl backdrop-blur-md"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {onAdd && (
          <button
            type="button"
            title="오른쪽에 칸 추가"
            aria-label="오른쪽에 칸 추가"
            onClick={(event) => {
              event.stopPropagation();
              onAdd(part);
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-white shadow-sm ring-2 ring-white/80 transition hover:scale-105"
          >
            <AddModuleIcon />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            title="선택 칸 삭제"
            aria-label="선택 칸 삭제"
            disabled={!canRemove}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(part);
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-rose-50 text-rose-700 shadow-sm ring-2 ring-white/80 transition hover:scale-105 disabled:opacity-35 disabled:hover:scale-100"
          >
            <RemoveModuleIcon />
          </button>
        )}
      </div>
    </Html>
  );
}

function ChangeFeedback({
  type,
  x,
  y,
  z,
  width,
}: {
  type: "added" | "removed";
  x: number;
  y: number;
  z: number;
  width: number;
}) {
  const added = type === "added";

  return (
    <group>
      {added && (
        <mesh position={[x, y - 0.02, z - 0.04]}>
          <boxGeometry args={[Math.max(width * 0.92, 0.16), 0.5, 0.035]} />
          <meshStandardMaterial color="#22c55e" transparent opacity={0.2} depthWrite={false} />
        </mesh>
      )}
      <Html position={[x, y + 0.32, z + 0.04]} center distanceFactor={1.9} zIndexRange={[30, 20]}>
        <div className={`rounded-md px-2.5 py-1 text-[11px] font-black text-white shadow-lg ${added ? "bg-emerald-600" : "bg-slate-800"}`}>
          {added ? "추가됨" : "삭제됨"}
        </div>
      </Html>
    </group>
  );
}

function ContinuousToeKick({
  width,
  depth,
  material,
}: {
  width: number;
  depth: number;
  material: MaterialColors;
}) {
  const frontZ = depth / 2 - 0.048;
  const sideDepth = Math.min(Math.max(depth * 0.24, 0.12), 0.18);
  const color = material.color;

  return (
    <group>
      <Panel
        size={[Math.max(width * 0.96, 0.1), KITCHEN_TOE_KICK_M * 0.84, 0.03]}
        position={[0, KITCHEN_TOE_KICK_M * 0.42, frontZ]}
        color={color}
        edge={material.edge}
      />
      <Panel
        size={[0.02, KITCHEN_TOE_KICK_M * 0.78, sideDepth]}
        position={[-width / 2 + 0.035, KITCHEN_TOE_KICK_M * 0.39, depth / 2 - sideDepth / 2 - 0.055]}
        color={color}
        edge={material.edge}
      />
      <Panel
        size={[0.02, KITCHEN_TOE_KICK_M * 0.78, sideDepth]}
        position={[width / 2 - 0.035, KITCHEN_TOE_KICK_M * 0.39, depth / 2 - sideDepth / 2 - 0.055]}
        color={color}
        edge={material.edge}
      />
    </group>
  );
}

function SizeBadge({
  x,
  y,
  z,
  label,
  widthMm,
  heightMm,
  depthMm,
  onWidthChange,
  onHeightChange,
  onDepthChange,
  onClose,
  swing,
  onSwing,
  hasHandle,
  onHandle,
  part,
  moduleType,
  shelfCount,
  drawerCount,
  onShelfCount,
  onDrawerCount,
  onAdd,
  onRemove,
  canRemove,
}: {
  x: number;
  y: number;
  z: number;
  label: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  onWidthChange?: (widthMm: number) => void;
  onHeightChange?: (heightMm: number) => void;
  onDepthChange?: (depthMm: number) => void;
  onClose?: () => void;
  /** 문 방향 토글 (도어 칸일 때만 제공) */
  swing?: DoorSwing;
  onSwing?: (swing: DoorSwing) => void;
  /** 손잡이 있음/없음 (무손잡이=아래로 잡아 여는 형태) */
  hasHandle?: boolean;
  onHandle?: (hasHandle: boolean) => void;
  /** 선반/서랍 단수 + 칸 추가/삭제를 한 박스로 통합 (떠다니는 오버레이 충돌 방지) */
  part?: KitchenModulePart;
  moduleType?: string;
  shelfCount?: number;
  drawerCount?: number;
  onShelfCount?: (count: number) => void;
  onDrawerCount?: (count: number) => void;
  onAdd?: (part: KitchenModulePart) => void;
  onRemove?: (part: KitchenModulePart) => void;
  canRemove?: boolean;
}) {
  const showDrawer = part === "base" && moduleType === "drawer" && Boolean(onDrawerCount);
  const showShelf = !showDrawer && Boolean(onShelfCount) && (part === "wall" || !["drawer", "pullout", "microwave", "oven", "dishwasher"].includes(moduleType ?? "door"));
  const showHandle = Boolean(onHandle) && (part === "wall" || moduleType !== "open");
  const stepCount = showDrawer ? Math.round(drawerCount ?? 1) : Math.round(shelfCount ?? 1);
  const stepMin = showDrawer ? 1 : 0;
  const stepMax = showDrawer ? 3 : 8;
  const applyStep = (next: number) => {
    const clamped = Math.min(stepMax, Math.max(stepMin, next));
    if (showDrawer) onDrawerCount?.(clamped);
    else onShelfCount?.(clamped);
  };
  const [draftWidth, setDraftWidth] = useState(String(widthMm));
  const [draftHeight, setDraftHeight] = useState(String(heightMm));
  const [draftDepth, setDraftDepth] = useState(String(depthMm));

  useEffect(() => {
    setDraftWidth(String(widthMm));
  }, [widthMm]);

  useEffect(() => {
    setDraftHeight(String(heightMm));
  }, [heightMm]);

  useEffect(() => {
    setDraftDepth(String(depthMm));
  }, [depthMm]);

  function commit(nextDraft: string, fallback: number, onChange?: (valueMm: number) => void, syncDraft?: (value: string) => void) {
    const parsed = Number(nextDraft);
    if (!Number.isFinite(parsed)) {
      syncDraft?.(String(fallback));
      return;
    }
    const nextValue = Math.round(parsed);
    syncDraft?.(String(nextValue));
    onChange?.(nextValue);
  }

  return (
    <Html position={[x, y, z]} center distanceFactor={1.9} zIndexRange={[28, 18]}>
      <div
        className="relative rounded-md border border-white/70 bg-slate-950/84 px-2 py-1 pr-7 text-white shadow-lg backdrop-blur-md"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        {onClose && (
          <button
            type="button"
            title="사이즈 숨기기"
            aria-label="사이즈 숨기기"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded bg-white/12 text-[13px] font-black leading-none text-white/80 hover:bg-white/24 hover:text-white"
          >
            ×
          </button>
        )}
        <div className="mb-0.5 text-center text-[9px] font-black text-white/72">가로 개별 · 높이/깊이 {label}전체</div>
        <div className="flex items-center gap-1 text-[11px] font-black">
          <input
            type="number"
            min={150}
            max={1000}
            step={50}
            value={draftWidth}
            inputMode="numeric"
            aria-label="선택 레이어 가로"
            onChange={(event) => setDraftWidth(event.target.value)}
            onBlur={() => commit(draftWidth, widthMm, onWidthChange, setDraftWidth)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="h-7 w-14 rounded bg-white/95 px-1 text-right text-[12px] font-black text-slate-950 outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <span>x</span>
          <input
            type="number"
            min={300}
            max={1200}
            step={10}
            value={draftHeight}
            inputMode="numeric"
            aria-label={`${label} 전체 높이`}
            onChange={(event) => setDraftHeight(event.target.value)}
            onBlur={() => commit(draftHeight, heightMm, onHeightChange, setDraftHeight)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="h-7 w-14 rounded bg-white/95 px-1 text-right text-[12px] font-black text-slate-950 outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <span>x</span>
          <input
            type="number"
            min={250}
            max={800}
            step={10}
            value={draftDepth}
            inputMode="numeric"
            aria-label={`${label} 전체 깊이`}
            onChange={(event) => setDraftDepth(event.target.value)}
            onBlur={() => commit(draftDepth, depthMm, onDepthChange, setDraftDepth)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="h-7 w-12 rounded bg-white/95 px-1 text-right text-[12px] font-black text-slate-950 outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <span>mm</span>
        </div>
        {onSwing && (
          <div className="mt-1 flex items-center justify-center gap-1">
            <span className="mr-0.5 text-[9px] font-black text-white/60">문</span>
            {([{ id: "pair", label: "2짝" }, { id: "left", label: "좌개" }, { id: "right", label: "우개" }] as const).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={(event) => { event.stopPropagation(); onSwing(o.id); }}
                className={`rounded px-2 py-1 text-[10px] font-black ${swing === o.id ? "bg-emerald-400 text-slate-950" : "bg-white/15 text-white/80 hover:bg-white/25"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
        {showHandle && (
          <div className="mt-1 flex items-center justify-center gap-1">
            <span className="mr-0.5 text-[9px] font-black text-white/60">손잡이</span>
            <button type="button" onClick={(event) => { event.stopPropagation(); onHandle?.(true); }} className={`rounded px-2 py-1 text-[10px] font-black ${hasHandle ? "bg-emerald-400 text-slate-950" : "bg-white/15 text-white/80 hover:bg-white/25"}`}>있음</button>
            <button type="button" onClick={(event) => { event.stopPropagation(); onHandle?.(false); }} className={`rounded px-2 py-1 text-[10px] font-black ${!hasHandle ? "bg-emerald-400 text-slate-950" : "bg-white/15 text-white/80 hover:bg-white/25"}`}>없음</button>
          </div>
        )}
        {(showShelf || showDrawer) && (
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <span className="text-[9px] font-black text-white/60">{showDrawer ? "서랍" : "선반"}</span>
            <button type="button" aria-label="단 줄이기" disabled={stepCount <= stepMin} onClick={(event) => { event.stopPropagation(); applyStep(stepCount - 1); }} className="grid h-6 w-6 place-items-center rounded bg-white/15 text-[14px] font-black leading-none text-white hover:bg-white/25 disabled:opacity-30">−</button>
            <span className="w-6 text-center text-[12px] font-black text-white">{stepCount}</span>
            <button type="button" aria-label="단 늘리기" disabled={stepCount >= stepMax} onClick={(event) => { event.stopPropagation(); applyStep(stepCount + 1); }} className="grid h-6 w-6 place-items-center rounded bg-white/15 text-[14px] font-black leading-none text-white hover:bg-white/25 disabled:opacity-30">＋</button>
          </div>
        )}
        {(onAdd || onRemove) && part && (
          <div className="mt-1.5 flex items-center justify-center gap-1.5 border-t border-white/15 pt-1.5">
            {onAdd && (
              <button type="button" onClick={(event) => { event.stopPropagation(); onAdd(part); }} className="rounded-md bg-emerald-400 px-2.5 py-1 text-[10px] font-black text-slate-950 hover:bg-emerald-300">+ 칸 추가</button>
            )}
            {onRemove && (
              <button type="button" disabled={!canRemove} onClick={(event) => { event.stopPropagation(); onRemove(part); }} className="rounded-md bg-rose-500/90 px-2.5 py-1 text-[10px] font-black text-white hover:bg-rose-400 disabled:opacity-35">− 삭제</button>
            )}
          </div>
        )}
      </div>
    </Html>
  );
}

function DimensionRuler({
  label,
  widthMm,
  y,
  z,
  labelSide,
  onAutoAlign,
}: {
  label: string;
  widthMm: number;
  y: number;
  z: number;
  labelSide: "top" | "bottom";
  onAutoAlign?: () => void;
}) {
  const widthM = Math.max(widthMm / 1000, 0.2);
  const segmentCount = Math.max(6, Math.floor(widthM / 0.12));
  const segmentPitch = widthM / segmentCount;
  const segmentWidth = Math.max(segmentPitch * 0.55, 0.035);
  const tickHeight = 0.18;
  const labelY = y + (labelSide === "top" ? 0.12 : -0.12);

  return (
    <group>
      {Array.from({ length: segmentCount }).map((_, index) => {
        const x = -widthM / 2 + segmentPitch * (index + 0.5);
        return (
          <mesh key={`${label}-dash-${index}`} position={[x, y, z]}>
            <boxGeometry args={[segmentWidth, 0.012, 0.012]} />
            <meshStandardMaterial color="#0f172a" transparent opacity={0.55} depthWrite={false} />
          </mesh>
        );
      })}
      {[-widthM / 2, widthM / 2].map((x, index) => (
        <mesh key={`${label}-tick-${index}`} position={[x, y, z]}>
          <boxGeometry args={[0.014, tickHeight, 0.014]} />
          <meshStandardMaterial color="#0f172a" transparent opacity={0.62} depthWrite={false} />
        </mesh>
      ))}
      <Html position={[0, labelY, z]} center distanceFactor={2.1} zIndexRange={[24, 14]}>
        <div
          className="flex items-center gap-1 rounded-md border border-white/70 bg-white/86 px-2 py-1 text-[11px] font-black text-slate-900 shadow-md backdrop-blur-md"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <span>{label} {widthMm}mm</span>
          {onAutoAlign && (
            <button
              type="button"
              title={`${label} 기준 자동정렬`}
              aria-label={`${label} 기준 자동정렬`}
              onClick={onAutoAlign}
              className="grid h-5 w-5 place-items-center rounded bg-slate-950 text-white"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5.5h12" />
                <path d="M4 14.5h12" />
                <path d="M7 8.5 4 5.5l3-3" />
                <path d="M13 11.5l3 3-3 3" />
              </svg>
            </button>
          )}
        </div>
      </Html>
    </group>
  );
}

function EmptyPartSlot({
  label,
  x,
  y,
  z,
  width,
  height,
  depth,
  onRestore,
}: {
  label: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  onRestore?: () => void;
}) {
  if (!onRestore) return null;

  return (
    <group>
      <mesh position={[x, y, z - 0.02]}>
        <boxGeometry args={[Math.max(width * 0.9, 0.18), Math.max(height * 0.82, 0.18), Math.max(depth * 0.12, 0.03)]} />
        <meshStandardMaterial color="#0ea5e9" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <Html position={[x, y, z + 0.08]} center distanceFactor={1.9} zIndexRange={[25, 15]}>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onRestore();
          }}
          className="rounded-md border border-white/70 bg-white/88 px-2.5 py-1.5 text-[11px] font-black text-slate-800 shadow-lg backdrop-blur-md"
        >
          + {label}
        </button>
      </Html>
    </group>
  );
}

function WallLengthMarker({ leftX, rightX, y, z, mm }: { leftX: number; rightX: number; y: number; z: number; mm: number }) {
  const lengthM = Math.max(rightX - leftX, 0.05);
  const midX = (leftX + rightX) / 2;
  return (
    <group>
      <mesh position={[midX, y, z]}>
        <boxGeometry args={[lengthM, 0.014, 0.014]} />
        <meshStandardMaterial color="#ea580c" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      {[leftX, rightX].map((x, index) => (
        <mesh key={`wall-tick-${index}`} position={[x, y + 0.08, z]}>
          <boxGeometry args={[0.016, 0.18, 0.016]} />
          <meshStandardMaterial color="#ea580c" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      ))}
      <Html position={[midX, y, z + 0.06]} center distanceFactor={2.1} zIndexRange={[24, 14]}>
        <div className="rounded-md border border-orange-200 bg-orange-50/90 px-2 py-1 text-[11px] font-black text-orange-700 shadow-sm backdrop-blur-md">
          설치벽 {mm}mm
        </div>
      </Html>
    </group>
  );
}

function WaterPositionMarker({ x, y0, y1, z, mm }: { x: number; y0: number; y1: number; z: number; mm: number }) {
  const midY = (y0 + y1) / 2;
  return (
    <group>
      <mesh position={[x, midY, z]}>
        <boxGeometry args={[0.014, Math.max(y1 - y0, 0.05), 0.014]} />
        <meshStandardMaterial color="#0891b2" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh position={[x, y1, z]}>
        <sphereGeometry args={[0.022, 16, 16]} />
        <meshStandardMaterial color="#0891b2" />
      </mesh>
      <Html position={[x, y1 + 0.09, z]} center distanceFactor={2} zIndexRange={[25, 15]}>
        <div className="flex items-center gap-1 rounded-md border border-cyan-200 bg-cyan-50/90 px-2 py-1 text-[11px] font-black text-cyan-700 shadow-sm backdrop-blur-md">
          <span aria-hidden>💧</span>수전 {mm}mm
        </div>
      </Html>
    </group>
  );
}

/** 세로 높이 치수 (좌측). 불투명 색상 라벨로 다른 마커와 안 겹치게. */
function HeightMarker({ x, y0, y1, z, label, mm, color }: { x: number; y0: number; y1: number; z: number; label: string; mm: number; color: string }) {
  const midY = (y0 + y1) / 2;
  return (
    <group>
      <mesh position={[x, midY, z]}>
        <boxGeometry args={[0.014, Math.max(y1 - y0, 0.05), 0.014]} />
        <meshStandardMaterial color={color} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      {[y0, y1].map((y, index) => (
        <mesh key={`htick-${index}`} position={[x, y, z]}>
          <boxGeometry args={[0.11, 0.014, 0.014]} />
          <meshStandardMaterial color={color} transparent opacity={0.95} depthWrite={false} />
        </mesh>
      ))}
      <Html position={[x - 0.04, midY, z]} center distanceFactor={2.1} zIndexRange={[27, 17]}>
        <div className="whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-black text-white shadow-md" style={{ backgroundColor: color }}>
          {label} {mm}
        </div>
      </Html>
    </group>
  );
}

/** 깊이 치수 (우측, Z 방향). 불투명 색상 라벨. */
function DepthMarker({ x, y, z0, z1, label, mm, color }: { x: number; y: number; z0: number; z1: number; label: string; mm: number; color: string }) {
  const midZ = (z0 + z1) / 2;
  return (
    <group>
      <mesh position={[x, y, midZ]}>
        <boxGeometry args={[0.014, 0.014, Math.max(z1 - z0, 0.05)]} />
        <meshStandardMaterial color={color} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      {[z0, z1].map((z, index) => (
        <mesh key={`dtick-${index}`} position={[x, y, z]}>
          <boxGeometry args={[0.11, 0.014, 0.014]} />
          <meshStandardMaterial color={color} transparent opacity={0.95} depthWrite={false} />
        </mesh>
      ))}
      <Html position={[x + 0.04, y, midZ]} center distanceFactor={2.1} zIndexRange={[27, 17]}>
        <div className="whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-black text-white shadow-md" style={{ backgroundColor: color }}>
          {label} {mm}
        </div>
      </Html>
    </group>
  );
}

function MoveIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 12h18" />
      <path d="M12 3l-2.4 2.4M12 3l2.4 2.4" />
      <path d="M12 21l-2.4-2.4M12 21l2.4-2.4" />
      <path d="M3 12l2.4-2.4M3 12l2.4 2.4" />
      <path d="M21 12l-2.4-2.4M21 12l2.4 2.4" />
    </svg>
  );
}

/** 선택된 칸을 감싸는 밝은 외곽선 — 어떤 칸을 눌렀는지 확실히 보이게 */
function SelectionOutline({ x, y, width, height, depth }: { x: number; y: number; width: number; height: number; depth: number }) {
  return (
    <group position={[x, y, 0]}>
      <mesh>
        <boxGeometry args={[width * 1.03, height * 1.03, depth * 1.06]} />
        <meshBasicMaterial color="#06b6d4" wireframe transparent opacity={0.95} depthTest={false} />
      </mesh>
      <mesh>
        <boxGeometry args={[width * 1.02, height * 1.02, depth * 1.04]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.14} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** 위아래로 드래그하면 일정 간격(50mm)마다 딱딱 높이가 바뀌는 그립(상부장용) */
function VerticalDragGrip({ onStepUp, onStepDown }: { onStepUp: () => void; onStepDown: () => void }) {
  const stateRef = useRef<{ y: number; applied: number } | null>(null);
  const upRef = useRef(onStepUp);
  const downRef = useRef(onStepDown);
  upRef.current = onStepUp;
  downRef.current = onStepDown;
  const [active, setActive] = useState(false);

  useEffect(() => {
    const PX_PER_STEP = 14; // 14px 끌 때마다 한 칸(50mm)
    function move(event: PointerEvent) {
      const s = stateRef.current;
      if (!s) return;
      const target = Math.round((s.y - event.clientY) / PX_PER_STEP); // 위로 끌면 +
      while (s.applied < target) {
        upRef.current();
        s.applied += 1;
      }
      while (s.applied > target) {
        downRef.current();
        s.applied -= 1;
      }
    }
    function up() {
      if (stateRef.current) {
        stateRef.current = null;
        setActive(false);
      }
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <button
      type="button"
      title="위아래로 드래그해서 높이 조절"
      aria-label="위아래로 드래그해서 높이 조절"
      onPointerDown={(event) => {
        event.stopPropagation();
        stateRef.current = { y: event.clientY, applied: 0 };
        setActive(true);
      }}
      onClick={(event) => event.stopPropagation()}
      className={`grid h-10 w-10 cursor-ns-resize touch-none place-items-center rounded-full text-white shadow-lg ring-2 ring-white/90 transition ${active ? "scale-110 bg-slate-700" : "bg-slate-900 hover:scale-105"}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" /></svg>
    </button>
  );
}

/** IKEA식 이동 핸들 — 동그라미를 드래그하면 칸이 좌우로 이동(놓으면 칸에 스냅).
 *  상부장이면 ↕ 그립을 위아래로 드래그해 설치 높이도 조절. */
function MoveHandle({ x, y, z, dragging, onStart, onUp, onDown }: { x: number; y: number; z: number; dragging: boolean; onStart: (clientX: number, clientY: number) => void; onUp?: () => void; onDown?: () => void }) {
  const vertical = Boolean(onUp && onDown);
  return (
    <Html position={[x, y, z]} center distanceFactor={1.7} zIndexRange={[42, 32]}>
      <div className="flex items-center gap-1.5" onPointerDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          title="드래그해서 칸 이동"
          aria-label="드래그해서 칸 이동"
          onPointerDown={(event) => {
            event.stopPropagation();
            onStart(event.clientX, event.clientY);
          }}
          onClick={(event) => event.stopPropagation()}
          className={`grid h-12 w-12 place-items-center rounded-full text-white shadow-xl ring-4 ring-white/90 transition ${dragging ? "scale-110 cursor-grabbing bg-cyan-500" : "cursor-grab bg-cyan-600 hover:scale-105"}`}
        >
          <MoveIcon />
        </button>
        {vertical && <VerticalDragGrip onStepUp={onUp!} onStepDown={onDown!} />}
      </div>
    </Html>
  );
}

/**
 * 주방이 놓이는 방(뒷벽 + 양 옆벽 + 바닥). IKEA 플래너처럼 코너 공간감을 준다.
 * 단면(FrontSide) 평면이라 카메라가 뒤로 돌면 앞을 가리는 벽은 자동으로 사라진다(백페이스 컬링).
 */
function KitchenRoom({
  mainWidthM,
  baseDepthM,
  sideLenM,
  isL,
  corner,
  upperTopY,
}: {
  mainWidthM: number;
  baseDepthM: number;
  sideLenM: number;
  isL: boolean;
  corner: "left" | "right";
  upperTopY: number;
}) {
  // 일반 가정집 기준 — 천장 2.5m 이상(상부장 위 여유), 옆·앞으로 넓은 방
  const ceilingY = Math.max(2.5, upperTopY + 0.45);
  const SIDE = 1.4; // 주방이 없는 쪽으로 벌어지는 방 폭
  const FRONT_WALK = 2.6; // 카운터 앞 보행/식탁 공간
  const FLUSH = 0.03; // 캐비닛에 바짝 (z-파이팅 회피)

  // 주방은 코너(뒷벽 + 한쪽 옆벽)에 붙이고, 반대쪽·앞쪽으로 방을 넓힌다
  const leftX = isL && corner === "left" ? -mainWidthM / 2 - FLUSH : -mainWidthM / 2 - SIDE;
  const rightX = isL && corner === "right" ? mainWidthM / 2 + FLUSH : mainWidthM / 2 + SIDE;
  const backZ = -baseDepthM / 2 - FLUSH;
  const frontZ = baseDepthM / 2 + (isL ? sideLenM : 0) + FRONT_WALK;

  const roomW = rightX - leftX;
  const centerX = (leftX + rightX) / 2;
  const floorDepth = frontZ - backZ;
  const centerZ = (backZ + frontZ) / 2;
  const wallColor = "#eceff4";
  const floorColor = "#e6dac4";
  const skirtColor = "#d9d2c4";

  return (
    <group>
      {/* 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, -0.004, centerZ]} receiveShadow>
        <planeGeometry args={[roomW, floorDepth]} />
        <meshStandardMaterial color={floorColor} roughness={0.95} />
      </mesh>
      {/* 뒷벽 (정면 +z) */}
      <mesh position={[centerX, ceilingY / 2, backZ]}>
        <planeGeometry args={[roomW, ceilingY]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>
      <mesh position={[centerX, 0.04, backZ + 0.006]}>
        <planeGeometry args={[roomW, 0.08]} />
        <meshStandardMaterial color={skirtColor} roughness={1} />
      </mesh>
      {/* 왼쪽 벽 (법선 +x → 안쪽) */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[leftX, ceilingY / 2, centerZ]}>
        <planeGeometry args={[floorDepth, ceilingY]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>
      {/* 오른쪽 벽 (법선 -x → 안쪽) */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[rightX, ceilingY / 2, centerZ]}>
        <planeGeometry args={[floorDepth, ceilingY]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>
    </group>
  );
}

/**
 * ㄱ자 주방의 측면(꺾인) 다리. 메인 런과 90° 직각으로 코너에 붙어 안쪽(앞쪽)으로 뻗는다.
 * v1: 표시 + 치수 반영 전용(드래그/개별선택은 메인 런에서만). 코너 칸은 메인 런 마지막 칸이 담당.
 */
function KitchenLShapeLeg({
  modules,
  moduleTypes,
  mainWidthM,
  baseDepthM,
  wallDepthM,
  baseHeightM,
  wallHeightM,
  baseHeightMm,
  baseDepthMm,
  material,
  doorStyle,
  viewMode,
  corner,
  hasWall,
  showHandles,
  selectedIndex = null,
  onSelect,
  onAdd,
  onRemove,
  onWidthChange,
}: {
  modules: number[];
  moduleTypes: KitchenModuleType[];
  mainWidthM: number;
  baseDepthM: number;
  wallDepthM: number;
  baseHeightM: number;
  wallHeightM: number;
  baseHeightMm: number;
  baseDepthMm: number;
  material: MaterialColors;
  doorStyle: PreviewRendererProps["doorStyle"];
  viewMode: PreviewRendererProps["viewMode"];
  corner: "left" | "right";
  hasWall: boolean;
  showHandles: boolean;
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
  onAdd?: () => void;
  onRemove?: () => void;
  onWidthChange?: (widthMm: number) => void;
}) {
  if (!modules.length) return null;
  const dir = corner === "left" ? -1 : 1;
  const rotationY = corner === "left" ? Math.PI / 2 : -Math.PI / 2;
  const baseOriginX = dir * (mainWidthM / 2 - baseDepthM / 2);
  const wallOriginX = dir * (mainWidthM / 2 - wallDepthM / 2);
  const originZ = baseDepthM / 2;
  const interactive = Boolean(onSelect);

  let acc = 0;
  const centers = modules.map((widthMm) => {
    const widthM = widthMm / 1000;
    const center = (acc + widthM / 2) * dir;
    acc += widthM;
    return { center, widthM };
  });

  const sel = selectedIndex !== null && selectedIndex >= 0 && selectedIndex < centers.length ? centers[selectedIndex] : null;

  return (
    <group>
      <group position={[baseOriginX, 0, originZ]} rotation={[0, rotationY, 0]}>
        {centers.map((c, index) => (
          <KitchenBaseModule
            key={`side-base-${index}-${c.widthM}`}
            width={c.widthM}
            height={baseHeightM}
            depth={baseDepthM}
            x={c.center}
            y={0}
            material={material}
            doorStyle={doorStyle}
            moduleType={(moduleTypes[index] ?? "door") as KitchenModuleType}
            drawerCount={3}
            shelfCount={1}
            showHandles={false}
            selected={selectedIndex === index}
            dragging={false}
            interactive={interactive}
            hasToeKick={false}
            viewMode={viewMode}
            doorSwing="pair"
            onSelectTarget={interactive ? () => onSelect?.(index) : undefined}
          />
        ))}
        {sel && (
          <>
            <SizeBadge
              x={sel.center}
              y={KITCHEN_TOE_KICK_M + baseHeightM + 0.14}
              z={baseDepthM / 2 + 0.18}
              label="측면"
              widthMm={Math.round(modules[selectedIndex as number])}
              heightMm={baseHeightMm}
              depthMm={baseDepthMm}
              onWidthChange={onWidthChange}
            />
            <LayerQuickActions
              x={sel.center + dir * (sel.widthM / 2 + 0.18)}
              y={KITCHEN_TOE_KICK_M + baseHeightM * 0.52}
              z={baseDepthM / 2 + 0.3}
              part="base"
              canRemove={modules.length > 1}
              onAdd={onAdd ? () => onAdd() : undefined}
              onRemove={onRemove ? () => onRemove() : undefined}
            />
          </>
        )}
      </group>
      {hasWall && (
        <group position={[wallOriginX, 0, originZ]} rotation={[0, rotationY, 0]}>
          {centers.map((c, index) => (
            <KitchenWallModule
              key={`side-wall-${index}-${c.widthM}`}
              width={c.widthM}
              height={wallHeightM}
              depth={wallDepthM}
              x={c.center}
              y={KITCHEN_WALL_BOTTOM_M}
              material={material}
              doorStyle={doorStyle}
              showHandles={showHandles}
              shelfCount={1}
              hideDoor={false}
              viewMode={viewMode}
              selected={false}
              dragging={false}
              interactive={false}
              doorSwing="pair"
            />
          ))}
        </group>
      )}
    </group>
  );
}

export function KitchenFullSetRenderer(props: PreviewRendererProps) {
  const {
    input,
    doorStyle,
    frontView,
    viewMode,
    selectedModuleIndex,
    selectedModulePart = "base",
    selectedEditTarget = "module",
    selectedFixture,
    sizeBadgeHidden,
    activeDragTarget,
    dragRatio,
    feedback,
    onSelectModule,
    onDoubleClickModule,
    onSelectFixture,
    onPrepareDragModule,
    onPrepareDragItem,
    onStartDragItem,
    onAddModule,
    onRemoveModule,
    onModuleWidthChange,
    onModuleHeightChange,
    onModuleDepthChange,
    onDrawerCountChange,
    onShelfCountChange,
    onDoorSwingChange,
    onHandleChange,
    onHideSizeBadge,
    onSyncAllWidths,
    onRestoreModulePart,
    onWallVerticalMove,
    selectedSideIndex = null,
    onSelectSideModule,
    onAddSideModule,
    onRemoveSideModule,
    onSideModuleWidthChange,
    onEditStart,
    onEditEnd,
    interactive = true,
    showDimensions = false,
    embedded = false,
  } = props;

  const material = materialPresets[getMaterialPreset(input.material)];
  const template = getKitchenTemplate(input.kitchen_template);
  const dimensions = getKitchenSetDimensions(input, template);
  const baseHeightM = dimensions.baseHeightMm / 1000;
  const baseDepthM = dimensions.baseDepthMm / 1000;
  const wallHeightM = dimensions.wallHeightMm / 1000;
  const wallDepthM = dimensions.wallDepthMm / 1000;
  // 상부장은 하부장보다 얕다 — 등면(뒷벽)을 하부장과 일치시켜 실제처럼 벽에 붙인다
  const wallBackZ = -(baseDepthM - wallDepthM) / 2;
  const layout = normalizeKitchenModules(template, input.kitchen_modules_mm, input.kitchen_module_types);
  const modules = layout.modules;
  const baseModules = normalizeKitchenLayerWidths(modules, input.kitchen_base_modules_mm);
  const wallModules = normalizeKitchenLayerWidths(modules, input.kitchen_wall_modules_mm);
  const moduleTypes = layout.moduleTypes;
  const baseWidthMm = baseModules.reduce((sum, width) => sum + width, 0);
  const wallWidthMm = wallModules.reduce((sum, width) => sum + width, 0);
  const sceneWidthMm = Math.max(layout.width_mm, baseWidthMm, wallWidthMm);
  // ㄱ자 측면 다리
  const isL = isLShapeKitchen(input);
  const sideLayout = normalizeKitchenSideModules(input.kitchen_side_modules_mm, input.kitchen_side_module_types);
  const cornerSide: "left" | "right" = input.kitchen_corner === "left" ? "left" : "right";
  const sideHasWall = input.kitchen_side_has_wall !== false;
  // L자는 측면이 Z로 뻗어 화면이 더 필요하므로 줌아웃 폭을 키운다
  const scaleWidthMm = isL ? sceneWidthMm + sideLayout.width_mm : sceneWidthMm;
  // 멀티 씬(embedded)에선 실척(1) — 다른 가구와 스케일을 맞춰야 함
  const modelScale = embedded ? 1 : getKitchenSceneFrameScale(scaleWidthMm).modelScale;
  const w = baseWidthMm / 1000;
  // ㄱ자는 측면 다리가 +Z로 뻗어 무게중심이 앞으로 쏠리므로, 모델을 Z로 재중심해 화면 중앙에 오게 한다
  const lOffsetZ = isL ? -(sideLayout.width_mm / 1000) / 2 : 0;

  const countertop = getCountertopOption(input.countertop_type);
  const sink = getSinkOption(input.sink_option);
  const faucet = getFaucetOption(input.faucet_option);
  const hood = getHoodOption(input.hood_option);
  const cooktop = getCooktopOption(input.cooktop_option);
  const microwave = getMicrowaveOption(input.microwave_option);

  const sinkModuleIndex = clampModuleIndex(input.sink_module_index ?? template.sinkModuleIndex, modules.length - 1);
  const cooktopModuleIndex = clampModuleIndex(input.cooktop_module_index ?? template.cooktopModuleIndex, modules.length - 1);
  const hoodModuleIndex = clampModuleIndex(input.hood_module_index ?? cooktopModuleIndex, modules.length - 1);
  const microwaveModuleIndex = clampModuleIndex(input.microwave_module_index ?? modules.length - 1, modules.length - 1);
  // 침니/타워형 후드는 독립 설치 → 해당 칸 상부장은 필요 없음(장 자체 제거)
  const hoodReplacesCabinet = hood.id !== "none" && (() => { const s = getHoodSpec(input.hood_option).shape; return s === "chimney" || s === "tower"; })();

  const hasToeKick = hasToeKickEnabled(input.toe_kick_option);
  const baseFloorY = KITCHEN_TOE_KICK_M;
  const counterTopY = baseFloorY + baseHeightM;
  const upperBottomY = KITCHEN_WALL_BOTTOM_M;

  const draggingItemKey = activeDragTarget?.type === "item" ? activeDragTarget.itemKey : null;
  const draggingModuleIndex = activeDragTarget?.type === "module" ? activeDragTarget.moduleIndex : null;
  const draggingModulePart = activeDragTarget?.type === "module" ? activeDragTarget.part : null;

  const sinkX = draggingItemKey === "sink_module_index" && dragRatio !== null ? getXFromRatio(baseModules, dragRatio) : getModuleCenterX(baseModules, sinkModuleIndex);
  const cooktopX = draggingItemKey === "cooktop_module_index" && dragRatio !== null ? getXFromRatio(baseModules, dragRatio) : getModuleCenterX(baseModules, cooktopModuleIndex);
  const hoodX = draggingItemKey === "hood_module_index" && dragRatio !== null ? getXFromRatio(wallModules, dragRatio) : getModuleCenterX(wallModules, hoodModuleIndex);
  const microwaveX = draggingItemKey === "microwave_module_index" && dragRatio !== null ? getXFromRatio(wallModules, dragRatio) : getModuleCenterX(wallModules, microwaveModuleIndex);
  const draggedBaseModuleX = dragRatio !== null && draggingModuleIndex !== null ? getXFromRatio(baseModules, dragRatio) : null;
  const draggedWallModuleX = dragRatio !== null && draggingModuleIndex !== null ? getXFromRatio(wallModules, dragRatio) : null;
  const selectedIndex = selectedModuleIndex === null ? null : clampModuleIndex(selectedModuleIndex, modules.length - 1);
  // 선택 칸의 문 방향(레이어별) — 상부는 항상 도어, 하부는 도어/싱크장만
  const selectedTypeForSwing = selectedIndex === null ? "door" : moduleTypes[selectedIndex] ?? "door";
  const selectedIsDoor = selectedModulePart === "wall" || selectedTypeForSwing === "door" || selectedTypeForSwing === "sink_base";
  const selectedSwing: DoorSwing = selectedIndex === null
    ? "pair"
    : selectedModulePart === "wall"
      ? (input.kitchen_wall_door_swings?.[selectedIndex] ?? input.kitchen_door_swings?.[selectedIndex] ?? "pair")
      : (input.kitchen_door_swings?.[selectedIndex] ?? "pair");
  const selectedDrawerCount = selectedIndex === null ? 3 : input.kitchen_drawer_counts?.[selectedIndex] ?? 3;
  const selectedShelfCount = selectedIndex === null
    ? 1
    : selectedModulePart === "wall"
      ? (input.kitchen_wall_shelf_counts?.[selectedIndex] ?? 1)
      : (input.kitchen_base_shelf_counts?.[selectedIndex] ?? 1);
  const selectedHasHandle = selectedIndex === null
    ? true
    : selectedModulePart === "wall"
      ? !(input.kitchen_wall_no_handle_indices ?? []).includes(selectedIndex)
      : !(input.kitchen_no_handle_indices ?? []).includes(selectedIndex);
  const hiddenBase = new Set(input.kitchen_base_hidden_indices ?? []);
  const hiddenWall = new Set(input.kitchen_wall_hidden_indices ?? []);
  // 상부장 칸별 수직 설치 오프셋(m) — 위/아래 이동
  const wallOffsetM = (index: number) => Math.min(0.6, Math.max(-0.4, (input.kitchen_wall_offset_mm?.[index] ?? 0) / 1000));
  const noHandle = new Set(input.kitchen_no_handle_indices ?? []);
  const noHandleWall = new Set(input.kitchen_wall_no_handle_indices ?? []);
  const handleOn = input.handle_type !== "무손잡이";
  const anyWallVisible = modules.some((_, index) => !hiddenWall.has(index));
  const selectedLayerModules = selectedModulePart === "wall" ? wallModules : baseModules;
  const selectedWidthMm = selectedIndex === null ? 0 : selectedLayerModules[selectedIndex];
  const selectedWidthM = selectedWidthMm / 1000;
  const selectedX = selectedIndex === null ? 0 : getModuleCenterX(selectedLayerModules, selectedIndex);
  const selectedSizeY = selectedModulePart === "wall" ? KITCHEN_WALL_BOTTOM_M + wallHeightM + 0.14 : baseFloorY + baseHeightM + 0.14;
  const selectedSizeZ = selectedModulePart === "wall" ? wallDepthM / 2 + 0.18 : baseDepthM / 2 + 0.18;
  const wallRulerY = KITCHEN_WALL_BOTTOM_M + wallHeightM + 0.34;
  const baseRulerY = Math.max(baseFloorY - 0.12, -0.12);
  const selectedHeightMm = selectedModulePart === "wall" ? dimensions.wallHeightMm : dimensions.baseHeightMm;
  const selectedDepthMm = selectedModulePart === "wall" ? dimensions.wallDepthMm : dimensions.baseDepthMm;
  const feedbackIndex = feedback ? clampModuleIndex(feedback.moduleIndex, modules.length - 1) : null;
  const feedbackX = feedbackIndex === null ? 0 : getModuleCenterX(baseModules, feedbackIndex);
  const feedbackWidthM = feedbackIndex === null ? 0.6 : baseModules[feedbackIndex] / 1000;
  const widthsAligned = baseModules.length === wallModules.length && baseModules.every((width, index) => width === wallModules[index]);
  const hasSelectedFixture = Boolean(selectedFixture);
  // 선택 칸 외곽선/이동 핸들 위치 (드래그 중이면 드래그 위치를 따라간다)
  const selDraggingThis = draggingModuleIndex === selectedIndex && draggingModulePart === selectedModulePart;
  const selDraggedX = selectedModulePart === "wall" ? draggedWallModuleX : draggedBaseModuleX;
  const selHighlightX = selDraggingThis && selDraggedX !== null ? selDraggedX : selectedX;
  const selCenterY = selectedModulePart === "wall" ? KITCHEN_WALL_BOTTOM_M + wallOffsetM(selectedIndex ?? 0) + wallHeightM / 2 : baseFloorY + baseHeightM / 2;
  const selBoxHeight = selectedModulePart === "wall" ? wallHeightM : baseHeightM;
  const selBoxDepth = selectedModulePart === "wall" ? wallDepthM : baseDepthM;
  const selHandleZ = selectedModulePart === "wall" ? wallDepthM / 2 + 0.16 : baseDepthM / 2 + 0.16;
  const selectedSink = selectedFixture === "sink";
  const selectedCooktop = selectedFixture === "cooktop";
  const selectedHood = selectedFixture === "hood";

  function handleFixturePointerDown(fixture: "sink" | "cooktop" | "hood", itemKey: "sink_module_index" | "cooktop_module_index" | "hood_module_index", moduleIndex: number, clientX: number, clientY: number) {
    onSelectFixture?.(fixture, moduleIndex);
    onPrepareDragItem?.(itemKey, moduleIndex, clientX, clientY);
  }

  return (
    <group scale={modelScale} rotation={[0, frontView ? 0 : -0.28, 0]}>
     <group position={[0, 0, lOffsetZ]}>
      {!embedded && (
        <KitchenRoom
          mainWidthM={w}
          baseDepthM={baseDepthM}
          sideLenM={sideLayout.width_mm / 1000}
          isL={isL}
          corner={cornerSide}
          upperTopY={KITCHEN_WALL_BOTTOM_M + wallHeightM}
        />
      )}
      {showDimensions && (
        <>
          <DimensionRuler
            label="상부"
            widthMm={Math.round(wallWidthMm)}
            y={wallRulerY}
            z={wallDepthM / 2 + 0.2}
            labelSide="top"
            onAutoAlign={onSyncAllWidths && !widthsAligned ? () => onSyncAllWidths("wall") : undefined}
          />
          <DimensionRuler
            label="하부"
            widthMm={Math.round(baseWidthMm)}
            y={baseRulerY}
            z={baseDepthM / 2 + 0.2}
            labelSide="bottom"
            onAutoAlign={onSyncAllWidths && !widthsAligned ? () => onSyncAllWidths("base") : undefined}
          />
          {/* 좌측: 상·하부 높이 (세로) */}
          <HeightMarker x={-w / 2 - 0.16} y0={baseFloorY} y1={counterTopY} z={baseDepthM / 2} label="하부 높이" mm={dimensions.baseHeightMm} color="#7c3aed" />
          {anyWallVisible && (
            <HeightMarker x={-w / 2 - 0.16} y0={upperBottomY} y1={upperBottomY + wallHeightM} z={wallDepthM / 2} label="상부 높이" mm={dimensions.wallHeightMm} color="#7c3aed" />
          )}
          {/* 우측: 상·하부 깊이 (Z 방향) */}
          <DepthMarker x={w / 2 + 0.16} y={baseFloorY + baseHeightM * 0.5} z0={-baseDepthM / 2} z1={baseDepthM / 2} label="하부 깊이" mm={dimensions.baseDepthMm} color="#0d9488" />
          {anyWallVisible && (
            <DepthMarker x={w / 2 + 0.16} y={upperBottomY + wallHeightM * 0.5} z0={-wallDepthM / 2} z1={wallDepthM / 2} label="상부 깊이" mm={dimensions.wallDepthMm} color="#0d9488" />
          )}
          {(input.total_wall_length_mm ?? 0) > 0 && (
            <WallLengthMarker
              leftX={-w / 2}
              rightX={-w / 2 + (input.total_wall_length_mm ?? 0) / 1000}
              y={0.006}
              z={-baseDepthM / 2 - 0.08}
              mm={Math.round(input.total_wall_length_mm ?? 0)}
            />
          )}
          {(input.water_position_x_mm ?? 0) > 0 && (
            <WaterPositionMarker
              x={Math.max(-w / 2 + 0.03, Math.min(w / 2 - 0.03, -w / 2 + (input.water_position_x_mm ?? 0) / 1000))}
              y0={counterTopY + 0.02}
              y1={Math.max(counterTopY + 0.12, upperBottomY - 0.04)}
              z={-baseDepthM / 2 - 0.02}
              mm={Math.round(input.water_position_x_mm ?? 0)}
            />
          )}
        </>
      )}
      {isL && (
        <KitchenLShapeLeg
          modules={sideLayout.modules}
          moduleTypes={sideLayout.moduleTypes}
          mainWidthM={w}
          baseDepthM={baseDepthM}
          wallDepthM={wallDepthM}
          baseHeightM={baseHeightM}
          wallHeightM={wallHeightM}
          baseHeightMm={dimensions.baseHeightMm}
          baseDepthMm={dimensions.baseDepthMm}
          material={material}
          doorStyle={doorStyle}
          viewMode={viewMode}
          corner={cornerSide}
          hasWall={sideHasWall}
          showHandles={input.handle_type !== "무손잡이"}
          selectedIndex={interactive ? selectedSideIndex : null}
          onSelect={interactive ? onSelectSideModule : undefined}
          onAdd={interactive ? onAddSideModule : undefined}
          onRemove={interactive ? onRemoveSideModule : undefined}
          onWidthChange={interactive ? onSideModuleWidthChange : undefined}
        />
      )}
      {/* ㄱ자 코너 상부 채움장: 메인 상부장(얕음)과 측면 상부장 사이 빈틈을 막아 한쪽 벽처럼 붙인다 */}
      {isL && sideHasWall && (
        <Panel
          size={[wallDepthM, wallHeightM, Math.max(baseDepthM / 2 - wallDepthM / 2, 0.05)]}
          position={[
            (cornerSide === "left" ? -1 : 1) * (w / 2 - wallDepthM / 2),
            KITCHEN_WALL_BOTTOM_M + wallHeightM / 2,
            (wallDepthM / 2 + baseDepthM / 2) / 2,
          ]}
          color={material.color}
          edge={material.edge}
        />
      )}
      {modules.map((_, index) => {
        const moduleWidth = baseModules[index] ?? modules[index];
        return hiddenBase.has(index) ? null : (
        <KitchenBaseModule
          key={`base-${moduleWidth}-${index}`}
          width={moduleWidth / 1000}
          height={baseHeightM}
          depth={baseDepthM}
          x={draggingModuleIndex === index && draggingModulePart === "base" && draggedBaseModuleX !== null ? draggedBaseModuleX : getModuleCenterX(baseModules, index)}
          y={0}
          material={material}
          doorStyle={doorStyle}
          moduleType={(moduleTypes[index] ?? "door") as KitchenModuleType}
          doorCount={(input.kitchen_door_swings?.[index] ?? "pair") === "pair" ? 2 : 1}
          drawerCount={input.kitchen_drawer_counts?.[index] ?? 3}
          shelfCount={input.kitchen_base_shelf_counts?.[index] ?? Math.max(1, input.shelf_count)}
          showHandles={handleOn && !noHandle.has(index)}
          selected={!hasSelectedFixture && selectedModuleIndex === index && selectedModulePart === "base"}
          selectedTarget={selectedEditTarget}
          dragging={draggingModuleIndex === index && draggingModulePart === "base"}
          interactive={interactive}
          hasToeKick={false}
          viewMode={viewMode}
          doorSwing={input.kitchen_door_swings?.[index] ?? "pair"}
          sinkSpec={
            (moduleTypes[index] === "sink_base" || (sink.id !== "none" && index === sinkModuleIndex))
              ? getSinkFixtureSpec(input.sink_option, moduleWidth / 1000)
              : undefined
          }
          onEditStart={onEditStart}
          onEditEnd={onEditEnd}
          onPointerDown={(clientX, clientY) => {
            onPrepareDragModule?.(index, "base", clientX, clientY);
          }}
          onSelectTarget={(target) => onSelectModule(index, "base", target)}
          onDoubleClick={() => onDoubleClickModule?.(index, "base")}
        />
      );})}
      {interactive && modules.map((_, index) => {
        const moduleWidth = baseModules[index] ?? modules[index];
        return hiddenBase.has(index) ? (
        <EmptyPartSlot
          key={`empty-base-${moduleWidth}-${index}`}
          label="하부장"
          x={getModuleCenterX(baseModules, index)}
          y={baseFloorY + baseHeightM * 0.5}
          z={baseDepthM / 2 + 0.08}
          width={moduleWidth / 1000}
          height={baseHeightM}
          depth={baseDepthM}
          onRestore={() => onRestoreModulePart?.(index, "base")}
        />
      ) : null;})}
      {hasToeKick && <ContinuousToeKick width={w} depth={baseDepthM} material={material} />}
      <group position={[0, 0, wallBackZ]}>
      {modules.map((_, index) => {
        const moduleWidth = wallModules[index] ?? modules[index];
        return (hiddenWall.has(index) || (hoodReplacesCabinet && index === hoodModuleIndex)) ? null : (
        <KitchenWallModule
          key={`wall-${moduleWidth}-${index}`}
          width={moduleWidth / 1000}
          height={wallHeightM}
          depth={wallDepthM}
          x={draggingModuleIndex === index && draggingModulePart === "wall" && draggedWallModuleX !== null ? draggedWallModuleX : getModuleCenterX(wallModules, index)}
          y={KITCHEN_WALL_BOTTOM_M + wallOffsetM(index)}
          material={material}
          doorStyle={doorStyle}
          showHandles={handleOn && !noHandleWall.has(index)}
          shelfCount={input.kitchen_wall_shelf_counts?.[index] ?? 1}
          hideDoor={hoodReplacesCabinet && index === hoodModuleIndex}
          viewMode={viewMode}
          selected={!hasSelectedFixture && selectedModuleIndex === index && selectedModulePart === "wall"}
          selectedTarget={selectedEditTarget}
          dragging={draggingModuleIndex === index && draggingModulePart === "wall"}
          interactive={interactive}
          doorSwing={input.kitchen_wall_door_swings?.[index] ?? input.kitchen_door_swings?.[index] ?? "pair"}
          onEditStart={onEditStart}
          onEditEnd={onEditEnd}
          onPointerDown={(clientX, clientY) => {
            onPrepareDragModule?.(index, "wall", clientX, clientY);
          }}
          onSelectTarget={(target) => onSelectModule(index, "wall", target)}
          onDoubleClick={() => onDoubleClickModule?.(index, "wall")}
        />
      );})}
      {interactive && modules.map((_, index) => {
        const moduleWidth = wallModules[index] ?? modules[index];
        return hiddenWall.has(index) ? (
        <EmptyPartSlot
          key={`empty-wall-${moduleWidth}-${index}`}
          label="상부장"
          x={getModuleCenterX(wallModules, index)}
          y={KITCHEN_WALL_BOTTOM_M + wallHeightM * 0.5}
          z={wallDepthM / 2 + 0.08}
          width={moduleWidth / 1000}
          height={wallHeightM}
          depth={wallDepthM}
          onRestore={() => onRestoreModulePart?.(index, "wall")}
        />
      ) : null;})}
      </group>
      {countertop.id !== "none" && (() => {
        // 싱크 자리에 실제 컷아웃을 낸 상판 — 구멍으로 싱크볼 내부가 그대로 보인다
        const sinkCut = sink.id !== "none"
          ? (() => {
              const s = getSinkFixtureSpec(input.sink_option, (baseModules[sinkModuleIndex] ?? 900) / 1000);
              return { x: sinkX, w: s.widthM + 0.004, d: s.depthM + 0.004, z: 0.06 };
            })()
          : null;
        return (
          <CountertopWithCutout
            width={w * 0.98}
            depth={baseDepthM * 1.08}
            y={counterTopY}
            z={0.02}
            color={countertop.id === "stainless" ? "#94a3b8" : "#e5e7eb"}
            cutout={sinkCut}
          />
        );
      })()}
      {/* 칸 상세 편집은 우측 하단 도크(Kitchen3DEditDock). 단, 선택 표시 + 이동 핸들은 캐비닛 위에 띄운다 */}
      {interactive && selectedIndex !== null && !hasSelectedFixture && (
        <>
          <SelectionOutline x={selHighlightX} y={selCenterY} width={selectedWidthM} height={selBoxHeight} depth={selBoxDepth} />
          {onPrepareDragModule && (
            <MoveHandle
              x={selHighlightX}
              y={selCenterY}
              z={selHandleZ}
              dragging={selDraggingThis}
              onStart={(clientX, clientY) => onPrepareDragModule(selectedIndex, selectedModulePart, clientX, clientY)}
              onUp={selectedModulePart === "wall" && onWallVerticalMove ? () => onWallVerticalMove(selectedIndex, 50) : undefined}
              onDown={selectedModulePart === "wall" && onWallVerticalMove ? () => onWallVerticalMove(selectedIndex, -50) : undefined}
            />
          )}
          {/* 선택한 칸 바로 위에 뜨는 인라인 편집 — 치수·단수·＋칸추가·삭제 (하단 도크 대체).
              embedded(방 배치 뷰)에선 숨김 — 우측/하단 조절 패널이 같은 기능을 담당해 겹침 없이 편집 */}
          {!embedded && <SizeBadge
            x={selHighlightX}
            y={selectedSizeY}
            z={selectedSizeZ}
            label={`${selectedIndex + 1}번 ${selectedModulePart === "wall" ? "상부장" : "하부장"}`}
            widthMm={Math.round(selectedWidthMm)}
            heightMm={selectedHeightMm}
            depthMm={selectedDepthMm}
            onWidthChange={onModuleWidthChange}
            onHeightChange={onModuleHeightChange}
            onDepthChange={onModuleDepthChange}
            onClose={() => onSelectModule(selectedIndex, selectedModulePart)}
            swing={selectedIsDoor ? selectedSwing : undefined}
            onSwing={selectedIsDoor ? onDoorSwingChange : undefined}
            hasHandle={selectedHasHandle}
            onHandle={onHandleChange}
            part={selectedModulePart}
            moduleType={selectedTypeForSwing}
            shelfCount={selectedShelfCount}
            drawerCount={selectedDrawerCount}
            onShelfCount={onShelfCountChange}
            onDrawerCount={onDrawerCountChange}
            onAdd={onAddModule}
            onRemove={onRemoveModule}
            canRemove={modules.length > 1}
          />}
        </>
      )}
      {feedback && feedbackIndex !== null && (
        <ChangeFeedback
          key={feedback.nonce}
          type={feedback.type}
          x={feedbackX}
          y={baseFloorY + baseHeightM * 0.5}
          z={baseDepthM / 2 + 0.25}
          width={feedbackWidthM}
        />
      )}
      {sink.id !== "none" && (
        <SinkFixture
          x={sinkX}
          counterTopY={counterTopY}
          sinkOptionId={input.sink_option}
          cabinetWidthM={baseModules[sinkModuleIndex] / 1000}
          selected={selectedSink}
          onPointerDown={
            onPrepareDragItem || onSelectFixture
              ? (clientX, clientY) => handleFixturePointerDown("sink", "sink_module_index", sinkModuleIndex, clientX, clientY)
              : onStartDragItem
                ? () => onStartDragItem("sink_module_index", sinkModuleIndex)
                : undefined
          }
        />
      )}
      {cooktop.id !== "none" && (
        <CooktopFixture
          x={cooktopX}
          counterTopY={counterTopY}
          cooktopId={cooktop.id}
          selected={selectedCooktop}
          onPointerDown={
            onPrepareDragItem || onSelectFixture
              ? (clientX, clientY) => handleFixturePointerDown("cooktop", "cooktop_module_index", cooktopModuleIndex, clientX, clientY)
              : onStartDragItem
                ? () => onStartDragItem("cooktop_module_index", cooktopModuleIndex)
                : undefined
          }
        />
      )}
      {faucet.id !== "none" && sink.id !== "none" && (
        <FaucetFixture
          x={sinkX}
          counterTopY={counterTopY}
          faucetId={faucet.id}
          selected={selectedSink}
          onPointerDown={
            onPrepareDragItem || onSelectFixture
              ? (clientX, clientY) => handleFixturePointerDown("sink", "sink_module_index", sinkModuleIndex, clientX, clientY)
              : onStartDragItem
                ? () => onStartDragItem("sink_module_index", sinkModuleIndex)
                : undefined
          }
        />
      )}
      {hood.id !== "none" && (
        <group position={[0, 0, wallBackZ]}>
        <HoodFixture
          x={hoodX}
          upperBottomY={upperBottomY}
          selected={selectedHood}
          widthM={getHoodSpec(input.hood_option).widthMm / 1000}
          shape={getHoodSpec(input.hood_option).shape}
          onPointerDown={
            onPrepareDragItem || onSelectFixture
              ? (clientX, clientY) => handleFixturePointerDown("hood", "hood_module_index", hoodModuleIndex, clientX, clientY)
              : onStartDragItem
                ? () => onStartDragItem("hood_module_index", hoodModuleIndex)
                : undefined
          }
        />
        </group>
      )}
      {microwave.id !== "none" && (
        <group position={[0, 0, wallBackZ]}>
        <MicrowaveFixture
          x={microwaveX}
          onDragStart={onStartDragItem ? () => onStartDragItem("microwave_module_index", microwaveModuleIndex) : undefined}
        />
        </group>
      )}
     </group>
    </group>
  );
}
