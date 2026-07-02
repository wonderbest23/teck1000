"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addConfiguredItem, clearCart, getCart, setCart } from "@/lib/cartStore";
import { catalogCategories, productLabels, roomAddPresets } from "@/lib/catalog";
import { ProductArt } from "@/components/ProductArt";
import { RoomCommandChat } from "@/components/RoomCommandChat";
import type { RoomAction, RoomStateSummary } from "@/lib/roomCommands";
import { archiveDraft, readDraft, writeDraft } from "@/lib/quoteHistory";
import { defaultInput, getProduct, materials } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { clampModuleIndex, cooktopOptions, countertopOptions, deriveModuleTypeCounts, faucetOptions, getKitchenSetDimensions, getKitchenTemplate, hoodOptions, kitchenTemplates, microwaveOptions, normalizeKitchenLayerWidths, normalizeKitchenModules, sinkOptions, toeKickOptions } from "@/lib/kitchen";
import { MAX_WARDROBE_MODULE_COUNT, MAX_WARDROBE_MODULE_WIDTH_MM, MIN_WARDROBE_MODULE_COUNT, MIN_WARDROBE_MODULE_WIDTH_MM, alignWardrobeCounts, getDefaultWardrobeModules, normalizeWardrobeModules, wardrobeModuleTypeLabels, type WardrobeModuleType } from "@/lib/wardrobe";
import { calculateQuote } from "@/lib/quote";
import { countOptionCases, getDoorCountOptions, getSafeDoorCount, productRules } from "@/lib/rules";
import type { FurnitureInput, ProductType } from "@/lib/types";
import { ENTRANCE_STANDARDS, KITCHEN_STANDARDS, WARDROBE_STANDARDS, snapKitchenModuleWidthMm } from "@/lib/platformConfig";
import { PreOrderCheckPanel } from "@/components/PreOrderCheckPanel";
import { EditorShell } from "@/components/editor/EditorShell";
import { RedoIcon, UndoIcon } from "@/components/editor/HistoryControls";
import { ModuleStripPlan } from "@/components/editor/ModuleStripPlan";
import { ModuleListEditor } from "@/components/editor/ModuleListEditor";
import { KitchenDrawingView } from "@/components/admin/KitchenDrawingView";
import { KitchenPresetPicker } from "@/components/preview3d/controls/KitchenPresetPicker";
import { getEditorCategories } from "@/lib/productEditorSchema";
import { autoArrange, getFootprint, ROOM_BACK, type Placement, type RoomItem } from "@/components/preview3d/roomLayout";
import { useInputHistory } from "@/lib/hooks/useInputHistory";
import { validateOrderInput, ORDER_VERDICT_CTA, ORDER_VERDICT_LABELS } from "@/lib/order-validation";

const RoomScene = dynamic(() => import("@/components/preview3d/RoomScene").then((mod) => mod.RoomScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[340px] items-center justify-center rounded-2xl bg-gradient-to-b from-slate-100 to-white text-sm font-bold text-slate-500">
      내 공간 준비 중…
    </div>
  ),
});

