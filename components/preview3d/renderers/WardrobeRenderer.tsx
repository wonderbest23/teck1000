"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { BOARD_THICKNESS_M } from "@/components/preview3d/constants";
import { Doors, Panel, PreviewRoom, SlidingDoors, Trim } from "@/components/preview3d/primitives";
import { BoxDimensions } from "@/components/preview3d/primitives/DimensionMarkers";
import { getMaterialPreset, lighten, materialPresets } from "@/components/preview3d/materials";
import {
  StorageSelectionBox,
  StorageShelfStepper,
  StorageSizeBadge,
  type StorageDimensionLimits,
} from "@/components/preview3d/controls/StorageSceneControls";
import {
  MAX_WARDROBE_MODULE_WIDTH_MM,
  MIN_WARDROBE_MODULE_WIDTH_MM,
  alignWardrobeCounts,
  getWardrobeDrawerCountLimits,
  getWardrobeDrawerZoneMm,
  normalizeWardrobeModules,
  type WardrobeModuleType,
} from "@/lib/wardrobe";
import { productRules } from "@/lib/rules";
import { carcassShellProps, resolveModuleViewMode, shouldShowInteriorHints } from "@/components/preview3d/modes/visibilityModes";
import type { DoorSwing, MaterialColors, PreviewRendererProps, PreviewViewMode } from "@/components/preview3d/types";

function HangingRod({ x1, x2, y, z = 0 }: { x1: number; x2: number; y: number; z?: number }) {
  const length = Math.max(Math.abs(x2 - x1), 0.05);
  return (
    <mesh position={[(x1 + x2) / 2, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.009, 0.009, length, 16]} />
      <meshStandardMaterial color="#94a3b8" roughness={0.35} metalness={0.65} />
    </mesh>
  );
}

function DrawerStack({
  width,
  height,
  depth,
  count,
  material,
  active,
}: {
  width: number;
  height: number;
  depth: number;
  count: number;
  material: MaterialColors;
  active: boolean;
}) {
  const refs = useRef<Array<Group | null>>([]);
  const safeCount = Math.min(6, Math.max(2, Math.round(count)));
  const gap = 0.012;
  const faceHeight = Math.max((height - gap * (safeCount + 1)) / safeCount, 0.06);
  const frontZ = depth / 2 + 0.012;
  const boxDepth = Math.max(depth * 0.52, 0.18);
  const boxWidth = Math.max(width * 0.82, 0.14);
  const sideHeight = Math.max(faceHeight * 0.55, 0.045);

  useFrame((_, delta) => {
    refs.current.forEach((group, index) => {
      if (!group) return;
      const stagger = safeCount <= 1 ? 1 : 1 - index * 0.12;
      const target = active ? depth * 0.32 * Math.max(0.5, stagger) : 0;
      group.position.z += (frontZ + target - group.position.z) * Math.min(1, delta * 8);
    });
  });

  return (
    <group>
      {active &&
        Array.from({ length: safeCount }).map((_, index) => {
          const y = height - gap - faceHeight / 2 - index * (faceHeight + gap);
          return (
            <group key={`drawer-fixed-rails-${index}`} position={[0, y - faceHeight * 0.08, 0]}>
              {[-1, 1].map((side) => (
                <Trim
                  key={`drawer-fixed-rail-${index}-${side}`}
                  size={[0.018, 0.018, depth * 0.62]}
                  position={[side * width * 0.47, 0, -depth * 0.04]}
                  color="#94a3b8"
                />
              ))}
            </group>
          );
        })}
      {Array.from({ length: safeCount }).map((_, index) => {
        const y = height - gap - faceHeight / 2 - index * (faceHeight + gap);
        return (
          <group
            key={`drawer-${index}`}
            ref={(node) => {
              refs.current[index] = node;
            }}
            position={[0, y, frontZ]}
          >
            <Panel size={[width * 0.92, faceHeight, 0.018]} position={[0, 0, 0]} color={material.color} edge={material.edge} />
            {active && (
              <>
                <Panel size={[boxWidth, 0.012, boxDepth]} position={[0, -faceHeight * 0.2, -boxDepth / 2]} color={lighten(material.color)} edge={material.edge} />
                <Panel size={[0.014, sideHeight, boxDepth]} position={[-boxWidth / 2, -faceHeight * 0.2 + sideHeight / 2, -boxDepth / 2]} color={lighten(material.color)} edge={material.edge} />
                <Panel size={[0.014, sideHeight, boxDepth]} position={[boxWidth / 2, -faceHeight * 0.2 + sideHeight / 2, -boxDepth / 2]} color={lighten(material.color)} edge={material.edge} />
                <Panel size={[boxWidth, sideHeight, 0.014]} position={[0, -faceHeight * 0.2 + sideHeight / 2, -boxDepth]} color={lighten(material.color)} edge={material.edge} />
                {[-1, 1].map((side) => (
                  <Trim
                    key={`drawer-moving-rail-${index}-${side}`}
                    size={[0.012, 0.014, boxDepth * 0.9]}
                    position={[side * (boxWidth / 2 + 0.012), -faceHeight * 0.05, -boxDepth / 2]}
                    color="#64748b"
                  />
                ))}
              </>
            )}
            <Trim size={[width * 0.4, 0.016, 0.026]} position={[0, faceHeight * 0.16, 0.024]} color={material.edge} />
          </group>
        );
      })}
    </group>
  );
}

