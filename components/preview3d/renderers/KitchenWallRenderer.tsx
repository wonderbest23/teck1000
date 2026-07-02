"use client";

import { KITCHEN_WALL_BOTTOM_M, KITCHEN_WALL_DEPTH_M } from "@/components/preview3d/constants";
import { HoodFixture } from "@/components/preview3d/renderers/KitchenFixtures";
import { getHoodSpec } from "@/lib/kitchen";
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
  // 표준 상부장 윗선(설치높이+800)에 상단 정렬 — 후드장(H600)은 아래가 올라가 후드 공간 확보
  const wallBottomY = KITCHEN_WALL_BOTTOM_M + Math.max(0, 0.8 - Math.max(input.height_mm, 200) / 1000);

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
      {/* 후드장 — hood_option이 있으면 장 아래에 슬라이드/침니 후드 렌더(그냥 장이 아니라 실제 후드장) */}
      {input.hood_option && input.hood_option !== "none" && (
        <HoodFixture
          x={0}
          upperBottomY={wallBottomY}
          widthM={getHoodSpec(input.hood_option).widthMm / 1000}
          shape={getHoodSpec(input.hood_option).shape}
        />
      )}

      {showDimensions && <BoxDimensions widthMm={input.width_mm} heightMm={input.height_mm} depthMm={input.depth_mm} w={w} h={h} d={depth} baseY={wallBottomY} />}
    </group>
  );
}