export function QuoteBuilder({ productType }: { productType: ProductType }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [added, setAdded] = useState(false);
  const manualTitle = searchParams.get("title") ?? "";
  const manualNote = searchParams.get("note") ?? "";
  const isManual = searchParams.get("manual") === "1";

  const initialInput = useMemo<FurnitureInput>(() => {
    const base = getInitialInput(productType);
    if (!isManual) return base;
    const width = Number(searchParams.get("w"));
    const height = Number(searchParams.get("h"));
    const depth = Number(searchParams.get("d"));
    return normalizeInput({
      ...base,
      width_mm: Number.isFinite(width) && width > 0 ? width : base.width_mm,
      height_mm: Number.isFinite(height) && height > 0 ? height : base.height_mm,
      depth_mm: Number.isFinite(depth) && depth > 0 ? depth : base.depth_mm,
      has_door: true,
      door_count: 2,
      shelf_count: Math.max(2, base.shelf_count),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 단일 실행취소 스택(3D·2D 공유). 기존 setInput(값|업데이터) 호출부를 그대로 살리는 shim.
  const { input, set: setInputValue, reset: resetInput, undo, redo, canUndo, canRedo } = useInputHistory(initialInput);
  const setInput = (value: FurnitureInput | ((current: FurnitureInput) => FurnitureInput)) =>
    setInputValue(typeof value === "function" ? (value as (current: FurnitureInput) => FurnitureInput)(input) : value);

  // 자동 저장/복원 — 수정할 때마다 localStorage에 저장. 단 '?fresh=1'(새로 시작)이면 기존 작업본을 보관하고 새로 시작.
  const isFresh = searchParams.get("fresh") === "1";
  const [hydrated, setHydrated] = useState(false);
  // Phase 1: 주방 세트 신규 생성 시 "형태→길이" 프리셋 픽커를 먼저 보여준다(빈 캔버스 제거)
  const [showKitchenPreset, setShowKitchenPreset] = useState(productType === "kitchen_full_set");
  useEffect(() => {
    if (isFresh) {
      // 기존 작업본을 '최근 저장 내역'으로 보관 후 슬롯 비움 + 장바구니(방에 떠있던 가구)도 비움 → 완전히 깨끗한 새 시작
      archiveDraft(productType, productLabels[productType] ?? productType);
      clearCart(); // 방에 떠있던 장바구니 가구도 비움(아래 cart effect가 빈 값으로 갱신)
      setHydrated(true);
      // fresh 파라미터 제거 → 이후 새로고침은 새 작업본을 이어가게(다시 보관/초기화하지 않게)
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("fresh");
        window.history.replaceState(null, "", url.toString());
      }
      return;
    }
    const saved = readDraft(productType);
    if (saved) {
      resetInput(normalizeInput(saved));
      setShowKitchenPreset(false); // 저장된 작업본이 있으면 이미 구성된 상태 → 픽커 생략
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      writeDraft(productType, input);
    } catch {
      // 저장 실패 무시 (용량 초과 등)
    }
  }, [hydrated, input, productType]);

  // Ctrl/⌘+Z = 되돌리기, Ctrl+Y / ⌘⇧Z = 다시실행. 입력 필드 포커스 시엔 네이티브 실행취소 보존.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
  const [showManualKitchenSpec, setShowManualKitchenSpec] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [showDimensions, setShowDimensions] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "room">("room");
  const [selModule, setSelModule] = useState<number | null>(null);
  // 내 공간(멀티 가구 씬) 배치/선택
  const [roomPlacements, setRoomPlacements] = useState<Record<string, { x: number; z: number; rotY: number }>>({});
  const [roomSelected, setRoomSelected] = useState<string | null>(null);
  const [roomGuides, setRoomGuides] = useState<{ axis: "x" | "z"; value: number }[]>([]);
  const [justAddedId, setJustAddedId] = useState<string | null>(null); // 방금 추가한 가구 — 파란 테두리로 안내
  const [canvasMode, setCanvasMode] = useState<"view" | "edit">("edit"); // 보기/수정 모드 — 보기 모드는 편집 UI 없이 감상만
  const [addOpen, setAddOpen] = useState(false); // 캔버스 하단 '＋ 가구 추가' 시트
  // 모바일: 사이즈 패널을 미리보기 위가 아니라 섹션 아래(belowCanvas)에 포털로 렌더 — 화면을 가리지 않게
  const [mobilePanelHost, setMobilePanelHost] = useState<HTMLDivElement | null>(null);
  const [pickerSlug, setPickerSlug] = useState<ProductType | null>(null); // 규격 선택 단계(제품 누르면 사이즈 칩 표시)
  const [chatOpen, setChatOpen] = useState(false); // AI 명령 채팅 패널
  // 상품추가 패널 — 같은 주문(장바구니)에 담긴 항목 목록
  const [cartItems, setCartItems] = useState<ReturnType<typeof getCart>>([]);
  useEffect(() => {
    const refresh = () => setCartItems(getCart());
    refresh();
    window.addEventListener("teck-cart-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("teck-cart-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const quote = useMemo(() => calculateQuote(input), [input]);
  // 담긴 상품들의 합계(주문 합산)
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + calculateQuote(item.input).finalPrice * (item.quantity ?? 1), 0),
    [cartItems],
  );
  const validation = useMemo(() => validateOrderInput(input), [input]);

  // 내 공간(멀티 가구 씬) — 현재 구성 + 장바구니 상품을 한 방에
  const product = getProduct(productType)!;
  const roomItems: RoomItem[] = useMemo(
    () => [
      { id: "current", name: isManual && manualTitle ? manualTitle : product.name, input },
      ...cartItems.map((it) => ({ id: it.id, name: it.name, input: it.input })),
    ],
    [input, cartItems, product.name, isManual, manualTitle],
  );
  // 발자국 + 방 바닥(벽 안쪽) 경계 — RoomScene과 동일 공식
  const roomFootprints = useMemo(() => Object.fromEntries(roomItems.map((it) => [it.id, getFootprint(it.input)])), [roomItems]);
  // 5cm 격자 — 모든 위치·크기·벽이 이 격자에 맞춰져 '정해진 규격' 안에서만 움직인다(예측 가능/안정)
  const GRID_M = 0.05;
  const snapG = (v: number) => Math.round(v / GRID_M) * GRID_M;
  // 고정 약 10평 방(≈5.7m × 5.7m). 내용물/모드와 무관하게 항상 같은 크기 — 절대 줄거나 커지지 않는다.
  const roomFloor = useMemo(() => {
    const list = roomItems.map((it) => getFootprint(it.input));
    const halfSide = 2.85; // 한 변 5.7m ≈ 9.96평
    const side = halfSide * 2;
    return {
      leftX: -halfSide,
      rightX: halfSide,
      backZ: ROOM_BACK,
      frontZ: ROOM_BACK + side,
      topY: Math.max(0.9, ...list.map((f) => f.topY)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomItems.length]);

  // 회전(90°단위) 고려한 반치수
  function halfExtents(id: string, rotY: number) {
    const f = roomFootprints[id];
    const c = Math.abs(Math.cos(rotY));
    const s = Math.abs(Math.sin(rotY));
    return { hx: c * f.widthM / 2 + s * f.depthM / 2, hz: s * f.widthM / 2 + c * f.depthM / 2 };
  }
  // 충돌 레이어 — 상부장(벽 높이)은 바닥 가구와 평면이 겹쳐도 부딪히지 않게 별도 층으로 본다.
  function roomLayerOf(id: string): "wall" | "floor" {
    return roomItems.find((it) => it.id === id)?.input.productType === "kitchen_wall_cabinet" ? "wall" : "floor";
  }
  // 벽/바닥 안쪽으로 클램프 + 다른 가구와 겹치지 않게 밀어냄(경우의수 반복 해소)
  function resolvePlacement(id: string, desiredX: number, desiredZ: number, rotY: number, all: Record<string, Placement>): { x: number; z: number } {
    const { hx, hz } = halfExtents(id, rotY);
    const cl = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
    let x = cl(desiredX, roomFloor.leftX + hx, roomFloor.rightX - hx);
    let z = cl(desiredZ, roomFloor.backZ + hz, roomFloor.frontZ - hz);
    const myLayer = roomLayerOf(id);
    const others = roomItems
      .filter((it) => it.id !== id && roomLayerOf(it.id) === myLayer)
      .map((it) => {
        const p = all[it.id] ?? { x: 0, z: 0, rotY: 0 };
        const e = halfExtents(it.id, p.rotY);
        return { x: p.x, z: p.z, hx: e.hx, hz: e.hz };
      });
    for (let iter = 0; iter < 8; iter += 1) {
      let moved = false;
      for (const o of others) {
        const dx = x - o.x;
        const dz = z - o.z;
        const overlapX = hx + o.hx - Math.abs(dx);
        const overlapZ = hz + o.hz - Math.abs(dz);
        if (overlapX > 0.001 && overlapZ > 0.001) {
          if (overlapX < overlapZ) x += dx >= 0 ? overlapX : -overlapX;
          else z += dz >= 0 ? overlapZ : -overlapZ;
          moved = true;
        }
      }
      x = cl(x, roomFloor.leftX + hx, roomFloor.rightX - hx);
      z = cl(z, roomFloor.backZ + hz, roomFloor.frontZ - hz);
      if (!moved) break;
    }
    return { x, z };
  }

  // 아이템/치수 변경 시: 기존 가구는 '벽 안으로만' 클램프(서로 밀치지 않음 → 한 가구 크기조절이 다른 가구를 안 건드림),
  // 새로 추가된 가구만 자동 배치 + 빈 자리 탐색.
  useEffect(() => {
    setRoomPlacements((current) => {
      const auto = autoArrange(roomItems);
      const next: Record<string, Placement> = {};
      const cl = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
      let changed = roomItems.length !== Object.keys(current).length;
      roomItems.forEach((it) => {
        const existing = current[it.id];
        if (existing) {
          // 기존 가구: 위치 보존, 벽 밖이면 벽 안으로만 보정(다른 가구는 건드리지 않음)
          const { hx, hz } = halfExtents(it.id, existing.rotY);
          const x = cl(existing.x, roomFloor.leftX + hx, roomFloor.rightX - hx);
          const z = cl(existing.z, roomFloor.backZ + hz, roomFloor.frontZ - hz);
          next[it.id] = { x, z, rotY: existing.rotY };
          if (Math.abs(existing.x - x) > 1e-4 || Math.abs(existing.z - z) > 1e-4) changed = true;
        } else {
          const newLayer = roomLayerOf(it.id);
          // 상부장: 가장 최근 하부장/세트 바로 위(같은 가로 위치, 벽에 붙임)에 자동 배치
          if (it.input.productType === "kitchen_wall_cabinet") {
            const hostItem = [...roomItems].reverse().find((o) => o.input.productType === "kitchen_base_cabinet" || o.input.productType === "kitchen_full_set");
            const hp = hostItem ? (next[hostItem.id] ?? current[hostItem.id]) : null;
            if (hp) {
              const f = getFootprint(it.input);
              next[it.id] = { x: hp.x, z: ROOM_BACK + f.depthM / 2 + 0.02, rotY: hp.rotY };
              changed = true;
              return;
            }
          }
          // 새 가구: 자동 배치 후 (같은 레이어끼리) 겹치면 오른쪽 빈 자리로
          const base = auto[it.id] ?? { x: 0, z: 0, rotY: 0 };
          const { hx, hz } = halfExtents(it.id, base.rotY);
          let r = resolvePlacement(it.id, base.x, base.z, base.rotY, next);
          const collides = (px: number, pz: number) =>
            Object.keys(next).some((oid) => {
              if (roomLayerOf(oid) !== newLayer) return false;
              const op = next[oid];
              const oe = halfExtents(oid, op.rotY);
              return hx + oe.hx - Math.abs(px - op.x) > 0.0015 && hz + oe.hz - Math.abs(pz - op.z) > 0.0015;
            });
          for (let step = 1; collides(r.x, r.z) && step <= 40; step += 1) {
            r = resolvePlacement(it.id, base.x + step * (hx * 2 + 0.2), base.z, base.rotY, next);
          }
          next[it.id] = { x: r.x, z: r.z, rotY: base.rotY };
          changed = true;
        }
      });
      return changed ? next : current;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomItems]);

  // 스냅(모서리/중심 정렬) + 충돌/경계 해소 + 정렬 가이드 산출
  function snapAndResolve(id: string, desiredX: number, desiredZ: number, rotY: number, all: Record<string, Placement>) {
    const SNAP = 0.06; // 6cm 이내면 딱 맞춤
    const EPS = 0.018;
    const { hx, hz } = halfExtents(id, rotY);
    const cl = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
    // 먼저 격자에 맞춰 떨림 제거 — 이후 모서리/벽 스냅이 더 가까우면 그쪽으로 보정
    let x = cl(snapG(desiredX), roomFloor.leftX + hx, roomFloor.rightX - hx);
    let z = cl(snapG(desiredZ), roomFloor.backZ + hz, roomFloor.frontZ - hz);

    const myLayer = roomLayerOf(id);
    const others = roomItems
      .filter((it) => it.id !== id && roomLayerOf(it.id) === myLayer)
      .map((it) => {
        const p = all[it.id] ?? { x: 0, z: 0, rotY: 0 };
        const e = halfExtents(it.id, p.rotY);
        return { x: p.x, z: p.z, hx: e.hx, hz: e.hz };
      });
    // 정렬 후보(다른 가구의 좌/중심/우 + 벽)
    const xTargets = [roomFloor.leftX, roomFloor.rightX, ...others.flatMap((o) => [o.x - o.hx, o.x, o.x + o.hx])];
    const zTargets = [roomFloor.backZ, roomFloor.frontZ, ...others.flatMap((o) => [o.z - o.hz, o.z, o.z + o.hz])];
    const snap = (val: number, half: number, targets: number[]) => {
      let best = Infinity;
      let to: number | null = null;
      for (const t of targets) for (const a of [val - half, val, val + half]) {
        const d = Math.abs(t - a);
        if (d < SNAP && d < best) { best = d; to = val + (t - a); }
      }
      return to;
    };
    const sx = snap(x, hx, xTargets);
    const sz = snap(z, hz, zTargets);
    if (sx !== null) x = sx;
    if (sz !== null) z = sz;

    // 충돌 해소 (여러 번 반복해 밀어냄)
    const overlaps = (px: number, pz: number) =>
      others.some((o) => hx + o.hx - Math.abs(px - o.x) > 0.0015 && hz + o.hz - Math.abs(pz - o.z) > 0.0015);
    for (let iter = 0; iter < 16; iter += 1) {
      let moved = false;
      for (const o of others) {
        const dx = x - o.x;
        const dz = z - o.z;
        const ox = hx + o.hx - Math.abs(dx);
        const oz = hz + o.hz - Math.abs(dz);
        if (ox > 0.001 && oz > 0.001) {
          if (ox < oz) x += (dx >= 0 ? ox : -ox) + (dx >= 0 ? 0.002 : -0.002);
          else z += (dz >= 0 ? oz : -oz) + (dz >= 0 ? 0.002 : -0.002);
          moved = true;
        }
      }
      x = cl(x, roomFloor.leftX + hx, roomFloor.rightX - hx);
      z = cl(z, roomFloor.backZ + hz, roomFloor.frontZ - hz);
      if (!moved) break;
    }

    // 안전망: 그래도 겹치면 이동 거부(직전 위치 유지) — 절대 겹치지 않게
    if (overlaps(x, z)) {
      const prev = all[id];
      if (prev) return { x: prev.x, z: prev.z, guides: [] as { axis: "x" | "z"; value: number }[] };
    }
    // 모서리/벽 스냅이 없었으면 최종 위치를 격자에 맞춰 항상 5cm 단위로 고정
    if (sx === null && sz === null) {
      const gx = cl(snapG(x), roomFloor.leftX + hx, roomFloor.rightX - hx);
      const gz = cl(snapG(z), roomFloor.backZ + hz, roomFloor.frontZ - hz);
      if (!overlaps(gx, gz)) { x = gx; z = gz; }
    }

    // 최종 위치 기준으로 실제 정렬된 선만 가이드로
    const guides: { axis: "x" | "z"; value: number }[] = [];
    for (const t of xTargets) if ([x - hx, x, x + hx].some((a) => Math.abs(a - t) < EPS)) { guides.push({ axis: "x", value: t }); break; }
    for (const t of zTargets) if ([z - hz, z, z + hz].some((a) => Math.abs(a - t) < EPS)) { guides.push({ axis: "z", value: t }); break; }
    return { x, z, guides };
  }

  // ── 현실 제약: 벽부착 가구(싱크대·붙박이장 등)는 벽에서 떨어질 수 없다 ──
  // 이동하면 가장 가까운 벽에 등을 붙이고, 옆벽으로 끌고 가면 자동으로 그 벽을 향해 회전한다.
  const WALL_BOUND_TYPES = new Set<ProductType>([
    "kitchen_full_set",
    "kitchen_base_cabinet",
    "kitchen_wall_cabinet",
    "built_in_wardrobe",
    "shoe_cabinet",
    "gap_cabinet",
    "custom_shelf",
  ]); // kitchen_island(아일랜드)만 방 중앙 허용
  function isWallBound(id: string) {
    const it = roomItems.find((i) => i.id === id);
    return it ? WALL_BOUND_TYPES.has(it.input.productType) : false;
  }
  /** 원하는 지점에서 가장 가까운 벽으로 투영 — 등을 벽에 붙이고(rotY 고정) 벽을 따라서만 미끄러진다 */
  function projectToWall(id: string, x: number, z: number) {
    const f = roomFootprints[id];
    const hw = f.widthM / 2;
    const hd = f.depthM / 2;
    const cl = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
    const walls = [
      { wall: "back" as const, d: Math.abs(z - roomFloor.backZ), rotY: 0, x: cl(x, roomFloor.leftX + hw, roomFloor.rightX - hw), z: roomFloor.backZ + hd },
      { wall: "front" as const, d: Math.abs(roomFloor.frontZ - z), rotY: Math.PI, x: cl(x, roomFloor.leftX + hw, roomFloor.rightX - hw), z: roomFloor.frontZ - hd },
      { wall: "left" as const, d: Math.abs(x - roomFloor.leftX), rotY: Math.PI / 2, x: roomFloor.leftX + hd, z: cl(z, roomFloor.backZ + hw, roomFloor.frontZ - hw) },
      { wall: "right" as const, d: Math.abs(roomFloor.rightX - x), rotY: -Math.PI / 2, x: roomFloor.rightX - hd, z: cl(z, roomFloor.backZ + hw, roomFloor.frontZ - hw) },
    ];
    return walls.reduce((best, w) => (w.d < best.d ? w : best));
  }
  function moveRoomItem(id: string, x: number, z: number) {
    if (isWallBound(id)) {
      const w = projectToWall(id, x, z);
      const r = snapAndResolve(id, w.x, w.z, w.rotY, roomPlacements);
      // 충돌/스냅 보정 후에도 벽 수직 방향은 다시 벽에 고정(벽에서 떨어지지 않게)
      const fx = w.wall === "left" || w.wall === "right" ? w.x : r.x;
      const fz = w.wall === "back" || w.wall === "front" ? w.z : r.z;
      setRoomGuides(r.guides);
      setRoomPlacements((current) => ({ ...current, [id]: { x: fx, z: fz, rotY: w.rotY } }));
      return;
    }
    const rotY = roomPlacements[id]?.rotY ?? 0;
    const r = snapAndResolve(id, x, z, rotY, roomPlacements);
    setRoomGuides(r.guides);
    setRoomPlacements((current) => ({ ...current, [id]: { x: r.x, z: r.z, rotY: current[id]?.rotY ?? rotY } }));
  }
  function endRoomMove() {
    setRoomGuides([]);
  }
  function resetRoomLayout() {
    setRoomPlacements(autoArrange(roomItems));
    setRoomGuides([]);
    setRoomSelected(null);
  }
  function rotateRoomItem(id: string) {
    // 벽부착 가구의 회전 = 다음 벽으로 이동(뒤→오른쪽→앞→왼쪽 순환). 벽에서 떨어진 회전은 불가.
    if (isWallBound(id)) {
      setRoomPlacements((current) => {
        const cur = current[id] ?? { x: 0, z: 0, rotY: 0 };
        const wallOrder = ["back", "right", "front", "left"] as const;
        const here = projectToWall(id, cur.x, cur.z);
        const next = wallOrder[(wallOrder.indexOf(here.wall) + 1) % wallOrder.length];
        const f = roomFootprints[id];
        const hw = f.widthM / 2;
        const hd = f.depthM / 2;
        const cl = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
        const target =
          next === "back" ? { rotY: 0, x: cl(cur.x, roomFloor.leftX + hw, roomFloor.rightX - hw), z: roomFloor.backZ + hd }
          : next === "front" ? { rotY: Math.PI, x: cl(cur.x, roomFloor.leftX + hw, roomFloor.rightX - hw), z: roomFloor.frontZ - hd }
          : next === "left" ? { rotY: Math.PI / 2, x: roomFloor.leftX + hd, z: cl(cur.z, roomFloor.backZ + hw, roomFloor.frontZ - hw) }
          : { rotY: -Math.PI / 2, x: roomFloor.rightX - hd, z: cl(cur.z, roomFloor.backZ + hw, roomFloor.frontZ - hw) };
        return { ...current, [id]: target };
      });
      return;
    }
    setRoomPlacements((current) => {
      const cur = current[id] ?? { x: 0, z: 0, rotY: 0 };
      const rotY = cur.rotY + Math.PI / 2;
      const r = resolvePlacement(id, cur.x, cur.z, rotY, current);
      return { ...current, [id]: { x: r.x, z: r.z, rotY } };
    });
  }

  // 키보드 단축키 — 내 공간에서 가구 선택 시 Delete=제거, R=90° 회전
  useEffect(() => {
    if (viewMode !== "room" || !roomSelected) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (roomSelected) {
          e.preventDefault();
          removeRoomItem(roomSelected);
        }
      } else if (e.key === "r" || e.key === "R" || e.key === "ㄱ") {
        e.preventDefault();
        rotateRoomItem(roomSelected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, roomSelected]);

  // 복사/붙여넣기 — Ctrl+C(선택 복사) / Ctrl+V(붙여넣기)
  useEffect(() => {
    if (viewMode !== "room") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "c") {
        if (roomSelected) { e.preventDefault(); copyRoomItem(roomSelected); }
      } else if (k === "v") {
        if (clipboardRef.current) { e.preventDefault(); pasteRoomItem(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, roomSelected]);

  const selectedRoomItem = roomItems.find((it) => it.id === roomSelected) ?? null;
  // 방 가구의 input을 그 가구에 바로 반영(현재=라이브 input, 장바구니=해당 항목). id로 직접 지정.
  function commitRoomItemById(id: string, nextInput: FurnitureInput) {
    const normalized = normalizeInput(nextInput);
    if (id === "current") setInput(normalized);
    else setCart(getCart().map((it) => (it.id === id ? { ...it, input: normalized } : it)));
  }
  function commitRoomItem(nextInput: FurnitureInput) {
    if (roomSelected) commitRoomItemById(roomSelected, nextInput);
  }

  // 선택 가구의 사이즈가 권장 범위(productRules)를 벗어났는지 — 우측 패널 알림에 표시
  const selectedSizeIssues = (() => {
    if (!selectedRoomItem) return [] as { label: string; val: number; min: number; max: number }[];
    const r = productRules[selectedRoomItem.input.productType];
    if (!r) return [];
    const inp = selectedRoomItem.input;
    const out: { label: string; val: number; min: number; max: number }[] = [];
    if (inp.width_mm < r.minWidth || inp.width_mm > r.maxWidth) out.push({ label: "가로", val: inp.width_mm, min: r.minWidth, max: r.maxWidth });
    if (inp.height_mm < r.minHeight || inp.height_mm > r.maxHeight) out.push({ label: "높이", val: inp.height_mm, min: r.minHeight, max: r.maxHeight });
    if (inp.depth_mm < r.minDepth || inp.depth_mm > r.maxDepth) out.push({ label: "깊이", val: inp.depth_mm, min: r.minDepth, max: r.maxDepth });
    return out;
  })();
  function snapSelectedToValid() {
    if (!selectedRoomItem) return;
    const r = productRules[selectedRoomItem.input.productType];
    if (!r) return;
    const inp = selectedRoomItem.input;
    const nextHeight = Math.min(r.maxHeight, Math.max(r.minHeight, inp.height_mm));
    const nextDepth = Math.min(r.maxDepth, Math.max(r.minDepth, inp.depth_mm));
    commitRoomItem({
      ...inp,
      width_mm: Math.min(r.maxWidth, Math.max(r.minWidth, inp.width_mm)),
      height_mm: nextHeight,
      depth_mm: nextDepth,
      // 주방 세트는 kitchen_base_* 가 원본(normalizeInput이 height/depth를 여기서 재계산) — 함께 맞춰야 실제 반영된다
      ...(inp.productType === "kitchen_full_set" ? { kitchen_base_height_mm: nextHeight, kitchen_base_depth_mm: nextDepth } : {}),
    });
  }
  // 이슈 코드별 원클릭 해결 — 패널 알림에서 버튼 하나로 바로 고친다 (검증 룰과 짝: lib/order-validation/validators)
  const ISSUE_QUICK_FIXES: Record<string, { label: string; patch: Partial<FurnitureInput> }> = {
    MISSING_BASE_SUPPORT: { label: "걸레받이 추가 (100mm)", patch: { toe_kick_option: "standard_100" } },
    KITCHEN_BASE_DEPTH_TOO_SMALL: { label: "깊이 500mm로 맞추기", patch: { depth_mm: 500, kitchen_base_depth_mm: 500 } },
  };
  // 선택 가구의 주문 검증/규격 이탈 — 사유와 즉시 해결 버튼을 우측 패널 알림으로(별도 배너 없음)
  const selectedNotice = (() => {
    if (!selectedRoomItem) return null;
    const hasSizeIssue = selectedSizeIssues.length > 0;
    const result = roomSelected === "current" ? validation : validateOrderInput(selectedRoomItem.input);
    if (result.verdict !== "ready") {
      // 필수 입력 누락(상판 선택 등)은 하단 CTA·검수 탭이 안내 — 패널에는 규격/제작 규칙 위반만
      const ruleIssues = result.issues.filter((i) => i.source !== "missing_input");
      const issue = ruleIssues.find((i) => i.level === "error") ?? ruleIssues.find((i) => i.level === "warning");
      if (issue) {
        const quickFix = ISSUE_QUICK_FIXES[issue.code];
        return {
          level: result.verdict === "blocked" ? ("error" as const) : ("warning" as const),
          text: issue.message,
          actionLabel: quickFix ? quickFix.label : hasSizeIssue ? "권장값으로 맞추기" : undefined,
          onAction: quickFix
            ? () => commitRoomItem({ ...selectedRoomItem.input, ...quickFix.patch })
            : hasSizeIssue
              ? snapSelectedToValid
              : undefined,
        };
      }
    }
    if (hasSizeIssue) {
      return {
        level: "warning" as const,
        text: selectedSizeIssues.map((i) => `${i.label} ${i.val}mm (권장 ${i.min}~${i.max}mm)`).join(" · "),
        actionLabel: "권장값으로 맞추기",
        onAction: snapSelectedToValid,
      };
    }
    return null;
  })();
  // 핸들 드래그 리사이즈 — 잡은 쪽만 늘리고(앵커 center) 이웃/벽에 스냅 + 가이드, 침범은 막음
  function resizeRoomItem(id: string, patch: Partial<FurnitureInput>, center?: { x: number; z: number }, dirArg?: { x: number; z: number }) {
    const item = roomItems.find((it) => it.id === id);
    if (!item) return;
    if (!center) {
      commitRoomItemById(id, { ...item.input, ...patch });
      return;
    }
    const sClamp = (mm: number) => Math.min(3000, Math.max(150, Math.round(mm)));
    const sStep = (mm: number) => sClamp(Math.round(mm / 50) * 50); // 50mm 단위로 떨어지게
    const cur = roomPlacements[id] ?? { x: 0, z: 0, rotY: 0 };
    const rot = cur.rotY;
    const isW = patch.width_mm != null;
    // 잡은 쪽 방향 — RoomScene이 넘긴 dir(좌/우·앞/뒤 부호 포함)을 우선 사용
    const dir = dirArg ?? (isW ? { x: Math.cos(rot), z: -Math.sin(rot) } : { x: Math.sin(rot), z: Math.cos(rot) });
    let sizeMm = (isW ? patch.width_mm : patch.depth_mm) ?? 600;
    let nh = sizeMm / 1000 / 2;
    const anchor = { x: center.x - dir.x * nh, z: center.z - dir.z * nh };
    const far = { x: anchor.x + dir.x * nh * 2, z: anchor.z + dir.z * nh * 2 };

    // 늘어나는 모서리를 이웃 가구 모서리/벽에 스냅(축 정렬 회전만)
    const SNAP = 0.05;
    let guide: { axis: "x" | "z"; value: number } | null = null;
    const edges = (axis: "x" | "z") =>
      roomItems
        .filter((it) => it.id !== id)
        .flatMap((it) => {
          const op = roomPlacements[it.id] ?? { x: 0, z: 0, rotY: 0 };
          const oe = halfExtents(it.id, op.rotY);
          return axis === "x" ? [op.x - oe.hx, op.x + oe.hx] : [op.z - oe.hz, op.z + oe.hz];
        });
    if (Math.abs(dir.z) < 0.05) {
      const targets = [roomFloor.leftX, roomFloor.rightX, ...edges("x")];
      let best = SNAP;
      for (const t of targets) if (Math.abs(t - far.x) < best) { best = Math.abs(t - far.x); guide = { axis: "x", value: t }; far.x = t; }
      const raw = Math.max(0.12, (far.x - anchor.x) * dir.x) * 1000;
      sizeMm = guide ? sClamp(raw) : sStep(raw);
      if (!guide) far.x = anchor.x + dir.x * (sizeMm / 1000);
    } else if (Math.abs(dir.x) < 0.05) {
      const targets = [roomFloor.backZ, roomFloor.frontZ, ...edges("z")];
      let best = SNAP;
      for (const t of targets) if (Math.abs(t - far.z) < best) { best = Math.abs(t - far.z); guide = { axis: "z", value: t }; far.z = t; }
      const raw = Math.max(0.12, (far.z - anchor.z) * dir.z) * 1000;
      sizeMm = guide ? sClamp(raw) : sStep(raw);
      if (!guide) far.z = anchor.z + dir.z * (sizeMm / 1000);
    } else {
      sizeMm = sStep(sizeMm);
    }
    nh = sizeMm / 1000 / 2;
    const cx = anchor.x + dir.x * nh;
    const cz = anchor.z + dir.z * nh;
    const finalPatch = isW ? { width_mm: sizeMm } : { depth_mm: sizeMm };

    // 새 반치수로 벽/가구 검사
    const wM = isW ? sizeMm / 1000 : roomFootprints[id].widthM;
    const dM = isW ? roomFootprints[id].depthM : sizeMm / 1000;
    const c = Math.abs(Math.cos(rot));
    const s = Math.abs(Math.sin(rot));
    const hx = c * wM / 2 + s * dM / 2;
    const hz = s * wM / 2 + c * dM / 2;
    if (cx - hx < roomFloor.leftX - 0.001 || cx + hx > roomFloor.rightX + 0.001 || cz - hz < roomFloor.backZ - 0.001 || cz + hz > roomFloor.frontZ + 0.001) return;
    const overlap = roomItems.filter((it) => it.id !== id).some((it) => {
      const op = roomPlacements[it.id] ?? { x: 0, z: 0, rotY: 0 };
      const oe = halfExtents(it.id, op.rotY);
      return hx + oe.hx - Math.abs(cx - op.x) > 0.0015 && hz + oe.hz - Math.abs(cz - op.z) > 0.0015;
    });
    if (overlap) return;
    setRoomGuides(guide ? [guide] : []);
    setRoomPlacements((prev) => ({ ...prev, [id]: { x: cx, z: cz, rotY: rot } }));
    commitRoomItemById(id, { ...item.input, ...finalPatch });
  }
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const requiredChecklistIds = validation.checklist.filter((item) => item.required).map((item) => item.id);
  const allRequiredChecked = requiredChecklistIds.every((id) => checklistState[id]);
  const canPlaceOrder = validation.canOrder && allRequiredChecked;
  const rules = productRules[productType];
  const doorOptions = useMemo(() => getDoorCountOptions(input.productType, input.width_mm, input.has_door), [input.productType, input.width_mm, input.has_door]);
  const optionCases = useMemo(() => countOptionCases(input, materials.length, 3), [input]);

  function update<K extends keyof FurnitureInput>(key: K, value: FurnitureInput[K]) {
    setInput((current) => normalizeInput({ ...current, [key]: value }));
  }

  // 현재 구성을 장바구니(같은 주문)에 담는다 — 푸터/상품추가 패널 공용
  function addCurrentToCart() {
    addConfiguredItem(input.productType, isManual && manualTitle ? manualTitle : product.name, input, 1, {
      order_verdict: validation.verdict,
      checklist_confirmations: requiredChecklistIds.filter((id) => checklistState[id]),
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  function removeCartItem(id: string) {
    setCart(getCart().filter((item) => item.id !== id));
  }

  // 어떤 레이어든 삭제 — 'current'(처음 사물)도 삭제 가능.
  // current 삭제 시: 장바구니에 다음 상품이 있으면 그걸 current로 승격, 없으면 기본 구성으로 초기화.
  function removeRoomItem(id: string) {
    if (id !== "current") {
      removeCartItem(id);
      setRoomSelected(null);
      return;
    }
    const items = getCart();
    if (items.length > 0) {
      const [first, ...rest] = items;
      setCart(rest);
      setInput(normalizeInput(first.input));
    } else {
      setInput(getInitialInput(productType));
    }
    setRoomSelected(null);
  }

  // 다른 상품을 이어서 만들기 — 현재 구성이 주문 가능하면 먼저 담아 보존한 뒤 이동
  function goToProduct(slug: ProductType) {
    if (slug === input.productType) return;
    if (canPlaceOrder) addCurrentToCart();
    router.push(`/custom/${slug}`);
  }

  // IKEA식 — 가구를 '내 공간'에 바로 추가(이동 없음). 기본 구성으로 방에 등장.
  function addFurnitureToRoom(slug: ProductType, overrides?: Pick<RoomAction, "material" | "door_style" | "width_mm" | "height_mm" | "depth_mm">) {
    const label = productLabels[slug] ?? getProduct(slug)?.name ?? slug;
    let nextInput = getInitialInput(slug);
    if (overrides) {
      const draft = { ...nextInput };
      if (overrides.width_mm) draft.width_mm = overrides.width_mm;
      if (overrides.height_mm) draft.height_mm = overrides.height_mm;
      if (overrides.depth_mm) draft.depth_mm = overrides.depth_mm;
      if (overrides.door_style) draft.door_style = overrides.door_style;
      if (overrides.material) {
        const m = materials.find((x) => x.name === overrides.material);
        if (m) { draft.material = m.name; draft.color = m.color; }
      }
      nextInput = normalizeInput(draft);
    }
    const item = addConfiguredItem(slug, label, nextInput, 1);
    setViewMode("room");
    // 방금 추가한 가구를 선택 + 파란 테두리로 어디 들어갔는지 안내(잠시 후 자동 해제)
    setRoomSelected(item.id);
    setJustAddedId(item.id);
    setAddOpen(false);
    setCanvasMode("edit");
    window.setTimeout(() => setJustAddedId((cur) => (cur === item.id ? null : cur)), 3500);
  }

  // 레이어 복사/붙여넣기 — Ctrl+C / Ctrl+V (그리고 복제 버튼)
  const clipboardRef = useRef<{ productType: ProductType; name: string; input: FurnitureInput } | null>(null);
  function copyRoomItem(id: string) {
    const it = roomItems.find((x) => x.id === id);
    if (!it) return;
    clipboardRef.current = { productType: it.input.productType, name: it.name, input: JSON.parse(JSON.stringify(it.input)) as FurnitureInput };
  }
  function pasteRoomItem() {
    const clip = clipboardRef.current;
    if (!clip) return;
    const item = addConfiguredItem(clip.productType, clip.name, JSON.parse(JSON.stringify(clip.input)) as FurnitureInput, 1);
    setViewMode("room");
    setRoomSelected(item.id);
    setJustAddedId(item.id);
    setCanvasMode("edit");
    window.setTimeout(() => setJustAddedId((cur) => (cur === item.id ? null : cur)), 3500);
  }
  function duplicateRoomItem(id: string) {
    copyRoomItem(id);
    pasteRoomItem();
  }

  // AI 채팅 → 동작 실행 (전부 기존 조작으로만 매핑)
  const roomStateSummary: RoomStateSummary = useMemo(
    () => ({
      items: roomItems.map((it) => ({ id: it.id, name: it.name, productType: it.input.productType, width_mm: it.input.width_mm, height_mm: it.input.height_mm, depth_mm: it.input.depth_mm })),
      selectedId: roomSelected,
    }),
    [roomItems, roomSelected],
  );
  function runRoomActions(actions: RoomAction[]) {
    for (const a of actions) {
      if (a.type === "add" && a.productType) {
        addFurnitureToRoom(a.productType, a);
      } else if (a.type === "arrange") {
        resetRoomLayout();
      } else if (a.type === "rotate") {
        if (roomSelected) rotateRoomItem(roomSelected);
      } else if (a.type === "remove") {
        if (roomSelected) removeRoomItem(roomSelected);
      } else if (a.type === "modify") {
        const sel = roomItems.find((it) => it.id === roomSelected);
        if (sel) {
          const draft = { ...sel.input };
          if (a.width_mm) draft.width_mm = a.width_mm;
          if (a.height_mm) draft.height_mm = a.height_mm;
          if (a.depth_mm) draft.depth_mm = a.depth_mm;
          if (a.door_style) draft.door_style = a.door_style;
          if (a.material) {
            const m = materials.find((x) => x.name === a.material);
            if (m) { draft.material = m.name; draft.color = m.color; }
          }
          commitRoomItemById(sel.id, draft);
        }
      }
    }
  }

  function applyKitchenTemplate(templateId: string) {
    const template = getKitchenTemplate(templateId);
    setInput((current) => normalizeInput({
      ...current,
      kitchen_template: template.id,
      width_mm: template.width_mm,
      height_mm: template.base_height_mm,
      depth_mm: template.base_depth_mm,
      kitchen_base_height_mm: template.base_height_mm,
      kitchen_base_depth_mm: template.base_depth_mm,
      kitchen_wall_height_mm: template.wall_height_mm,
      kitchen_wall_depth_mm: template.wall_depth_mm,
      door_count: template.modules.length,
      kitchen_modules_mm: [...template.modules],
      kitchen_base_modules_mm: [...template.modules],
      kitchen_wall_modules_mm: [...template.modules],
      kitchen_module_types: template.modules.map(() => "door"),
      kitchen_drawer_counts: template.modules.map(() => 3),
      kitchen_base_shelf_counts: template.modules.map(() => Math.max(1, current.shelf_count ?? 1)),
      kitchen_wall_shelf_counts: template.modules.map(() => 1),
      kitchen_door_swings: template.modules.map(() => "pair"),
      kitchen_base_hidden_indices: [],
      kitchen_wall_hidden_indices: [],
    }));
  }

  function applyManualKitchenSpec(next: { baseTotalMm?: number; wallTotalMm?: number; moduleCount?: number }) {
    const currentModules = input.kitchen_modules_mm?.length ? input.kitchen_modules_mm : getKitchenTemplate(input.kitchen_template).modules;
    const moduleCount = Math.min(7, Math.max(2, Math.round(next.moduleCount ?? currentModules.length)));
    const baseTotalMm = next.baseTotalMm ?? sumWidths(input.kitchen_base_modules_mm ?? currentModules);
    const wallTotalMm = next.wallTotalMm ?? sumWidths(input.kitchen_wall_modules_mm ?? currentModules);
    const baseModules = distributeKitchenTotalWidth(baseTotalMm, moduleCount);
    const wallModules = distributeKitchenTotalWidth(wallTotalMm, moduleCount);
    const nextTypes = Array.from({ length: moduleCount }, (_, index) => input.kitchen_module_types?.[index] ?? (index === 0 ? "drawer" : "door"));
    const nextDrawerCounts = Array.from({ length: moduleCount }, (_, index) => input.kitchen_drawer_counts?.[index] ?? 3);
    const nextBaseShelfCounts = Array.from({ length: moduleCount }, (_, index) => input.kitchen_base_shelf_counts?.[index] ?? Math.max(1, input.shelf_count ?? 1));
    const nextWallShelfCounts = Array.from({ length: moduleCount }, (_, index) => input.kitchen_wall_shelf_counts?.[index] ?? 1);
    const nextSwings = Array.from({ length: moduleCount }, (_, index) => input.kitchen_door_swings?.[index] ?? "pair" as const);
    const maxIndex = moduleCount - 1;

    setInput((current) => normalizeInput({
      ...current,
      kitchen_modules_mm: baseModules,
      kitchen_base_modules_mm: baseModules,
      kitchen_wall_modules_mm: wallModules,
      door_count: moduleCount,
      kitchen_module_types: nextTypes,
      kitchen_drawer_counts: nextDrawerCounts,
      kitchen_base_shelf_counts: nextBaseShelfCounts,
      kitchen_wall_shelf_counts: nextWallShelfCounts,
      kitchen_door_swings: nextSwings,
      kitchen_base_hidden_indices: (current.kitchen_base_hidden_indices ?? []).filter((index) => index < moduleCount),
      kitchen_wall_hidden_indices: (current.kitchen_wall_hidden_indices ?? []).filter((index) => index < moduleCount),
      sink_module_index: clampModuleIndex(current.sink_module_index ?? 0, maxIndex),
      cooktop_module_index: clampModuleIndex(current.cooktop_module_index ?? 0, maxIndex),
      hood_module_index: clampModuleIndex(current.hood_module_index ?? current.cooktop_module_index ?? 0, maxIndex),
      microwave_module_index: clampModuleIndex(current.microwave_module_index ?? maxIndex, maxIndex),
    }));
  }

  function matchesKitchenTemplate(templateId: string) {
    const template = getKitchenTemplate(templateId);
    const baseModules = input.kitchen_base_modules_mm ?? input.kitchen_modules_mm ?? template.modules;
    const wallModules = input.kitchen_wall_modules_mm ?? input.kitchen_modules_mm ?? template.modules;
    return sameWidths(template.modules, input.kitchen_modules_mm ?? template.modules)
      && sameWidths(template.modules, baseModules)
      && sameWidths(template.modules, wallModules)
      && (input.kitchen_base_hidden_indices?.length ?? 0) === 0
      && (input.kitchen_wall_hidden_indices?.length ?? 0) === 0;
  }

  const kitchenCurrentTemplate = input.productType === "kitchen_full_set" ? getKitchenTemplate(input.kitchen_template) : null;
  const kitchenCurrentModules = kitchenCurrentTemplate ? input.kitchen_modules_mm ?? kitchenCurrentTemplate.modules : [];
  const kitchenBaseTotalMm = sumWidths(input.kitchen_base_modules_mm ?? kitchenCurrentModules);
  const kitchenWallTotalMm = sumWidths(input.kitchen_wall_modules_mm ?? kitchenCurrentModules);
  const kitchenModuleCount = kitchenCurrentModules.length || 1;
  const isManualKitchenSpec = input.productType === "kitchen_full_set" && !kitchenTemplates.some((template) => matchesKitchenTemplate(template.id));
  const wardrobeLayout = input.productType === "built_in_wardrobe"
    ? normalizeWardrobeModules(input.wardrobe_modules_mm, input.wardrobe_module_types, input.width_mm)
    : { modules: [] as number[], moduleTypes: [] as WardrobeModuleType[], width_mm: 0 };
  const isModularProduct = input.productType === "built_in_wardrobe" || input.productType === "kitchen_full_set";

  const hasKitchenFixtures = input.productType === "kitchen_full_set" || input.productType === "kitchen_base_cabinet";
  const isPro = (input.customer_type ?? "consumer") === "professional"; // 전문가/관리자(자율) 모드

  // ── 옵션 패널은 '선택된 레이어'를 편집한다(없으면 현재 제작 항목) — 레이어 클릭 후 문·부속 등이 그 레이어에 적용되게 ──
  const activeRoomId = roomSelected ?? "current";
  const activeInput: FurnitureInput = roomItems.find((it) => it.id === activeRoomId)?.input ?? input;
  const updateActive = <K extends keyof FurnitureInput>(key: K, value: FurnitureInput[K]) =>
    commitRoomItemById(activeRoomId, { ...activeInput, [key]: value });
  const setActiveMaterial = (name: string, color: string) => commitRoomItemById(activeRoomId, { ...activeInput, material: name, color });
  const activeRules = productRules[activeInput.productType];
  const activeDoorOptions = getDoorCountOptions(activeInput.productType, activeInput.width_mm, activeInput.has_door);
  const showSwingChips = activeInput.has_door && (activeInput.productType === "custom_shelf" || activeInput.productType === "gap_cabinet" || activeInput.productType === "shoe_cabinet");

  // 간편(소비자) 모드에서는 설비(주방 모델 선택) 같은 전문 카테고리를 숨긴다.
  // 소재는 미리보기 우측 패널(가구 선택 시)로 이동 — 상단 카테고리에서 제거해 버튼 수를 줄인다.
  const categories = getEditorCategories(activeInput.productType, isPro).filter((c) => (isPro || c.id !== "fixtures") && c.id !== "material");
  // effectiveCat: 데스크톱 2분할 패널이 항상 표시할 칸(미선택 시 첫 칸). 모바일 팝업은 activeCat != null일 때만 뜬다.
  const effectiveCat = activeCat ?? categories[0]?.id ?? null;
  const activeLabel = categories.find((cat) => cat.id === activeCat)?.label ?? "";
  const effectiveLabel = categories.find((cat) => cat.id === effectiveCat)?.label ?? "";

  // '＋ 가구 추가' 시트 내용 — 데스크톱(캔버스 위 반투명 플로팅)과 모바일(섹션 아래)이 공유
  const addSheetBody = (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-black text-ink">가구 추가</span>
        <button type="button" onClick={() => { setAddOpen(false); setPickerSlug(null); }} aria-label="닫기" className="grid h-6 w-6 place-items-center rounded-md bg-soft text-sm font-black leading-none text-slate-500 hover:bg-slate-100">×</button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {catalogCategories.flatMap((cat) => cat.slugs).map((slug) => {
          const presets = roomAddPresets[slug];
          const active = pickerSlug === slug;
          return (
            <button
              key={slug}
              type="button"
              title={`${productLabels[slug] ?? slug} ${presets ? "규격 선택" : "추가"}`}
              onClick={() => (presets ? setPickerSlug(active ? null : slug) : addFurnitureToRoom(slug))}
              className={`group flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-xl border bg-white/80 p-1.5 transition hover:bg-white hover:shadow-sm active:scale-95 ${active ? "border-brand ring-2 ring-brand/30" : "border-slate-200/70 hover:border-brand"}`}
            >
              <span className="flex aspect-square w-full items-center justify-center rounded-lg bg-slate-50/70">
                <ProductArt slug={slug} className="h-11 w-11" />
              </span>
              <span className="line-clamp-1 w-full text-center text-[10px] font-black text-slate-700">{productLabels[slug] ?? slug}</span>
            </button>
          );
        })}
      </div>
      {pickerSlug && roomAddPresets[pickerSlug] && (
        <div className="mt-2 rounded-xl border border-brand/30 bg-brand/5 p-2">
          <div className="mb-1.5 text-[11px] font-black text-brand">{productLabels[pickerSlug] ?? pickerSlug} 규격 — 누르면 바로 추가돼요</div>
          <div className="flex flex-wrap gap-1.5">
            {roomAddPresets[pickerSlug]!.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => addFurnitureToRoom(pickerSlug, { width_mm: p.width_mm, height_mm: p.height_mm, depth_mm: p.depth_mm })}
                className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-black text-slate-700 ring-1 ring-slate-200 transition hover:ring-brand active:scale-95"
              >
                폭 {p.label}mm
                <span className="ml-1 text-[10px] font-bold text-slate-400">H{p.height_mm}·D{p.depth_mm}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <EditorShell
      overlay
      categories={categories}
      activeCat={activeCat}
      effectiveCat={effectiveCat}
      onSelectCat={setActiveCat}
      panelTitle={activeLabel}
      panelHeading={effectiveLabel}
      toolbar={
        <>
          <span className="shrink-0 px-1 text-[12px] font-black text-ink">{isManual && manualTitle ? manualTitle : product.name}</span>
          <div className="inline-flex shrink-0 rounded-full border border-slate-200 bg-white p-0.5 text-[10px] font-black">
            {([{ value: "consumer", label: "간편" }, { value: "professional", label: "전문가" }] as const).map((mode) => (
              <button key={mode.value} type="button" onClick={() => update("customer_type", mode.value)} className={`rounded-full px-2.5 py-1 transition ${(input.customer_type ?? "consumer") === mode.value ? "bg-brand text-white" : "text-slate-500"}`}>{mode.label}</button>
            ))}
          </div>
          <button type="button" title="AI로 만들기" aria-label="AI로 만들기" onClick={() => setChatOpen((v) => !v)} className={`grid h-9 shrink-0 place-items-center rounded-full border px-3 text-[12px] font-black transition ${chatOpen ? "border-brand bg-brand text-white" : "border-brand/40 bg-white text-brand"}`}>AI</button>
          {isModularProduct && isPro && (
            <button type="button" title="도면 편집" aria-label="도면 편집" onClick={() => setViewMode(viewMode === "2d" ? "room" : "2d")} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition ${viewMode === "2d" ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600"}`}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" strokeLinecap="round" /></svg>
            </button>
          )}
        </>
      }
      canvas={
        <div className="relative h-full w-full">
          {/* Phase 1: 주방 세트 신규 생성 시 프리셋 픽커를 먼저 (빈 캔버스 대신 완성 구성에서 시작) */}
          {showKitchenPreset && input.productType === "kitchen_full_set" && (
            <div className="absolute inset-0 z-40 flex items-start justify-center overflow-auto bg-slate-50/95 p-4 backdrop-blur-sm sm:items-center">
              <div className="w-full max-w-lg">
                <KitchenPresetPicker
                  currentInput={input}
                  onApply={(next) => {
                    setInput(normalizeInput(next));
                    setShowKitchenPreset(false);
                  }}
                  onSkip={() => setShowKitchenPreset(false)}
                />
              </div>
            </div>
          )}
          {!(isModularProduct && isPro && viewMode === "2d") ? (
            <>
              <RoomScene items={roomItems} placements={roomPlacements} selectedId={roomSelected} highlightId={justAddedId} expert={isPro} editable={canvasMode === "edit"} onSelect={setRoomSelected} onMove={moveRoomItem} onMoveEnd={endRoomMove} onResize={resizeRoomItem} onCommitItem={commitRoomItemById} onRotateItem={rotateRoomItem} onDuplicateItem={duplicateRoomItem} onRemoveItem={removeRoomItem} selectedNotice={selectedNotice} mobilePanelHost={mobilePanelHost} showDimensions={showDimensions} doorsOpen={doorsOpen} guides={roomGuides} floor={roomFloor} />

              {/* 통합 툴바 — 보기/수정 모드 · 치수 · 문열림 · 자동정렬 · 실행취소를 한 곳에(글래스 바) */}
              <div className="pointer-events-auto absolute left-3 top-3 z-20 flex items-center gap-1 rounded-2xl border border-slate-200/70 bg-white/85 p-1 shadow-lg shadow-slate-900/5 backdrop-blur-md">
                <div className="flex rounded-xl bg-slate-100/80 p-0.5 text-[11px] font-black">
                  {([["view", "보기"], ["edit", "수정"]] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setCanvasMode(mode);
                        if (mode === "view") {
                          setRoomSelected(null);
                          setRoomGuides([]);
                          setAddOpen(false);
                        }
                      }}
                      className={`rounded-lg px-2.5 py-1.5 transition ${canvasMode === mode ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mx-0.5 h-5 w-px bg-slate-200" />
                <button type="button" title="치수 표시" aria-label="치수 표시" aria-pressed={showDimensions} onClick={() => setShowDimensions((v) => !v)} className={`grid h-8 w-8 place-items-center rounded-xl transition ${showDimensions ? "bg-brand text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="8" width="18" height="8" rx="1.5" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" strokeLinecap="round" /></svg>
                </button>
                <button type="button" title="문 열림" aria-label="문 열림" aria-pressed={doorsOpen} onClick={() => setDoorsOpen((v) => !v)} className={`grid h-8 w-8 place-items-center rounded-xl transition ${doorsOpen ? "bg-brand text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 4 6 6v13l8 2V4Z" strokeLinejoin="round" /><path d="M14 4h4v15h-4M10.5 12v1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {canvasMode === "edit" && (
                  <>
                    <button type="button" title="자동 정렬" aria-label="자동 정렬" onClick={resetRoomLayout} className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h10M4 12h16M4 18h7" strokeLinecap="round" /><path d="M18 7l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <div className="mx-0.5 h-5 w-px bg-slate-200" />
                    <button type="button" title="되돌리기" aria-label="되돌리기" disabled={!canUndo} onClick={undo} className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-30">
                      <UndoIcon />
                    </button>
                    <button type="button" title="다시실행" aria-label="다시실행" disabled={!canRedo} onClick={redo} className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-30">
                      <RedoIcon />
                    </button>
                  </>
                )}
              </div>

              {/* AI 명령 채팅 — 자연어로 가구/공간 만들기(기존 동작만) */}
              {chatOpen && (
                <div className="pointer-events-none absolute right-3 top-3 bottom-3 z-50 flex w-[min(86%,340px)] justify-end">
                  <RoomCommandChat state={roomStateSummary} onActions={runRoomActions} onClose={() => setChatOpen(false)} />
                </div>
              )}

              {/* ＋ 가구 추가 — 버튼은 캔버스 하단 플로팅. 시트는 데스크톱=캔버스 위 반투명, 모바일=섹션 아래(belowCanvas) */}
              {canvasMode === "edit" && (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex flex-col items-center gap-2 px-3">
                  {addOpen && (
                    <div className="pointer-events-auto w-[min(100%,560px)] rounded-2xl border border-white/60 bg-white/70 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-[3px] max-sm:hidden">
                      {addSheetBody}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setAddOpen((v) => !v)}
                    className={`pointer-events-auto flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[12px] font-black shadow-lg backdrop-blur-md transition active:scale-95 ${addOpen ? "bg-slate-900 text-white" : "border border-slate-200/70 bg-white/90 text-slate-700 hover:border-brand hover:text-brand"}`}
                  >
                    <span className="text-base leading-none">＋</span> 가구 추가
                  </button>
                </div>
              )}
            </>
          ) : (
            <section className="h-full w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              {input.productType === "kitchen_full_set" ? (
                <KitchenDrawingView
                  input={input}
                  onInputChange={(nextInput) => setInput(normalizeInput(nextInput))}
                  showMeta={false}
                  selectedIndex={selModule}
                  onSelectIndex={(index) => {
                    setSelModule(index);
                    // kitchen_full_set은 '칸 편집' 탭이 없으므로(3D 클릭으로 통일) 유령 탭 전환 방지
                    if (categories.some((cat) => cat.id === "modules")) setActiveCat("modules");
                  }}
                  history={{ canUndo, canRedo, onUndo: undo, onRedo: redo }}
                />
              ) : (
                <ModuleStripPlan
                  modules={wardrobeLayout.modules}
                  types={wardrobeLayout.moduleTypes}
                  typeOptions={(Object.entries(wardrobeModuleTypeLabels) as Array<[WardrobeModuleType, string]>).map(([value, label]) => ({ value, label }))}
                  typeLabels={wardrobeModuleTypeLabels}
                  minWidthMm={MIN_WARDROBE_MODULE_WIDTH_MM}
                  maxWidthMm={MAX_WARDROBE_MODULE_WIDTH_MM}
                  depthMm={input.depth_mm}
                  accent="#7c3aed"
                  canAdd={wardrobeLayout.modules.length < MAX_WARDROBE_MODULE_COUNT}
                  canRemove={wardrobeLayout.modules.length > MIN_WARDROBE_MODULE_COUNT}
                  onCommit={(mods, nextTypes) =>
                    setInput((current) =>
                      normalizeInput({
                        ...current,
                        width_mm: mods.reduce((s, w) => s + w, 0),
                        wardrobe_modules_mm: mods,
                        wardrobe_module_types: nextTypes as WardrobeModuleType[],
                      }),
                    )
                  }
                />
              )}
            </section>
          )}
        </div>
      }
      belowCanvas={
        !(isModularProduct && isPro && viewMode === "2d") ? (
          <div className="mt-2 space-y-2 sm:hidden">
            {/* 모바일: 사이즈 패널(RoomScene이 포털로 채움)과 가구추가 시트를 미리보기 아래에 — 화면을 가리지 않게 */}
            <div ref={setMobilePanelHost} />
            {canvasMode === "edit" && addOpen && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">{addSheetBody}</div>
            )}
          </div>
        ) : null
      }
      panel={
        <>
                {effectiveCat === "material" && (
                  <div>
                    <div className="mb-2 text-xs font-black text-slate-500">소재</div>
                    <div className="flex flex-wrap gap-2">
                      {materials.map((material) => (
                        <button
                          key={material.name}
                          type="button"
                          title={material.name}
                          aria-label={material.name}
                          onClick={() => setActiveMaterial(material.name, material.color)}
                          className={`shrink-0 rounded-full p-1 transition ${activeInput.material === material.name ? "bg-brand ring-4 ring-brand/20" : "bg-white ring-1 ring-slate-200"}`}
                        >
                          <span
                            className="block h-9 w-9 rounded-full border-2 border-white shadow-sm"
                            style={{ background: material.name.includes("LPM") ? `repeating-linear-gradient(90deg, ${material.tone}, ${material.tone} 8px, rgba(255,255,255,.22) 8px, rgba(255,255,255,.22) 12px)` : material.tone }}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{materials.find((material) => material.name === activeInput.material)?.description}</p>
                  </div>
                )}

                {effectiveCat === "spec" && (
                  <div className="space-y-4">
                    {activeInput.productType === "kitchen_full_set" && activeRoomId === "current" && (
                      <div>
                        <div className="mb-2 text-xs font-black text-slate-500">기본 규격</div>
                        <div className="flex flex-wrap gap-2">
                          {kitchenTemplates.map((template) => (
                            <button key={template.id} type="button" onClick={() => { setShowManualKitchenSpec(false); applyKitchenTemplate(template.id); }} className={`rounded-lg px-3 py-1.5 text-xs font-black ${matchesKitchenTemplate(template.id) && !showManualKitchenSpec ? "bg-brand text-white" : "bg-soft text-slate-700"}`}>
                              {template.name}
                            </button>
                          ))}
                          <button type="button" onClick={() => setShowManualKitchenSpec((value) => !value)} className={`rounded-lg px-3 py-1.5 text-xs font-black ${showManualKitchenSpec || isManualKitchenSpec ? "bg-slate-950 text-white" : "bg-soft text-slate-700"}`}>
                            수동 규격
                          </button>
                        </div>
                        {(showManualKitchenSpec || isManualKitchenSpec) && (
                          <div className="mt-3 grid gap-3">
                            <NumberField label="하부 총 길이" value={kitchenBaseTotalMm} onChange={(value) => applyManualKitchenSpec({ baseTotalMm: value })} />
                            <NumberField label="상부 총 길이" value={kitchenWallTotalMm} onChange={(value) => applyManualKitchenSpec({ wallTotalMm: value })} />
                            <NumberField label="칸 수" value={kitchenModuleCount} onChange={(value) => applyManualKitchenSpec({ moduleCount: value })} />
                          </div>
                        )}
                        <p className="mt-2 text-[11px] text-slate-500">3D에서 개별 장을 눌러 칸별 폭을 조정할 수 있습니다.</p>
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <NumberField label="가로" value={activeInput.width_mm} onChange={(value) => updateActive("width_mm", value)} disabled={activeInput.productType === "kitchen_full_set" || activeInput.productType === "built_in_wardrobe"} />
                      <NumberField label="높이" value={activeInput.height_mm} onChange={(value) => updateActive("height_mm", value)} disabled={activeInput.productType === "kitchen_full_set"} />
                      <NumberField label="깊이" value={activeInput.depth_mm} onChange={(value) => updateActive("depth_mm", value)} disabled={activeInput.productType === "kitchen_full_set" || activeInput.productType === "kitchen_base_cabinet"} />
                      <NumberField label="칸 수" value={activeInput.shelf_count} onChange={(value) => updateActive("shelf_count", value)} />
                    </div>
                  </div>
                )}

                {effectiveCat === "modules" && (
                  <ModuleListEditor
                    input={activeInput}
                    onChange={(partial) => commitRoomItemById(activeRoomId, { ...activeInput, ...partial })}
                    selectedIndex={selModule ?? undefined}
                    onSelectIndex={setSelModule}
                  />
                )}

                {effectiveCat === "fixtures" && (activeInput.productType === "kitchen_full_set" || activeInput.productType === "kitchen_base_cabinet") && (
                  <div className="grid gap-3">
                    <SelectField label="상판" value={activeInput.countertop_type ?? "none"} onChange={(value) => updateActive("countertop_type", value)} options={countertopOptions.map((option) => ({ value: option.id, label: option.name }))} />
                    <SelectField label="걸레받이" value={activeInput.toe_kick_option ?? "none"} onChange={(value) => updateActive("toe_kick_option", value)} options={toeKickOptions.map((option) => ({ value: option.id, label: option.name }))} />
                    <SelectField label="싱크볼" value={activeInput.sink_option ?? "none"} onChange={(value) => updateActive("sink_option", value)} options={sinkOptions.map((option) => ({ value: option.id, label: option.name }))} />
                    <SelectField label="수전" value={activeInput.faucet_option ?? "none"} onChange={(value) => updateActive("faucet_option", value)} options={faucetOptions.map((option) => ({ value: option.id, label: option.name }))} />
                    {activeInput.productType === "kitchen_full_set" && (
                      <>
                        <SelectField label="후드" value={activeInput.hood_option ?? "haatz_slide_600"} onChange={(value) => updateActive("hood_option", value)} options={hoodOptions.map((option) => ({ value: option.id, label: option.name }))} />
                        <SelectField label="쿡탑/가스렌지" value={activeInput.cooktop_option ?? "none"} onChange={(value) => updateActive("cooktop_option", value)} options={cooktopOptions.map((option) => ({ value: option.id, label: option.name }))} />
                        <SelectField label="전자레인지장" value={activeInput.microwave_option ?? "none"} onChange={(value) => updateActive("microwave_option", value)} options={microwaveOptions.map((option) => ({ value: option.id, label: option.name }))} />
                      </>
                    )}
                    {activeInput.productType === "kitchen_base_cabinet" && (
                      <SelectField label="서랍형" value={String((activeInput.drawer_module_count ?? 0) > 0)} onChange={(value) => updateActive("drawer_module_count", value === "true" ? 1 : 0)} options={[{ value: "false", label: "도어형" }, { value: "true", label: "서랍형" }]} />
                    )}
                  </div>
                )}

                {effectiveCat === "doors" && (
                  activeInput.productType === "kitchen_full_set" ? (
                    <div className="space-y-4">
                      <div className="w-full rounded-xl bg-sky-50 px-3 py-2.5 text-left text-[11px] font-bold leading-5 text-sky-900 ring-1 ring-sky-200">
                        칸별 <b>문 방향(1짝/2짝)</b>·<b>손잡이</b>는 칸마다 달라요 → <b>3D 미리보기에서 캐비닛을 누르면</b> 뜨는 편집창에서 <b>하부·상부 따로</b> 조절하세요.
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <SelectField label="손잡이 (전체 기본)" value={activeInput.handle_type} onChange={(value) => updateActive("handle_type", value)} options={[{ value: "기본 손잡이", label: "기본 손잡이" }, { value: "댐핑", label: "댐핑" }, { value: "무손잡이", label: "무손잡이(전체)" }]} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <SelectField label="문 유무" value={String(activeInput.has_door)} onChange={(value) => updateActive("has_door", value === "true")} disabled={!activeRules.allowsDoorless} options={[...(activeRules.allowsDoorless ? [{ value: "false", label: "문 없음" }] : []), { value: "true", label: "문 있음" }]} />
                        <SelectField label="문짝 개수" value={String(activeInput.door_count)} onChange={(value) => updateActive("door_count", Number(value))} disabled={!activeInput.has_door || activeDoorOptions.length === 0} options={activeDoorOptions.map((count) => ({ value: String(count), label: count === 0 ? "문 없음" : `${count}개` }))} />
                        <SelectField label="손잡이" value={activeInput.handle_type} onChange={(value) => updateActive("handle_type", value)} options={[{ value: "기본 손잡이", label: "기본 손잡이" }, { value: "댐핑", label: "댐핑" }, { value: "무손잡이", label: "무손잡이" }]} />
                      </div>
                      {showSwingChips && (
                        <div>
                          <div className="mb-2 text-xs font-black text-slate-500">문 열림 방향</div>
                          <div className="flex flex-wrap gap-2">
                            {([{ id: "pair", label: "양개(좌우)" }, { id: "left", label: "좌측 경첩" }, { id: "right", label: "우측 경첩" }] as const).map((option) => (
                              <button key={option.id} type="button" onClick={() => updateActive("door_swing", option.id)} className={`rounded-lg px-3 py-1.5 text-xs font-black ${(activeInput.door_swing ?? "pair") === option.id ? "bg-brand text-white" : "bg-soft text-slate-700"}`}>
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="rounded-2xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
                        가능한 문짝 조합: {activeDoorOptions.length ? activeDoorOptions.map((count) => `${count}개`).join(", ") : "없음"}
                      </div>
                    </div>
                  )
                )}

                {effectiveCat === "build" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold leading-5 text-slate-200">
                      전문가(시공자) 전용 — 공장 제작 사양입니다. 배수·수전·가스·콘센트 타공은 <b className="text-amber-300">현장 타공</b>으로 분류되어 재단표에 없습니다.
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <h3 className="text-xs font-black text-ink">재단표 (부품)</h3>
                        <span className="text-[11px] font-bold text-slate-400">원판 {quote.sheetCount}장 · {quote.parts.reduce((sum, part) => sum + part.quantity, 0)}개</span>
                      </div>
                      <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
                        <table className="w-full text-[11px]">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-2 py-1.5 text-left font-black">부품</th>
                              <th className="px-2 py-1.5 text-right font-black">가로</th>
                              <th className="px-2 py-1.5 text-right font-black">세로</th>
                              <th className="px-2 py-1.5 text-right font-black">수량</th>
                              <th className="px-2 py-1.5 text-left font-black">자재</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {quote.parts.map((part) => (
                              <tr key={`${part.name}-${part.width_mm}-${part.height_mm}`}>
                                <td className="px-2 py-1.5 font-bold text-ink">{part.name}</td>
                                <td className="px-2 py-1.5 text-right">{part.width_mm}</td>
                                <td className="px-2 py-1.5 text-right">{part.height_mm}</td>
                                <td className="px-2 py-1.5 text-right">{part.quantity}</td>
                                <td className="px-2 py-1.5 text-slate-500">{part.material}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {quote.hardwareTasks.length > 0 && (
                      <div>
                        <h3 className="mb-1.5 text-xs font-black text-ink">부속 리스트</h3>
                        <ul className="space-y-1">
                          {quote.hardwareTasks.map((task) => (
                            <li key={task.hardware_name} className="flex items-center justify-between rounded-lg bg-soft px-3 py-1.5 text-[11px]">
                              <span className="font-bold text-ink">{task.hardware_name} <span className="font-normal text-slate-400">{task.spec}</span></span>
                              <span className="font-black text-slate-600">{task.quantity}{task.unit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {quote.siteTasks.length > 0 && (
                      <div>
                        <h3 className="mb-1.5 text-xs font-black text-amber-800">현장 타공·조정 (시공자)</h3>
                        <ul className="space-y-1">
                          {quote.siteTasks.map((task) => (
                            <li key={task.name} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px]">
                              <span className={`mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-black text-white ${task.category === "타공" ? "bg-rose-600" : task.category === "조정" ? "bg-amber-600" : "bg-sky-600"}`}>{task.category}</span>
                              <div>
                                <div className="font-black text-slate-800">{task.name}</div>
                                {task.note && <div className="text-slate-500">{task.note}</div>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {effectiveCat === "addproduct" && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold leading-5 text-slate-500">
                      한 주문에 여러 상품을 함께 담아 <b>합산 주문</b>할 수 있어요. 지금 구성을 담은 뒤 다른 상품을 이어서 만들면 됩니다.
                    </p>

                    {/* 주문 합산 */}
                    <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                        <span>담긴 상품 {cartItems.length}개</span>
                        <span>{formatMoney(cartTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                        <span>현재 구성</span>
                        <span>{formatMoney(quote.finalPrice)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-white/15 pt-1.5">
                        <span className="text-xs font-black">합계(현재 포함)</span>
                        <span className="text-base font-black">{formatMoney(cartTotal + quote.finalPrice)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canPlaceOrder}
                      onClick={addCurrentToCart}
                      className="w-full rounded-2xl bg-brand px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {added ? "담았어요 ✓" : "이 구성 주문목록에 담기"}
                    </button>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <h3 className="text-xs font-black text-ink">담긴 상품 ({cartItems.length})</h3>
                        {cartItems.length > 0 && (
                          <button type="button" onClick={() => router.push("/cart")} className="text-[11px] font-black text-brand underline-offset-2 hover:underline">장바구니/주문 →</button>
                        )}
                      </div>
                      {cartItems.length === 0 ? (
                        <div className="rounded-xl bg-soft px-3 py-4 text-center text-[11px] font-bold text-slate-400">아직 담긴 상품이 없어요.</div>
                      ) : (
                        <ul className="space-y-1.5">
                          {cartItems.map((item) => (
                            <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-soft px-3 py-2">
                              <div className="min-w-0">
                                <div className="truncate text-xs font-black text-ink">{item.name}</div>
                                <div className="text-[10px] font-bold text-slate-400">{item.input.width_mm}×{item.input.height_mm}×{item.input.depth_mm}mm · {item.quantity}개</div>
                              </div>
                              <button type="button" onClick={() => removeCartItem(item.id)} className="shrink-0 rounded-lg bg-white px-2 py-1 text-[10px] font-black text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">삭제</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <h3 className="mb-1.5 text-xs font-black text-ink">내 공간에 가구 추가</h3>
                      <p className="mb-2 text-[11px] font-bold text-slate-500">고르면 <b>‘내 공간’ 화면 안에 바로 추가</b>돼요(기본 구성). 한 방에서 끌어 배치하고 주문 합계에 합산됩니다.</p>
                      <div className="space-y-3">
                        {catalogCategories.map((cat) => (
                          <div key={cat.id}>
                            <div className="mb-1 text-[10px] font-black text-slate-400">{cat.title}</div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {cat.slugs.map((slug) => (
                                <button
                                  key={slug}
                                  type="button"
                                  onClick={() => addFurnitureToRoom(slug)}
                                  className="rounded-xl bg-white px-2 py-2 text-[11px] font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                                >
                                  + {productLabels[slug] ?? slug}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] font-bold text-slate-400">상세하게 만들려면 해당 상품 페이지로:
                        <span className="ml-1 inline-flex flex-wrap gap-1">
                          {catalogCategories.flatMap((c) => c.slugs).filter((s) => s !== input.productType).slice(0, 4).map((slug) => (
                            <button key={slug} type="button" onClick={() => goToProduct(slug)} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-600 hover:bg-slate-200">{productLabels[slug] ?? slug} ↗</button>
                          ))}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
                {effectiveCat === "check" && (
                  <div className="space-y-3">
                    {quote.warnings.map((warning) => (
                      <div key={warning.message} className={`rounded-xl px-3 py-2 text-xs font-bold ${warning.type === "error" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>
                        {warning.message}
                      </div>
                    ))}
                    <PreOrderCheckPanel
                      input={input}
                      validation={validation}
                      checklistState={checklistState}
                      onChecklistChange={(id, checked) => setChecklistState((current) => ({ ...current, [id]: checked }))}
                      onInputChange={(partial) => setInput((current) => normalizeInput({ ...current, ...partial }))}
                    />
                  </div>
                )}
        </>
      }
      footer={
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 sm:gap-3 lg:max-w-6xl">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-500 sm:text-xs">예상 견적</div>
              <div className="truncate text-xl font-black text-brand sm:text-2xl">{formatMoney(quote.finalPrice)}</div>
              {/* 상태 표기는 CTA와 같은 기준(주문 검증 verdict)으로 통일 — 견적 verdict와 섞이면 혼란 */}
              <div className="truncate text-[11px] font-semibold text-slate-500">
                원판 {quote.sheetCount}장 · 마진 {(quote.marginRate * 100).toFixed(0)}% · {ORDER_VERDICT_LABELS[validation.verdict]}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* 모바일에선 아이콘만 — 좁은 화면에서 CTA가 잘리지 않게 */}
              <button
                type="button"
                title="장바구니 담기"
                aria-label="장바구니 담기"
                disabled={!canPlaceOrder}
                onClick={() => {
                  addConfiguredItem(input.productType, isManual && manualTitle ? manualTitle : product.name, input, 1, {
                    order_verdict: validation.verdict,
                    checklist_confirmations: requiredChecklistIds.filter((id) => checklistState[id]),
                  });
                  setAdded(true);
                  window.setTimeout(() => setAdded(false), 1600);
                }}
                className="rounded-2xl border-2 border-brand px-3 py-2.5 text-[13px] font-black text-brand disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 sm:px-4 sm:py-3 sm:text-sm"
              >
                <span className="sm:hidden" aria-hidden="true">
                  {added ? "✓" : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /><path d="M3 4h2l2.4 12h10.2L20 7H6" /></svg>
                  )}
                </span>
                <span className="max-sm:hidden">{added ? "담김 ✓" : "장바구니 담기"}</span>
              </button>
              <button
                type="button"
                disabled={!canPlaceOrder}
                onClick={() => {
                  addConfiguredItem(input.productType, isManual && manualTitle ? manualTitle : product.name, input, 1, {
                    order_verdict: validation.verdict,
                    checklist_confirmations: requiredChecklistIds.filter((id) => checklistState[id]),
                  });
                  router.push("/cart");
                }}
                className="whitespace-nowrap rounded-2xl bg-brand px-3.5 py-2.5 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 sm:px-5 sm:py-3 sm:text-sm"
              >
                {ORDER_VERDICT_CTA[validation.verdict]}
              </button>
            </div>
          </div>
        </div>
      }
    />
  );
}

function orderVerdictToLevel(verdict: "ready" | "needs_review" | "inquiry_required" | "blocked") {
  if (verdict === "blocked") return "불가" as const;
  if (verdict === "inquiry_required") return "제작문의" as const;
  if (verdict === "needs_review") return "주의" as const;
  return "가능" as const;
}

const COMPACT_FIELD = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-700";

function NumberField({ label, value, onChange, disabled }: { label: string; value: number; onChange: (value: number) => void; disabled?: boolean }) {
  return (
    <label className="space-y-1 text-xs font-bold text-slate-600">
      {label}
      <input className={COMPACT_FIELD} type="number" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1 text-xs font-bold text-slate-600">
      {label}
      <select className={COMPACT_FIELD} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function sumWidths(widths: number[]) {
  return widths.reduce((sum, width) => sum + width, 0);
}

function sameWidths(a: number[], b: number[]) {
  return a.length === b.length && a.every((width, index) => width === b[index]);
}

function distributeKitchenTotalWidth(totalWidthMm: number, moduleCount: number) {
  const safeCount = Math.min(7, Math.max(2, Math.round(moduleCount)));
  const safeTotal = Math.min(KITCHEN_STANDARDS.moduleWidthMaxMm * safeCount, Math.max(KITCHEN_STANDARDS.moduleWidthMinMm * safeCount, Math.round(totalWidthMm)));
  const baseWidth = Math.floor(safeTotal / safeCount / 10) * 10;
  const modules = Array.from({ length: safeCount }, () => baseWidth);
  let remaining = safeTotal - baseWidth * safeCount;
  for (let index = modules.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const add = Math.min(remaining, 10);
    modules[index] += add;
    remaining -= add;
  }
  return modules.map((width) => snapKitchenModuleWidthMm(width));
}

function getInitialInput(productType: ProductType): FurnitureInput {
  if (productType === "kitchen_base_cabinet") {
    return {
      ...defaultInput,
      productType,
      width_mm: 900,
      height_mm: KITCHEN_STANDARDS.baseHeightMm,
      depth_mm: KITCHEN_STANDARDS.baseDepthMm,
      has_door: true,
      door_count: 2,
      shelf_count: 1,
      material: "UV 하이그로시 화이트",
      color: "무광 화이트",
      countertop_type: "none",
      toe_kick_option: "none",
      sink_option: "none",
      faucet_option: "none",
      drawer_module_count: 0,
    };
  }
  if (productType === "kitchen_wall_cabinet") {
    return { ...defaultInput, productType, width_mm: 900, height_mm: KITCHEN_STANDARDS.wallHeightMm, depth_mm: KITCHEN_STANDARDS.wallDepthMm, has_door: true, door_count: 3, shelf_count: 1, material: "UV 하이그로시 화이트", color: "화이트" };
  }
  if (productType === "kitchen_full_set") {
    return {
      ...defaultInput,
      productType,
      width_mm: 2400,
      height_mm: KITCHEN_STANDARDS.baseHeightMm,
      depth_mm: KITCHEN_STANDARDS.baseDepthMm,
      kitchen_base_height_mm: KITCHEN_STANDARDS.baseHeightMm,
      kitchen_base_depth_mm: KITCHEN_STANDARDS.baseDepthMm,
      kitchen_wall_height_mm: KITCHEN_STANDARDS.wallHeightMm,
      kitchen_wall_depth_mm: KITCHEN_STANDARDS.wallDepthMm,
      has_door: true,
      door_count: 4,
      shelf_count: 1,
      material: "UV 하이그로시 화이트",
      color: "무광 화이트",
      kitchen_template: "kitchen_2400_standard",
      countertop_type: "none",
      toe_kick_option: "none",
      sink_option: "none",
      faucet_option: "none",
      hood_option: "none",
      cooktop_option: "none",
      microwave_option: "none",
      drawer_module_count: 1,
      pullout_module_count: 0,
      kitchen_modules_mm: [600, 600, 600, 600],
      kitchen_module_types: ["drawer", "door", "door", "door"],
      kitchen_drawer_counts: [3, 3, 3, 3],
      kitchen_base_shelf_counts: [1, 1, 1, 1],
      kitchen_wall_shelf_counts: [1, 1, 1, 1],
      kitchen_door_swings: ["pair", "pair", "pair", "pair"],
      sink_module_index: 2,
      cooktop_module_index: 0,
      hood_module_index: 0,
      microwave_module_index: 3,
    };
  }
  if (productType === "built_in_wardrobe") {
    const { modules, moduleTypes } = getDefaultWardrobeModules(1800);
    return {
      ...defaultInput,
      productType,
      width_mm: modules.reduce((sum, width) => sum + width, 0),
      height_mm: WARDROBE_STANDARDS.minTotalHeightMm,
      depth_mm: WARDROBE_STANDARDS.preferredDepthMm,
      has_door: true,
      door_count: modules.length,
      shelf_count: 5,
      material: "LPM 라이트오크",
      color: "오크",
      wardrobe_modules_mm: modules,
      wardrobe_module_types: moduleTypes,
      wardrobe_drawer_counts: modules.map(() => 4),
      wardrobe_shelf_counts: modules.map(() => 4),
    };
  }
  if (productType === "shoe_cabinet") {
    return { ...defaultInput, productType, width_mm: 900, height_mm: ENTRANCE_STANDARDS.minTotalHeightMm, depth_mm: ENTRANCE_STANDARDS.preferredDepthMm, has_door: true, door_count: 3, shelf_count: 4 };
  }
  if (productType === "gap_cabinet") {
    return { ...defaultInput, productType, width_mm: 420, height_mm: 1800, depth_mm: 300, has_door: true, door_count: 1, shelf_count: 4 };
  }
  if (productType === "kitchen_island") {
    return {
      ...defaultInput,
      productType,
      width_mm: 1200,
      height_mm: KITCHEN_STANDARDS.baseHeightMm,
      depth_mm: 700,
      has_door: true,
      door_count: 2,
      shelf_count: 1,
      material: "UV 하이그로시 화이트",
      color: "무광 화이트",
      countertop_type: "pt_white",
      toe_kick_option: "standard_100",
      sink_option: "none",
      faucet_option: "none",
      drawer_module_count: 0,
    };
  }
  return { ...defaultInput, productType, has_door: false, door_count: 0 };
}

function normalizeInput(input: FurnitureInput): FurnitureInput {
  if (input.productType === "built_in_wardrobe") {
    const layout = normalizeWardrobeModules(input.wardrobe_modules_mm, input.wardrobe_module_types, input.width_mm);
    const length = layout.modules.length;
    return {
      ...input,
      width_mm: layout.width_mm,
      has_door: true,
      door_count: length,
      wardrobe_modules_mm: layout.modules,
      wardrobe_module_types: layout.moduleTypes,
      wardrobe_drawer_counts: alignWardrobeCounts(input.wardrobe_drawer_counts, length, 4, 2, 6),
      wardrobe_shelf_counts: alignWardrobeCounts(input.wardrobe_shelf_counts, length, 4, 1, 10),
      door_style: input.door_style ?? "flat",
      door_swing: input.door_swing ?? "pair",
    };
  }
  const rules = productRules[input.productType];
  const kitchenTemplate = input.productType === "kitchen_full_set" ? getKitchenTemplate(input.kitchen_template) : null;
  const kitchenLayout = kitchenTemplate
    ? normalizeKitchenModules(kitchenTemplate, input.kitchen_modules_mm, input.kitchen_module_types)
    : null;
  const moduleTypeCounts = kitchenLayout ? deriveModuleTypeCounts(kitchenLayout.moduleTypes) : null;
  const kitchenDimensions = kitchenTemplate ? getKitchenSetDimensions(input, kitchenTemplate) : null;
  const hasDoor = rules.allowsDoorless ? input.has_door : true;
  const width = kitchenLayout?.width_mm ?? kitchenTemplate?.width_mm ?? input.width_mm;
  const maxModuleIndex = Math.max(0, (kitchenLayout?.modules.length ?? kitchenTemplate?.modules.length ?? 1) - 1);
  const defaultSinkIndex = clampModuleIndex(kitchenTemplate?.sinkModuleIndex ?? 0, maxModuleIndex);
  const defaultCooktopIndex = clampModuleIndex(kitchenTemplate?.cooktopModuleIndex ?? 0, maxModuleIndex);
  const isKitchenSet = input.productType === "kitchen_full_set";
  const isKitchenBase = input.productType === "kitchen_base_cabinet";
  return {
    ...input,
    width_mm: width,
    height_mm: kitchenDimensions?.baseHeightMm ?? input.height_mm,
    depth_mm: kitchenDimensions?.baseDepthMm ?? input.depth_mm,
    has_door: hasDoor,
    door_count: getSafeDoorCount(input.productType, width, hasDoor, input.door_count),
    kitchen_template: kitchenTemplate?.id ?? input.kitchen_template,
    countertop_type: isKitchenSet || isKitchenBase ? (input.countertop_type ?? "none") : input.countertop_type,
    toe_kick_option: isKitchenSet || isKitchenBase ? (input.toe_kick_option ?? "none") : input.toe_kick_option,
    sink_option: isKitchenSet || isKitchenBase ? (input.sink_option ?? "none") : input.sink_option,
    faucet_option: isKitchenSet || isKitchenBase ? (input.faucet_option ?? "none") : input.faucet_option,
    hood_option: isKitchenSet ? (input.hood_option ?? "none") : input.hood_option,
    cooktop_option: isKitchenSet ? (input.cooktop_option ?? "none") : input.cooktop_option,
    microwave_option: isKitchenSet ? (input.microwave_option ?? "none") : input.microwave_option,
    kitchen_modules_mm: kitchenLayout?.modules ?? input.kitchen_modules_mm,
    kitchen_base_modules_mm: kitchenLayout ? normalizeKitchenLayerWidths(kitchenLayout.modules, input.kitchen_base_modules_mm) : input.kitchen_base_modules_mm,
    kitchen_wall_modules_mm: kitchenLayout ? normalizeKitchenLayerWidths(kitchenLayout.modules, input.kitchen_wall_modules_mm) : input.kitchen_wall_modules_mm,
    kitchen_base_height_mm: kitchenDimensions?.baseHeightMm ?? input.kitchen_base_height_mm,
    kitchen_base_depth_mm: kitchenDimensions?.baseDepthMm ?? input.kitchen_base_depth_mm,
    kitchen_wall_height_mm: kitchenDimensions?.wallHeightMm ?? input.kitchen_wall_height_mm,
    kitchen_wall_depth_mm: kitchenDimensions?.wallDepthMm ?? input.kitchen_wall_depth_mm,
    kitchen_module_types: kitchenLayout?.moduleTypes ?? input.kitchen_module_types,
    kitchen_drawer_counts: kitchenLayout
      ? kitchenLayout.modules.map((_, index) => Math.min(3, Math.max(1, Math.round(input.kitchen_drawer_counts?.[index] ?? 3))))
      : input.kitchen_drawer_counts,
    kitchen_base_shelf_counts: kitchenLayout
      ? kitchenLayout.modules.map((_, index) => Math.min(8, Math.max(0, Math.round(input.kitchen_base_shelf_counts?.[index] ?? input.shelf_count ?? 1))))
      : input.kitchen_base_shelf_counts,
    kitchen_wall_shelf_counts: kitchenLayout
      ? kitchenLayout.modules.map((_, index) => Math.min(8, Math.max(0, Math.round(input.kitchen_wall_shelf_counts?.[index] ?? 1))))
      : input.kitchen_wall_shelf_counts,
    kitchen_base_hidden_indices: kitchenLayout
      ? (input.kitchen_base_hidden_indices ?? []).filter((index) => index >= 0 && index < kitchenLayout.modules.length)
      : input.kitchen_base_hidden_indices,
    kitchen_wall_hidden_indices: kitchenLayout
      ? (input.kitchen_wall_hidden_indices ?? []).filter((index) => index >= 0 && index < kitchenLayout.modules.length)
      : input.kitchen_wall_hidden_indices,
    kitchen_no_handle_indices: kitchenLayout
      ? (input.kitchen_no_handle_indices ?? []).filter((index) => index >= 0 && index < kitchenLayout.modules.length)
      : input.kitchen_no_handle_indices,
    kitchen_wall_no_handle_indices: kitchenLayout
      ? (input.kitchen_wall_no_handle_indices ?? []).filter((index) => index >= 0 && index < kitchenLayout.modules.length)
      : input.kitchen_wall_no_handle_indices,
    kitchen_door_swings: kitchenLayout
      ? kitchenLayout.modules.map((_, index) => input.kitchen_door_swings?.[index] ?? "pair")
      : input.kitchen_door_swings,
    // 상부 문방향을 하부와 완전 독립으로 — 미설정 칸은 하부값으로 1회 채운 뒤(스냅샷) 이후 독립 편집.
    kitchen_wall_door_swings: kitchenLayout
      ? kitchenLayout.modules.map((_, index) => input.kitchen_wall_door_swings?.[index] ?? input.kitchen_door_swings?.[index] ?? "pair")
      : input.kitchen_wall_door_swings,
    drawer_module_count: moduleTypeCounts ? moduleTypeCounts.drawer : Math.max(0, Math.floor(input.drawer_module_count ?? 0)),
    pullout_module_count: moduleTypeCounts ? moduleTypeCounts.pullout : Math.max(0, Math.floor(input.pullout_module_count ?? 0)),
    sink_module_index: clampModuleIndex(input.sink_module_index ?? defaultSinkIndex, maxModuleIndex),
    cooktop_module_index: clampModuleIndex(input.cooktop_module_index ?? defaultCooktopIndex, maxModuleIndex),
    hood_module_index: clampModuleIndex(input.hood_module_index ?? input.cooktop_module_index ?? defaultCooktopIndex, maxModuleIndex),
    microwave_module_index: clampModuleIndex(input.microwave_module_index ?? maxModuleIndex, maxModuleIndex),
    door_style: input.door_style ?? "flat",
    door_swing: input.door_swing ?? "pair",
  };
}
