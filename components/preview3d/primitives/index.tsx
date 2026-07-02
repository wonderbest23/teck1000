"use client";

import { Edges, RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { Group } from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** 스튜디오 환경맵 — 하이그로시(UV) 도어에 창/면광 반사가 비쳐 실제 유광처럼 보이게 한다.
 *  RoomEnvironment(내장, 네트워크 불필요) + environmentIntensity를 낮게 잡아
 *  기존 균일 조명 밸런스는 유지하고 반사(스페큘러)만 얹는다. */
export function StudioEnvironment({ intensity = 0.45 }: { intensity?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const prevEnv = scene.environment;
    const prevIntensity = scene.environmentIntensity;
    scene.environment = envTex;
    scene.environmentIntensity = intensity;
    pmrem.dispose();
    return () => {
      scene.environment = prevEnv;
      scene.environmentIntensity = prevIntensity;
      envTex.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

/** 몸통(캐비닛 바디) 공통 마감 — 실제 싱크대처럼 몸통은 소재와 무관하게 백색 멜라민 합판 */
export const CARCASS_FINISH = { color: "#f4f4f1", edge: "#d9dbd4" };

/** 면 광원(RectAreaLight) — 하이그로시 표면에 부드러운 직사각형 반사를 만들어 실사 느낌을 준다.
 *  scale로 전체 강도를 낮출 수 있다(무광 소재에서 과노출 방지). */
export function StudioRectLights({ scale = 1 }: { scale?: number }) {
  useEffect(() => {
    RectAreaLightUniformsLib.init();
  }, []);
  return (
    <>
      <rectAreaLight intensity={3.2 * scale} width={3.2} height={2} position={[0, 2.3, 2.4]} rotation={[-Math.PI / 7, 0, 0]} />
      <rectAreaLight intensity={1.8 * scale} width={2} height={2.6} position={[-2.2, 1.9, 1]} rotation={[0, Math.PI / 4, 0]} />
      <rectAreaLight intensity={1.8 * scale} width={2} height={2.6} position={[2.2, 1.9, 1]} rotation={[0, -Math.PI / 4, 0]} />
    </>
  );
}
import { getDoorOpenAngle, isDoorTransparent, shouldRenderDoors } from "@/components/preview3d/modes/visibilityModes";
import { lighten } from "@/components/preview3d/materials";
import type { DoorStyle, DoorSwing, MaterialColors, PreviewViewMode } from "@/components/preview3d/types";

/** 하위 Panel의 마감(고광택 / 무광 / 우드 텍스쳐)을 결정 — 선택한 소재에 따라 마운트 지점에서 주입 */
type FinishValue = { gloss: boolean; map: THREE.Texture | null };
export const FinishContext = createContext<FinishValue>({ gloss: false, map: null });

/** 소재(MaterialColors)에 맞춰 고광택 여부 + 우드 텍스쳐를 로드해 하위에 제공. (Suspense 불필요 — 비동기 로드) */
export function FinishProvider({ material, children }: { material: MaterialColors; children: ReactNode }) {
  const [map, setMap] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (material.finish !== "wood" || !material.texture) {
      setMap(null);
      return;
    }
    let alive = true;
    new THREE.TextureLoader().load(material.texture, (tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1.4, 1.4);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      if (alive) setMap(tex);
      else tex.dispose();
    });
    return () => {
      alive = false;
    };
  }, [material.finish, material.texture]);
  const value = useMemo<FinishValue>(() => ({ gloss: material.finish === "gloss", map }), [material.finish, map]);
  return <FinishContext.Provider value={value}>{children}</FinishContext.Provider>;
}

export function Panel({
  size,
  position,
  color,
  edge,
  transparent,
  opacity = 1,
  carcass = false,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color: string;
  edge: string;
  transparent?: boolean;
  opacity?: number;
  /** 몸통(바디) 패널 — 선택 소재(광택/우드)와 무관하게 무광 멜라민 합판 질감으로 렌더 */
  carcass?: boolean;
}) {
  const { gloss, map } = useContext(FinishContext);
  // 베벨(모서리 둥글림) — 실제 가구 도어처럼 모서리에 살짝 라운드를 줘 빛이 부드럽게 꺾이게.
  const bevel = Math.min(0.006, Math.min(size[0], size[1], size[2]) * 0.28);
  return (
    <RoundedBox args={size} radius={bevel} smoothness={2} position={position} castShadow={!transparent} receiveShadow renderOrder={transparent ? 2 : 0}>
      {carcass ? (
        <meshStandardMaterial
          color={color}
          roughness={0.74}
          metalness={0.02}
          envMapIntensity={0.3}
          transparent={transparent}
          opacity={opacity}
          depthWrite={!transparent}
          depthTest
        />
      ) : map ? (
        <meshStandardMaterial
          map={map}
          color="#ffffff"
          roughness={0.5}
          metalness={0.02}
          envMapIntensity={0.45}
          transparent={transparent}
          opacity={opacity}
          depthWrite={!transparent}
          depthTest
        />
      ) : gloss ? (
        <meshPhysicalMaterial
          color={color}
          roughness={0.06}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.04}
          reflectivity={1}
          envMapIntensity={1.5}
          transparent={transparent}
          opacity={opacity}
          depthWrite={!transparent}
          depthTest
        />
      ) : (
        <meshStandardMaterial
          color={color}
          roughness={0.62}
          metalness={0.03}
          envMapIntensity={0.35}
          transparent={transparent}
          opacity={opacity}
          depthWrite={!transparent}
          depthTest
        />
      )}
      {!transparent && <Edges color={edge} threshold={25} />}
    </RoundedBox>
  );
}