function WardrobeModuleInterior({
  type,
  width,
  height,
  depth,
  thickness,
  shelfCount,
  drawerCount,
  material,
  reveal,
}: {
  type: WardrobeModuleType;
  width: number;
  height: number;
  depth: number;
  thickness: number;
  shelfCount: number;
  drawerCount: number;
  material: MaterialColors;
  reveal: boolean;
}) {
  const innerW = Math.max(width - thickness * 2, 0.04);
  const topRodY = height - Math.min(0.3, height * 0.12);

  if (type === "drawer") {
    // 서랍은 손이 닿는 하부 구역에만 (현실 기준). 그 위는 행거로 채운다.
    const innerH = height - thickness * 2;
    const zoneM = Math.min(innerH, getWardrobeDrawerZoneMm(height * 1000) / 1000);
    const limit = getWardrobeDrawerCountLimits(height * 1000);
    const safeDrawerCount = Math.min(limit.max, Math.max(limit.min, Math.round(drawerCount)));
    const hasUpper = innerH - zoneM > 0.25;
    const upperRodY = thickness + innerH - Math.min(0.3, innerH * 0.12);
    return (
      <group>
        <DrawerStack width={innerW} height={zoneM} depth={depth} count={safeDrawerCount} material={material} active={reveal} />
        {hasUpper && reveal && (
          <group>
            <HangingRod x1={-innerW / 2} x2={innerW / 2} y={upperRodY} />
          </group>
        )}
      </group>
    );
  }

  if (type === "shelf") {
    return (
      <group>
        {Array.from({ length: Math.max(1, shelfCount) }).map((_, index) => {
          const y = thickness + ((height - thickness * 2) * (index + 1)) / (Math.max(1, shelfCount) + 1);
          return (
            <Panel
              key={`wshelf-${index}`}
              size={[innerW, thickness, depth * 0.9]}
              position={[0, y, 0.01]}
              color={reveal ? lighten(material.color) : material.color}
              edge={material.edge}
            />
          );
        })}
      </group>
    );
  }

  if (type === "hang2") {
    const midRodY = height * 0.5;
    return (
      <group>
        <HangingRod x1={-innerW / 2} x2={innerW / 2} y={topRodY} />
        <HangingRod x1={-innerW / 2} x2={innerW / 2} y={midRodY} />
      </group>
    );
  }

  // hang (롱 행거)
  return (
    <group>
      <HangingRod x1={-innerW / 2} x2={innerW / 2} y={topRodY} />
    </group>
  );
}

