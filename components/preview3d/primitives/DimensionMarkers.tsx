"use client";

import { Html } from "@react-three/drei";

const LABEL_FACTOR = 4.5;

function Label({ position, mm, label, color }: { position: [number, number, number]; mm: number; label: string; color: string }) {
  return (
    <Html position={position} center distanceFactor={LABEL_FACTOR} zIndexRange={[27, 17]}>
      <div style={{ pointerEvents: "none", backgroundColor: color }} className="whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-black text-white shadow-md">
        {label} {mm}
      </div>
    </Html>
  );
}

/** 가로 치수 (X 방향, 앞쪽 바닥) */
function WidthMarker({ x0, x1, y, z, mm, color }: { x0: number; x1: number; y: number; z: number; mm: number; color: string }) {
  const midX = (x0 + x1) / 2;
  return (
    <group>
      <mesh position={[midX, y, z]}>
        <boxGeometry args={[Math.max(x1 - x0, 0.05), 0.014, 0.014]} />
        <meshStandardMaterial color={color} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      {[x0, x1].map((x, index) => (
        <mesh key={`wtick-${index}`} position={[x, y, z]}>
          <boxGeometry args={[0.014, 0.11, 0.014]} />
          <meshStandardMaterial color={color} transparent opacity={0.95} depthWrite={false} />
        </mesh>
      ))}
      <Label position={[midX, y - 0.05, z]} mm={mm} label="가로" color={color} />
    </group>
  );
}

/** 높이 치수 (Y 방향, 좌측) */
function HeightMarker({ x, y0, y1, z, mm, color }: { x: number; y0: number; y1: number; z: number; mm: number; color: string }) {
  const midY = (y0 + y1) / 2;
  return (
    <group>
      <mesh position={[x, midY, z]}>
        <boxGeometry args={[0.014, Math.max(y1 - y0, 0.05), 0.014]} />
        <meshStandardMaterial color={color} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      {[y0, y1].map((y, index) => (
        <mesh key={`htick-${index}`} position={[x, y, z]}>
          <boxGeometry args={[0.11, 0.014, 0.014]} />
          <meshStandardMaterial color={color} transparent opacity={0.95} depthWrite={false} />
        </mesh>
      ))}
      <Label position={[x - 0.05, midY, z]} mm={mm} label="높이" color={color} />
    </group>
  );
}

/** 깊이 치수 (Z 방향, 우측) */
function DepthMarker({ x, y, z0, z1, mm, color }: { x: number; y: number; z0: number; z1: number; mm: number; color: string }) {
  const midZ = (z0 + z1) / 2;
  return (
    <group>
      <mesh position={[x, y, midZ]}>
        <boxGeometry args={[0.014, 0.014, Math.max(z1 - z0, 0.05)]} />
        <meshStandardMaterial color={color} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      {[z0, z1].map((z, index) => (
        <mesh key={`dtick-${index}`} position={[x, y, z]}>
          <boxGeometry args={[0.11, 0.014, 0.014]} />
          <meshStandardMaterial color={color} transparent opacity={0.95} depthWrite={false} />
        </mesh>
      ))}
      <Label position={[x + 0.05, y, midZ]} mm={mm} label="깊이" color={color} />
    </group>
  );
}

/** 박스형 가구의 가로·높이·깊이 실측 마커를 한 번에 — w/h/d는 미터, *Mm은 라벨값, baseY는 박스 바닥 높이 */
export function BoxDimensions({
  widthMm,
  heightMm,
  depthMm,
  w,
  h,
  d,
  baseY = 0,
}: {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  w: number;
  h: number;
  d: number;
  baseY?: number;
}) {
  return (
    <group>
      <WidthMarker x0={-w / 2} x1={w / 2} y={baseY + 0.01} z={d / 2 + 0.18} mm={Math.round(widthMm)} color="#2563eb" />
      <HeightMarker x={-w / 2 - 0.16} y0={baseY} y1={baseY + h} z={d / 2} mm={Math.round(heightMm)} color="#7c3aed" />
      <DepthMarker x={w / 2 + 0.16} y={baseY + h / 2} z0={-d / 2} z1={d / 2} mm={Math.round(depthMm)} color="#0d9488" />
    </group>
  );
}
