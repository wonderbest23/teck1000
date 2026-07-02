"use client";

import { BOARD_THICKNESS_M } from "@/components/preview3d/constants";
import { Doors, Panel, PreviewRoom, SlidingDoors, WoodGrain } from "@/components/preview3d/primitives";
import { getMaterialPreset, lighten, materialPresets } from "@/components/preview3d/materials";
import { StorageEditLayer, getStorageDimensionLimits } from "@/components/preview3d/controls/StorageSceneControls";
import { BoxDimensions } from "@/components/preview3d/primitives/DimensionMarkers";
import { StorageDrawers } from "@/components/preview3d/renderers/StorageDrawers";
import { carcassShellProps, resolveModuleViewMode } from "@/components/preview3d/modes/visibilityModes";
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
  // 하단 서랍 구역 — 서랍이 있으면 문/선반은 그 위쪽에만 (경첩·문짝과 간섭 없음)
  const drawerCount = Math.min(4, Math.max(0, Math.round(input.storage_drawer_count ?? 0)));
  const drawerZone = drawerCount > 0 ? Math.min(h * 0.55, drawerCount * 0.2 + t) : 0;
  const upperBottom = t + drawerZone; // 선반/문 구역 시작 높이
  const doorZoneHeight = Math.max(h - upperBottom, 0.2);
  const doorShelfPositionsY = Array.from({ length: shelfCount }).map(
    (_, index) => t + ((h - upperBottom - t * 2) * (index + 1)) / (shelfCount + 1),
  );
  const isSliding = hasDoors && (input.open_type ?? "").includes("슬라이딩");
  const openAll = viewMode === "doors_open";
  const revealInterior = selected;
  const moduleViewMode = resolveModuleViewMode(viewMode, revealInterior);
  const shell = carcassShellProps(revealInterior);
  const doorsOpenOnSelect = selected || openAll;

  return (
    <group rotation={[0, frontView ? 0 : -0.38, 0]}>
      {!embedded && <PreviewRoom widthM={w} depthM={d} floorY={0} topY={h} />}
      <Panel size={[t, h, d]} position={[-w / 2 + t / 2, h / 2, 0]} color={material.color} edge={material.edge} {...shell} />
      <Panel size={[t, h, d]} position={[w / 2 - t / 2, h / 2, 0]} color={material.color} edge={material.edge} {...shell} />
      <Panel size={[innerWidth, t, d]} position={[0, h - t / 2, 0]} color={material.color} edge={material.edge} {...shell} />
      <Panel size={[innerWidth, t, d]} position={[0, t / 2, 0]} color={material.color} edge={material.edge} {...shell} />
      <Panel size={[w, h, t * 0.6]} position={[0, h / 2, -d / 2 + t * 0.3]} color={lighten(material.color)} edge={material.edge} {...shell} />
      {/* 서랍 구역 상단 칸막이(고정 선반) */}
      {drawerCount > 0 && (
        <Panel size={[innerWidth, t, d * 0.96]} position={[0, upperBottom + t / 2, 0]} color={material.color} edge={material.edge} />
      )}
      {Array.from({ length: shelfCount }).map((_, index) => (
        <Panel
          key={`shelf-${index}`}
          size={[innerWidth, t, d * 0.94]}
          position={[0, upperBottom + t + ((h - upperBottom - t * 2) * (index + 1)) / (shelfCount + 1), 0.01]}
          color={material.color}
          edge={material.edge}
        />
      ))}
      {drawerCount > 0 && (
        <StorageDrawers
          width={innerWidth}
          bottomY={t}
          zoneHeight={drawerZone}
          depth={d}
          count={drawerCount}
          material={material}
          open={openAll || revealInterior}
          showHandles={input.handle_type !== "무손잡이"}
        />
      )}
      {hasDoors && isSliding && (
        <group position={[0, upperBottom, 0]}>
          <SlidingDoors
            width={w}
            height={Math.max(h - upperBottom, 0.2)}
            depth={d}
            thickness={t}
            material={material}
            doorStyle={doorStyle}
            viewMode={moduleViewMode}
            open={doorsOpenOnSelect}
            openDirection={(input.door_swing ?? "right") === "left" ? "left" : "right"}
            revealInterior={revealInterior}
          />
        </group>
      )}
      {hasDoors && !isSliding && (
        <group position={[0, upperBottom, 0]}>
          <Doors
            count={doorCount}
            width={w}
            height={doorZoneHeight}
            depth={d}
            thickness={t}
            material={material}
            doorStyle={doorStyle}
            showHandles={input.handle_type !== "무손잡이"}
            viewMode={moduleViewMode}
            doorSwing={input.door_swing ?? "pair"}
            animatedOpen={selected}
            revealInterior={revealInterior}
            shelfPositionsY={doorShelfPositionsY}
          />
        </group>
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