export function Trim({ size, position, color }: { size: [number, number, number]; position: [number, number, number]; color: string }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.48} metalness={0.08} />
    </mesh>
  );
}

function DoorFrame({ width, height, color }: { width: number; height: number; color: string }) {
  const rail = 0.018;
  const z = 0.014;
  return (
    <group>
      <Trim size={[width - rail, rail, rail]} position={[0, height / 2 - rail * 1.8, z]} color={color} />
      <Trim size={[width - rail, rail, rail]} position={[0, -height / 2 + rail * 1.8, z]} color={color} />
      <Trim size={[rail, height - rail, rail]} position={[-width / 2 + rail * 1.8, 0, z]} color={color} />
      <Trim size={[rail, height - rail, rail]} position={[width / 2 - rail * 1.8, 0, z]} color={color} />
    </group>
  );
}

function DoorSlats({ width, height, color }: { width: number; height: number; color: string }) {
  const count = Math.max(4, Math.floor(width / 0.045));
  return (
    <group>
      {Array.from({ length: count }).map((_, index) => {
        const x = -width / 2 + ((index + 1) * width) / (count + 1);
        return <Trim key={`slat-${index}`} size={[0.012, height * 0.92, 0.014]} position={[x, 0, 0.014]} color={color} />;
      })}
    </group>
  );
}

function SideHandle({ x, color }: { x: number; color: string }) {
  return <Trim size={[0.018, 0.18, 0.026]} position={[x, 0, 0.028]} color={color} />;
}

function BottomHandle({ doorHeight, color }: { doorHeight: number; color: string }) {
  return <Trim size={[0.14, 0.018, 0.024]} position={[0, -doorHeight * 0.38, 0.026]} color={color} />;
}

function TopHandle({ doorHeight, color }: { doorHeight: number; color: string }) {
  return <Trim size={[0.14, 0.018, 0.024]} position={[0, doorHeight * 0.38, 0.026]} color={color} />;
}

