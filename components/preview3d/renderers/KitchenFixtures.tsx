"use client";

import { KITCHEN_COUNTERTOP_M } from "@/components/preview3d/constants";
import { getSinkFixtureSpec } from "@/components/preview3d/kitchen/sinkFixtureSpec";
import { Trim } from "@/components/preview3d/primitives";
import type { KitchenMovableKey } from "@/components/preview3d/types";

export function CountertopTrim({ width, y, depth, countertopId }: { width: number; y: number; depth: number; countertopId: string }) {
  return (
    <Trim
      size={[width * 0.98, KITCHEN_COUNTERTOP_M, depth * 0.95]}
      position={[0, y + KITCHEN_COUNTERTOP_M / 2, 0.02]}
      color={countertopId === "stainless" ? "#94a3b8" : "#e5e7eb"}
    />
  );
}

export function SinkFixture({
  x,
  counterTopY,
  sinkOptionId,
  cabinetWidthM,
  selected,
  onPointerDown,
}: {
  x: number;
  counterTopY: number;
  sinkOptionId?: string;
  cabinetWidthM: number;
  selected?: boolean;
  onPointerDown?: (clientX: number, clientY: number) => void;
}) {
  const spec = getSinkFixtureSpec(sinkOptionId, cabinetWidthM);
  const rimY = counterTopY + KITCHEN_COUNTERTOP_M + spec.rimHeightM / 2;

  return (
    <group
      onPointerDown={
        onPointerDown
          ? (event) => {
              event.stopPropagation();
              onPointerDown(event.clientX, event.clientY);
            }
          : undefined
      }
    >
      {selected && (
        <mesh position={[x, rimY + 0.01, 0.06]}>
          <boxGeometry args={[spec.widthM + 0.08, spec.rimHeightM + 0.02, spec.depthM + 0.08]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.26} depthWrite={false} />
        </mesh>
      )}
      <Trim size={[spec.widthM, spec.rimHeightM, spec.depthM]} position={[x, rimY, 0.06]} color="#94a3b8" />
      <mesh position={[x, counterTopY + KITCHEN_COUNTERTOP_M - spec.bowlDepthM * 0.35, 0.04]}>
        <boxGeometry args={[spec.widthM * 0.9, spec.bowlDepthM, spec.depthM * 0.85]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.42} roughness={0.55} />
      </mesh>
      {spec.hasMaster && (
        <mesh position={[x, counterTopY - spec.bowlDepthM * 0.15, 0.02]}>
          <boxGeometry args={[spec.widthM * 0.55, spec.bowlDepthM * 0.55, spec.depthM * 0.6]} />
          <meshStandardMaterial color="#475569" transparent opacity={0.28} />
        </mesh>
      )}
    </group>
  );
}

