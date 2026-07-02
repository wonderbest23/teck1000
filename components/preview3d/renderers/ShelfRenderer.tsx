"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { BOARD_THICKNESS_M } from "@/components/preview3d/constants";
import { Doors, Panel, PreviewRoom, SlidingDoors, Trim, WoodGrain } from "@/components/preview3d/primitives";
import { getMaterialPreset, lighten, materialPresets } from "@/components/preview3d/materials";
import { StorageEditLayer, getStorageDimensionLimits } from "@/components/preview3d/controls/StorageSceneControls";
import { BoxDimensions } from "@/components/preview3d/primitives/DimensionMarkers";
import type { MaterialColors, PreviewRendererProps } from "@/components/preview3d/types";

/** 하단 서랍 스택 — 문열림/선택 시 순차 슬라이드로 열린다 (주방 서랍과 동일한 감각) */
function StorageDrawers({
  width,
  bottomY,
  zoneHeight,
  depth,
  count,
  material,
  open,
  showHandles,
}: {
  width: number;
  bottomY: number;
  zoneHeight: number;
  depth: number;
  count: number;
  material: MaterialColors;
  open: boolean;
  showHandles: boolean;
}) {
  const refs = useRef<Array<Group | null>>([]);
  const gap = 0.01;
  const frontZ = depth / 2 + 0.012;
  const faceHeight = Math.max((zoneHeight - gap * (count + 1)) / count, 0.06);

  useFrame((_, delta) => {
    refs.current.forEach((group, index) => {
      if (!group) return;
      const stagger = count <= 1 ? 1 : 1 - index * 0.14;
      const target = open ? depth * 0.24 * Math.max(0.55, stagger) : 0;
      group.position.z += (frontZ + target - group.position.z) * Math.min(1, delta * 8);
    });
  });

  return (
    <group position={[0, bottomY, 0]}>
      {Array.from({ length: count }).map((_, index) => {
        const y = zoneHeight - gap - faceHeight / 2 - index * (faceHeight + gap);
        return (
          <group
            key={`storage-drawer-${index}`}
            ref={(node) => {
              refs.current[index] = node;
            }}
            position={[0, y, frontZ]}
          >
            <Panel size={[width * 0.96, faceHeight, 0.018]} position={[0, 0, 0]} color={material.color} edge={material.edge} />
            {showHandles && (
              <Trim size={[width * 0.4, 0.016, 0.024]} position={[0, -faceHeight * 0.22, 0.022]} color={material.edge} />
            )}
          </group>
        );
      })}
    </group>
  );
}

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
  const isSliding = hasDoors && (input.open_type ?? "").includes("슬라이딩");
  const openAll = selected || viewMode === "doors_open";

  return (
    <group rotation={[0, frontView ? 0 : -0.38, 0]}>
      {!embedded && <PreviewRoom widthM={w} depthM={d} floorY={0} topY={h} />}
      <Panel size={[t, h, d]} position={[-w / 2 + t / 2, h / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[t, h, d]} position={[w / 2 - t / 2, h / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[innerWidth, t, d]} position={[0, h - t / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[innerWidth, t, d]} position={[0, t / 2, 0]} color={material.color} edge={material.edge} />
      <Panel size={[w, h, t * 0.6]} position={[0, h / 2, -d / 2 + t * 0.3]} color={lighten(material.color)} edge={material.edge} />
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
          open={openAll}
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
            viewMode={viewMode}
            open={openAll}
            openDirection={(input.door_swing ?? "right") === "left" ? "left" : "right"}
          />
        </group>
      )}
      {hasDoors && !isSliding && (
        <group position={[0, upperBottom, 0]}>
          <Doors
            count={doorCount}
            width={w}
            height={Math.max(h - upperBottom, 0.2)}
            depth={d}
            thickness={t}
            material={material}
            doorStyle={doorStyle}
            showHandles={input.handle_type !== "무손잡이"}
            viewMode={viewMode}
            doorSwing={input.door_swing ?? "pair"}
            animatedOpen={selected}
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