function WardrobeModule({
  x,
  width,
  height,
  depth,
  type,
  shelfCount,
  drawerCount,
  material,
  doorStyle,
  showHandles,
  selected,
  interactive,
  sliding,
  doorSwing,
  widthLimits,
  widthMm,
  heightMm,
  depthMm,
  onSelect,
  onWidthChange,
  onHeightChange,
  onDepthChange,
  onShelfCountChange,
  onDrawerCountChange,
  viewMode,
}: {
  x: number;
  width: number;
  height: number;
  depth: number;
  type: WardrobeModuleType;
  shelfCount: number;
  drawerCount: number;
  material: MaterialColors;
  doorStyle: PreviewRendererProps["doorStyle"];
  showHandles: boolean;
  selected: boolean;
  interactive: boolean;
  sliding: boolean;
  doorSwing: DoorSwing;
  viewMode: PreviewViewMode;
  widthLimits: StorageDimensionLimits;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  onSelect: () => void;
  onWidthChange?: (mm: number) => void;
  onHeightChange?: (mm: number) => void;
  onDepthChange?: (mm: number) => void;
  onShelfCountChange?: (count: number) => void;
  onDrawerCountChange?: (count: number) => void;
}) {
  const t = BOARD_THICKNESS_M;
  const innerWidth = Math.max(width - t * 2, 0.04);
  const hasDoor = type !== "drawer";
  const doorCount = hasDoor && !sliding ? (width > 0.7 ? 2 : 1) : 0;
  const doorShelfPositionsY =
    type === "shelf"
      ? Array.from({ length: Math.max(1, shelfCount) }).map((_, index) => t + ((height - t * 2) * (index + 1)) / (Math.max(1, shelfCount) + 1))
      : [];
  // 선택·문열림 시 X-ray — Orbit 회전해도 내부(선반·서랍) 확인
  const revealInterior = selected || shouldShowInteriorHints(viewMode);
  const shell = carcassShellProps(selected);
  const moduleViewMode = resolveModuleViewMode(viewMode, selected);

  return (
    <group position={[x, 0, 0]}>
      {/* 모듈 몸통 */}
      <Panel size={[t, height, depth]} position={[-width / 2 + t / 2, height / 2, 0]} color={material.color} edge={material.edge} {...shell} />
      <Panel size={[t, height, depth]} position={[width / 2 - t / 2, height / 2, 0]} color={material.color} edge={material.edge} {...shell} />
      <Panel size={[innerWidth, t, depth]} position={[0, height - t / 2, 0]} color={material.color} edge={material.edge} {...shell} />
      <Panel size={[innerWidth, t, depth]} position={[0, t / 2, 0]} color={material.color} edge={material.edge} {...shell} />
      <Panel size={[width, height, t * 0.55]} position={[0, height / 2, -depth / 2 + t * 0.28]} color={lighten(material.color)} edge={material.edge} {...shell} />

      <WardrobeModuleInterior
        type={type}
        width={width}
        height={height}
        depth={depth}
        thickness={t}
        shelfCount={shelfCount}
        drawerCount={drawerCount}
        material={material}
        reveal={revealInterior}
      />

      {doorCount > 0 && (
        <Doors
          count={doorCount}
          width={width}
          height={height}
          depth={depth}
          thickness={t}
          material={material}
          doorStyle={doorStyle}
          showHandles={showHandles}
          viewMode={moduleViewMode}
          doorSwing={doorSwing}
          animatedOpen={selected}
          revealInterior={selected}
          shelfPositionsY={doorShelfPositionsY}
        />
      )}

      {interactive && (
        <StorageSelectionBox width={width} height={height} depth={depth} selected={selected} onSelect={onSelect} />
      )}
      {interactive && selected && (
        <StorageSizeBadge
          width={width}
          height={height}
          depth={depth}
          widthMm={widthMm}
          heightMm={heightMm}
          depthMm={depthMm}
          limits={widthLimits}
          onWidthChange={onWidthChange}
          onHeightChange={onHeightChange}
          onDepthChange={onDepthChange}
        />
      )}
      {interactive && selected && type === "shelf" && onShelfCountChange && (
        <StorageShelfStepper width={width} height={height} depth={depth} count={shelfCount} min={1} max={10} onChange={onShelfCountChange} />
      )}
      {interactive && selected && type === "drawer" && onDrawerCountChange && (
        <StorageShelfStepper width={width} height={height} depth={depth} count={drawerCount} min={2} max={6} onChange={onDrawerCountChange} />
      )}
    </group>
  );
}

