"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { Panel, Trim } from "@/components/preview3d/primitives";
import { lighten } from "@/components/preview3d/materials";
import type { MaterialColors } from "@/components/preview3d/types";

/** 하단 서랍 스택 — 문열림 모드에서만 레일·서랍통을 보여준다 */
export function StorageDrawers({
  width,
  bottomY,
  zoneHeight,
  depth,
  count,
  material,
  open,
  showHandles,
  offsetX = 0,
}: {
  width: number;
  bottomY: number;
  zoneHeight: number;
  depth: number;
  count: number;
  material: MaterialColors;
  open: boolean;
  showHandles: boolean;
  offsetX?: number;
}) {
  const refs = useRef<Array<Group | null>>([]);
  const gap = 0.01;
  const frontZ = depth / 2 + 0.012;
  const faceHeight = Math.max((zoneHeight - gap * (count + 1)) / count, 0.06);
  const boxDepth = Math.max(depth * 0.5, 0.16);
  const boxWidth = Math.max(width * 0.82, 0.12);
  const sideH = Math.max(faceHeight * 0.55, 0.045);

  useFrame((_, delta) => {
    refs.current.forEach((group, index) => {
      if (!group) return;
      const stagger = count <= 1 ? 1 : 1 - index * 0.14;
      const target = open ? depth * 0.24 * Math.max(0.55, stagger) : 0;
      group.position.z += (frontZ + target - group.position.z) * Math.min(1, delta * 8);
    });
  });

  return (
    <group position={[offsetX, bottomY, 0]}>
      {open &&
        Array.from({ length: count }).map((_, index) => {
          const y = zoneHeight - gap - faceHeight / 2 - index * (faceHeight + gap);
          return (
            <group key={`storage-rail-${index}`} position={[0, y - faceHeight * 0.08, 0]}>
              {[-1, 1].map((side) => (
                <Trim
                  key={`storage-rail-${index}-${side}`}
                  size={[0.018, 0.018, depth * 0.62]}
                  position={[side * width * 0.47, 0, -depth * 0.04]}
                  color="#94a3b8"
                />
              ))}
            </group>
          );
        })}
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
            {open && (
              <>
                <Panel size={[boxWidth, 0.012, boxDepth]} position={[0, -faceHeight * 0.2, -boxDepth / 2]} color={lighten(material.color)} edge={material.edge} />
                <Panel size={[0.014, sideH, boxDepth]} position={[-boxWidth / 2, -faceHeight * 0.2 + sideH / 2, -boxDepth / 2]} color={lighten(material.color)} edge={material.edge} />
                <Panel size={[0.014, sideH, boxDepth]} position={[boxWidth / 2, -faceHeight * 0.2 + sideH / 2, -boxDepth / 2]} color={lighten(material.color)} edge={material.edge} />
                <Panel size={[boxWidth, sideH, 0.014]} position={[0, -faceHeight * 0.2 + sideH / 2, -boxDepth]} color={lighten(material.color)} edge={material.edge} />
                {[-1, 1].map((side) => (
                  <Trim
                    key={`moving-rail-${index}-${side}`}
                    size={[0.012, 0.014, boxDepth * 0.9]}
                    position={[side * (boxWidth / 2 + 0.012), -faceHeight * 0.05, -boxDepth / 2]}
                    color="#64748b"
                  />
                ))}
              </>
            )}
            {showHandles && (
              <Trim size={[width * 0.4, 0.016, 0.024]} position={[0, -faceHeight * 0.22, 0.022]} color={material.edge} />
            )}
          </group>
        );
      })}
    </group>
  );
}
