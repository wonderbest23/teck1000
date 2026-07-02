"use client";

import {
  KITCHEN_BASE_DEPTH_M,
  KITCHEN_TOE_KICK_M,
} from "@/components/preview3d/constants";
import { IslandEndPanels, KitchenBaseModule } from "@/components/preview3d/kitchen/KitchenModules";
import { getSinkFixtureSpec } from "@/components/preview3d/kitchen/sinkFixtureSpec";
import { PreviewRoom } from "@/components/preview3d/primitives";
import { BoxDimensions } from "@/components/preview3d/primitives/DimensionMarkers";
import { getMaterialPreset, materialPresets } from "@/components/preview3d/materials";
import type { PreviewRendererProps } from "@/components/preview3d/types";
import {
  getCountertopOption,
  getFaucetOption,
  getSinkOption,
  type KitchenModuleType,
} from "@/lib/kitchen";
import { FaucetFixture, IslandCountertopTrim, SinkFixture } from "./KitchenFixtures";

export function KitchenIslandRenderer(props: PreviewRendererProps) {
  const {
    input,
    doorStyle,
    frontView,
    viewMode,
    selectedModuleIndex,
    selectedEditTarget = "module",
    interactive = false,
    onSelectModule,
    onDoubleClickModule,
    onPrepareDragModule,
    onDrawerCountChange,
    onShelfCountChange,
    onEditStart,
    onEditEnd,
    showDimensions = false,
    embedded = false,
  } = props;
  const material = materialPresets[getMaterialPreset(input.material)];
  const w = Math.max(input.width_mm, 600) / 1000;
  const bodyH = Math.max(input.height_mm, 800) / 1000;
  const depth = Math.max(input.depth_mm, KITCHEN_BASE_DEPTH_M * 1000) / 1000;
  const countertop = getCountertopOption(input.countertop_type);
  const sink = getSinkOption(input.sink_option);
  const faucet = getFaucetOption(input.faucet_option);
  const doorCount = Math.max(1, Math.floor(input.door_count || 2));
  const moduleType: KitchenModuleType =
    (input.kitchen_module_types?.[0] as KitchenModuleType | undefined) ??
    ((input.drawer_module_count ?? 0) > 0 ? "drawer" : "door");
  const baseFloorY = KITCHEN_TOE_KICK_M;
  const topY = baseFloorY + bodyH;
  const showCountertop = countertop.id !== "none";
  const sinkSpec = getSinkFixtureSpec(input.sink_option, w);
  const showSinkInterior = moduleType === "sink_base" || sink.id !== "none";
  const showHandles = input.handle_type !== "무손잡이";

  return (
    <group rotation={[0, frontView ? 0 : -0.22, 0]}>
      {!embedded && <PreviewRoom widthM={w + 0.08} depthM={depth + 0.06} floorY={0} topY={KITCHEN_TOE_KICK_M + bodyH} />}
      <KitchenBaseModule
        width={w}
        height={bodyH}
        depth={depth}
        x={0}
        y={0}
        material={material}
        doorStyle={doorStyle}
        moduleType={moduleType}
        doorCount={doorCount}
        drawerCount={input.kitchen_drawer_counts?.[0] ?? 3}
        shelfCount={input.kitchen_base_shelf_counts?.[0] ?? input.shelf_count}
        showHandles={showHandles}
        selected={interactive && selectedModuleIndex === 0}
        selectedTarget={selectedEditTarget}
        dragging={false}
        interactive={interactive}
        hasToeKick={false}
        viewMode={viewMode}
        doorSwing={input.door_swing ?? "pair"}
        sinkSpec={showSinkInterior ? sinkSpec : undefined}
        onDrawerCountChange={onDrawerCountChange}
        onShelfCountChange={onShelfCountChange}
        onEditStart={onEditStart}
        onEditEnd={onEditEnd}
        onPointerDown={(clientX, clientY) => onPrepareDragModule?.(0, "base", clientX, clientY)}
        onSelectTarget={(target) => onSelectModule(0, "base", target)}
        onDoubleClick={() => onDoubleClickModule?.(0, "base")}
      />
      <IslandEndPanels width={w} height={bodyH} depth={depth} material={material} />
      {showCountertop && <IslandCountertopTrim width={w} y={topY} depth={depth} countertopId={countertop.id} />}
      {showCountertop && sink.id !== "none" && (
        <SinkFixture x={0} counterTopY={topY} sinkOptionId={input.sink_option} cabinetWidthM={w} />
      )}
      {showCountertop && faucet.id !== "none" && sink.id !== "none" && (
        <FaucetFixture x={0} counterTopY={topY} faucetId={faucet.id} />
      )}
      {showDimensions && <BoxDimensions widthMm={input.width_mm} heightMm={input.height_mm} depthMm={input.depth_mm} w={w} h={bodyH} d={depth} baseY={baseFloorY} />}
    </group>
  );
}