export function WardrobeRenderer({
  input,
  doorStyle,
  frontView,
  viewMode,
  interactive = false,
  selectedModuleIndex = null,
  onSelectModule,
  onModuleWidthChange,
  onModuleHeightChange,
  onModuleDepthChange,
  onShelfCountChange,
  onDrawerCountChange,
  showDimensions = false,
  embedded = false,
}: PreviewRendererProps) {
  const material = materialPresets[getMaterialPreset(input.material)];
  const rules = productRules.built_in_wardrobe;
  const layout = normalizeWardrobeModules(input.wardrobe_modules_mm, input.wardrobe_module_types, input.width_mm);
  const drawerCounts = alignWardrobeCounts(input.wardrobe_drawer_counts, layout.modules.length, 4, 2, 6);
  const shelfCounts = alignWardrobeCounts(input.wardrobe_shelf_counts, layout.modules.length, 4, 1, 10);
  const swings: DoorSwing[] = layout.modules.map((_, index) => input.wardrobe_door_swings?.[index] ?? "pair");
  const h = Math.max(input.height_mm, rules.minHeight) / 1000;
  const d = Math.max(input.depth_mm, rules.minDepth) / 1000;
  const isSliding = input.open_type?.includes("슬라이딩") ?? false;
  const showHandles = input.handle_type !== "무손잡이";

  const moduleWidthsM = layout.modules.map((mm) => mm / 1000);
  const totalW = moduleWidthsM.reduce((sum, w) => sum + w, 0);
  let cursor = -totalW / 2;
  const moduleXs = moduleWidthsM.map((w) => {
    const center = cursor + w / 2;
    cursor += w;
    return center;
  });

  const widthLimits: StorageDimensionLimits = {
    width: { min: MIN_WARDROBE_MODULE_WIDTH_MM, max: MAX_WARDROBE_MODULE_WIDTH_MM, step: 10 },
    height: { min: rules.minHeight, max: rules.maxHeight, step: 10 },
    depth: { min: rules.minDepth, max: rules.maxDepth, step: 10 },
  };

  return (
    <group rotation={[0, frontView ? 0 : -0.32, 0]}>
      {!embedded && <PreviewRoom widthM={Math.max(totalW, 0.4)} depthM={d} floorY={0} topY={h} />}
      <Trim size={[totalW * 1.02, 0.012, d * 1.02]} position={[0, h - 0.006, 0]} color={material.edge} />

      {layout.modules.map((moduleMm, index) => (
        <WardrobeModule
          key={`wmodule-${index}`}
          x={moduleXs[index]}
          width={moduleWidthsM[index]}
          height={h}
          depth={d}
          type={layout.moduleTypes[index]}
          shelfCount={shelfCounts[index]}
          drawerCount={drawerCounts[index]}
          material={material}
          doorStyle={doorStyle}
          showHandles={showHandles}
          selected={interactive && selectedModuleIndex === index}
          interactive={interactive}
          sliding={isSliding}
          doorSwing={swings[index]}
          widthLimits={widthLimits}
          widthMm={moduleMm}
          heightMm={input.height_mm}
          depthMm={input.depth_mm}
          onSelect={() => onSelectModule?.(index, "base", "module")}
          onWidthChange={onModuleWidthChange}
          onHeightChange={onModuleHeightChange}
          onDepthChange={onModuleDepthChange}
          onShelfCountChange={onShelfCountChange}
          onDrawerCountChange={onDrawerCountChange}
          viewMode={viewMode}
        />
      ))}

      {/* 슬라이딩은 전체 폭을 덮는 슬라이딩 도어 1세트로 표현 */}
      {isSliding && (
        <SlidingDoors
          width={totalW}
          height={h}
          depth={d}
          thickness={BOARD_THICKNESS_M}
          material={material}
          doorStyle={doorStyle}
          viewMode={viewMode}
          open={viewMode === "doors_open" && interactive && selectedModuleIndex !== null}
          openDirection={(input.door_swing ?? "right") === "left" ? "left" : "right"}
        />
      )}
      {showDimensions && <BoxDimensions widthMm={Math.round(totalW * 1000)} heightMm={input.height_mm} depthMm={input.depth_mm} w={totalW} h={h} d={d} />}
    </group>
  );
}