function DoorLeaf({
  index,
  width,
  height,
  depth,
  thickness,
  material,
  doorStyle,
  showHandles,
  hingeSide,
  doorSwing,
  transparent,
  doorOpacity,
  targetAngle,
}: {
  index: number;
  width: number;
  height: number;
  depth: number;
  thickness: number;
  material: MaterialColors;
  doorStyle: DoorStyle;
  showHandles: boolean;
  hingeSide: "side" | "bottom" | "top";
  doorSwing: DoorSwing;
  transparent: boolean;
  doorOpacity: number;
  targetAngle: number;
}) {
  const ref = useRef<Group>(null);
  const gap = 0.008;
  const doorHeight = Math.max(height - gap * 2, 0.08);
  const doorWidth = width;
  const hingeOnRight = hingeSide === "side" && (doorSwing === "right" || (doorSwing === "pair" && index % 2 === 1));
  const isBottomHinge = hingeSide === "bottom";
  const isTopHinge = hingeSide === "top";
  const isHorizontalHinge = isBottomHinge || isTopHinge;
  const doorOffsetX = isHorizontalHinge ? 0 : hingeOnRight ? -doorWidth / 2 : doorWidth / 2;
  const doorOffsetY = isBottomHinge ? doorHeight / 2 : isTopHinge ? -doorHeight / 2 : 0;
  const openDirection = hingeOnRight ? 1 : -1;
  const handleX = doorWidth * 0.34 * (hingeOnRight ? -1 : 1);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const lerp = Math.min(1, delta * 8);
    if (isHorizontalHinge) {
      const target = isTopHinge ? -targetAngle : targetAngle;
      ref.current.rotation.x += (target - ref.current.rotation.x) * lerp;
      ref.current.rotation.y += (0 - ref.current.rotation.y) * lerp;
      return;
    }
    const target = targetAngle * openDirection;
    ref.current.rotation.y += (target - ref.current.rotation.y) * lerp;
    ref.current.rotation.x += (0 - ref.current.rotation.x) * lerp;
  });

  return (
    <group ref={ref}>
      <group position={[doorOffsetX, doorOffsetY, 0]}>
        <Panel
          size={[doorWidth, doorHeight, thickness]}
          position={[0, 0, 0]}
          color={material.color}
          edge={material.edge}
          transparent={transparent}
          opacity={doorOpacity}
        />
        {!transparent && doorStyle === "frame" && <DoorFrame width={doorWidth} height={doorHeight} color={material.accent} />}
        {!transparent && doorStyle === "slat" && <DoorSlats width={doorWidth} height={doorHeight} color={material.accent} />}
        {!transparent && showHandles && hingeSide === "side" && <SideHandle x={handleX} color={material.edge} />}
        {!transparent && showHandles && isBottomHinge && <TopHandle doorHeight={doorHeight} color={material.edge} />}
        {!transparent && showHandles && isTopHinge && <BottomHandle doorHeight={doorHeight} color={material.edge} />}
      </group>
    </group>
  );
}

export function Doors({
  count,
  width,
  height,
  depth,
  thickness,
  material,
  doorStyle,
  showHandles,
  viewMode,
  hingeSide = "side",
  doorSwing = "pair",
  animatedOpen = false,
}: {
  count: number;
  width: number;
  height: number;
  depth: number;
  thickness: number;
  material: MaterialColors;
  doorStyle: DoorStyle;
  showHandles: boolean;
  viewMode: PreviewViewMode;
  hingeSide?: "side" | "bottom" | "top";
  doorSwing?: DoorSwing;
  animatedOpen?: boolean;
}) {
  if (count <= 0 || !shouldRenderDoors(viewMode)) return null;
  const gap = 0.008;
  const resolvedHingeSide = doorSwing === "up" || doorSwing === "up_pair" ? "top" : doorSwing === "down" ? "bottom" : hingeSide;
  const verticalSplit = doorSwing === "up_pair";
  const doorHeight = verticalSplit ? Math.max((height - gap * (count + 1)) / count, 0.08) : Math.max(height - gap * 2, 0.08);
  const doorWidth = verticalSplit ? Math.max(width - gap * 2, 0.04) : Math.max((width - gap * (count + 1)) / count, 0.04);
  const z = depth / 2 + thickness * 0.52;
  const transparent = isDoorTransparent(viewMode);
  const openAngle = animatedOpen ? Math.PI * 0.42 : getDoorOpenAngle(viewMode);
  const doorOpacity = transparent ? 0.14 : 1;

  return (
    <group>
      {Array.from({ length: count }).map((_, index) => {
        const x = verticalSplit ? 0 : -width / 2 + gap + doorWidth / 2 + index * (doorWidth + gap);
        const y = verticalSplit ? height - gap - doorHeight / 2 - index * (doorHeight + gap) : height / 2;
        const hingeOnRight = resolvedHingeSide === "side" && (doorSwing === "right" || (doorSwing === "pair" && index % 2 === 1));
        const hingeX = resolvedHingeSide === "side" ? (hingeOnRight ? x + doorWidth / 2 : x - doorWidth / 2) : x;
        const hingeY = resolvedHingeSide === "bottom" ? y - doorHeight / 2 : resolvedHingeSide === "top" ? y + doorHeight / 2 : y;
        return (
          <group key={`door-${index}`} position={[hingeX, hingeY, z]}>
            <DoorLeaf
              index={index}
              width={doorWidth}
              height={doorHeight}
              depth={depth}
              thickness={thickness}
              material={material}
              doorStyle={doorStyle}
              showHandles={showHandles}
              hingeSide={resolvedHingeSide}
              doorSwing={doorSwing}
              transparent={transparent}
              doorOpacity={doorOpacity}
              targetAngle={openAngle}
            />
          </group>
        );
      })}
    </group>
  );
}

