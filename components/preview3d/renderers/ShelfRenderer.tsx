"use client";

import { BOARD_THICKNESS_M } from "@/components/preview3d/constants";
import { Doors, Panel, PreviewRoom, WoodGrain } from "@/components/preview3d/primitives";
import { getMaterialPreset, lighten, materialPresets } from "@/components/preview3d/materials";
import { StorageEditLayer, getStorageDimensionLimits } from "@/components/preview3d/controls/StorageSceneControls";
import { BoxDimensions } from "@/components/preview3d/primitives/DimensionMarkers";
import type { PreviewRendererProps } from "@/components/preview3d/types";

export function ShelfRenderer({
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
  const w = Math.max(input.width_mm, 200) / 1000;
  const h = Math.max(input.height_mm, 300) / 1000;
  const d = Math.max(input.depth_mm, 150) / 1000;
  const t = BOARD_THICKNESS_M;
  const shelfCount = Math.max(0, Math.floor(input.shelf_count));
  const hasDoors = input.has_door || input.productType === "gap_cabinet";
  const doorCount = hasDoors ? Math.max(1, Math.floor(input.door_count || 1)) : 0;
  const innerWidth = Math.max(w - t * 2, 0.04);
  const selected = selectedModuleIndex === 0;

  return (
    <group rotation={[0, frontView ? 0 : -0.38, 0]}>
      {!embedded && <PreviewRoom widthM={w} depthM={d} floorY={0} topY={h} />}
      <Panel size={[t, h, d]} position={[-w / 2 + t / 2, h / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[t, h, d]} position={[w / 2 - t / 2, h / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[innerWidth, t, d]} position={[0, h - t / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[innerWidth, t, d]} position={[0, t / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[w, h, t * 0.6]} position={[0, h / 2, -d / 2 + t * 0.3]} color={lighten(material.color)} edge={material.edge} />
      {Array.from({ length: shelfCount }).map((_, index) => (
        <Panel
          key={`shelf-${index}`}
          size={[innerWidth, t, d * 0.94]}
          position={[0, t + ((h - t * 2) * (index + 1)) / (shelfCount + 1), 0.01]}
          color={material.color}
          edge={material.edge}
        />
      ))}
      {hasDoors && (
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
        />
      )}
      {(materialPreset.includes("oak") || materialPreset.includes("mdf") || materialPreset.includes("plywood")) && (
        <WoodGrain width={w} height={h} depth={d} color={material.accent} />
      )}
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
