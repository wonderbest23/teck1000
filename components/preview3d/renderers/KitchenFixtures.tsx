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

/** 아일랜드 상판 — 본체 대비 오버행(전후좌우 돌출) */
export function IslandCountertopTrim({ width, y, depth, countertopId }: { width: number; y: number; depth: number; countertopId: string }) {
  const overhangW = 0.06;
  const overhangD = 0.05;
  return (
    <Trim
      size={[width + overhangW, KITCHEN_COUNTERTOP_M, depth + overhangD]}
      position={[0, y + KITCHEN_COUNTERTOP_M / 2, 0]}
      color={countertopId === "stainless" ? "#94a3b8" : "#e5e7eb"}
    />
  );
}

/** 상판(슬랩) — 싱크 위치에 실제 컷아웃(구멍)을 낸 4분할 슬랩.
 *  구멍이 실제로 뚫려 있어 그 안의 싱크볼 내부(벽·바닥·배수구)가 그대로 보인다. */
export function CountertopWithCutout({
  width,
  depth,
  y,
  z = 0.02,
  color,
  cutout,
  gaps = [],
}: {
  width: number;
  depth: number;
  y: number;
  z?: number;
  color: string;
  /** 싱크 컷아웃(부분 구멍) */
  cutout?: { x: number; w: number; d: number; z: number } | null;
  /** 상판이 아예 끊기는 구간(가스대 등 — 전체 깊이) */
  gaps?: Array<{ x: number; w: number }>;
}) {
  const yMid = y + KITCHEN_COUNTERTOP_M / 2;
  const left = -width / 2;
  const right = width / 2;
  const back = z - depth / 2;
  const front = z + depth / 2;
  // 가스대 구간으로 X 세그먼트 분할
  const sorted = [...gaps].sort((a, b) => a.x - b.x).filter((g) => g.x + g.w / 2 > left && g.x - g.w / 2 < right);
  const segments: Array<[number, number]> = [];
  let cursor = left;
  for (const gap of sorted) {
    const gl = Math.max(left, gap.x - gap.w / 2);
    const gr = Math.min(right, gap.x + gap.w / 2);
    if (gl - cursor > 0.01) segments.push([cursor, gl]);
    cursor = Math.max(cursor, gr);
  }
  if (right - cursor > 0.01) segments.push([cursor, right]);
  if (segments.length === 0) return null;
  return (
    <group>
      {segments.map(([a, b], index) => {
        const hasSink =
          cutout &&
          cutout.x - cutout.w / 2 > a + 0.01 &&
          cutout.x + cutout.w / 2 < b - 0.01 &&
          cutout.z - cutout.d / 2 > back + 0.005 &&
          cutout.z + cutout.d / 2 < front - 0.005;
        if (!hasSink || !cutout) {
          return <Trim key={`seg-${index}`} size={[b - a, KITCHEN_COUNTERTOP_M, depth]} position={[(a + b) / 2, yMid, z]} color={color} />;
        }
        const cl = cutout.x - cutout.w / 2;
        const cr = cutout.x + cutout.w / 2;
        const cb = cutout.z - cutout.d / 2;
        const cf = cutout.z + cutout.d / 2;
        return (
          <group key={`seg-${index}`}>
            <Trim size={[cl - a, KITCHEN_COUNTERTOP_M, depth]} position={[(a + cl) / 2, yMid, z]} color={color} />
            <Trim size={[b - cr, KITCHEN_COUNTERTOP_M, depth]} position={[(cr + b) / 2, yMid, z]} color={color} />
            <Trim size={[cutout.w, KITCHEN_COUNTERTOP_M, cb - back]} position={[cutout.x, yMid, (back + cb) / 2]} color={color} />
            <Trim size={[cutout.w, KITCHEN_COUNTERTOP_M, front - cf]} position={[cutout.x, yMid, (cf + front) / 2]} color={color} />
          </group>
        );
      })}
    </group>
  );
}

// 일반 상판+스텐볼: 림은 폴리시(밝고 매끈), 내부는 헤어라인(어둡고 결) — 상판과 또렷한 대비
const SINK_RIM_POLISHED = { color: "#cdd5db", metalness: 0.92, roughness: 0.16 } as const;
const SINK_STEEL_BRUSHED = { color: "#8d979f", metalness: 0.82, roughness: 0.34 } as const;
// 스텐 상판 일체형: 상판과 같은 톤으로 프레스 성형된 느낌(림 거의 없음)
const SINK_STEEL_TOP = { color: "#98a3ab", metalness: 0.85, roughness: 0.28 } as const;