function AluminumFrame({ width, height, color = "#9aa3ad" }: { width: number; height: number; color?: string }) {
  const rail = 0.022;
  const z = 0.012;
  return (
    <group>
      <Trim size={[width, rail, 0.02]} position={[0, height / 2 - rail / 2, z]} color={color} />
      <Trim size={[width, rail, 0.02]} position={[0, -height / 2 + rail / 2, z]} color={color} />
      <Trim size={[rail, height, 0.02]} position={[-width / 2 + rail / 2, 0, z]} color={color} />
      <Trim size={[rail, height, 0.02]} position={[width / 2 - rail / 2, 0, z]} color={color} />
    </group>
  );
}

function SlidingPanel({
  width,
  height,
  thickness,
  material,
  doorStyle,
  transparent,
  opacity,
  xClosed,
  xOpen,
  z,
  open,
  handleSide,
}: {
  width: number;
  height: number;
  thickness: number;
  material: MaterialColors;
  doorStyle: DoorStyle;
  transparent: boolean;
  opacity: number;
  xClosed: number;
  xOpen: number;
  z: number;
  open: boolean;
  handleSide: 1 | -1;
}) {
  const ref = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = open ? xOpen : xClosed;
    ref.current.position.x += (target - ref.current.position.x) * Math.min(1, delta * 7);
  });

  return (
    <group ref={ref} position={[xClosed, height / 2, z]}>
      <Panel
        size={[width, height, thickness]}
        position={[0, 0, 0]}
        color={material.color}
        edge={material.edge}
        transparent={transparent}
        opacity={opacity}
      />
      {!transparent && <AluminumFrame width={width} height={height} />}
      {!transparent && doorStyle === "slat" && <DoorSlats width={width * 0.92} height={height * 0.92} color={material.accent} />}
      {!transparent && doorStyle === "frame" && <DoorFrame width={width * 0.86} height={height * 0.86} color={material.accent} />}
      {/* 세로 손잡이 홈 (슬라이딩 도어 특유의 측면 손잡이) */}
      <Trim size={[0.02, height * 0.9, 0.03]} position={[(width / 2 - 0.03) * handleSide, 0, 0.03]} color="#7c848d" />
    </group>
  );
}

/** 좌우로 미끄러지는 슬라이딩 도어 — 선택 시 앞쪽 패널이 옆으로 슬라이드되어 내부를 보여준다. */
export function SlidingDoors({
  width,
  height,
  depth,
  thickness,
  material,
  doorStyle,
  viewMode,
  open = false,
}: {
  width: number;
  height: number;
  depth: number;
  thickness: number;
  material: MaterialColors;
  doorStyle: DoorStyle;
  viewMode: PreviewViewMode;
  open?: boolean;
}) {
  if (!shouldRenderDoors(viewMode)) return null;
  const transparent = isDoorTransparent(viewMode);
  const opacity = transparent ? 0.16 : 1;
  const overlap = 0.04;
  const panelWidth = Math.max((width + overlap) / 2, 0.12);
  const frontZ = depth / 2 + thickness * 1.6;
  const backZ = depth / 2 + thickness * 0.5;
  const leftX = -width / 4;
  const rightX = width / 4;

  return (
    <group>
      {/* 뒤쪽 트랙: 왼쪽 패널 (고정) */}
      <SlidingPanel
        width={panelWidth}
        height={height - thickness}
        thickness={thickness}
        material={material}
        doorStyle={doorStyle}
        transparent={transparent}
        opacity={opacity}
        xClosed={leftX}
        xOpen={leftX}
        z={backZ}
        open={open}
        handleSide={1}
      />
      {/* 앞쪽 트랙: 오른쪽 패널 (열면 왼쪽으로 슬라이드되어 오른쪽 칸을 개방) */}
      <SlidingPanel
        width={panelWidth}
        height={height - thickness}
        thickness={thickness}
        material={material}
        doorStyle={doorStyle}
        transparent={transparent}
        opacity={opacity}
        xClosed={rightX}
        xOpen={leftX + 0.012}
        z={frontZ}
        open={open}
        handleSide={-1}
      />
    </group>
  );
}