export function CooktopFixture({
  x,
  counterTopY,
  cooktopId,
  selected,
  onPointerDown,
}: {
  x: number;
  counterTopY: number;
  cooktopId: string;
  selected?: boolean;
  onPointerDown?: (clientX: number, clientY: number) => void;
}) {
  return (
    <group
      onPointerDown={
        onPointerDown
          ? (event) => {
              event.stopPropagation();
              onPointerDown(event.clientX, event.clientY);
            }
          : undefined
      }
    >
      {selected && (
        <mesh position={[x, counterTopY + KITCHEN_COUNTERTOP_M + 0.012, 0.06]}>
          <boxGeometry args={[0.56, 0.018, 0.4]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
      <Trim
        size={[0.48, 0.016, 0.32]}
        position={[x, counterTopY + KITCHEN_COUNTERTOP_M + 0.01, 0.06]}
        color={cooktopId.includes("gas") ? "#111827" : "#0f172a"}
      />
    </group>
  );
}

export function FaucetFixture({
  x,
  counterTopY,
  faucetId,
  selected,
  onPointerDown,
}: {
  x: number;
  counterTopY: number;
  faucetId: string;
  selected?: boolean;
  onPointerDown?: (clientX: number, clientY: number) => void;
}) {
  const color = faucetId.includes("black") ? "#111827" : "#64748b";
  return (
    <group
      position={[x + 0.18, counterTopY + KITCHEN_COUNTERTOP_M + 0.06, -0.12]}
      onPointerDown={
        onPointerDown
          ? (event) => {
              event.stopPropagation();
              onPointerDown(event.clientX, event.clientY);
            }
          : undefined
      }
    >
      {selected && (
        <mesh position={[-0.05, 0.08, 0.02]}>
          <boxGeometry args={[0.28, 0.24, 0.12]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.16} depthWrite={false} />
        </mesh>
      )}
      <Trim size={[0.035, 0.18, 0.035]} position={[0, 0.08, 0]} color={color} />
      <Trim size={[0.18, 0.03, 0.035]} position={[-0.07, 0.17, 0.05]} color={color} />
    </group>
  );
}

export function HoodFixture({
  x,
  upperBottomY,
  selected,
  widthM = 0.56,
  shape = "slide",
  onPointerDown,
}: {
  x: number;
  upperBottomY: number;
  selected?: boolean;
  widthM?: number;
  shape?: "slide" | "chimney" | "tower";
  onPointerDown?: (clientX: number, clientY: number) => void;
}) {
  const w = Math.max(widthM, 0.3);
  return (
    <group
      position={[x, upperBottomY - 0.08, 0.02]}
      onPointerDown={
        onPointerDown
          ? (event) => {
              event.stopPropagation();
              onPointerDown(event.clientX, event.clientY);
            }
          : undefined
      }
    >
      {selected && (
        <mesh position={[0, shape === "slide" ? -0.01 : 0.2, 0.01]}>
          <boxGeometry args={[w + 0.1, shape === "slide" ? 0.16 : 0.6, 0.42]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.2} depthWrite={false} />
        </mesh>
      )}

      {shape === "slide" && (
        <>
          <Trim size={[w, 0.1, 0.3]} position={[0, 0, 0]} color="#94a3b8" />
          <Trim size={[w * 0.85, 0.025, 0.26]} position={[0, -0.065, 0.02]} color="#64748b" />
        </>
      )}

      {shape === "chimney" && (
        <>
          {/* 캐노피 + 위로 뻗는 연통 */}
          <mesh position={[0, 0, -0.02]}>
            <boxGeometry args={[w, 0.16, 0.34]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} />
          </mesh>
          <Trim size={[w * 0.95, 0.02, 0.3]} position={[0, -0.085, 0.02]} color="#64748b" />
          <mesh position={[0, 0.42, -0.1]}>
            <boxGeometry args={[w * 0.34, 0.7, 0.16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.4} />
          </mesh>
        </>
      )}

      {shape === "tower" && (
        <>
          {/* 대형 단일 후드(벽부/아일랜드형): 넓은 본체 + 굵은 연통 */}
          <mesh position={[0, 0.02, -0.02]}>
            <boxGeometry args={[w, 0.26, 0.46]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.65} roughness={0.3} />
          </mesh>
          <Trim size={[w * 0.96, 0.02, 0.4]} position={[0, -0.12, 0.02]} color="#475569" />
          <mesh position={[0, 0.5, -0.12]}>
            <boxGeometry args={[w * 0.3, 0.8, 0.2]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />
          </mesh>
        </>
      )}
    </group>
  );
}

export function MicrowaveFixture({ x, onDragStart }: { x: number; onDragStart?: () => void }) {
  return (
    <group
      onPointerDown={
        onDragStart
          ? (event) => {
              event.stopPropagation();
              onDragStart();
            }
          : undefined
      }
    >
      <Trim size={[0.5, 0.28, 0.28]} position={[x, 1.58, 0.04]} color="#1f2937" />
    </group>
  );
}

export type FixtureDragHandlers = Partial<Record<KitchenMovableKey, () => void>>;
