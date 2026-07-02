"use client";

import { BOARD_THICKNESS_M } from "@/components/preview3d/constants";
import { Doors, Panel, PreviewRoom, Trim } from "@/components/preview3d/primitives";
import { getMaterialPreset, lighten, materialPresets } from "@/components/preview3d/materials";
import { shouldShowInteriorHints } from "@/components/preview3d/modes/visibilityModes";
import { StorageEditLayer, getStorageDimensionLimits } from "@/components/preview3d/controls/StorageSceneControls";
import { BoxDimensions } from "@/components/preview3d/primitives/DimensionMarkers";
import type { PreviewRendererProps } from "@/components/preview3d/types";
import { ENTRANCE_STANDARDS } from "@/lib/platformConfig";

export function ShoeCabinetRenderer({
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
  const material = materialPresets[getMaterialPreset(input.material)];
  const w = Math.max(input.width_mm, 400) / 1000;
  const h = Math.max(input.height_mm, ENTRANCE_STANDARDS.minTotalHeightMm) / 1000;
  const d = Math.max(input.depth_mm, ENTRANCE_STANDARDS.preferredDepthMm) / 1000;
  const bottom = (input.bottom_space ?? 0) / 1000;
  const t = BOARD_THICKNESS_M;
  const innerWidth = Math.max(w - t * 2, 0.04);
  const shelfCount = Math.max(4, Math.floor(input.shelf_count || 6));
  const doorCount = Math.max(1, Math.floor(input.door_count || 1));
  const shelfPositionsY = Array.from({ length: shelfCount }).map((_, index) => t + ((h - t * 2) * (index + 1)) / (shelfCount + 1));
  const showInterior = shouldShowInteriorHints(viewMode);
  const tilted = input.shoe_shelf_angle ?? false;
  const selected = selectedModuleIndex === 0;

  return (
    <group position={[0, bottom, 0]} rotation={[0, frontView ? 0 : -0.28, 0]}>
      {!embedded && <PreviewRoom widthM={w} depthM={d} floorY={-bottom} topY={h} />}
      {bottom > 0 && <Trim size={[w * 0.9, bottom, d * 0.85]} position={[0, bottom / 2, 0]} color="#64748b" />}
      <Panel size={[t, h, d]} position={[-w / 2 + t / 2, h / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[t, h, d]} position={[w / 2 - t / 2, h / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[innerWidth, t, d]} position={[0, h - t / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[innerWidth, t, d]} position={[0, t / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[w, h, t * 0.5]} position={[0, h / 2, -d / 2 + t * 0.25]} color={lighten(material.color)} edge={material.edge} />
      {Array.from({ length: shelfCount }).map((_, index) => {
        const y = shelfPositionsY[index];
        const tiltZ = tilted ? -0.12 : 0;
        return (
          <group key={`shoe-shelf-${index}`} position={[0, y, 0.01]} rotation={[tiltZ, 0, 0]}>
            <Panel size={[innerWidth, t * 0.8, d * 0.88]} position={[0, 0, 0]} color={material.color} edge={material.edge} transparent={showInterior} opacity={showInterior ? 0.55 : 1} />
          </group>
        );
      })}
      <Doors
        count={doorCount}
        width={w}
        height={h}
        depth={d}
        thickness={t}
        material={material}
        doorStyle={doorStyle}
        showHandles={input.handle_type !== "무손잡이"}
        viewMode={viewMode}
        doorSwing={input.door_swing ?? "pair"}
        animatedOpen={selected}
        shelfPositionsY={shelfPositionsY}
      />
      <StorageEditLayer
        interactive={interactive}
        selected={selectedModuleIndex === 0}
        width={w}
        height={h}
        depth={d}
        widthMm={input.width_mm}
        heightMm={input.height_mm}
        depthMm={input.depth_mm}
        shelfCount={shelfCount}
        shelfMin={4}
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