export function SimpleCabinet({
  width,
  height,
  depth,
  shelfCount,
  doorCount,
  y = 0,
  x = 0,
  material,
  doorStyle,
  showHandles,
  viewMode,
  showInterior = false,
  doorSwing = "pair",
  animatedOpen = false,
}: {
  width: number;
  height: number;
  depth: number;
  shelfCount: number;
  doorCount: number;
  y?: number;
  x?: number;
  material: MaterialColors;
  doorStyle: DoorStyle;
  showHandles: boolean;
  viewMode: PreviewViewMode;
  showInterior?: boolean;
  doorSwing?: DoorSwing;
  animatedOpen?: boolean;
}) {
  const t = 0.018;
  const innerWidth = Math.max(width - t * 2, 0.04);
  const faint = showInterior;

  return (
    <group position={[x, y, 0]}>
      {/* 몸통(측판·상하판·뒷판·선반) = 백색 멜라민 합판 — 문짝(선택 소재)과 실제처럼 구분 */}
      <Panel size={[t, height, depth]} position={[-width / 2 + t / 2, height / 2, 0]} color={CARCASS_FINISH.color} edge={CARCASS_FINISH.edge} carcass />
      <Panel size={[t, height, depth]} position={[width / 2 - t / 2, height / 2, 0]} color={CARCASS_FINISH.color} edge={CARCASS_FINISH.edge} carcass />
      <Panel size={[innerWidth, t, depth]} position={[0, height - t / 2, 0]} color={CARCASS_FINISH.color} edge={CARCASS_FINISH.edge} carcass />
      <Panel size={[innerWidth, t, depth]} position={[0, t / 2, 0]} color={CARCASS_FINISH.color} edge={CARCASS_FINISH.edge} carcass />
      <Panel size={[width, height, t * 0.6]} position={[0, height / 2, -depth / 2 + t * 0.3]} color={CARCASS_FINISH.color} edge={CARCASS_FINISH.edge} carcass />
      {Array.from({ length: shelfCount }).map((_, index) => {
        const shelfY = t + ((height - t * 2) * (index + 1)) / (shelfCount + 1);
        return (
          <group key={`shelf-${index}`}>
            <Panel
              size={[innerWidth, t, depth * 0.94]}
              position={[0, shelfY, 0.01]}
              color={CARCASS_FINISH.color}
              edge={CARCASS_FINISH.edge}
              carcass
              transparent={false}
              opacity={1}
            />
            {showInterior && (
              <Trim
                size={[innerWidth * 0.98, 0.014, 0.024]}
                position={[0, shelfY + t * 0.72, depth / 2 + 0.018]}
                color={material.accent}
              />
            )}
          </group>
        );
      })}
      <Doors
        count={doorCount}
        width={width}
        height={height}
        depth={depth}
        thickness={t}
        material={material}
        doorStyle={doorStyle}
        showHandles={showHandles}
        viewMode={viewMode}
        doorSwing={doorSwing}
        animatedOpen={animatedOpen}
      />
    </group>
  );
}

export function WoodGrain({ width, height, depth, color }: { width: number; height: number; depth: number; color: string }) {
  const lineCount = 12;
  return (
    <group position={[0, height / 2, depth / 2 + 0.031]}>
      {Array.from({ length: lineCount }).map((_, index) => {
        const y = -height * 0.43 + (index * height * 0.86) / (lineCount - 1);
        return <Trim key={`grain-${index}`} size={[width * 0.88, 0.0025, 0.004]} position={[0, y, 0]} color={color} />;
      })}
    </group>
  );
}

export function WallContext({ widthM, heightM }: { widthM: number; heightM: number }) {
  return (
    <group>
      <Panel size={[widthM * 1.2, 0.008, 0.02]} position={[0, -0.004, -0.25]} color="#e2e8f0" edge="#cbd5e1" />
      <Panel size={[0.008, heightM, 0.02]} position={[-widthM * 0.62, heightM / 2, -0.25]} color="#f1f5f9" edge="#cbd5e1" />
      <Trim size={[widthM * 1.1, 0.004, 0.01]} position={[0, 0.002, 0.12]} color="#94a3b8" />
    </group>
  );
}

export function FloorContext({ widthM }: { widthM: number }) {
  return <Trim size={[widthM * 1.3, 0.004, 0.5]} position={[0, 0, 0.05]} color="#cbd5e1" />;
}

