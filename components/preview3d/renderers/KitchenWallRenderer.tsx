"use client";

import { KITCHEN_WALL_BOTTOM_M, KITCHEN_WALL_DEPTH_M } from "@/components/preview3d/constants";
import { KitchenWallModule } from "@/components/preview3d/kitchen/KitchenModules";
import { PreviewRoom } from "@/components/preview3d/primitives";
import { BoxDimensions } from "@/components/preview3d/primitives/DimensionMarkers";
import { getMaterialPreset, materialPresets } from "@/components/preview3d/materials";
import type { PreviewRendererProps } from "@/components/preview3d/types";

export function KitchenWallRenderer({ input, doorStyle, frontView, viewMode, showDimensions = false, embedded = false }: PreviewRendererProps) {
  const material = materialPresets[getMaterialPreset(input.material)];
  const w = Math.max(input.width_mm, 300) / 1000;
  const h = Math.max(input.height_mm, 300) / 1000;
  const depth = Math.max(input.depth_mm, KITCHEN_WALL_DEPTH_M * 1000) / 1000;
  const wallBottomY = KITCHEN_WALL_BOTTOM_M;

  return (
    <group rotation={[0, frontView ? 0 : -0.22, 0]}>
      {!embedded && <PreviewRoom widthM={w} depthM={depth} floorY={0} topY={wallBottomY + h} />}
      <KitchenWallModule
        width={w}
        height={h}
        depth={depth}
        x={0}
        y={wallBottomY}
        material={material}
        doorStyle={doorStyle}
        showHandles={input.handle_type !== "무손잡이"}
        viewMode={viewMode}
      />
      {showDimensions && <BoxDimensions widthMm={input.width_mm} heightMm={input.height_mm} depthMm={input.depth_mm} w={w} h={h} d={depth} baseY={wallBottomY} />}
    </group>
  );
}
