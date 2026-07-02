"use client";

import { BOARD_THICKNESS_M } from "@/components/preview3d/constants";
import { Doors, Panel, PreviewRoom } from "@/components/preview3d/primitives";
import { getMaterialPreset, lighten, materialPresets } from "@/components/preview3d/materials";
import { StorageEditLayer, getStorageDimensionLimits } from "@/components/preview3d/controls/StorageSceneControls";
import { BoxDimensions } from "@/components/preview3d/primitives/DimensionMarkers";
import type { PreviewRendererProps } from "@/components/preview3d/types";

/**
 * 거실 인테리어장(TV장·벽장·장식장) 전용 렌더러.
 * 하부는 도어 수납 구역, 상부는 오픈 진열 구역으로 나눠 "인테리어장" 느낌을 준다.
 */
export function LivingCabinetRenderer({
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
  showDimensions = false,
  embedded = false,
}: PreviewRendererProps) {
  const materialPreset = getMaterialPreset(input.material);
  const material = materialPresets[materialPreset];
  const w = Math.max(input.width_mm, 800) / 1000;
  const h = Math.max(input.height_mm, 400) / 1000;
  const d = Math.max(input.depth_mm, 300) / 1000;
  const t = BOARD_THICKNESS_M;
  const innerWidth = Math.max(w - t * 2, 0.04);
  const shelfCount = Math.max(0, Math.floor(input.shelf_count));
  const hasDoors = input.has_door;
  const hasBack = input.back_panel !== false;
  const doorCount = hasDoors ? Math.max(1, Math.floor(input.door_count || 1)) : 0;
  const selected = selectedModuleIndex === 0;

  // 하부 도어 구역 = 전체 높이의 ratio(0.3~0.6, 최대 900mm), 그 위는 오픈 진열
  const doorRatio = Math.min(0.6, Math.max(0.3, input.living_door_ratio ?? 0.45));
  const doorZoneHeight = hasDoors ? Math.min(h * doorRatio, 0.9) : 0;
  const openBottom = t + doorZoneHeight;
  const openHeight = Math.max(h - openBottom - t, 0.1);
  const openShelfCount = Math.max(0, shelfCount);
  const openShelfPositionsY = Array.from({ length: openShelfCount }).map(
    (_, index) => openBottom + (openHeight * (index + 1)) / (openShelfCount + 1),
  );

  return (
    <group rotation={[0, frontView ? 0 : -0.34, 0]}>
      {!embedded && <PreviewRoom widthM={w} depthM={d} floorY={0} topY={h} />}

      {/* Carcass */}
      <Panel size={[t, h, d]} position={[-w / 2 + t / 2, h / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[t, h, d]} position={[w / 2 - t / 2, h / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[innerWidth, t, d]} position={[0, h - t / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[innerWidth, t, d]} position={[0, t / 2, 0]} color={material.color} edge={material.edge} />
      {hasBack && (
        <Panel size={[w, h, t * 0.6]} position={[0, h / 2, -d / 2 + t * 0.3]} color={lighten(material.color)} edge={material.edge} />
      )}

      {/* Divider between door zone and open display zone */}
      {hasDoors && (
        <Panel size={[innerWidth, t, d * 0.96]} position={[0, openBottom - t / 2, 0]} color={material.color} edge={material.edge} />
      )}

      {/* Open display shelves */}
      {openShelfPositionsY.map((y, index) => (
        <Panel
          key={`living-shelf-${index}`}
          size={[innerWidth, t, d * 0.9]}
          position={[0, y, 0.01]}
          color={material.color}
          edge={material.edge}
        />
      ))}

      {/* Lower doors */}
      {hasDoors && (
        <group position={[0, t, 0]}>
          <Doors
            count={doorCount}
            width={w}
            height={doorZoneHeight}
            depth={d}
            thickness={t}
            material={material}
            doorStyle={doorStyle}
            showHandles={input.handle_type !== "무손잡이"}
            viewMode={viewMode}
            doorSwing={input.door_swing ?? "pair"}
            animatedOpen={selected}
            shelfPositionsY={[]}
          />
        </group>
      )}

      <StorageEditLayer
        interactive={interactive}
        selected={selected}
        width={w}
        height={h}
        depth={d}
        widthMm={input.width_mm}
        heightMm={input.height_mm}
        depthMm={input.depth_mm}
        shelfCount={shelfCount}
        shelfMin={0}
        shelfMax={12}
        limits={getStorageDimensionLimits(input.productType)}
        onSelect={() => onSelectModule?.(0, "base", "module")}
        onWidthChange={onModuleWidthChange}
        onHeightChange={onModuleHeightChange}
        onDepthChange={onModuleDepthChange}
        onShelfCountChange={onShelfCountChange}
      />
      {showDimensions && <BoxDimensions widthMm={input.width_mm} heightMm={input.height_mm} depthMm={input.depth_mm} w={w} h={h} d={d} />}
    </group>
  );
}