/**
 * 실제 방(뒷벽 + 양 옆벽 + 바닥)을 상품 발자국에 맞춰 그린다. 모든 상품 공통.
 * - floorY: 상품 바닥의 로컬 Y(렌더러마다 다름: 바닥상품=0, 선반=-h/2, 신발장=-bottom).
 * - topY: 상품 최상단 Y. 천장/벽 높이는 여기 + 여유.
 * - 여백은 폭/깊이에 비례(작은 상품도 방이 어색하지 않게). 단면(FrontSide) 평면이라
 *   카메라를 돌리면 앞을 가리는 벽은 자동으로 사라진다(백페이스 컬링).
 */
/** 실제 원목 마루 사진 텍스처 (CC0, Poly Haven) */
const WOOD_FLOOR_SRC = "/images/textures/wood-floor.jpg";

export function PreviewRoom({ widthM = 1, depthM = 1, floorY, topY, extents, ceilingY: ceilingYProp }: { widthM?: number; depthM?: number; floorY: number; topY: number; extents?: { leftX: number; rightX: number; backZ: number; frontZ: number }; ceilingY?: number }) {
  // 옆 1.4m, 앞 2.6m 고정. 천장은 기본 2.5m 이상이나, 명시(ceilingYProp)되면 그 높이로(간편 모드=낮게).
  const sideMargin = 1.4;
  const frontMargin = 2.6;
  const ceilingY = ceilingYProp ?? Math.max(2.5, topY + 0.45);
  // 멀티 씬은 명시 경계(extents)로 그려 클램프 영역과 정확히 일치
  const leftX = extents ? extents.leftX : -widthM / 2 - sideMargin;
  const rightX = extents ? extents.rightX : widthM / 2 + sideMargin;
  const backZ = extents ? extents.backZ : -depthM / 2 - 0.03;
  const frontZ = extents ? extents.frontZ : depthM / 2 + frontMargin;
  const roomW = rightX - leftX;
  const centerX = (leftX + rightX) / 2;
  const floorDepth = frontZ - backZ;
  const centerZ = (backZ + frontZ) / 2;
  const wallH = ceilingY - floorY;
  const wallMidY = (floorY + ceilingY) / 2;
  // 흰색(UV하이그로시) 캐비닛과 확실히 구별되도록 벽은 살짝 따뜻하고 톤 다운된 그레이지로.
  const wallColor = "#cdc7bb";
  const floorColor = "#c9a064";
  const skirtColor = "#b9ad97";

  // 실제 마루 사진을 텍스처로 로드 (한 번만)
  const floorTex = useMemo(() => {
    if (typeof window === "undefined") return null;
    const tex = new THREE.TextureLoader().load(WOOD_FLOOR_SRC);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);
  // 방 크기에 맞춰 타일 반복(한 장 ≈ 2m)
  useMemo(() => {
    if (floorTex) {
      floorTex.repeat.set(Math.max(1, Math.round(roomW / 2)), Math.max(1, Math.round(floorDepth / 2)));
      floorTex.needsUpdate = true;
    }
  }, [floorTex, roomW, floorDepth]);

  return (
    <group>
      {/* 바닥 (원목 마루) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, floorY - 0.004, centerZ]} receiveShadow>
        <planeGeometry args={[roomW, floorDepth]} />
        <meshStandardMaterial map={floorTex ?? undefined} color={floorTex ? "#ffffff" : floorColor} roughness={0.78} metalness={0.04} />
      </mesh>
      {/* 뒷벽 (정면 +z) */}
      <mesh position={[centerX, wallMidY, backZ]}>
        <planeGeometry args={[roomW, wallH]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>
      {/* 걸레받이 */}
      <mesh position={[centerX, floorY + 0.04, backZ + 0.006]}>
        <planeGeometry args={[roomW, 0.08]} />
        <meshStandardMaterial color={skirtColor} roughness={1} />
      </mesh>
      {/* 왼쪽 벽 (법선 +x) */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[leftX, wallMidY, centerZ]}>
        <planeGeometry args={[floorDepth, wallH]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>
      {/* 오른쪽 벽 (법선 -x) */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[rightX, wallMidY, centerZ]}>
        <planeGeometry args={[floorDepth, wallH]} />
        <meshStandardMaterial color={wallColor} roughness={1} />
      </mesh>
    </group>
  );
}

export function DrainPlaceholder({ status }: { status: "verified" | "unknown" }) {
  const verified = status === "verified";
  return (
    <group position={[0, 0.35, 0]}>
      <Trim size={[0.08, 0.08, 0.02]} position={[0, 0, 0]} color={verified ? "#64748b" : "#94a3b8"} />
    </group>
  );
}
