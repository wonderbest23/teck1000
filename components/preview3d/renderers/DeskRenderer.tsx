"use client";

import { BOARD_THICKNESS_M } from "@/components/preview3d/constants";
import { Panel, PreviewRoom } from "@/components/preview3d/primitives";
import { getMaterialPreset, lighten, materialPresets } from "@/components/preview3d/materials";
import { StorageEditLayer, getStorageDimensionLimits } from "@/components/preview3d/controls/StorageSceneControls";
import { BoxDimensions } from "@/components/preview3d/primitives/DimensionMarkers";
import { StorageDrawers } from "@/components/preview3d/renderers/StorageDrawers";
import type { PreviewRendererProps } from "@/components/preview3d/types";

export function DeskRenderer({
  input,
  viewMode,
  frontView,
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
  const w = Math.max(input.width_mm, 900) / 1000;
  const h = Math.max(input.height_mm, 680) / 1000;
  const d = Math.max(input.depth_mm, 450) / 1000;
  const t = BOARD_THICKNESS_M;
  const topT = Math.max(t * 1.2, 0.022);
  const legH = Math.max(h - topT, 0.5);
  const legY = legH / 2;
  const legInset = Math.min(w * 0.22, 0.24);
  const leftLegX = -(w / 2 - legInset);
  const shelfCount = Math.min(6, Math.max(0, Math.round(input.shelf_count ?? 0)));
  const selected = selectedModuleIndex === 0;
  const drawerCount = Math.min(4, Math.max(0, Math.round(input.storage_drawer_count ?? 0)));
  const hasDrawerPedestal = drawerCount > 0;
  const pedestalW = hasDrawerPedestal ? Math.min(Math.max(w * 0.34, 0.32), w * 0.44) : 0;
  const pedestalCenterX = w / 2 - pedestalW / 2;
  const pedestalInnerW = Math.max(pedestalW - t * 2, 0.2);
  const drawerZoneH = hasDrawerPedestal ? legH - t : 0;
  const openAll = viewMode === "doors_open";
  const shelfGapH = Math.max(legH - (hasDrawerPedestal ? 0 : 0) - t * 2, 0.16);

  return (
    <group rotation={[0, frontView ? 0 : -0.32, 0]}>
      {!embedded && <PreviewRoom widthM={w} depthM={d} floorY={0} topY={h} />}

      {/* Top board */}
      <Panel size={[w, topT, d]} position={[0, h - topT / 2, 0]} color={material.color} edge={material.edge} />

      {/* Left leg */}
      <Panel size={[t, legH, d * 0.92]} position={[leftLegX, legY, 0]} color={material.color} edge={material.edge} />

      {/* Right: drawer pedestal or matching leg */}
      {hasDrawerPedestal ? (
        <>
          <Panel size={[t, legH, d * 0.96]} position={[pedestalCenterX - pedestalW / 2 + t / 2, legY, 0]} color={material.color} edge={material.edge} />
          <Panel size={[t, legH, d * 0.96]} position={[pedestalCenterX + pedestalW / 2 - t / 2, legY, 0]} color={material.color} edge={material.edge} />
          <Panel size={[pedestalInnerW, t, d * 0.96]} position={[pedestalCenterX, t / 2, 0]} color={material.color} edge={material.edge} />
          <Panel size={[pedestalW, legH, t * 0.6]} position={[pedestalCenterX, legY, -d / 2 + t * 0.3]} color={lighten(material.color)} edge={material.edge} />
          <StorageDrawers
            width={pedestalInnerW}
            bottomY={t}
            zoneHeight={drawerZoneH}
            depth={d}
            count={drawerCount}
            material={material}
            open={openAll}
            showHandles={input.handle_type !== "무손잡이"}
            offsetX={pedestalCenterX}
          />
        </>
      ) : (
        <Panel size={[t, legH, d * 0.92]} position={[w / 2 - legInset, legY, 0]} color={material.color} edge={material.edge} />
      )}

      {/* Back modesty panel */}
      <Panel
        size={[Math.max(w - legInset * 2.2, 0.4), Math.min(legH * 0.38, 0.32), t]}
        position={[0, h - topT - Math.min(legH * 0.24, 0.22), -d / 2 + t / 2]}
        color={material.color}
        edge={material.edge}
      />

      {/* Optional lower shelves between legs */}
      {shelfCount > 0 &&
        Array.from({ length: shelfCount }).map((_, index) => {
          const shelfSpan = hasDrawerPedestal ? w - legInset - pedestalW - t * 2 : Math.max(w - legInset * 2.6, 0.4);
          const shelfCenterX = hasDrawerPedestal ? (leftLegX + (pedestalCenterX - pedestalW / 2)) / 2 : 0;
          const y = t + (shelfGapH * (index + 1)) / (shelfCount + 1);
          return (
            <Panel
              key={`desk-shelf-${index}`}
              size={[Math.max(shelfSpan, 0.28), t, d * 0.62]}
              position={[shelfCenterX, y, 0.03]}
              color={material.color}
              edge={material.edge}
            />
          );
        })}

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
        shelfMax={6}
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
