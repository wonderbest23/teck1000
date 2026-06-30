"use client";

import { Html } from "@react-three/drei";
import { useEffect, useState } from "react";
import { productRules } from "@/lib/rules";
import type { ProductType } from "@/lib/types";

export type DimensionLimit = { min: number; max: number; step: number };
export type StorageDimensionLimits = {
  width: DimensionLimit;
  height: DimensionLimit;
  depth: DimensionLimit;
};

/** 제품별 허용 치수 범위를 치수 배지용 limits 형태로 변환 */
export function getStorageDimensionLimits(productType: ProductType): StorageDimensionLimits {
  const rules = productRules[productType];
  return {
    width: { min: rules.minWidth, max: rules.maxWidth, step: 10 },
    height: { min: rules.minHeight, max: rules.maxHeight, step: 10 },
    depth: { min: rules.minDepth, max: rules.maxDepth, step: 10 },
  };
}

/** 클릭으로 가구를 선택하는 히트박스 + 선택 하이라이트 (주방 모듈과 동일한 느낌) */
export function StorageSelectionBox({
  width,
  height,
  depth,
  baseY = 0,
  selected,
  onSelect,
}: {
  width: number;
  height: number;
  depth: number;
  baseY?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <mesh
      position={[0, baseY + height / 2, depth / 2 + 0.05]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <boxGeometry args={[Math.max(width * 0.96, 0.05), Math.max(height * 0.96, 0.08), 0.12]} />
      <meshStandardMaterial color={selected ? "#0ea5e9" : "#38bdf8"} transparent opacity={selected ? 0.16 : 0.04} />
    </mesh>
  );
}

/** 선택된 가구 위에 떠서 가로/높이/깊이를 직접 입력하는 치수 배지 */
export function StorageSizeBadge({
  width,
  height,
  depth,
  baseY = 0,
  widthMm,
  heightMm,
  depthMm,
  limits,
  onWidthChange,
  onHeightChange,
  onDepthChange,
  onClose,
}: {
  width: number;
  height: number;
  depth: number;
  baseY?: number;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  limits: StorageDimensionLimits;
  onWidthChange?: (widthMm: number) => void;
  onHeightChange?: (heightMm: number) => void;
  onDepthChange?: (depthMm: number) => void;
  onClose?: () => void;
}) {
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

  function commit(
    nextDraft: string,
    fallback: number,
    onChange?: (valueMm: number) => void,
    syncDraft?: (value: string) => void,
  ) {
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
    <Html position={[0, baseY + height + 0.16, depth / 2]} center distanceFactor={2} zIndexRange={[28, 18]}>
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
        <div className="mb-0.5 text-center text-[9px] font-black text-white/72">가로 x 높이 x 깊이 (mm)</div>
        <div className="flex items-center gap-1 text-[11px] font-black">
          <input
            type="number"
            min={limits.width.min}
            max={limits.width.max}
            step={limits.width.step}
            value={draftWidth}
            inputMode="numeric"
            aria-label="가로"
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
            min={limits.height.min}
            max={limits.height.max}
            step={limits.height.step}
            value={draftHeight}
            inputMode="numeric"
            aria-label="높이"
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
            min={limits.depth.min}
            max={limits.depth.max}
            step={limits.depth.step}
            value={draftDepth}
            inputMode="numeric"
            aria-label="깊이"
            onChange={(event) => setDraftDepth(event.target.value)}
            onBlur={() => commit(draftDepth, depthMm, onDepthChange, setDraftDepth)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="h-7 w-12 rounded bg-white/95 px-1 text-right text-[12px] font-black text-slate-950 outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
      </div>
    </Html>
  );
}

/**
 * 비주방 가구(선반장/틈새장/신발장/붙박이장)를 주방처럼 3D 안에서 직접 편집하는 레이어.
 * 클릭 선택 → 치수 배지로 W/H/D 직접 입력 → 선반 칸수 인라인 조절.
 */
export function StorageEditLayer({
  width,
  height,
  depth,
  baseY = 0,
  interactive,
  selected,
  widthMm,
  heightMm,
  depthMm,
  shelfCount,
  shelfMin = 0,
  shelfMax = 12,
  showShelfStepper = true,
  limits,
  onSelect,
  onWidthChange,
  onHeightChange,
  onDepthChange,
  onShelfCountChange,
}: {
  width: number;
  height: number;
  depth: number;
  baseY?: number;
  interactive: boolean;
  selected: boolean;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  shelfCount: number;
  shelfMin?: number;
  shelfMax?: number;
  showShelfStepper?: boolean;
  limits: StorageDimensionLimits;
  onSelect: () => void;
  onWidthChange?: (widthMm: number) => void;
  onHeightChange?: (heightMm: number) => void;
  onDepthChange?: (depthMm: number) => void;
  onShelfCountChange?: (shelfCount: number) => void;
}) {
  if (!interactive) return null;

  return (
    <group>
      <StorageSelectionBox width={width} height={height} depth={depth} baseY={baseY} selected={selected} onSelect={onSelect} />
      {selected && (
        <StorageSizeBadge
          width={width}
          height={height}
          depth={depth}
          baseY={baseY}
          widthMm={widthMm}
          heightMm={heightMm}
          depthMm={depthMm}
          limits={limits}
          onWidthChange={onWidthChange}
          onHeightChange={onHeightChange}
          onDepthChange={onDepthChange}
        />
      )}
      {selected && showShelfStepper && onShelfCountChange && (
        <StorageShelfStepper
          width={width}
          height={height}
          depth={depth}
          baseY={baseY}
          count={shelfCount}
          min={shelfMin}
          max={shelfMax}
          onChange={onShelfCountChange}
        />
      )}
    </group>
  );
}

/** 선택된 가구 안쪽에 떠서 선반 칸수를 직접 늘리고 줄이는 인라인 컨트롤 */
export function StorageShelfStepper({
  width,
  height,
  depth,
  baseY = 0,
  count,
  min = 0,
  max = 12,
  onChange,
}: {
  width: number;
  height: number;
  depth: number;
  baseY?: number;
  count: number;
  min?: number;
  max?: number;
  onChange: (shelfCount: number) => void;
}) {
  const safeCount = Math.min(max, Math.max(min, Math.round(count)));
  const x = -width / 2 + Math.min(Math.max(width * 0.18, 0.07), 0.16);
  const y = baseY + Math.min(Math.max(height * 0.12, 0.12), height - 0.06);
  const z = depth / 2 + 0.18;

  return (
    <Html position={[x, y, z]} center distanceFactor={1.9} zIndexRange={[33, 23]}>
      <div
        className="flex h-8 items-center overflow-hidden rounded-full border border-white/75 bg-slate-950/88 shadow-lg backdrop-blur-md"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          title="선반 삭제"
          aria-label="선반 삭제"
          disabled={safeCount <= min}
          onClick={(event) => {
            event.stopPropagation();
            if (safeCount > min) onChange(safeCount - 1);
          }}
          className="grid h-8 w-8 place-items-center text-[17px] font-black leading-none text-white transition hover:bg-white/12 disabled:text-white/25 disabled:hover:bg-transparent"
        >
          -
        </button>
        <span className="min-w-7 px-1 text-center text-[12px] font-black text-white">{safeCount}</span>
        <div className="h-5 w-px bg-white/20" />
        <button
          type="button"
          title="선반 추가"
          aria-label="선반 추가"
          disabled={safeCount >= max}
          onClick={(event) => {
            event.stopPropagation();
            if (safeCount < max) onChange(safeCount + 1);
          }}
          className="grid h-8 w-8 place-items-center text-[17px] font-black leading-none text-white transition hover:bg-white/12 disabled:text-white/25 disabled:hover:bg-transparent"
        >
          +
        </button>
      </div>
    </Html>
  );
}