/** 싱크볼 — 상판 컷아웃 안에 실제 볼(4벽+바닥+배수구, 더블볼은 중간 분리대) */
export function SinkFixture({
  x,
  counterTopY,
  sinkOptionId,
  cabinetWidthM,
  selected,
  countertopId = "pt_white",
  onPointerDown,
}: {
  x: number;
  counterTopY: number;
  sinkOptionId?: string;
  cabinetWidthM: number;
  selected?: boolean;
  /** 상판 종류 — stainless면 스텐 상판 일체형(프레스 볼), 그 외엔 상판+스텐볼 대비형 */
  countertopId?: string;
  onPointerDown?: (clientX: number, clientY: number) => void;
}) {
  const steelTop = countertopId === "stainless";
  const RIM = steelTop ? SINK_STEEL_TOP : SINK_RIM_POLISHED;
  const INNER = steelTop ? SINK_STEEL_TOP : SINK_STEEL_BRUSHED;
  const spec = getSinkFixtureSpec(sinkOptionId, cabinetWidthM);
  const topY = counterTopY + KITCHEN_COUNTERTOP_M; // 상판 윗면
  const w = spec.widthM;
  const d = spec.depthM;
  const zC = 0.06;
  const bowlDepth = Math.max(0.1, Math.min(spec.bowlDepthM, 0.18));
  const wallT = 0.012;
  const rimH = steelTop ? 0.004 : 0.01;
  const isDouble = (sinkOptionId ?? "").includes("double");
  const bowlBottomY = topY - bowlDepth;
  const drainXs = isDouble ? [x - w / 4, x + w / 4] : [x];

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
        <mesh position={[x, topY + 0.02, zC]}>
          <boxGeometry args={[w + 0.08, 0.05, d + 0.08]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.24} depthWrite={false} />
        </mesh>
      )}
      {/* 스텐 림 프레임 — 상판 위로 살짝 올라온 테두리 */}
      <mesh position={[x, topY + rimH / 2, zC - d / 2 + wallT / 2]}>
        <boxGeometry args={[w + wallT * 2, rimH, wallT]} />
        <meshStandardMaterial {...RIM} />
      </mesh>
      <mesh position={[x, topY + rimH / 2, zC + d / 2 - wallT / 2]}>
        <boxGeometry args={[w + wallT * 2, rimH, wallT]} />
        <meshStandardMaterial {...RIM} />
      </mesh>
      <mesh position={[x - w / 2 - wallT / 2, topY + rimH / 2, zC]}>
        <boxGeometry args={[wallT, rimH, d]} />
        <meshStandardMaterial {...RIM} />
      </mesh>
      <mesh position={[x + w / 2 + wallT / 2, topY + rimH / 2, zC]}>
        <boxGeometry args={[wallT, rimH, d]} />
        <meshStandardMaterial {...RIM} />
      </mesh>
      {/* 볼 내부 — 열린 윗면: 4벽 + 바닥 (컷아웃 구멍으로 실제 내부가 보인다) */}
      <mesh position={[x, topY - bowlDepth / 2, zC - d / 2 + wallT / 2]}>
        <boxGeometry args={[w, bowlDepth, wallT]} />
        <meshStandardMaterial {...INNER} />
      </mesh>
      <mesh position={[x, topY - bowlDepth / 2, zC + d / 2 - wallT / 2]}>
        <boxGeometry args={[w, bowlDepth, wallT]} />
        <meshStandardMaterial {...INNER} />
      </mesh>
      <mesh position={[x - w / 2 + wallT / 2, topY - bowlDepth / 2, zC]}>
        <boxGeometry args={[wallT, bowlDepth, d]} />
        <meshStandardMaterial {...INNER} />
      </mesh>
      <mesh position={[x + w / 2 - wallT / 2, topY - bowlDepth / 2, zC]}>
        <boxGeometry args={[wallT, bowlDepth, d]} />
        <meshStandardMaterial {...INNER} />
      </mesh>
      {/* 더블볼 분리대 */}
      {isDouble && (
        <mesh position={[x, topY - bowlDepth / 2, zC]}>
          <boxGeometry args={[wallT * 1.6, bowlDepth, d - wallT * 2]} />
          <meshStandardMaterial {...INNER} />
        </mesh>
      )}
      {/* 바닥(배수 방향으로 살짝 어둡게) + 배수구 */}
      <mesh position={[x, bowlBottomY + 0.005, zC]}>
        <boxGeometry args={[w - wallT, 0.01, d - wallT]} />
        <meshStandardMaterial color={steelTop ? "#8b959d" : "#79838b"} metalness={0.78} roughness={0.4} />
      </mesh>
      {drainXs.map((dx, i) => (
        <mesh key={`drain-${i}`} position={[dx, bowlBottomY + 0.012, zC + d * 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.006, 20]} />
          <meshStandardMaterial color="#3f474e" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** 쿡탑/가스레인지 — 옵션 규격 폭 그대로 + 화구(가스=3구 버너, 인덕션=글래스에 히팅존 링) */
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
  const specMm = Number((cooktopId.match(/(\d{3,4})/) ?? [])[1]) || 560;
  const w = Math.min(Math.max(specMm / 1000, 0.3), 0.9);
  const d = 0.36;
  const topY = counterTopY + KITCHEN_COUNTERTOP_M;
  const isGas = cooktopId.includes("gas") || cooktopId.includes("range");
  const burnerXs = isGas ? [-w * 0.3, 0, w * 0.3] : [-w * 0.24, w * 0.24];

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
        <mesh position={[x, topY + 0.014, 0.06]}>
          <boxGeometry args={[w + 0.08, 0.02, d + 0.08]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
      {/* 본체 플레이트 — 가스=검정 팬서포트 베이스 / 인덕션=글래스 */}
      <mesh position={[x, topY + 0.008, 0.06]}>
        <boxGeometry args={[w, 0.016, d]} />
        <meshStandardMaterial color={isGas ? "#14181d" : "#0b0f14"} metalness={0.35} roughness={isGas ? 0.6 : 0.18} />
      </mesh>
      {burnerXs.map((bx, i) => (
        <group key={`burner-${i}`} position={[x + bx, topY + 0.017, 0.06]}>
          {isGas ? (
            <>
              {/* 가스 버너: 팬서포트 링 + 버너캡 */}
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.055, 0.006, 8, 24]} />
                <meshStandardMaterial color="#2d343b" metalness={0.5} roughness={0.55} />
              </mesh>
              <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.024, 0.028, 0.012, 20]} />
                <meshStandardMaterial color="#454d55" metalness={0.55} roughness={0.45} />
              </mesh>
            </>
          ) : (
            /* 인덕션 히팅존 링 */
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.065, 0.0025, 8, 32]} />
              <meshStandardMaterial color="#8a939b" metalness={0.3} roughness={0.4} />
            </mesh>
          )}
        </group>
      ))}
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
