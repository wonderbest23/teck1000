"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addConfiguredItem, clearCart, getCart, setCart } from "@/lib/cartStore";
import { catalogCategories, productFromPrice, productLabels, roomAddPresets } from "@/lib/catalog";
import { ProductArt } from "@/components/ProductArt";
import { RoomCommandChat } from "@/components/RoomCommandChat";
import type { RoomAction, RoomStateSummary } from "@/lib/roomCommands";
import { archiveDraft, readDraft, writeDraft } from "@/lib/quoteHistory";
import { defaultInput, getProduct, materials } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { accessories as retailAccessories } from "@/lib/retailCatalog";
import { clampModuleIndex, cooktopOptions, countertopOptions, DEFAULT_KITCHEN_MODULE_WIDTH_MM, deriveModuleTypeCounts, faucetOptions, getHoodSpec, getKitchenSetDimensions, getKitchenTemplate, getSinkMinCabinetWidthMm, hoodOptions, KITCHEN_DIMENSION_LIMITS, kitchenTemplates, MAX_KITCHEN_MODULE_COUNT, microwaveOptions, normalizeKitchenLayerWidths, normalizeKitchenModules, sinkOptions, snapKitchenDimensionMm, toeKickOptions, type KitchenModuleType } from "@/lib/kitchen";
import { MAX_WARDROBE_MODULE_COUNT, MAX_WARDROBE_MODULE_WIDTH_MM, MIN_WARDROBE_MODULE_COUNT, MIN_WARDROBE_MODULE_WIDTH_MM, alignWardrobeCounts, getDefaultWardrobeModules, normalizeWardrobeModules, wardrobeModuleTypeLabels, type WardrobeModuleType } from "@/lib/wardrobe";
import { calculateQuote } from "@/lib/quote";
import { countOptionCases, getDoorCountOptions, getSafeDoorCount, productRules } from "@/lib/rules";
import type { FurnitureInput, ProductType } from "@/lib/types";
import { ENTRANCE_STANDARDS, KITCHEN_STANDARDS, WARDROBE_STANDARDS, snapKitchenModuleWidthMm } from "@/lib/platformConfig";
import { PreOrderCheckPanel } from "@/components/PreOrderCheckPanel";
import { EditorShell } from "@/components/editor/EditorShell";
import { RedoIcon, UndoIcon } from "@/components/editor/HistoryControls";
import { CoachMarks } from "@/components/CoachMarks";
import { ModuleStripPlan } from "@/components/editor/ModuleStripPlan";
import { ModuleListEditor } from "@/components/editor/ModuleListEditor";
import { KitchenDrawingView } from "@/components/admin/KitchenDrawingView";
import { KitchenPresetPicker } from "@/components/preview3d/controls/KitchenPresetPicker";
import { KITCHEN_PRESETS, applyKitchenPreset, kitchenTemplateIdForWidth, type KitchenPreset } from "@/lib/kitchenPresets";
import { getEditorCategories } from "@/lib/productEditorSchema";
import { applyStartPreset } from "@/lib/startPresets";
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
  const starterPreset = searchParams.get("starter");

  const initialInput = useMemo<FurnitureInput>(() => {
    const base = applyStartPreset(getInitialInput(productType), starterPreset);
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
  // /start에서 이미 프리셋(starter)을 골라 들어왔으면 픽커를 또 띄우지 않는다 — 단계 중복 제거
  const [showKitchenPreset, setShowKitchenPreset] = useState(productType === "kitchen_full_set" && !searchParams.get("starter"));
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
  const [previewFullScreen, setPreviewFullScreen] = useState(false);
  const [showStartChoice, setShowStartChoice] = useState(searchParams.get("start_choice") === "1");
  const [startStep, setStartStep] = useState<"intro" | "category">("intro");
  const [selModule, setSelModule] = useState<number | null>(null);
  // 내 공간(멀티 가구 씬) 배치/선택
  const [roomPlacements, setRoomPlacements] = useState<Record<string, { x: number; z: number; rotY: number }>>({});
  const [roomSelected, setRoomSelected] = useState<string | null>(null);
  // 정렬 가이드 — x/z(바닥 정렬) + y(높이 수평 맞춤 레이저선)
  const [roomGuides, setRoomGuides] = useState<{ axis: "x" | "y" | "z"; value: number }[]>([]);
  const [justAddedId, setJustAddedId] = useState<string | null>(null); // 방금 추가한 가구 — 파란 테두리로 안내
  const [canvasMode, setCanvasMode] = useState<"view" | "edit">("edit"); // 보기/수정 모드 — 보기 모드는 편집 UI 없이 감상만
  const [addOpen, setAddOpen] = useState(false); // 캔버스 하단 '＋ 가구 추가' 시트
  const [addCat, setAddCat] = useState<string>("kitchen"); // 가구추가 시트의 활성 카테고리(카테고리 우선 탐색)
  // 모바일: 사이즈 패널을 미리보기 위가 아니라 섹션 아래(belowCanvas)에 포털로 렌더 — 화면을 가리지 않게
  const [mobilePanelHost, setMobilePanelHost] = useState<HTMLDivElement | null>(null);
  // IKEA식 좌측 사이드바(데스크톱) — 평소엔 상품 목록, 가구 선택 시 제품 옵션 패널이 이 호스트로 포털된다
  const [sidePanelHost, setSidePanelHost] = useState<HTMLDivElement | null>(null);
  const [pickerSlug, setPickerSlug] = useState<ProductType | null>(null); // 규격 선택 단계(제품 누르면 사이즈 칩 표시)
  const [needCategory, setNeedCategory] = useState<string | null>(null);
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
      { id: "current", name: isManual && manualTitle ? manualTitle : productLabels[input.productType] ?? product.name, input },
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
  // 충돌 판정 — 상부장(벽걸이)은 바닥 가구와 평면이 겹쳐도 되지만,
  // '상하부장 세트'는 상부장까지 포함하므로 어느 레이어와도 겹치면 안 된다(상부장 단품↔세트 겹침 버그 수정)
  function layersCollide(idA: string, idB: string) {
    const typeOf = (id: string) => roomItems.find((it) => it.id === id)?.input.productType;
    if (typeOf(idA) === "kitchen_full_set" || typeOf(idB) === "kitchen_full_set") return true;
    return roomLayerOf(idA) === roomLayerOf(idB);
  }
  // 벽/바닥 안쪽으로 클램프 + 다른 가구와 겹치지 않게 밀어냄(경우의수 반복 해소)
  function resolvePlacement(id: string, desiredX: number, desiredZ: number, rotY: number, all: Record<string, Placement>): { x: number; z: number } {
    const { hx, hz } = halfExtents(id, rotY);
    const cl = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
    let x = cl(desiredX, roomFloor.leftX + hx, roomFloor.rightX - hx);
    let z = cl(desiredZ, roomFloor.backZ + hz, roomFloor.frontZ - hz);
    const others = roomItems
      .filter((it) => it.id !== id && layersCollide(id, it.id))
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

          // 상부장: 가장 최근 하부장/세트 바로 위(같은 가로 위치, 벽에 붙임)에 자동 배치
          if (it.input.productType === "kitchen_wall_cabinet") {
            const hostItem = [...roomItems].reverse().find((o) => o.input.productType === "kitchen_base_cabinet");
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
              if (!layersCollide(it.id, oid)) return false;
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

    const others = roomItems
      .filter((it) => it.id !== id && layersCollide(id, it.id))
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
    "desk",
    "living_cabinet",
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
    syncKitchenFinishes();
  }
  // ── EP 엔드패널 자동 마감: 싱크대(세트·하부장)는 노출된 좌/우 옆면에 EP가 '항상' 자동으로 붙고,
  //    옆에 다른 주방장이 딱 붙어 가려진 면은 자동으로 빠진다. ep_panel_sides(견적)도 함께 갱신. ──
  useEffect(() => {
    const kitchenKinds = ["kitchen_full_set", "kitchen_base_cabinet"];
    roomItems.forEach((it) => {
      if (!kitchenKinds.includes(it.input.productType)) return;
      const p = roomPlacements[it.id];
      const f = roomFootprints[it.id];
      if (!p || !f) return;
      let coverLeft = false;
      let coverRight = false;
      for (const other of roomItems) {
        if (other.id === it.id) continue;
        if (!other.input.productType.startsWith("kitchen")) continue;
        const op = roomPlacements[other.id];
        const of2 = roomFootprints[other.id];
        if (!op || !of2) continue;
        if (Math.abs(Math.sin(p.rotY - op.rotY)) > 0.02) continue; // 같은 벽(방향)만
        // 내 로컬 좌표로 변환해 어느 쪽 옆면에 붙었는지 판정
        const dx = op.x - p.x;
        const dz = op.z - p.z;
        const localX = dx * Math.cos(p.rotY) - dz * Math.sin(p.rotY);
        const localZ = dx * Math.sin(p.rotY) + dz * Math.cos(p.rotY);
        const touching = Math.abs(Math.abs(localX) - (f.widthM / 2 + of2.widthM / 2)) < 0.03 && Math.abs(localZ) < 0.1;
        if (!touching) continue;
        if (localX > 0) coverRight = true;
        else coverLeft = true;
      }
      const sides = (coverLeft ? 0 : 1) + (coverRight ? 0 : 1);
      if (it.input.ep_cover_left !== coverLeft || it.input.ep_cover_right !== coverRight || (it.input.ep_panel_sides ?? 0) !== sides) {
        commitRoomItemById(it.id, { ...it.input, ep_cover_left: coverLeft, ep_cover_right: coverRight, ep_panel_sides: sides });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomItems, roomPlacements]);

  // 하부장 단품을 세트/다른 하부장 옆에 딱 붙이면(같은 벽·모서리 맞닿음) 걸레받이·상판을
  // 자동으로 이어받아 한 몸처럼 연결된다 — 실제 시공처럼 라인이 이어짐
  function syncKitchenFinishes() {
    const EPS = 0.03;
    roomItems.forEach((it) => {
      if (it.input.productType !== "kitchen_base_cabinet") return;
      const p = roomPlacements[it.id];
      const f = roomFootprints[it.id];
      if (!p || !f) return;
      for (const other of roomItems) {
        if (other.id === it.id) continue;
        const ot = other.input.productType;
        if (ot !== "kitchen_full_set" && ot !== "kitchen_base_cabinet") continue;
        const op = roomPlacements[other.id];
        const of2 = roomFootprints[other.id];
        if (!op || !of2) continue;
        if (Math.abs(Math.sin(p.rotY - op.rotY)) > 0.02) continue; // 같은 벽(같은 방향)만
        // 벽 진행 방향 성분으로 좌우 맞닿음 판정
        const c = Math.cos(op.rotY);
        const sn = Math.sin(op.rotY);
        const along = (p.x - op.x) * c - (p.z - op.z) * sn;
        const perp = (p.x - op.x) * sn + (p.z - op.z) * c;
        const touching = Math.abs(Math.abs(along) - (f.widthM / 2 + of2.widthM / 2)) < EPS && Math.abs(perp) < 0.1;
        if (!touching) continue;
        const src = other.input;
        const patch: Partial<FurnitureInput> = {};
        if ((src.countertop_type ?? "none") !== "none" && (it.input.countertop_type ?? "none") === "none") patch.countertop_type = src.countertop_type;
        if ((src.toe_kick_option ?? "none") !== "none" && (it.input.toe_kick_option ?? "none") === "none") patch.toe_kick_option = src.toe_kick_option;
        if (Object.keys(patch).length > 0) commitRoomItemById(it.id, { ...it.input, ...patch });
        break;
      }
    });
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

  // 키보드 단축키 — 모든 편집을 키보드로도:
  //   Esc=선택 해제/시트 닫기 · Delete=제거 · R=90° 회전(벽부착은 다음 벽)
  //   화살표=5cm 이동 · Shift+←→=가로 ±50 · Shift+↑↓=높이 ±50 · Alt+↑↓=깊이 ±50
  //   (기존: Ctrl+C/V 복사·붙여넣기, Ctrl+Z/Y 실행취소·다시실행)
  useEffect(() => {
    if (viewMode !== "room") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Escape") {
        setAddOpen(false);
        setPickerSlug(null);
        setRoomSelected(null);
        setRoomGuides([]);
        return;
      }
      if (!roomSelected || canvasMode !== "edit") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeRoomItem(roomSelected);
        return;
      }
      if (e.key === "r" || e.key === "R" || e.key === "ㄱ") {
        e.preventDefault();
        rotateRoomItem(roomSelected);
        return;
      }
      if (!e.key.startsWith("Arrow")) return;
      e.preventDefault();
      const item = roomItems.find((it) => it.id === roomSelected);
      if (!item) return;
      const clearGuidesSoon = () => window.setTimeout(() => setRoomGuides([]), 600);
      if (e.shiftKey) {
        // Shift+화살표 = 크기 (←→ 가로, ↑↓ 높이 — 높이는 y 스냅 가이드와 연동)
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          resizeRoomItem(roomSelected, { width_mm: Math.max(150, item.input.width_mm + (e.key === "ArrowRight" ? 50 : -50)) });
        } else {
          resizeRoomItem(roomSelected, { height_mm: Math.max(120, item.input.height_mm + (e.key === "ArrowUp" ? 50 : -50)) });
        }
        clearGuidesSoon();
        return;
      }
      if (e.altKey) {
        // Alt+↑↓ = 깊이
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          resizeRoomItem(roomSelected, { depth_mm: Math.max(150, item.input.depth_mm + (e.key === "ArrowUp" ? 50 : -50)) });
          clearGuidesSoon();
        }
        return;
      }
      // 화살표 = 5cm 이동 (벽부착 가구는 벽 투영 규칙 그대로)
      const delta: Record<string, [number, number]> = { ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, -0.05], ArrowDown: [0, 0.05] };
      const [dx, dz] = delta[e.key] ?? [0, 0];
      const p = roomPlacements[roomSelected] ?? { x: 0, z: 0, rotY: 0 };
      moveRoomItem(roomSelected, p.x + dx, p.z + dz);
      clearGuidesSoon();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, roomSelected, canvasMode, roomPlacements, roomItems]);

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
  /** 주방 칸 배열을 목표 폭까지 줄인다 — 여유(현재폭−최소규격)가 가장 큰 칸부터 10mm씩.
   *  설비 규격 최소(싱크 800/900·쿡탑 600·후드 스펙+40·전자레인지 600)는 절대 침범하지 않는다. */
  function fitKitchenModulesToWidth(inp: FurnitureInput, targetMm: number) {
    const main = [...(inp.kitchen_modules_mm ?? [])];
    const wall = [...(inp.kitchen_wall_modules_mm ?? inp.kitchen_modules_mm ?? [])];
    const minOf = (layer: "base" | "wall") =>
      (arr: number[]) =>
        arr.map((_, i) => {
          let min: number = KITCHEN_STANDARDS.moduleWidthMinMm;
          if (layer === "base") {
            if (inp.sink_option && inp.sink_option !== "none" && (inp.sink_module_index ?? 0) === i) min = Math.max(min, getSinkMinCabinetWidthMm(inp.sink_option));
            if (inp.cooktop_option && inp.cooktop_option !== "none" && (inp.cooktop_module_index ?? 0) === i) min = Math.max(min, 600);
            if (inp.microwave_option && inp.microwave_option !== "none" && (inp.microwave_module_index ?? 0) === i) min = Math.max(min, 600);
          } else {
            if (inp.hood_option && inp.hood_option !== "none" && (inp.hood_module_index ?? inp.cooktop_module_index ?? 0) === i) min = Math.max(min, Math.max(600, Math.ceil((getHoodSpec(inp.hood_option).widthMm + 40) / 10) * 10));
            if (inp.microwave_option && inp.microwave_option !== "none" && (inp.microwave_module_index ?? 0) === i) min = Math.max(min, 600);
          }
          return min;
        });
    const shrink = (arr: number[], mins: number[]) => {
      let total = arr.reduce((sum, v) => sum + v, 0);
      let guard = 0;
      while (total > targetMm && guard++ < 1000) {
        let best = -1;
        let bestSlack = 0;
        for (let i = 0; i < arr.length; i += 1) {
          const slack = arr[i] - mins[i];
          if (slack > bestSlack) {
            bestSlack = slack;
            best = i;
          }
        }
        if (best < 0) break; // 모든 칸이 최소 규격 — 더 줄일 수 없음(설비 규격 우선)
        const step = Math.min(10, bestSlack, total - targetMm);
        arr[best] -= step;
        total -= step;
      }
      return arr;
    };
    return { main: shrink(main, minOf("base")(main)), wall: shrink(wall, minOf("wall")(wall)) };
  }

  function snapSelectedToValid() {
    if (!selectedRoomItem) return;
    const r = productRules[selectedRoomItem.input.productType];
    if (!r) return;
    const inp = selectedRoomItem.input;
    // 설치 벽 길이를 입력했다면 그보다 넓어질 수 없다(KITCHEN_WIDTH_OVER_WALL도 이 버튼으로 해결)
    const wallCap = inp.total_wall_length_mm && inp.total_wall_length_mm > 0 ? inp.total_wall_length_mm : Infinity;
    const nextWidth = Math.min(Math.min(r.maxWidth, wallCap), Math.max(r.minWidth, inp.width_mm));
    const nextHeight = Math.min(r.maxHeight, Math.max(r.minHeight, inp.height_mm));
    const nextDepth = Math.min(r.maxDepth, Math.max(r.minDepth, inp.depth_mm));
    if (inp.productType === "kitchen_full_set") {
      // 세트 폭은 width_mm이 아니라 칸 배열이 원본 — 칸을 줄여서 목표 폭에 맞춘다(설비 최소규격 유지).
      // 높이/깊이도 kitchen_base_*가 원본이라 함께 보정해야 normalizeInput에 안 덮인다.
      const fitted = inp.width_mm > nextWidth ? fitKitchenModulesToWidth(inp, nextWidth) : null;
      const wallHeight = snapKitchenDimensionMm(inp.kitchen_wall_height_mm ?? KITCHEN_STANDARDS.wallHeightMm, KITCHEN_DIMENSION_LIMITS.wallHeight.min, KITCHEN_DIMENSION_LIMITS.wallHeight.max, KITCHEN_DIMENSION_LIMITS.wallHeight.step);
      const wallDepth = snapKitchenDimensionMm(inp.kitchen_wall_depth_mm ?? KITCHEN_STANDARDS.wallDepthMm, KITCHEN_DIMENSION_LIMITS.wallDepth.min, KITCHEN_DIMENSION_LIMITS.wallDepth.max, KITCHEN_DIMENSION_LIMITS.wallDepth.step);
      commitRoomItem({
        ...inp,
        width_mm: nextWidth,
        height_mm: nextHeight,
        depth_mm: nextDepth,
        kitchen_base_height_mm: nextHeight,
        kitchen_base_depth_mm: nextDepth,
        kitchen_wall_height_mm: wallHeight,
        kitchen_wall_depth_mm: wallDepth,
        ...(fitted ? { kitchen_modules_mm: fitted.main, kitchen_base_modules_mm: fitted.main, kitchen_wall_modules_mm: fitted.wall } : {}),
      });
      return;
    }
    // 붙박이장은 normalizeWardrobeModules가 width_mm 목표로 모듈을 비례 재분배 — width_mm 클램프만으로 충분
    commitRoomItem({
      ...inp,
      width_mm: nextWidth,
      height_mm: nextHeight,
      depth_mm: nextDepth,
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
  // 모든 경로(핸들·키보드·패널)가 제품 규격(productRules) 안으로 강제 클램프된다 — 규격 밖 상태 자체가 불가능(온톨로지)
  function resizeRoomItem(id: string, patch: Partial<FurnitureInput>, center?: { x: number; z: number }, dirArg?: { x: number; z: number }) {
    const item = roomItems.find((it) => it.id === id);
    if (!item) return;
    const rr = productRules[item.input.productType];
    if (rr) {
      if (patch.width_mm != null) patch.width_mm = Math.min(rr.maxWidth, Math.max(rr.minWidth, Math.round(patch.width_mm)));
      if (patch.height_mm != null) patch.height_mm = Math.min(rr.maxHeight, Math.max(rr.minHeight, Math.round(patch.height_mm)));
      if (patch.depth_mm != null) patch.depth_mm = Math.min(rr.maxDepth, Math.max(rr.minDepth, Math.round(patch.depth_mm)));
    }
    if (!center) {
      // 높이 조절 — 다른 가구의 윗면 높이(topY)와 4cm 이내면 파란 수평 레이저선 + 자동 스냅(수평 맞춤)
      if (patch.height_mm != null) {
        const f = roomFootprints[id];
        const baseY = f?.baseY ?? 0;
        let heightMm = Math.max(120, Math.round(patch.height_mm));
        let yGuide: { axis: "y"; value: number } | null = null;
        const SNAP_Y = 0.04;
        for (const other of roomItems) {
          if (other.id === id) continue;
          const otherTop = roomFootprints[other.id]?.topY;
          if (otherTop == null) continue;
          if (Math.abs(baseY + heightMm / 1000 - otherTop) < SNAP_Y) {
            heightMm = Math.max(120, Math.round(((otherTop - baseY) * 1000) / 10) * 10);
            if (rr) heightMm = Math.min(rr.maxHeight, Math.max(rr.minHeight, heightMm)); // 스냅도 규격 안에서만
            yGuide = { axis: "y", value: baseY + heightMm / 1000 };
            break;
          }
        }
        setRoomGuides(yGuide ? [yGuide] : []);
        commitRoomItemById(id, { ...item.input, ...patch, height_mm: heightMm });
        return;
      }
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
  function addFurnitureToRoom(slug: ProductType, overrides?: Pick<RoomAction, "material" | "door_style" | "width_mm" | "height_mm" | "depth_mm"> & { hood_option?: string }) {
    const label = productLabels[slug] ?? getProduct(slug)?.name ?? slug;
    let nextInput = getInitialInput(slug);
    if (overrides) {
      const draft = { ...nextInput };
      if (overrides.width_mm) draft.width_mm = overrides.width_mm;
      if (overrides.height_mm) draft.height_mm = overrides.height_mm;
      if (overrides.depth_mm) draft.depth_mm = overrides.depth_mm;
      if (overrides.door_style) draft.door_style = overrides.door_style;
      if (overrides.hood_option) draft.hood_option = overrides.hood_option; // 후드장 프리셋 — 장 아래 후드 포함
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

  type QuickProductId = ProductType | "drawer_cabinet";
  const quickProductSlug = (id: QuickProductId): ProductType => (id === "drawer_cabinet" ? "custom_shelf" : id);
  const quickProductLabel = (id: QuickProductId) => (id === "drawer_cabinet" ? "서랍장" : productLabels[id] ?? id);

  function makeQuickProductInput(id: QuickProductId, source?: FurnitureInput) {
    const slug = quickProductSlug(id);
    const draft: FurnitureInput = {
      ...getInitialInput(slug),
      material: source?.material ?? getInitialInput(slug).material,
      color: source?.color ?? getInitialInput(slug).color,
      door_style: source?.door_style ?? getInitialInput(slug).door_style,
      handle_type: source?.handle_type ?? getInitialInput(slug).handle_type,
    };
    if (id === "drawer_cabinet") {
      draft.width_mm = Math.max(600, Math.min(1000, source?.width_mm ?? 800));
      draft.height_mm = Math.max(700, Math.min(1200, source?.height_mm ?? 850));
      draft.depth_mm = Math.max(400, Math.min(600, source?.depth_mm ?? 500));
      draft.has_door = false;
      draft.door_count = 0;
      draft.shelf_count = 0;
      draft.storage_drawer_count = 3;
      draft.open_type = "여닫이";
    }
    return normalizeInput(draft);
  }

  function replaceActiveProduct(id: QuickProductId) {
    const label = quickProductLabel(id);
    const nextInput = makeQuickProductInput(id, activeInput);
    if (activeRoomId === "current") {
      setInput(nextInput);
    } else {
      setCart(getCart().map((item) => (item.id === activeRoomId ? { ...item, name: label, input: nextInput } : item)));
    }
    setRoomSelected(activeRoomId);
    setJustAddedId(activeRoomId);
    setAddOpen(false);
    setCanvasMode("edit");
    window.setTimeout(() => setJustAddedId((cur) => (cur === activeRoomId ? null : cur)), 2500);
  }

  function addQuickProduct(id: QuickProductId) {
    const slug = quickProductSlug(id);
    const label = quickProductLabel(id);
    const item = addConfiguredItem(slug, label, makeQuickProductInput(id, activeInput), 1);
    setViewMode("room");
    setRoomSelected(item.id);
    setJustAddedId(item.id);
    setAddOpen(false);
    setCanvasMode("edit");
    window.setTimeout(() => setJustAddedId((cur) => (cur === item.id ? null : cur)), 3500);
  }

  function beginWithProduct(id: QuickProductId) {
    const nextInput = makeQuickProductInput(id, activeInput);
    setInput(nextInput);
    setRoomSelected("current");
    setNeedCategory(quickProducts.find((item) => item.id === id)?.category ?? null);
    setShowKitchenPreset(id === "kitchen_full_set");
    setShowStartChoice(false);
    setCanvasMode("edit");
  }

  // 상하부장 세트를 표준 프리셋(일자 1800/2400/2700/3000·ㄱ자)으로 방에 추가
  function addKitchenSetToRoom(preset: KitchenPreset) {
    const base = getInitialInput("kitchen_full_set");
    const moduleCount = preset.input.kitchen_modules_mm.length;
    const merged = normalizeInput({
      ...applyKitchenPreset(base as unknown as Record<string, unknown>, preset),
      width_mm: preset.totalWidthMm,
      door_count: moduleCount,
      kitchen_template: kitchenTemplateIdForWidth(preset.totalWidthMm),
      kitchen_drawer_counts: preset.input.kitchen_module_types.map((type) => (type === "drawer" ? 3 : 3)),
      kitchen_base_shelf_counts: Array.from({ length: moduleCount }, () => 1),
      kitchen_wall_shelf_counts: Array.from({ length: moduleCount }, () => 1),
      kitchen_door_swings: Array.from({ length: moduleCount }, () => "pair" as const),
    } as unknown as FurnitureInput);
    const item = addConfiguredItem("kitchen_full_set", `${productLabels.kitchen_full_set ?? "상하부장 세트"} ${preset.label}`, merged, 1);
    setViewMode("room");
    setRoomSelected(item.id);
    setJustAddedId(item.id);
    setAddOpen(false);
    setPickerSlug(null);
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
      // 선택 없을 때도 '현재 제작 중' 가구(id=current)를 AI·modify 기본 대상으로
      selectedId: roomSelected ?? "current",
    }),
    [roomItems, roomSelected],
  );
  function applyRoomActionModify(inp: FurnitureInput, action: RoomAction): FurnitureInput {
    let draft = { ...inp };
    if (action.material) {
      const m = materials.find((x) => x.name === action.material);
      if (m) { draft.material = m.name; draft.color = m.color; }
    }
    if (action.door_style) draft.door_style = action.door_style;

    const rules = productRules[draft.productType];
    const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

    if (action.width_mm != null) {
      const target = rules ? clamp(action.width_mm, rules.minWidth, rules.maxWidth) : action.width_mm;
      if (draft.productType === "kitchen_full_set" || draft.productType === "kitchen_base_cabinet" || draft.productType === "kitchen_wall_cabinet") {
        const modules =
          draft.productType === "kitchen_wall_cabinet"
            ? (draft.kitchen_wall_modules_mm ?? draft.kitchen_modules_mm ?? [])
            : (draft.kitchen_base_modules_mm ?? draft.kitchen_modules_mm ?? []);
        const moduleCount = Math.max(2, modules.length || 4);
        const currentTotal = modules.reduce((sum, w) => sum + w, 0);
        const fitted = currentTotal > target ? fitKitchenModulesToWidth(draft, target) : null;
        const nextBase = fitted ? fitted.main : distributeKitchenTotalWidth(target, moduleCount);
        const nextWall = fitted ? fitted.wall : distributeKitchenTotalWidth(target, moduleCount);
        draft = {
          ...draft,
          width_mm: target,
          kitchen_modules_mm: nextBase,
          ...(draft.productType !== "kitchen_wall_cabinet"
            ? { kitchen_base_modules_mm: nextBase }
            : {}),
          ...(draft.productType === "kitchen_full_set" || draft.productType === "kitchen_wall_cabinet"
            ? { kitchen_wall_modules_mm: nextWall }
            : {}),
        };
      } else if (draft.productType === "built_in_wardrobe") {
        const layout = normalizeWardrobeModules(draft.wardrobe_modules_mm, draft.wardrobe_module_types, target);
        draft = { ...draft, width_mm: layout.width_mm, wardrobe_modules_mm: layout.modules, wardrobe_module_types: layout.moduleTypes };
      } else {
        draft.width_mm = target;
      }
    }
    if (action.height_mm != null) {
      const target = rules ? clamp(action.height_mm, rules.minHeight, rules.maxHeight) : action.height_mm;
      draft.height_mm = target;
      if (draft.productType === "kitchen_full_set" || draft.productType === "kitchen_base_cabinet") draft.kitchen_base_height_mm = target;
      if (draft.productType === "kitchen_full_set") draft.kitchen_wall_height_mm = draft.kitchen_wall_height_mm ?? target;
      if (draft.productType === "kitchen_wall_cabinet") draft.kitchen_wall_height_mm = target;
    }
    if (action.depth_mm != null) {
      const target = rules ? clamp(action.depth_mm, rules.minDepth, rules.maxDepth) : action.depth_mm;
      draft.depth_mm = target;
      if (draft.productType === "kitchen_full_set" || draft.productType === "kitchen_base_cabinet") draft.kitchen_base_depth_mm = target;
      if (draft.productType === "kitchen_full_set") draft.kitchen_wall_depth_mm = draft.kitchen_wall_depth_mm ?? target;
      if (draft.productType === "kitchen_wall_cabinet") draft.kitchen_wall_depth_mm = target;
    }
    return normalizeInput(draft);
  }
  function runRoomActions(actions: RoomAction[]) {
    const targetId = roomSelected ?? "current";
    for (const a of actions) {
      if (a.type === "add" && a.productType) {
        addFurnitureToRoom(a.productType, a);
      } else if (a.type === "arrange") {
        resetRoomLayout();
      } else if (a.type === "rotate") {
        rotateRoomItem(targetId);
      } else if (a.type === "remove") {
        if (targetId !== "current") removeRoomItem(targetId);
      } else if (a.type === "modify") {
        const sel = roomItems.find((it) => it.id === targetId);
        if (sel) {
          commitRoomItemById(sel.id, applyRoomActionModify(sel.input, a));
          setRoomSelected(sel.id);
          setCanvasMode("edit");
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
      kitchen_module_types: template.modules.map((_, index) => {
        if (index === template.sinkModuleIndex) return "sink_base";
        if (index === template.cooktopModuleIndex) return "cooktop";
        return index === 0 ? "drawer" : "door";
      }),
      kitchen_drawer_counts: template.modules.map((_, index) => (index === 0 ? 3 : 3)),
      kitchen_base_shelf_counts: template.modules.map(() => Math.max(1, current.shelf_count ?? 1)),
      kitchen_wall_shelf_counts: template.modules.map(() => 1),
      kitchen_door_swings: template.modules.map(() => "pair"),
      kitchen_base_hidden_indices: [],
      kitchen_wall_hidden_indices: [],
      sink_module_index: template.sinkModuleIndex,
      cooktop_module_index: template.cooktopModuleIndex,
      hood_module_index: template.cooktopModuleIndex,
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
  const showSwingChips = activeInput.has_door && (activeInput.productType === "custom_shelf" || activeInput.productType === "gap_cabinet" || activeInput.productType === "shoe_cabinet" || activeInput.productType === "living_cabinet");

  // 간편(소비자) 모드에서는 설비(주방 모델 선택) 같은 전문 카테고리를 숨긴다.
  // 단, 상부장 단품의 fixtures는 소비자용 추가 옵션(EP 판넬·후드 타공·부속)이라 간편 모드에서도 노출.
  // 소재는 미리보기 우측 패널로, 검수·주문은 하단 CTA(주문 버튼)로 이동 — 상단 카테고리 버튼 수를 줄인다.
  const categories = getEditorCategories(activeInput.productType, isPro).filter(
    (c) => (isPro || c.id !== "fixtures" || activeInput.productType.startsWith("kitchen")) && c.id !== "material" && c.id !== "check" && c.id !== "spec" && c.id !== "doors",
  );
  // effectiveCat: 데스크톱 2분할 패널이 항상 표시할 칸(미선택 시 첫 칸). 모바일 팝업은 activeCat != null일 때만 뜬다.
  const effectiveCat = activeCat ?? categories[0]?.id ?? null;
  // 검수·주문은 카테고리 버튼에서 뺐지만(하단 CTA로 진입) 팝업 제목은 필요 — 폴백 라벨
  const activeLabel = categories.find((cat) => cat.id === activeCat)?.label ?? (activeCat === "check" ? "검수·주문" : activeCat === "fixtures" ? "추가 옵션" : "");
  const effectiveLabel = categories.find((cat) => cat.id === effectiveCat)?.label ?? (effectiveCat === "check" ? "검수·주문" : effectiveCat === "fixtures" ? "추가 옵션" : "");
  const beginnerSteps = [
    { id: "spec", label: "치수", hint: activeInput.productType === "kitchen_full_set" ? "전체 길이와 칸 수를 먼저 맞추세요." : "가로·높이·깊이를 먼저 맞추세요." },
    { id: "modules", label: "구성", hint: "3D에서 칸을 누르고 서랍장·문장·오픈장으로 바꾸세요." },
    { id: "fixtures", label: "설비", hint: "싱크볼·쿡탑·후드는 위치가 맞아야 합니다." },
    { id: "doors", label: "문", hint: "문 방향·손잡이·슬라이딩 방향을 확인하세요." },
    { id: "check", label: "검수", hint: "주문 전 누락된 조건만 마지막으로 확인하세요." },
  ].filter((step) => {
    if (step.id === "fixtures") return activeInput.productType === "kitchen_full_set" || activeInput.productType === "kitchen_base_cabinet";
    if (step.id === "modules") return activeInput.productType === "kitchen_full_set" || activeInput.productType === "built_in_wardrobe";
    return true;
  });
  const currentGuideIndex = Math.max(0, beginnerSteps.findIndex((step) => step.id === effectiveCat));
  const currentGuide = beginnerSteps[currentGuideIndex] ?? beginnerSteps[0];
  const needCategories = [
    { id: "kitchen", label: "주방", hint: "싱크대·상부장·아일랜드" },
    { id: "office", label: "오피스", hint: "책상·사이드장" },
    { id: "living", label: "거실", hint: "인테리어장·TV장" },
    { id: "storage", label: "수납", hint: "서랍장·선반장·틈새장" },
    { id: "entrance", label: "현관", hint: "신발장" },
    { id: "wardrobe", label: "붙박이", hint: "옷장·드레스룸" },
  ];
  const quickProducts: Array<{ id: QuickProductId; label: string; slug: ProductType; category: string; hint: string }> = [
    { id: "kitchen_full_set", label: "싱크대 세트", slug: "kitchen_full_set", category: "kitchen", hint: "하부장+상부장" },
    { id: "kitchen_base_cabinet", label: "하부장", slug: "kitchen_base_cabinet", category: "kitchen", hint: "싱크볼·서랍 가능" },
    { id: "kitchen_wall_cabinet", label: "상부장", slug: "kitchen_wall_cabinet", category: "kitchen", hint: "후드장·수납" },
    { id: "kitchen_island", label: "아일랜드", slug: "kitchen_island", category: "kitchen", hint: "독립 조리대" },
    { id: "desk", label: "책상", slug: "desk", category: "office", hint: "재택·학습 데스크" },
    { id: "living_cabinet", label: "인테리어장", slug: "living_cabinet", category: "living", hint: "TV장·벽장·장식장" },
    { id: "drawer_cabinet", label: "서랍장", slug: "custom_shelf", category: "storage", hint: "레일 서랍형" },
    { id: "custom_shelf", label: "선반장", slug: "custom_shelf", category: "storage", hint: "오픈/도어 수납" },
    { id: "gap_cabinet", label: "틈새장", slug: "gap_cabinet", category: "storage", hint: "좁은 공간" },
    { id: "shoe_cabinet", label: "신발장", slug: "shoe_cabinet", category: "entrance", hint: "현관 수납" },
    { id: "built_in_wardrobe", label: "붙박이장", slug: "built_in_wardrobe", category: "wardrobe", hint: "행거·선반·서랍" },
  ];
  const startProductByCategory: Record<string, QuickProductId> = {
    kitchen: "kitchen_full_set",
    office: "desk",
    living: "living_cabinet",
    storage: "drawer_cabinet",
    entrance: "shoe_cabinet",
    wardrobe: "built_in_wardrobe",
  };
  const visibleQuickProducts = needCategory ? quickProducts.filter((item) => item.category === needCategory) : [];
  const activeProductKey: QuickProductId = activeInput.productType === "custom_shelf" && (activeInput.storage_drawer_count ?? 0) > 0 ? "drawer_cabinet" : activeInput.productType;

  const renderStartChoice = () => {
    return (
      <div className="h-full w-full overflow-y-auto bg-slate-50 px-4 py-6">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center text-center">
          {startStep === "intro" ? (
            <div className="flex w-full max-w-lg flex-col items-center">
              <div className="mb-4 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black text-brand ring-1 ring-brand/15">
                수동 커스텀 제작
              </div>
              <div className="relative">
                <h2 className="animate-pulse text-3xl font-black leading-tight text-ink sm:text-5xl">무엇이 필요하세요?</h2>
                <div className="mt-3 flex justify-center gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-brand [animation-delay:-0.2s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-brand [animation-delay:-0.1s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-brand" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStartStep("category")}
                className="mt-8 rounded-full bg-slate-950 px-7 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/20 transition hover:bg-brand active:scale-95"
              >
                시작하기
              </button>
            </div>
          ) : (
            <div className="w-full">
              <div className="mb-5">
                <div className="text-[12px] font-black text-brand">필요한 카테고리를 선택하세요</div>
                <h2 className="mt-1 text-2xl font-black text-ink sm:text-3xl">어떤 가구를 만들까요?</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                {needCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setNeedCategory(category.id);
                      beginWithProduct(startProductByCategory[category.id] ?? "custom_shelf");
                    }}
                    className="min-h-[104px] rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-brand hover:shadow-md active:scale-[0.99]"
                  >
                    <span className="block text-lg font-black text-ink">{category.label}</span>
                    <span className="mt-1 block text-[12px] font-bold leading-5 text-slate-500">{category.hint}</span>
                    <span className="mt-3 block text-[11px] font-black text-brand">바로 시작</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  function appendKitchenModule(kind: KitchenModuleType) {
    if (activeInput.productType !== "kitchen_full_set") return;
    const baseModules = activeInput.kitchen_base_modules_mm ?? activeInput.kitchen_modules_mm ?? getKitchenTemplate(activeInput.kitchen_template).modules;
    if (baseModules.length >= MAX_KITCHEN_MODULE_COUNT) return;
    const wallModules = activeInput.kitchen_wall_modules_mm ?? baseModules;
    const nextBase = [...baseModules, DEFAULT_KITCHEN_MODULE_WIDTH_MM];
    const nextWall = [...wallModules, DEFAULT_KITCHEN_MODULE_WIDTH_MM];
    const nextTypes = [...(activeInput.kitchen_module_types ?? baseModules.map(() => "door" as KitchenModuleType)), kind];
    const nextDrawers = [...(activeInput.kitchen_drawer_counts ?? baseModules.map(() => 3)), kind === "drawer" ? 3 : 3];
    const nextBaseShelves = [...(activeInput.kitchen_base_shelf_counts ?? baseModules.map(() => 1)), kind === "open" ? 2 : 1];
    const nextWallShelves = [...(activeInput.kitchen_wall_shelf_counts ?? baseModules.map(() => 1)), 1];
    commitRoomItemById(activeRoomId, {
      ...activeInput,
      kitchen_modules_mm: nextBase,
      kitchen_base_modules_mm: nextBase,
      kitchen_wall_modules_mm: nextWall,
      kitchen_module_types: nextTypes,
      kitchen_drawer_counts: nextDrawers,
      kitchen_base_shelf_counts: nextBaseShelves,
      kitchen_wall_shelf_counts: nextWallShelves,
      kitchen_door_swings: [...(activeInput.kitchen_door_swings ?? baseModules.map(() => "pair" as const)), "pair"],
      door_count: nextBase.length,
    });
  }

  function appendWardrobeModule(kind: WardrobeModuleType) {
    if (activeInput.productType !== "built_in_wardrobe") return;
    const layout = normalizeWardrobeModules(activeInput.wardrobe_modules_mm, activeInput.wardrobe_module_types, activeInput.width_mm);
    if (layout.modules.length >= MAX_WARDROBE_MODULE_COUNT) return;
    const modules = [...layout.modules, 600];
    const moduleTypes = [...layout.moduleTypes, kind];
    commitRoomItemById(activeRoomId, {
      ...activeInput,
      width_mm: modules.reduce((sum, width) => sum + width, 0),
      wardrobe_modules_mm: modules,
      wardrobe_module_types: moduleTypes,
      wardrobe_drawer_counts: [...(activeInput.wardrobe_drawer_counts ?? layout.modules.map(() => 4)), kind === "drawer" ? 4 : 4],
      wardrobe_shelf_counts: [...(activeInput.wardrobe_shelf_counts ?? layout.modules.map(() => 4)), kind === "shelf" ? 4 : 2],
      wardrobe_door_swings: [...(activeInput.wardrobe_door_swings ?? layout.modules.map(() => "pair" as const)), "pair"],
    });
  }

  function quickAppendModule(kind: "door" | "drawer" | "open") {
    if (activeInput.productType === "kitchen_full_set") {
      appendKitchenModule(kind === "open" ? "open" : kind);
      return;
    }
    if (activeInput.productType === "built_in_wardrobe") {
      appendWardrobeModule(kind === "drawer" ? "drawer" : kind === "open" ? "shelf" : "shelf");
      return;
    }
    if (["desk", "custom_shelf", "gap_cabinet", "shoe_cabinet"].includes(activeInput.productType)) {
      const nextDrawerCount = kind === "drawer" ? Math.min(4, Math.max(1, (activeInput.storage_drawer_count ?? 0) + 1)) : activeInput.storage_drawer_count ?? 0;
      commitRoomItemById(activeRoomId, {
        ...activeInput,
        shelf_count: kind === "door" ? Math.min(12, Math.max(1, activeInput.shelf_count + 1)) : activeInput.shelf_count,
        storage_drawer_count: nextDrawerCount,
        has_door: activeInput.has_door,
        door_count: activeInput.door_count,
      });
    }
  }

  const renderProductFlowPanel = () => (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex flex-col gap-1.5 lg:hidden">
      {addOpen && (
        <div className="pointer-events-auto max-h-[42dvh] overflow-y-auto rounded-2xl border border-white/65 bg-white/92 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-md">
          {addSheetBody}
        </div>
      )}

      {canvasMode === "edit" && (
        <div className="pointer-events-none flex justify-center">
          {/* 편집(치수·문/서랍·복제·삭제)은 가구를 누르면 뜨는 패널의 −/＋ 토글로 통일 — 하단 바는 '추가'만 */}
          <button
            type="button"
            onClick={() => setAddOpen((value) => !value)}
            className={`pointer-events-auto flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[12px] font-black shadow-lg backdrop-blur-md transition active:scale-95 ${addOpen ? "bg-slate-900 text-white" : "border border-slate-200/70 bg-white/92 text-slate-700 hover:border-brand hover:text-brand"}`}
          >
            <span className="text-base leading-none">＋</span> 가구 추가
          </button>
        </div>
      )}
    </div>
  );

  // '＋ 가구 추가' 시트 — 카테고리 우선 2단 구조: ① 카테고리 탭 → ② 해당 카테고리 상품 타일
  //   규격이 있는 상품은 타일 자리에서 규격 선택으로 전환(← 뒤로가기) — 아래로 계속 쌓이는 복잡함 제거
  const activeAddCat = catalogCategories.find((cat) => cat.id === addCat) ?? catalogCategories[0];
  const addSheetBody = (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-black text-ink">가구 추가</span>
        <button type="button" onClick={() => { setAddOpen(false); setPickerSlug(null); }} aria-label="닫기" className="grid h-6 w-6 place-items-center rounded-md bg-soft text-sm font-black leading-none text-slate-500 hover:bg-slate-100">×</button>
      </div>
      {/* ① 카테고리 탭 — 카테고리 색상으로 시인성 확보 */}
      <div className="scrollbar-none mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
        {catalogCategories.map((cat) => {
          const active = activeAddCat.id === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => { setAddCat(cat.id); setPickerSlug(null); }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black transition active:scale-95 ${active ? "text-white shadow-sm" : ""}`}
              style={active ? { background: cat.accent } : { background: cat.bg, color: cat.accent }}
            >
              {cat.title}
            </button>
          );
        })}
      </div>
      {pickerSlug ? (
        /* ②-b 규격 선택 — 타일 그리드 자리를 그대로 대체(겹겹이 쌓이지 않음) */
        <div className="rounded-xl bg-white/70 p-2 ring-1 ring-slate-200/70">
          <div className="mb-2 flex items-center gap-2">
            <button type="button" onClick={() => setPickerSlug(null)} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600 hover:bg-slate-200">← 상품 목록</button>
            <span className="text-[12px] font-black text-ink">{productLabels[pickerSlug] ?? pickerSlug} 규격</span>
            <span className="text-[10px] font-bold text-slate-400">누르면 바로 추가돼요</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pickerSlug === "kitchen_full_set"
              ? KITCHEN_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.description}
                    onClick={() => addKitchenSetToRoom(preset)}
                    className="rounded-lg bg-white px-3 py-2 text-left text-[12px] font-black text-slate-700 ring-1 ring-slate-200 transition hover:ring-brand active:scale-95"
                  >
                    {preset.label}
                    <span className="ml-1 text-[10px] font-bold text-slate-400">{preset.shape === "l_shape" ? "ㄱ자" : "일자"} · {preset.input.kitchen_modules_mm.length}칸</span>
                  </button>
                ))
              : (roomAddPresets[pickerSlug] ?? []).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => addFurnitureToRoom(pickerSlug, { width_mm: preset.width_mm, height_mm: preset.height_mm, depth_mm: preset.depth_mm, hood_option: preset.hood_option })}
                    className="rounded-lg bg-white px-3 py-2 text-[12px] font-black text-slate-700 ring-1 ring-slate-200 transition hover:ring-brand active:scale-95"
                  >
                    폭 {preset.label}mm
                    <span className="ml-1 text-[10px] font-bold text-slate-400">H{preset.height_mm}·D{preset.depth_mm}</span>
                  </button>
                ))}
          </div>
        </div>
      ) : (
        /* ② 상품 타일 — 현재 카테고리의 상품만 크게 */
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {activeAddCat.slugs.map((slug) => {
            const hasPresets = Boolean(roomAddPresets[slug]) || slug === "kitchen_full_set";
            return (
              <button
                key={slug}
                type="button"
                title={`${productLabels[slug] ?? slug} ${hasPresets ? "규격 선택" : "추가"}`}
                onClick={() => (hasPresets ? setPickerSlug(slug) : addFurnitureToRoom(slug))}
                className="group flex flex-col items-center gap-1 rounded-xl border border-slate-200/70 bg-white/85 p-2 transition hover:border-brand hover:bg-white hover:shadow-sm active:scale-95"
              >
                <span className="flex aspect-[4/3] w-full items-center justify-center rounded-lg" style={{ background: activeAddCat.bg }}>
                  <ProductArt slug={slug} className="h-12 w-12 transition group-hover:scale-105" />
                </span>
                <span className="line-clamp-1 w-full text-center text-[11px] font-black text-slate-700">{productLabels[slug] ?? slug}</span>
                {productFromPrice[slug] && <span className="text-[10px] font-black text-ink">₩{productFromPrice[slug]!.toLocaleString("ko-KR")}~</span>}
                <span className="text-[9px] font-bold text-slate-400">{hasPresets ? "규격 선택 →" : "바로 추가"}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  return (
      <EditorShell
      overlay
      categories={[]}
      activeCat={activeCat}
      effectiveCat={effectiveCat}
      onSelectCat={setActiveCat}
      panelTitle={activeLabel}
      panelHeading={effectiveLabel}
      fullScreen={previewFullScreen}
      onFullScreenChange={setPreviewFullScreen}
      toolbar={showStartChoice ? null : (
        <>
          <span className="shrink-0 px-1 text-[12px] font-black text-ink">{isManual && manualTitle ? manualTitle : product.name}</span>
          {/* 보기/수정 — 상단으로 승격(간편/전문가 토글 대체) */}
          <div data-coach="mode" className="inline-flex shrink-0 rounded-full border border-slate-200 bg-white p-0.5 text-[11px] font-black">
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
                className={`rounded-full px-3 py-1.5 transition ${canvasMode === mode ? "bg-brand text-white" : "text-slate-500"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {categories.some((c) => c.id === "fixtures") && (
            <button
              type="button"
              title="추가 옵션 (EP·타공·부속)"
              aria-label="추가 옵션"
              onClick={() => setActiveCat(activeCat === "fixtures" ? null : "fixtures")}
              className={`ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full border text-base transition ${activeCat === "fixtures" ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600"}`}
            >
              🚰
            </button>
          )}
          <button type="button" title="AI로 만들기" aria-label="AI로 만들기" onClick={() => setChatOpen((v) => !v)} className={`${categories.some((c) => c.id === "fixtures") ? "" : "ml-auto "}grid h-9 shrink-0 place-items-center rounded-full border px-3 text-[12px] font-black transition ${chatOpen ? "border-brand bg-brand text-white" : "border-brand/40 bg-white text-brand"}`}>AI</button>
          {!previewFullScreen && (
            <div className="hidden shrink-0 items-center sm:flex">
              <div className="rounded-l-full bg-amber-100 px-3 py-1.5 text-[11px] font-black text-amber-900 ring-1 ring-amber-200">
                이걸 누르면 전체모드로 볼 수 있어요
              </div>
              <div className="h-0 w-0 border-y-[8px] border-l-[10px] border-y-transparent border-l-amber-100" />
            </div>
          )}
          <button type="button" title={previewFullScreen ? "전체모드 종료" : "전체모드"} aria-label={previewFullScreen ? "전체모드 종료" : "전체모드"} aria-pressed={previewFullScreen} onClick={() => setPreviewFullScreen((value) => !value)} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition ${previewFullScreen ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
            {previewFullScreen ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v5H3" /><path d="M16 3v5h5" /><path d="M8 21v-5H3" /><path d="M16 21v-5h5" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H3v6" /><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M15 21h6v-6" /></svg>
            )}
          </button>
          {isModularProduct && isPro && (
            <button type="button" title="도면 편집" aria-label="도면 편집" onClick={() => setViewMode(viewMode === "2d" ? "room" : "2d")} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition ${viewMode === "2d" ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600"}`}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" strokeLinecap="round" /></svg>
            </button>
          )}
        </>
      )}
      canvas={
        <div className="flex h-full w-full">
          {/* IKEA식 좌측 사이드바 — 상품 카드 목록 상시, 가구 선택 시 제품 옵션으로 전환 */}
          {!showStartChoice && (
            <aside className="hidden w-[340px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-slate-200 bg-white p-3 lg:flex">
              <div ref={setSidePanelHost} className="empty:hidden" />
              {roomSelected ? (
                <p className="rounded-xl bg-soft px-3 py-2 text-[11px] font-bold leading-5 text-slate-500">
                  선택을 해제(Esc)하면 상품 목록이 다시 표시됩니다.
                </p>
              ) : (
                <div>{addSheetBody}</div>
              )}
            </aside>
          )}
        <div className="relative h-full min-w-0 flex-1">
          {showStartChoice ? (
            renderStartChoice()
          ) : (
          <>
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
              {!showKitchenPreset && (
                <CoachMarks
                  steps={[
                    { selector: "canvas", text: "① 가구(문짝)를 눌러보세요 — 크기·소재를 바로 조절할 수 있어요" },
                    { selector: '[data-coach="mode"]', text: "② 보기/수정 전환 — 보기 모드는 감상용, 수정 모드에서 편집해요" },
                    { selector: 'button[aria-label="전체모드"]', text: "전체화면은 여기! 크게 보면서 편집할 수 있어요" },
                    { selector: '[data-coach="order"]', text: "③ 구성이 끝나면 여기로 — 검수 항목을 하나씩 안내해 드려요" },
                  ]}
                />
              )}
              <RoomScene items={roomItems} placements={roomPlacements} selectedId={roomSelected} highlightId={justAddedId} expert={isPro} editable={canvasMode === "edit"} onSelect={setRoomSelected} onMove={moveRoomItem} onMoveEnd={endRoomMove} onResize={resizeRoomItem} onCommitItem={commitRoomItemById} onRotateItem={rotateRoomItem} onDuplicateItem={duplicateRoomItem} onRemoveItem={removeRoomItem} selectedNotice={selectedNotice} mobilePanelHost={mobilePanelHost} desktopPanelHost={sidePanelHost} showDimensions={showDimensions} doorsOpen={doorsOpen} guides={roomGuides} floor={roomFloor} />
              {renderProductFlowPanel()}

              {/* 통합 툴바 — 보기/수정 모드 · 치수 · 문열림 · 자동정렬 · 실행취소를 한 곳에(글래스 바) */}
              <div className="pointer-events-auto absolute left-3 top-3 z-20 flex items-center gap-1 rounded-2xl border border-slate-200/70 bg-white/85 p-1 shadow-lg shadow-slate-900/5 backdrop-blur-md lg:left-1/2 lg:top-auto lg:bottom-3 lg:-translate-x-1/2">
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
          </>
          )}
        </div>
        </div>
      }
      belowCanvas={
        !(isModularProduct && isPro && viewMode === "2d") ? (
          <div className="mt-2 space-y-2 sm:hidden">
            {/* 모바일: 사이즈 패널(RoomScene이 포털로 채움)과 가구추가 시트를 미리보기 아래에 — 화면을 가리지 않게 */}
            <div ref={setMobilePanelHost} />
          </div>
        ) : null
      }
      panel={
        <>
                <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-xs font-black text-sky-950">초보자 제작 순서</div>
                    <div className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-sky-700 ring-1 ring-sky-200">{currentGuideIndex + 1}/{beginnerSteps.length}</div>
                  </div>
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {beginnerSteps.map((step, index) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setActiveCat(step.id === "check" ? "check" : step.id)}
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-black transition ${index === currentGuideIndex ? "bg-brand text-white" : index < currentGuideIndex ? "bg-white text-sky-700 ring-1 ring-sky-200" : "bg-sky-100 text-sky-500"}`}
                      >
                        {index + 1}. {step.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 text-[11px] font-bold leading-5 text-sky-900">{currentGuide.hint}</div>
                </div>

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
                        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold leading-5 text-emerald-900 ring-1 ring-emerald-200">
                          후드는 쿡탑 칸 중앙에 자동으로 맞춰집니다. 쿡탑 칸을 옮기면 먼지 흡입 위치가 어긋나지 않게 후드도 같이 따라갑니다.
                        </div>
                        <SelectField label="전자레인지장" value={activeInput.microwave_option ?? "none"} onChange={(value) => updateActive("microwave_option", value)} options={microwaveOptions.map((option) => ({ value: option.id, label: option.name }))} />
                      </>
                    )}
                    {activeInput.productType === "kitchen_base_cabinet" && (
                      <SelectField label="서랍형" value={String((activeInput.drawer_module_count ?? 0) > 0)} onChange={(value) => updateActive("drawer_module_count", value === "true" ? 1 : 0)} options={[{ value: "false", label: "도어형" }, { value: "true", label: "서랍형" }]} />
                    )}
                  </div>
                )}

                {effectiveCat === "fixtures" && activeInput.productType.startsWith("kitchen_") && (
                  <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
                    <div className="text-xs font-black text-slate-500">추가 옵션 (고객센터 상담 품목)</div>
                    <SelectField
                      label={`EP 마감판넬 (${activeInput.productType === "kitchen_wall_cabinet" ? "면당 40,000원" : "면당 65,000원"})`}
                      value={String(activeInput.ep_panel_sides ?? 0)}
                      onChange={(value) => updateActive("ep_panel_sides", Number(value))}
                      options={[
                        { value: "0", label: "적용 안 함" },
                        { value: "1", label: "한쪽 면" },
                        { value: "2", label: "양쪽 면" },
                      ]}
                    />
                    {(activeInput.productType === "kitchen_full_set" || activeInput.productType === "kitchen_wall_cabinet") && (
                      <SelectField
                        label="후드장 타공 (+40,000원)"
                        value={String(Boolean(activeInput.hood_drilling))}
                        onChange={(value) => updateActive("hood_drilling", value === "true")}
                        options={[
                          { value: "false", label: "타공 안 함" },
                          { value: "true", label: "타공 (자바라·전선)" },
                        ]}
                      />
                    )}
                    <div>
                      <div className="mb-2 text-xs font-black text-slate-500">부속 / 악세사리</div>
                      <div className="flex flex-wrap gap-2">
                        {retailAccessories.filter((a) => !a.soldOut).map((a) => {
                          const selected = (activeInput.accessory_ids ?? []).includes(a.name);
                          return (
                            <button
                              key={a.name}
                              type="button"
                              onClick={() => {
                                const current = activeInput.accessory_ids ?? [];
                                const next = selected ? current.filter((n) => n !== a.name) : [...current, a.name];
                                updateActive("accessory_ids", next);
                              }}
                              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${selected ? "bg-brand text-white" : "bg-soft text-slate-700"}`}
                            >
                              {a.name} +{formatMoney(a.price)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
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
                      {activeInput.productType === "living_cabinet" && (
                        <>
                          <div>
                            <div className="mb-2 text-xs font-black text-slate-500">하부 도어 구역</div>
                            <div className="flex flex-wrap gap-2">
                              {([{ id: 0.3, label: "낮게 (진열↑)" }, { id: 0.45, label: "기본" }, { id: 0.6, label: "높게 (수납↑)" }] as const).map((option) => {
                                const current = Math.min(0.6, Math.max(0.3, activeInput.living_door_ratio ?? 0.45));
                                const active = Math.abs(current - option.id) < 0.03;
                                return (
                                  <button key={option.id} type="button" onClick={() => updateActive("living_door_ratio", option.id)} className={`rounded-lg px-3 py-1.5 text-xs font-black ${active ? "bg-brand text-white" : "bg-soft text-slate-700"}`}>
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="mt-1.5 text-[11px] font-semibold text-slate-400">하부는 도어 수납, 상부는 오픈 진열로 나뉩니다.</p>
                          </div>
                          <div>
                            <div className="mb-2 text-xs font-black text-slate-500">뒷판(백패널)</div>
                            <div className="flex flex-wrap gap-2">
                              {([{ id: true, label: "있음(막힘)" }, { id: false, label: "없음(벽 노출)" }] as const).map((option) => (
                                <button key={String(option.id)} type="button" onClick={() => updateActive("back_panel", option.id)} className={`rounded-lg px-3 py-1.5 text-xs font-black ${(activeInput.back_panel !== false) === option.id ? "bg-brand text-white" : "bg-soft text-slate-700"}`}>
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
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
                          {[...new Set(catalogCategories.flatMap((c) => c.slugs))].filter((s) => s !== input.productType).slice(0, 4).map((slug) => (
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
                    {/* 잘 모르겠으면 그냥 접수 — 담당자가 검수 후 확정 전에 연락(소비자를 체크리스트로 막지 않는다) */}
                    <div className="border-t border-slate-100 pt-3">
                      <p className="mb-2 text-[11px] font-bold leading-5 text-slate-500">
                        항목이 어렵거나 잘 모르겠다면 <b className="text-slate-700">이대로 접수</b>하세요. 담당자가 치수·설치 조건을 검수한 뒤 <b className="text-slate-700">제작 확정 전에 연락</b>드립니다.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          addConfiguredItem(input.productType, isManual && manualTitle ? manualTitle : product.name, input, 1, {
                            order_verdict: validation.verdict,
                            checklist_confirmations: requiredChecklistIds.filter((id) => checklistState[id]),
                          });
                          setActiveCat(null);
                          router.push("/cart");
                        }}
                        className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                      >
                        잘 모르겠어요 — 그냥 주문할게요 (검수 요청 접수)
                      </button>
                    </div>
                  </div>
                )}
        </>
      }
      footer={showStartChoice ? null : (
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
              {/* 홀드(비활성) 대신 항상 진행 가능 — 조건 미충족이면 검수·주문 팝업을 열어 하나씩 해결 */}
              <button
                type="button"
                data-coach="order"
                onClick={() => {
                  if (!canPlaceOrder) {
                    setActiveCat("check");
                    return;
                  }
                  addConfiguredItem(input.productType, isManual && manualTitle ? manualTitle : product.name, input, 1, {
                    order_verdict: validation.verdict,
                    checklist_confirmations: requiredChecklistIds.filter((id) => checklistState[id]),
                  });
                  router.push("/cart");
                }}
                className="whitespace-nowrap rounded-2xl bg-brand px-3.5 py-2.5 text-[13px] font-black text-white sm:px-5 sm:py-3 sm:text-sm"
              >
                {canPlaceOrder ? ORDER_VERDICT_CTA[validation.verdict] : "주문 진행하기"}
              </button>
            </div>
          </div>
        </div>
      )}
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
  if (productType === "desk") {
    return {
      ...defaultInput,
      productType,
      width_mm: 1400,
      height_mm: 740,
      depth_mm: 600,
      has_door: false,
      door_count: 0,
      shelf_count: 1,
      storage_drawer_count: 3,
      material: "LPM 라이트오크",
      color: "오크",
      open_type: "오픈형",
    };
  }
  if (productType === "living_cabinet") {
    return {
      ...defaultInput,
      productType,
      width_mm: 1800,
      height_mm: 1800,
      depth_mm: 400,
      has_door: true,
      door_count: 3,
      shelf_count: 4,
      material: "UV 하이그로시 그레이",
      color: "그레이",
      open_type: "여닫이",
      wall_fix_option: true,
    };
  }
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
      // 시작부터 '바로 주문 가능한 완성품' — 사용자는 사이즈 조절·장 추가만 하면 된다
      countertop_type: "pt_white",
      toe_kick_option: "standard_100",
      sink_option: "single_780",
      faucet_option: "basic_cobra",
      hood_option: "haatz_slide_600",
      cooktop_option: "gas_3burner_560",
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
      toe_kick_option: "none",
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
  const maxModuleIndex = Math.max(0, (kitchenLayout?.modules.length ?? kitchenTemplate?.modules.length ?? 1) - 1);
  const defaultSinkIndex = clampModuleIndex(kitchenTemplate?.sinkModuleIndex ?? 0, maxModuleIndex);
  const defaultCooktopIndex = clampModuleIndex(kitchenTemplate?.cooktopModuleIndex ?? 0, maxModuleIndex);
  const normalizedCooktopIndex = clampModuleIndex(input.cooktop_module_index ?? defaultCooktopIndex, maxModuleIndex);
  const normalizedHoodIndex =
    input.productType === "kitchen_full_set" &&
    input.hood_option &&
    input.hood_option !== "none" &&
    input.cooktop_option &&
    input.cooktop_option !== "none"
      ? normalizedCooktopIndex
      : clampModuleIndex(input.hood_module_index ?? input.cooktop_module_index ?? defaultCooktopIndex, maxModuleIndex);

  // ── 설비 규격 자동 맞춤 — 싱크볼(780→800/그 외 900)·쿡탑(≥600)·후드(스펙 폭+여유)·전자레인지장(≥600)이
  //    배치된 칸은 그 규격에 맞게 폭을 자동 확장한다(장이 설비에 맞춰 만들어지는 실제 제작 규칙). ──
  const fixedModules = kitchenLayout ? [...kitchenLayout.modules] : null;
  const fixedBase = kitchenLayout ? [...normalizeKitchenLayerWidths(kitchenLayout.modules, input.kitchen_base_modules_mm)] : null;
  const fixedWall = kitchenLayout ? [...normalizeKitchenLayerWidths(kitchenLayout.modules, input.kitchen_wall_modules_mm)] : null;
  if (kitchenLayout && fixedModules && fixedBase && fixedWall) {
    const bump = (arr: number[], idx: number, minMm: number) => {
      if (arr[idx] != null && arr[idx] < minMm) arr[idx] = minMm;
    };
    const sinkIdx = clampModuleIndex(input.sink_module_index ?? defaultSinkIndex, maxModuleIndex);
    const cooktopIdx = normalizedCooktopIndex;
    const hoodIdx = normalizedHoodIndex;
    const microIdx = clampModuleIndex(input.microwave_module_index ?? maxModuleIndex, maxModuleIndex);
    if (input.sink_option && input.sink_option !== "none") {
      const minW = getSinkMinCabinetWidthMm(input.sink_option); // 검증 룰과 동일 기준(더블 950 등)
      bump(fixedModules, sinkIdx, minW);
      bump(fixedBase, sinkIdx, minW);
    }
    if (input.cooktop_option && input.cooktop_option !== "none") {
      bump(fixedModules, cooktopIdx, 600);
      bump(fixedBase, cooktopIdx, 600);
    }
    if (input.hood_option && input.hood_option !== "none") {
      const minW = Math.max(600, Math.ceil((getHoodSpec(input.hood_option).widthMm + 40) / 10) * 10);
      bump(fixedWall, hoodIdx, minW);
    }
    if (input.microwave_option && input.microwave_option !== "none") {
      // 검증 룰은 하부(base) 폭을 본다 — 하부·상부 모두 600 확보
      bump(fixedModules, microIdx, 600);
      bump(fixedBase, microIdx, 600);
      bump(fixedWall, microIdx, 600);
    }
  }
  const width = fixedModules ? fixedModules.reduce((sum, moduleWidth) => sum + moduleWidth, 0) : (kitchenTemplate?.width_mm ?? input.width_mm);
  const isKitchenSet = input.productType === "kitchen_full_set";
  const isKitchenBase = input.productType === "kitchen_base_cabinet";
  const isKitchenIsland = input.productType === "kitchen_island";
  return {
    ...input,
    width_mm: width,
    height_mm: kitchenDimensions?.baseHeightMm ?? input.height_mm,
    depth_mm: kitchenDimensions?.baseDepthMm ?? input.depth_mm,
    has_door: hasDoor,
    door_count: getSafeDoorCount(input.productType, width, hasDoor, input.door_count),
    kitchen_template: kitchenTemplate?.id ?? input.kitchen_template,
    countertop_type: isKitchenSet || isKitchenBase || isKitchenIsland ? (input.countertop_type ?? "none") : input.countertop_type,
    toe_kick_option: isKitchenIsland ? "none" : isKitchenSet || isKitchenBase ? (input.toe_kick_option ?? "none") : input.toe_kick_option,
    sink_option: isKitchenSet || isKitchenBase ? (input.sink_option ?? "none") : input.sink_option,
    faucet_option: isKitchenSet || isKitchenBase ? (input.faucet_option ?? "none") : input.faucet_option,
    hood_option: isKitchenSet ? (input.hood_option ?? "none") : input.hood_option,
    cooktop_option: isKitchenSet ? (input.cooktop_option ?? "none") : input.cooktop_option,
    microwave_option: isKitchenSet ? (input.microwave_option ?? "none") : input.microwave_option,
    kitchen_modules_mm: fixedModules ?? input.kitchen_modules_mm,
    kitchen_base_modules_mm: fixedBase ?? input.kitchen_base_modules_mm,
    kitchen_wall_modules_mm: fixedWall ?? input.kitchen_wall_modules_mm,
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
    cooktop_module_index: normalizedCooktopIndex,
    hood_module_index: normalizedHoodIndex,
    microwave_module_index: clampModuleIndex(input.microwave_module_index ?? maxModuleIndex, maxModuleIndex),
    door_style: input.door_style ?? "flat",
    door_swing: input.door_swing ?? "pair",
  };
}
