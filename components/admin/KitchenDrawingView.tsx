"use client";

import { useEffect, useRef, useState } from "react";
import { HistoryButtons } from "@/components/editor/HistoryControls";
import { KITCHEN_TOE_KICK_M, KITCHEN_WALL_BOTTOM_M } from "@/components/preview3d/constants";
import {
  clampModuleIndex,
  getCooktopOption,
  getCountertopOption,
  getFaucetOption,
  getHoodOption,
  getKitchenSetDimensions,
  getKitchenTemplate,
  getMicrowaveOption,
  getSinkOption,
  hasToeKickEnabled,
  isLShapeKitchen,
  kitchenModuleTypeLabels,
  normalizeKitchenLayerWidths,
  normalizeKitchenModules,
  normalizeKitchenSideModules,
  type KitchenModuleType,
} from "@/lib/kitchen";
import type { FurnitureInput } from "@/lib/types";

const INK = "#0f172a";
const BASE_FILL = "#f1f5f9";
const WALL_FILL = "#f5f3ff";
const ACCENT = "#0891b2";
const UPPER = "#7c3aed";
const MIN_W = 150;
const MAX_W = 1200;

function cum(values: number[], index: number) {
  return values.slice(0, index).reduce((sum, value) => sum + value, 0);
}

function sum(values: number[]) {
  return values.reduce((s, v) => s + v, 0);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function lenFill<T>(arr: T[] | undefined, n: number, def: T): T[] {
  return Array.from({ length: n }, (_, index) => arr?.[index] ?? def);
}

function withModules(
  input: FurnitureInput,
  main: number[],
  mainTypes: KitchenModuleType[],
  side: number[],
  sideTypes: KitchenModuleType[],
  extra?: { corner?: "left" | "right"; sideHasWall?: boolean },
): FurnitureInput {
  const n = main.length;
  const isL = side.length > 0;
  return {
    ...input,
    kitchen_modules_mm: main,
    kitchen_base_modules_mm: main,
    kitchen_wall_modules_mm: main,
    kitchen_module_types: mainTypes.slice(0, n),
    kitchen_drawer_counts: lenFill(input.kitchen_drawer_counts, n, 3),
    kitchen_door_swings: lenFill(input.kitchen_door_swings, n, "pair"),
    kitchen_wall_door_swings: input.kitchen_wall_door_swings ? input.kitchen_wall_door_swings.slice(0, n) : undefined,
    kitchen_base_shelf_counts: lenFill(input.kitchen_base_shelf_counts, n, 1),
    kitchen_wall_shelf_counts: lenFill(input.kitchen_wall_shelf_counts, n, 1),
    kitchen_base_hidden_indices: (input.kitchen_base_hidden_indices ?? []).filter((index) => index < n),
    kitchen_wall_hidden_indices: (input.kitchen_wall_hidden_indices ?? []).filter((index) => index < n),
    kitchen_no_handle_indices: (input.kitchen_no_handle_indices ?? []).filter((index) => index < n),
    kitchen_wall_no_handle_indices: (input.kitchen_wall_no_handle_indices ?? []).filter((index) => index < n),
    sink_module_index: Math.min(input.sink_module_index ?? 0, n - 1),
    cooktop_module_index: Math.min(input.cooktop_module_index ?? 0, n - 1),
    hood_module_index: Math.min(input.hood_module_index ?? 0, n - 1),
    kitchen_layout_shape: isL ? "l_shape" : "straight",
    kitchen_corner: extra?.corner ?? (input.kitchen_corner === "left" ? "left" : "right"),
    kitchen_side_modules_mm: side,
    kitchen_side_module_types: sideTypes.slice(0, side.length),
    kitchen_side_has_wall: extra?.sideHasWall ?? input.kitchen_side_has_wall ?? true,
  };
}

// 평면도에서 고를 수 있는 칸 종류. 라벨은 앱 전체와 동일한 정식 명칭(kitchenModuleTypeLabels)을
// 그대로 써서, 칩에서 고른 이름과 도면/3D에 찍히는 이름이 항상 일치하도록 한다.
const EDIT_TYPES: { value: KitchenModuleType; label: string }[] = (
  ["door", "drawer", "pullout", "open"] as KitchenModuleType[]
).map((value) => ({ value, label: kitchenModuleTypeLabels[value] }));

/** 한 층(상부 또는 하부)을 연결된 ㄱ자 평면으로 그리고, 드래그/더블클릭으로 수정한다 */
function LPlan({
  title,
  subtitle,
  accent,
  fill,
  depth,
  modules,
  types,
  sideModules,
  sideTypes,
  corner,
  sink,
  cooktop,
  interactive,
  onMain,
  onSide,
  upperModules,
  upperSideModules,
  upperColor = UPPER,
  embedded = false,
  onMainType,
  onSideType,
  typeOptions,
  onDepth,
  onTotalWidth,
  selectedIndex,
  onSelectCell,
}: {
  title: string;
  subtitle: string;
  accent: string;
  fill: string;
  depth: number;
  modules: number[];
  types: KitchenModuleType[];
  sideModules: number[];
  sideTypes: KitchenModuleType[];
  corner: "left" | "right";
  sink: number | null;
  cooktop: number | null;
  interactive: boolean;
  embedded?: boolean;
  onMain: (next: number[]) => void;
  onSide: (next: number[]) => void;
  /** 제공되면 상부 폭을 위 모서리에 함께 표기(표시 전용). 외곽선/편집은 하부 1개. */
  upperModules?: number[];
  upperSideModules?: number[];
  upperColor?: string;
  /** 칸 종류 변경 (제공 시 종류 라벨 클릭으로 변경) */
  onMainType?: (index: number, type: KitchenModuleType) => void;
  onSideType?: (index: number, type: KitchenModuleType) => void;
  typeOptions?: { value: KitchenModuleType; label: string }[];
  /** 깊이(세로) 더블클릭 수정 */
  onDepth?: (mm: number) => void;
  /** 전체 가로 더블클릭 수정 (칸 비율로 재분배) */
  onTotalWidth?: (mm: number) => void;
  /** 선택된 메인 칸(하이라이트) + 칸 클릭 선택 콜백 */
  selectedIndex?: number | null;
  onSelectCell?: (index: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<null | { run: "main" | "side"; divider: number; startPos: number; mmPerPx: number; baseA: number; baseB: number; preview: number[] }>(null);
  const [editing, setEditing] = useState<string | null>(null);
  // 칸 종류 드롭다운: 클릭한 칸의 키 + 화면상 위치(SVG 밖 정상 px 오버레이로 띄움).
  const [typeEditing, setTypeEditing] = useState<{ key: string; left: number; top: number } | null>(null);

  const mainView = drag?.run === "main" ? drag.preview : modules;
  const sideView = drag?.run === "side" ? drag.preview : sideModules;
  const isL = sideModules.length > 0;
  const mainW = sum(mainView);
  const sideLen = sum(sideView);
  const sideX = corner === "right" ? mainW - depth : 0;

  useEffect(() => {
    if (!drag) return;
    function onMove(event: PointerEvent) {
      setDrag((current) => {
        if (!current) return current;
        const pos = current.run === "main" ? event.clientX : event.clientY;
        const deltaMm = (pos - current.startPos) * current.mmPerPx;
        let a = clamp(current.baseA + deltaMm, MIN_W, MAX_W);
        let b = current.baseA + current.baseB - a;
        if (b < MIN_W) {
          b = MIN_W;
          a = current.baseA + current.baseB - b;
        }
        const preview = [...current.preview];
        preview[current.divider - 1] = a;
        preview[current.divider] = b;
        return { ...current, preview };
      });
    }
    function onUp() {
      setDrag((current) => {
        if (current) (current.run === "main" ? onMain : onSide)(current.preview);
        return null;
      });
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  const padL = 380;
  const padR = 360;
  const padT = 320;
  const padB = 280;
  const contentW = mainW;
  const contentH = depth + (isL ? sideLen : 0);
  const vbW = contentW + padL + padR;
  const vbH = contentH + padT + padB;

  // 칸 라벨(SVG 좌표 sx,sy)을 클릭하면, 그 지점 화면 px 위에 정상 크기 드롭다운을 띄운다.
  // (SVG 안 <select>는 도면과 함께 축소돼 펼친 목록만 거대해지므로, SVG 밖 오버레이로 처리)
  function openType(key: string, sx: number, sy: number) {
    if (typeEditing?.key === key) {
      setTypeEditing(null);
      return;
    }
    const rect = svgRef.current?.getBoundingClientRect();
    const scale = rect ? rect.width / vbW : 1;
    setTypeEditing({ key, left: (sx + padL) * scale, top: (sy + padT) * scale });
  }

  function startDrag(run: "main" | "side", divider: number, event: React.PointerEvent) {
    if (!interactive) return;
    event.stopPropagation();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const arr = run === "main" ? modules : sideModules;
    setDrag({
      run,
      divider,
      startPos: run === "main" ? event.clientX : event.clientY,
      mmPerPx: run === "main" ? vbW / rect.width : vbH / rect.height,
      baseA: arr[divider - 1],
      baseB: arr[divider],
      preview: [...arr],
    });
  }

  function editMain(index: number, mm: number) {
    onMain(modules.map((w, j) => (j === index ? clamp(mm, MIN_W, MAX_W) : w)));
    setEditing(null);
  }
  function editSide(index: number, mm: number) {
    onSide(sideModules.map((w, j) => (j === index ? clamp(mm, MIN_W, MAX_W) : w)));
    setEditing(null);
  }
  function editTotal(mm: number) {
    // 전체 가로를 비율대로 재분배 (각 칸 150~1200, 10mm 스냅, 합계 보정)
    const target = clamp(mm, MIN_W, MAX_W * modules.length);
    const cur = sum(modules);
    const scaled = modules.map((w) => clamp(Math.round((cur > 0 ? w / cur : 1 / modules.length) * target / 10) * 10, MIN_W, MAX_W));
    let diff = target - sum(scaled);
    for (let i = scaled.length - 1; i >= 0 && diff !== 0; i -= 1) {
      const next = clamp(scaled[i] + diff, MIN_W, MAX_W);
      diff -= next - scaled[i];
      scaled[i] = next;
    }
    onMain(scaled);
    setEditing(null);
  }
  function editDepth(mm: number) {
    onDepth?.(clamp(mm, 200, 800));
    setEditing(null);
  }

  return (
    <div>
      {embedded ? (
        <div className="mb-1 flex items-center gap-2 text-xs font-black" style={{ color: accent }}>
          <span>{title}</span>
          {interactive && <span className="text-[10px] font-bold text-slate-400">· 경계 드래그 / 숫자 더블클릭</span>}
        </div>
      ) : (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-md px-2 py-0.5 text-[11px] font-black text-white" style={{ background: accent }}>{title}</span>
          <span className="text-xs font-bold text-slate-500">{subtitle}</span>
          {interactive && <span className="text-[11px] font-bold" style={{ color: accent }}>· 경계 드래그 / 숫자 더블클릭</span>}
          {upperModules && (
            <span className="ml-auto text-[11px] font-black">
              <span style={{ color: upperColor }}>위=상부</span>
              <span className="mx-1 text-slate-300">·</span>
              <span style={{ color: INK }}>아래=하부</span>
            </span>
          )}
        </div>
      )}
      <div className="relative">
      <svg ref={svgRef} viewBox={`${-padL} ${-padT} ${vbW} ${vbH}`} className={`w-full touch-none select-none bg-white ${embedded ? "" : "rounded-xl border border-slate-200"}`} style={{ aspectRatio: `${vbW} / ${vbH}` }}>
        {/* 메인 총길이(가로) 치수 — 더블클릭으로 전체 가로 수정(칸 비율 재분배) */}
        <line x1={0} y1={-150} x2={mainW} y2={-150} stroke={accent} strokeWidth={6} />
        <line x1={0} y1={-180} x2={0} y2={-120} stroke={accent} strokeWidth={6} />
        <line x1={mainW} y1={-180} x2={mainW} y2={-120} stroke={accent} strokeWidth={6} />
        {editing === "total" && onTotalWidth ? (
          <NumberEditor x={mainW / 2} y={-190} value={mainW} onCommit={editTotal} onCancel={() => setEditing(null)} />
        ) : (
          <text x={mainW / 2} y={-190} textAnchor="middle" fontSize={88} fontWeight={800} fill={accent} pointerEvents="all" style={{ cursor: onTotalWidth ? "pointer" : "default" }} onDoubleClick={() => onTotalWidth && setEditing("total")}>가로 {mainW}mm</text>
        )}

        {/* 깊이(세로/폭) 치수 — 측면 다리 반대쪽, 더블클릭으로 깊이 수정 */}
        {(() => {
          const dx = isL && corner === "left" ? mainW + 90 : -90;
          const lx = isL && corner === "left" ? mainW + 156 : -156;
          return (
            <g>
              <line x1={dx} y1={0} x2={dx} y2={depth} stroke={accent} strokeWidth={6} pointerEvents="none" />
              <line x1={dx - 30} y1={0} x2={dx + 30} y2={0} stroke={accent} strokeWidth={6} pointerEvents="none" />
              <line x1={dx - 30} y1={depth} x2={dx + 30} y2={depth} stroke={accent} strokeWidth={6} pointerEvents="none" />
              {editing === "depth" && onDepth ? (
                <NumberEditor x={dx} y={depth / 2} value={depth} onCommit={editDepth} onCancel={() => setEditing(null)} />
              ) : (
                <text x={lx} y={depth / 2} textAnchor="middle" fontSize={58} fontWeight={800} fill={accent} pointerEvents="all" style={{ cursor: onDepth ? "pointer" : "default" }} transform={`rotate(-90 ${lx} ${depth / 2})`} onDoubleClick={() => onDepth && setEditing("depth")}>깊이 {depth}mm</text>
              )}
            </g>
          );
        })()}

        {/* 상부 폭 (위 모서리, 표시 전용) */}
        {upperModules && (
          <g pointerEvents="none">
            <text x={-44} y={-30} textAnchor="end" fontSize={48} fontWeight={800} fill={upperColor}>상</text>
            {upperModules.map((uw, index) => (
              <text key={`um-${index}`} x={cum(upperModules, index) + uw / 2} y={-30} textAnchor="middle" fontSize={56} fontWeight={800} fill={upperColor}>{Math.round(uw)}</text>
            ))}
          </g>
        )}

        {/* 메인 런 (외곽선·편집은 하부 기준) */}
        <rect x={0} y={0} width={mainW} height={depth} fill={fill} stroke={INK} strokeWidth={9} />
        {mainView.map((w, index) => {
          const x = cum(mainView, index);
          const cx = x + w / 2;
          const key = `m-${index}`;
          return (
            <g key={key} style={{ cursor: onSelectCell ? "pointer" : undefined }} onClick={() => onSelectCell?.(index)}>
              <rect x={x} y={0} width={w} height={depth} fill="transparent" pointerEvents={onSelectCell ? "all" : "none"} />
              {selectedIndex === index && onSelectCell && (
                <rect x={x} y={0} width={w} height={depth} fill={accent} fillOpacity={0.1} stroke={accent} strokeWidth={9} pointerEvents="none" />
              )}
              {index > 0 && <line x1={x} y1={0} x2={x} y2={depth} stroke={INK} strokeWidth={5} />}
              <text x={cx} y={depth / 2 + 64} textAnchor="middle" fontSize={46} fontWeight={700} fill={typeEditing?.key === `mt-${index}` ? "#0891b2" : onMainType ? accent : "#64748b"} pointerEvents="all" style={{ cursor: onMainType ? "pointer" : "default" }} onClick={() => onMainType && typeOptions && openType(`mt-${index}`, cx, depth / 2 + 64)}>
                {kitchenModuleTypeLabels[types[index] ?? "door"]}{onMainType ? " ▾" : ""}
              </text>
              {editing === key ? (
                <NumberEditor x={cx} y={depth / 2 - 30} value={w} onCommit={(mm) => editMain(index, mm)} onCancel={() => setEditing(null)} />
              ) : (
                <text x={cx} y={depth / 2 + 6} textAnchor="middle" fontSize={70} fontWeight={800} fill={INK} pointerEvents="all" style={{ cursor: interactive ? "pointer" : "default" }} onDoubleClick={() => interactive && setEditing(key)}>
                  {upperModules ? `하 ${Math.round(w)}` : Math.round(w)}
                </text>
              )}
            </g>
          );
        })}
        {interactive && mainView.map((_w, index) =>
          index === 0 ? null : (
            <g key={`mh-${index}`} style={{ cursor: "ew-resize" }} onPointerDown={(event) => startDrag("main", index, event)}>
              <rect x={cum(mainView, index) - 36} y={0} width={72} height={depth} fill="transparent" pointerEvents="all" />
              <rect x={cum(mainView, index) - 9} y={depth / 2 - 70} width={18} height={140} rx={9} fill={accent} opacity={0.9} pointerEvents="all" />
            </g>
          ),
        )}

        {/* 설비(하부만) */}
        {sink !== null && sink < mainView.length && (
          <g pointerEvents="none">
            <ellipse cx={cum(mainView, sink) + mainView[sink] / 2} cy={depth * 0.74} rx={Math.min(mainView[sink] * 0.26, 150)} ry={depth * 0.12} fill="#bae6fd" stroke={ACCENT} strokeWidth={5} />
            <text x={cum(mainView, sink) + mainView[sink] / 2} y={depth * 0.74 + 16} textAnchor="middle" fontSize={42} fontWeight={800} fill={ACCENT}>싱크</text>
          </g>
        )}
        {cooktop !== null && cooktop < mainView.length && (
          <g pointerEvents="none">
            <rect x={cum(mainView, cooktop) + mainView[cooktop] / 2 - 130} y={depth * 0.74 - 80} width={260} height={160} rx={16} fill="#fee2e2" stroke="#dc2626" strokeWidth={5} />
            <text x={cum(mainView, cooktop) + mainView[cooktop] / 2} y={depth * 0.74 + 16} textAnchor="middle" fontSize={42} fontWeight={800} fill="#dc2626">쿡탑</text>
          </g>
        )}

        {/* 측면 다리 (연결된 ㄱ자) */}
        {isL && (
          <>
            <rect x={sideX} y={depth} width={depth} height={sideLen} fill={fill} stroke={INK} strokeWidth={9} />
            {sideView.map((w, index) => {
              const y = depth + cum(sideView, index);
              const cy = y + w / 2;
              const key = `s-${index}`;
              const numX = corner === "right" ? sideX - 36 : sideX + depth + 36;
              return (
                <g key={key}>
                  {index > 0 && <line x1={sideX} y1={y} x2={sideX + depth} y2={y} stroke={INK} strokeWidth={5} />}
                  <text x={sideX + depth / 2} y={cy + 54} textAnchor="middle" fontSize={42} fontWeight={700} fill={typeEditing?.key === `st-${index}` ? "#0891b2" : onSideType ? accent : "#64748b"} pointerEvents="all" style={{ cursor: onSideType ? "pointer" : "default" }} onClick={() => onSideType && typeOptions && openType(`st-${index}`, sideX + depth / 2, cy + 54)}>
                    {kitchenModuleTypeLabels[sideTypes[index] ?? "door"]}{onSideType ? " ▾" : ""}
                  </text>
                  {editing === key ? (
                    <NumberEditor x={sideX + depth / 2} y={cy - 20} value={w} onCommit={(mm) => editSide(index, mm)} onCancel={() => setEditing(null)} />
                  ) : (
                    <text x={numX} y={cy + 6} textAnchor={corner === "right" ? "end" : "start"} fontSize={62} fontWeight={800} fill={INK} pointerEvents="all" style={{ cursor: interactive ? "pointer" : "default" }} onDoubleClick={() => interactive && setEditing(key)}>{Math.round(w)}</text>
                  )}
                  {upperSideModules && upperSideModules[index] !== undefined && (
                    <text x={corner === "right" ? sideX + depth + 36 : sideX - 36} y={cy + 6} textAnchor={corner === "right" ? "start" : "end"} fontSize={54} fontWeight={800} fill={upperColor} pointerEvents="none">{Math.round(upperSideModules[index])}</text>
                  )}
                </g>
              );
            })}
            {interactive && sideView.map((_w, index) =>
              index === 0 ? null : (
                <g key={`sh-${index}`} style={{ cursor: "ns-resize" }} onPointerDown={(event) => startDrag("side", index, event)}>
                  <rect x={sideX} y={depth + cum(sideView, index) - 36} width={depth} height={72} fill="transparent" pointerEvents="all" />
                  <rect x={sideX + depth / 2 - 70} y={depth + cum(sideView, index) - 9} width={140} height={18} rx={9} fill={accent} opacity={0.9} pointerEvents="all" />
                </g>
              ),
            )}
            {/* 측면 총길이 치수 */}
            <line x1={corner === "right" ? sideX + depth + 150 : sideX - 150} y1={depth} x2={corner === "right" ? sideX + depth + 150 : sideX - 150} y2={depth + sideLen} stroke={accent} strokeWidth={6} />
            <text x={corner === "right" ? sideX + depth + 210 : sideX - 210} y={depth + sideLen / 2} textAnchor="middle" fontSize={74} fontWeight={800} fill={accent} transform={`rotate(90 ${corner === "right" ? sideX + depth + 210 : sideX - 210} ${depth + sideLen / 2})`}>측면 {sideLen}mm</text>
          </>
        )}
      </svg>
      {typeEditing && typeOptions && (onMainType || onSideType) && (() => {
        const isMain = typeEditing.key.startsWith("mt-");
        const idx = Number(typeEditing.key.slice(3));
        const current = isMain ? (types[idx] ?? "door") : (sideTypes[idx] ?? "door");
        return (
          <select
            autoFocus
            value={current}
            onChange={(event) => {
              const t = event.target.value as KitchenModuleType;
              if (isMain) onMainType?.(idx, t);
              else onSideType?.(idx, t);
              setTypeEditing(null);
            }}
            onBlur={() => setTypeEditing(null)}
            style={{
              position: "absolute",
              left: typeEditing.left,
              top: typeEditing.top,
              transform: "translate(-50%, -50%)",
              fontSize: 15,
              fontWeight: 800,
              color: INK,
              padding: "7px 12px",
              borderRadius: 10,
              border: `2px solid ${accent}`,
              background: "white",
              boxShadow: "0 8px 24px rgba(15,23,42,0.22)",
              cursor: "pointer",
              zIndex: 30,
              maxWidth: "70%",
            }}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        );
      })()}
      </div>
    </div>
  );
}

/** 현재 설계로 하부 ㄱ자 평면 + 상부 ㄱ자 평면 + 정면도를 그리는 제작용 도면 */
export function KitchenDrawingView({
  input,
  onInputChange,
  showMeta = true,
  showElevation = true,
  selectedIndex,
  onSelectIndex,
  history,
}: {
  input: FurnitureInput;
  onInputChange?: (next: FurnitureInput) => void;
  showMeta?: boolean;
  /** 정면도 표시 여부(작업지시서/스튜디오에서는 헷갈려서 끔) */
  showElevation?: boolean;
  /** 선택된 메인 칸 (칸 편집 인스펙터와 동기화) */
  selectedIndex?: number | null;
  onSelectIndex?: (index: number) => void;
  /** 실행취소/다시실행 (상위 useInputHistory 소유) */
  history?: { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void };
}) {
  const template = getKitchenTemplate(input.kitchen_template);
  const dim = getKitchenSetDimensions(input, template);
  const layout = normalizeKitchenModules(template, input.kitchen_modules_mm, input.kitchen_module_types);
  const baseModules = normalizeKitchenLayerWidths(layout.modules, input.kitchen_base_modules_mm);
  const wallModules = normalizeKitchenLayerWidths(layout.modules, input.kitchen_wall_modules_mm);
  const types = layout.moduleTypes;
  const isL = isLShapeKitchen(input);
  const side = normalizeKitchenSideModules(input.kitchen_side_modules_mm, input.kitchen_side_module_types);
  const corner: "left" | "right" = input.kitchen_corner === "left" ? "left" : "right";
  const interactive = Boolean(onInputChange);

  const sinkIndex = clampModuleIndex(input.sink_module_index ?? template.sinkModuleIndex, baseModules.length - 1);
  const cooktopIndex = clampModuleIndex(input.cooktop_module_index ?? template.cooktopModuleIndex, baseModules.length - 1);
  const hasSink = (input.sink_option ?? "none") !== "none";
  const hasCooktop = (input.cooktop_option ?? "none") !== "none";
  const hasWallMain = (input.kitchen_wall_hidden_indices?.length ?? 0) < baseModules.length;
  const hasWallSide = isL && input.kitchen_side_has_wall !== false;

  const commitMain = (next: number[]) => onInputChange?.(withModules(input, next, types, side.modules, side.moduleTypes));
  const commitSide = (next: number[]) => onInputChange?.(withModules(input, baseModules, types, next, side.moduleTypes));

  // 정면도 문 탭 → 2짝→좌개→우개 순환 (상·하부 독립)
  const cycleSwing = (s: ElevSwing): ElevSwing => (s === "pair" ? "left" : s === "left" ? "right" : "pair");
  const baseSwings: ElevSwing[] = baseModules.map((_, i) => input.kitchen_door_swings?.[i] ?? "pair");
  const wallSwingsArr: ElevSwing[] = baseModules.map((_, i) => input.kitchen_wall_door_swings?.[i] ?? baseSwings[i] ?? "pair");
  const cycleBaseSwing = (index: number) => onInputChange?.({ ...input, kitchen_door_swings: baseSwings.map((v, j) => (j === index ? cycleSwing(v) : v)) });
  const cycleWallSwing = (index: number) => onInputChange?.({ ...input, kitchen_wall_door_swings: wallSwingsArr.map((v, j) => (j === index ? cycleSwing(v) : v)) });

  const totalMain = sum(baseModules);
  const totalSide = sum(side.modules);

  return (
    <div className="space-y-6">
      {/* 제목칸 */}
      {showMeta && onInputChange && <TitleBlock input={input} onInputChange={onInputChange} />}

      {/* 전체 요약 + 실행취소 */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-white">
        <span className="text-xs font-bold text-slate-300">{isL ? "ㄱ자" : "일자"} 주방 전체 치수</span>
        <span className="ml-auto text-sm font-black">메인 {totalMain}mm{isL ? ` · 측면 ${totalSide}mm · 합계 ${totalMain + totalSide}mm` : ""}</span>
        {history && (
          <HistoryButtons className="ml-1" canUndo={history.canUndo} canRedo={history.canRedo} onUndo={history.onUndo} onRedo={history.onRedo} />
        )}
      </div>

      {/* 평면도 — 상부장이 위, 하부장이 바로 아래 (한 도면으로 통합) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="mb-1 text-sm font-black text-ink">평면도 <span className="text-xs font-bold text-slate-400">(상부 위 · 하부 아래)</span></div>
        {hasWallMain && (
          <>
            <LPlan
              title="① 상부 평면도"
              subtitle={hasWallSide ? "상부장 · 메인 + 측면(ㄱ자, 하부보다 얕음)" : "상부장 · 메인 (하부보다 얕음)"}
              accent={UPPER}
              fill={WALL_FILL}
              depth={dim.wallDepthMm}
              modules={wallModules}
              types={types.map(() => "door")}
              sideModules={hasWallSide && isL ? side.modules : []}
              sideTypes={hasWallSide && isL ? side.moduleTypes.map(() => "door") : []}
              corner={corner}
              sink={null}
              cooktop={null}
              interactive={interactive}
              embedded
              onMain={commitMain}
              onSide={commitSide}
              onDepth={interactive ? (mm) => onInputChange?.({ ...input, kitchen_wall_depth_mm: mm }) : undefined}
            />
            <div className="my-2 border-t border-dashed border-slate-200" />
          </>
        )}
        <LPlan
          title="② 하부 평면도"
          subtitle={isL ? "하부장 · 메인 + 측면(ㄱ자)" : "하부장 · 일자"}
          accent={INK}
          fill={BASE_FILL}
          depth={dim.baseDepthMm}
          modules={baseModules}
          types={types}
          sideModules={isL ? side.modules : []}
          sideTypes={isL ? side.moduleTypes : []}
          corner={corner}
          sink={hasSink ? sinkIndex : null}
          cooktop={hasCooktop ? cooktopIndex : null}
          interactive={interactive}
          embedded
          onMain={commitMain}
          onSide={commitSide}
          typeOptions={interactive ? EDIT_TYPES : undefined}
          onMainType={interactive ? (i, t) => onInputChange?.(withModules(input, baseModules, types.map((v, j) => (j === i ? t : v)), side.modules, side.moduleTypes)) : undefined}
          onSideType={interactive ? (i, t) => onInputChange?.(withModules(input, baseModules, types, side.modules, side.moduleTypes.map((v, j) => (j === i ? t : v)))) : undefined}
          onDepth={interactive ? (mm) => onInputChange?.({ ...input, kitchen_base_depth_mm: mm, depth_mm: mm }) : undefined}
          onTotalWidth={interactive ? () => undefined : undefined}
          selectedIndex={selectedIndex}
          onSelectCell={onSelectIndex}
        />
      </div>

      {/* 정면도 (showElevation=false면 숨김) */}
      {showElevation && (
        <>
          <KitchenElevation
            title="정면도 (메인)"
            subtitle="앞에서 본 메인 런"
            baseModules={baseModules}
            types={types}
            dim={dim}
            hasWall={hasWallMain}
            swings={baseSwings}
            wallSwings={wallSwingsArr}
            onCycleBase={interactive ? cycleBaseSwing : undefined}
            onCycleWall={interactive && hasWallMain ? cycleWallSwing : undefined}
          />
          {isL && (
            <KitchenElevation title="정면도 (측면)" subtitle={`${corner === "right" ? "오른쪽" : "왼쪽"} 코너에서 꺾인 측면 다리`} baseModules={side.modules} types={side.moduleTypes} dim={dim} hasWall={hasWallSide} />
          )}
        </>
      )}

      {/* (상)·(하) 사양 메모 */}
      {showMeta && onInputChange && <SpecMemo input={input} dim={dim} onInputChange={onInputChange} />}

      {/* 칸 추가/삭제·종류 */}
      {onInputChange && <KitchenDrawingEditor input={input} baseModules={baseModules} types={types} side={side} isL={isL} corner={corner} onInputChange={onInputChange} />}

      <p className="text-[11px] font-bold text-slate-400">
        ※ 경계를 드래그하면 옆 칸이 줄어 총길이 유지, 숫자 더블클릭은 그 칸만 바꿉니다. 현장 실측 후 확정됩니다.
      </p>
    </div>
  );
}

/** SVG 안 숫자 입력 편집 */
function NumberEditor({ x, y, value, onCommit, onCancel }: { x: number; y: number; value: number; onCommit: (mm: number) => void; onCancel: () => void }) {
  const W = 280;
  const H = 130;
  return (
    <foreignObject x={x - W / 2} y={y - H / 2} width={W} height={H}>
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <input
          autoFocus
          type="number"
          defaultValue={value}
          onFocus={(event) => event.target.select()}
          onBlur={(event) => onCommit(Number(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCommit(Number((event.target as HTMLInputElement).value));
            if (event.key === "Escape") onCancel();
          }}
          style={{ width: "92%", height: "78%", textAlign: "center", fontSize: 64, fontWeight: 800, color: INK, border: `4px solid ${ACCENT}`, borderRadius: 14, outline: "none" }}
        />
      </div>
    </foreignObject>
  );
}

function ModuleRow({ label, width, type, canRemove, onWidth, onType, onRemove }: { label: string; width: number; type: KitchenModuleType; canRemove: boolean; onWidth: (mm: number) => void; onType: (type: KitchenModuleType) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-xs font-black text-slate-500">{label}</span>
      <input
        key={width}
        type="number"
        min={MIN_W}
        max={MAX_W}
        step={10}
        defaultValue={width}
        inputMode="numeric"
        onBlur={(event) => onWidth(Number(event.target.value))}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-right text-sm font-bold text-slate-800 outline-none focus:border-brand"
      />
      <span className="text-xs font-bold text-slate-400">mm</span>
      <select value={EDIT_TYPES.some((t) => t.value === type) ? type : "door"} onChange={(event) => onType(event.target.value as KitchenModuleType)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-brand">
        {EDIT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <button type="button" onClick={onRemove} disabled={!canRemove} className="ml-auto rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-black text-rose-600 disabled:opacity-40">삭제</button>
    </div>
  );
}

function KitchenDrawingEditor({ input, baseModules, types, side, isL, corner, onInputChange }: { input: FurnitureInput; baseModules: number[]; types: KitchenModuleType[]; side: { modules: number[]; moduleTypes: KitchenModuleType[] }; isL: boolean; corner: "left" | "right"; onInputChange: (next: FurnitureInput) => void }) {
  function commitMain(nextModules: number[], nextTypes: KitchenModuleType[]) {
    onInputChange(withModules(input, nextModules, nextTypes, side.modules, side.moduleTypes));
  }
  function commitSide(nextSide: number[], nextSideTypes: KitchenModuleType[], extra?: { corner?: "left" | "right" }) {
    onInputChange(withModules(input, baseModules, types, nextSide, nextSideTypes, extra));
  }

  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50/50 p-4">
      <div className="text-sm font-black text-brand">칸 추가 · 삭제 · 종류</div>
      <p className="mt-0.5 text-xs font-bold text-slate-500">가로는 도면에서 드래그/더블클릭으로 바꾸고, 여기선 칸 추가·삭제·종류를 바꿉니다.</p>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-ink">메인 런 ({baseModules.length}칸 · 총 {sum(baseModules)}mm)</div>
          <button type="button" onClick={() => commitMain([...baseModules, 600], [...types, "door"])} className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-black text-white">+ 칸 추가</button>
        </div>
        <div className="mt-2 space-y-2">
          {baseModules.map((width, index) => (
            <ModuleRow
              key={index}
              label={`${index + 1}번`}
              width={width}
              type={types[index] ?? "door"}
              canRemove={baseModules.length > 1}
              onWidth={(mm) => commitMain(baseModules.map((w, j) => (j === index ? clamp(mm, MIN_W, MAX_W) : w)), types)}
              onType={(t) => commitMain(baseModules, types.map((tp, j) => (j === index ? t : tp)))}
              onRemove={() => commitMain(baseModules.filter((_, j) => j !== index), types.filter((_, j) => j !== index))}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-cyan-200 pt-3">
        {isL ? (
          <>
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-ink">측면 다리 ({side.modules.length}칸 · 총 {sum(side.modules)}mm)</div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => commitSide([...side.modules, 600], [...side.moduleTypes, "door"])} className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-black text-white">+ 칸 추가</button>
                <button type="button" onClick={() => commitSide([], [])} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-300">측면 제거</button>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">
              코너:
              <button type="button" onClick={() => commitSide(side.modules, side.moduleTypes, { corner: "left" })} className={`rounded-md px-2 py-1 font-black ${corner === "left" ? "bg-brand text-white" : "bg-white ring-1 ring-slate-300 text-slate-600"}`}>왼쪽</button>
              <button type="button" onClick={() => commitSide(side.modules, side.moduleTypes, { corner: "right" })} className={`rounded-md px-2 py-1 font-black ${corner === "right" ? "bg-brand text-white" : "bg-white ring-1 ring-slate-300 text-slate-600"}`}>오른쪽</button>
            </div>
            <div className="mt-2 space-y-2">
              {side.modules.map((width, index) => (
                <ModuleRow
                  key={index}
                  label={`측면 ${index + 1}`}
                  width={width}
                  type={side.moduleTypes[index] ?? "door"}
                  canRemove
                  onWidth={(mm) => commitSide(side.modules.map((w, j) => (j === index ? clamp(mm, MIN_W, MAX_W) : w)), side.moduleTypes)}
                  onType={(t) => commitSide(side.modules, side.moduleTypes.map((tp, j) => (j === index ? t : tp)))}
                  onRemove={() => commitSide(side.modules.filter((_, j) => j !== index), side.moduleTypes.filter((_, j) => j !== index))}
                />
              ))}
            </div>
          </>
        ) : (
          <button type="button" onClick={() => commitSide([600, 600], ["door", "door"], { corner: "right" })} className="w-full rounded-lg bg-white px-3 py-2.5 text-sm font-black text-brand ring-1 ring-cyan-300">+ 측면 다리 추가 (ㄱ자로 변경)</button>
        )}
      </div>
    </div>
  );
}

type ElevSwing = "pair" | "left" | "right" | "up" | "down" | "up_pair";
const swingShort = (s: ElevSwing) => (s === "left" ? "좌개" : s === "right" ? "우개" : "2짝");

/** 정면도 문 경첩/열림 표시 글리프 (좌개=좌측 경첩, 우개=우측 경첩, 2짝=중앙 ∧) */
function DoorGlyph({ x, y, w, h, swing, color }: { x: number; y: number; w: number; h: number; swing: ElevSwing; color: string }) {
  const m = Math.min(w, h) * 0.16;
  const x1 = x + m;
  const x2 = x + w - m;
  const yT = y + m;
  const yB = y + h - m;
  if (swing === "left") {
    return (<><line x1={x1} y1={yT} x2={x1} y2={yB} stroke={color} strokeWidth={7} /><line x1={x1} y1={yB} x2={x2} y2={yT} stroke={color} strokeWidth={5} /></>);
  }
  if (swing === "right") {
    return (<><line x1={x2} y1={yT} x2={x2} y2={yB} stroke={color} strokeWidth={7} /><line x1={x2} y1={yB} x2={x1} y2={yT} stroke={color} strokeWidth={5} /></>);
  }
  return (<><line x1={x1} y1={yB} x2={(x1 + x2) / 2} y2={yT} stroke={color} strokeWidth={5} /><line x1={x2} y1={yB} x2={(x1 + x2) / 2} y2={yT} stroke={color} strokeWidth={5} /></>);
}

function KitchenElevation({ title, subtitle, baseModules, types, dim, hasWall, swings, wallSwings, onCycleBase, onCycleWall }: { title: string; subtitle: string; baseModules: number[]; types: KitchenModuleType[]; dim: { baseHeightMm: number; wallHeightMm: number }; hasWall: boolean; swings?: ElevSwing[]; wallSwings?: ElevSwing[]; onCycleBase?: (index: number) => void; onCycleWall?: (index: number) => void }) {
  const mainW = sum(baseModules);
  if (mainW <= 0) return null;
  const toeKick = KITCHEN_TOE_KICK_M * 1000;
  const wallBottom = KITCHEN_WALL_BOTTOM_M * 1000;
  const baseH = dim.baseHeightMm;
  const wallH = dim.wallHeightMm;
  const wallTop = wallBottom + wallH;
  const totalH = wallTop + 140;
  const baseRectY = totalH - (toeKick + baseH);
  const wallRectY = totalH - wallTop;
  const padX = 340;
  const padTop = 320;
  const padBottom = 220;
  const vb = `${-padX} ${-padTop} ${mainW + padX * 2} ${totalH + padTop + padBottom}`;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-black text-white">{title}</span>
        <span className="text-xs font-bold text-slate-500">{subtitle}</span>
        {(onCycleBase || onCycleWall) && <span className="text-[11px] font-bold text-cyan-600">· 문을 눌러 1짝/좌·우 전환</span>}
      </div>
      <svg viewBox={vb} className="w-full select-none rounded-xl border border-slate-200 bg-white" style={{ aspectRatio: `${mainW + padX * 2} / ${totalH + padTop + padBottom}` }}>
        <line x1={-120} y1={totalH} x2={mainW + 120} y2={totalH} stroke={INK} strokeWidth={6} />
        {hasWall && (
          <>
            <rect x={0} y={wallRectY} width={mainW} height={wallH} fill={WALL_FILL} stroke={INK} strokeWidth={10} />
            {baseModules.map((width, index) => {
              const x = cum(baseModules, index);
              const sw: ElevSwing = wallSwings?.[index] ?? "pair";
              return (
                <g key={`ew-${index}`} style={{ cursor: onCycleWall ? "pointer" : "default" }} onClick={() => onCycleWall?.(index)}>
                  {index > 0 && <line x1={x} y1={wallRectY} x2={x} y2={wallRectY + wallH} stroke={INK} strokeWidth={5} />}
                  {onCycleWall && <rect x={x} y={wallRectY} width={width} height={wallH} fill="transparent" pointerEvents="all" />}
                  {onCycleWall && <DoorGlyph x={x} y={wallRectY} w={width} h={wallH} swing={sw} color={UPPER} />}
                  <text x={x + width / 2} y={wallRectY + wallH / 2 + 24} textAnchor="middle" fontSize={52} fontWeight={700} fill={UPPER} pointerEvents="none">상부장{onCycleWall ? ` · ${swingShort(sw)}` : ""}</text>
                </g>
              );
            })}
            <text x={mainW + 160} y={wallRectY + wallH / 2} textAnchor="middle" fontSize={56} fontWeight={800} fill="#64748b" transform={`rotate(90 ${mainW + 160} ${wallRectY + wallH / 2})`}>{wallH}</text>
          </>
        )}
        <rect x={0} y={baseRectY} width={mainW} height={baseH} fill={BASE_FILL} stroke={INK} strokeWidth={10} />
        {baseModules.map((width, index) => {
          const x = cum(baseModules, index);
          const t = types[index] ?? "door";
          const isDoor = t === "door" || t === "sink_base";
          const sw: ElevSwing = swings?.[index] ?? "pair";
          const tappable = isDoor && Boolean(onCycleBase);
          return (
            <g key={`eb-${index}`} style={{ cursor: tappable ? "pointer" : "default" }} onClick={() => tappable && onCycleBase?.(index)}>
              {index > 0 && <line x1={x} y1={baseRectY} x2={x} y2={baseRectY + baseH} stroke={INK} strokeWidth={5} />}
              {tappable && <rect x={x} y={baseRectY} width={width} height={baseH} fill="transparent" pointerEvents="all" />}
              {tappable && <DoorGlyph x={x} y={baseRectY} w={width} h={baseH} swing={sw} color={ACCENT} />}
              <text x={x + width / 2} y={baseRectY + baseH / 2 + 24} textAnchor="middle" fontSize={52} fontWeight={700} fill="#64748b" pointerEvents="none">{kitchenModuleTypeLabels[t]}{tappable ? ` · ${swingShort(sw)}` : ""}</text>
              <text x={x + width / 2} y={totalH + 110} textAnchor="middle" fontSize={72} fontWeight={800} fill={INK} pointerEvents="none">{Math.round(width)}</text>
            </g>
          );
        })}
        <text x={mainW + 160} y={baseRectY + baseH / 2} textAnchor="middle" fontSize={56} fontWeight={800} fill="#64748b" transform={`rotate(90 ${mainW + 160} ${baseRectY + baseH / 2})`}>{baseH}</text>
        <line x1={-40} y1={baseRectY} x2={mainW + 40} y2={baseRectY} stroke={ACCENT} strokeWidth={8} />
        <line x1={0} y1={-170} x2={mainW} y2={-170} stroke={ACCENT} strokeWidth={6} />
        <text x={mainW / 2} y={-210} textAnchor="middle" fontSize={80} fontWeight={800} fill={ACCENT}>전체 {mainW}mm</text>
      </svg>
    </div>
  );
}

const DOOR_STYLE_LABEL: Record<string, string> = { flat: "민자(평면)", frame: "프레임", slat: "슬랫" };
const META_FIELD = "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800 outline-none focus:border-brand";

/** 작업지시서 제목칸 — 현장명·주소·날짜·연락처 */
function TitleBlock({ input, onInputChange }: { input: FurnitureInput; onInputChange: (next: FurnitureInput) => void }) {
  const meta = input.work_order_meta ?? {};
  const set = (patch: Partial<NonNullable<FurnitureInput["work_order_meta"]>>) => onInputChange({ ...input, work_order_meta: { ...meta, ...patch } });
  return (
    <div className="rounded-2xl border-2 border-slate-900 bg-white p-4">
      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
        <div className="text-base font-black text-ink">제작 작업지시서</div>
        <div className="text-xs font-black text-slate-400">동방씽크</div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-[11px] font-black text-slate-500">현장명
          <input className={META_FIELD} value={meta.siteName ?? ""} placeholder="예: 서판교 33평" onChange={(e) => set({ siteName: e.target.value })} />
        </label>
        <label className="space-y-1 text-[11px] font-black text-slate-500">주소
          <input className={META_FIELD} value={meta.address ?? ""} placeholder="예: 646-26" onChange={(e) => set({ address: e.target.value })} />
        </label>
        <label className="space-y-1 text-[11px] font-black text-slate-500">날짜
          <input className={META_FIELD} value={meta.date ?? ""} placeholder="예: 2026-06-24" onChange={(e) => set({ date: e.target.value })} />
        </label>
        <label className="space-y-1 text-[11px] font-black text-slate-500">연락처
          <input className={META_FIELD} value={meta.contact ?? ""} placeholder="예: 010-0000-0000" onChange={(e) => set({ contact: e.target.value })} />
        </label>
      </div>
    </div>
  );
}

function SpecCard({ color, title, rows, extra, memo, onMemo }: { color: string; title: string; rows: [string, string][]; extra?: string; memo: string; onMemo: (v: string) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-black" style={{ color }}>{title}</div>
      <dl className="mt-2 space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 text-xs">
            <dt className="font-bold text-slate-500">{k}</dt>
            <dd className="text-right font-black text-ink">{v}</dd>
          </div>
        ))}
        {extra && <div className="pt-1 text-xs font-bold text-slate-600">{extra}</div>}
      </dl>
      <textarea
        className="mt-2 min-h-16 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-800 outline-none focus:border-brand"
        value={memo}
        placeholder="추가 사양 메모 (예: 백색 문짝, 아크릴 손잡이, 크림아트골드 걸레받이)"
        onChange={(e) => onMemo(e.target.value)}
      />
    </div>
  );
}

/** (상)·(하) 사양 메모 — 현재 옵션에서 자동 도출 + 자유 메모 */
function SpecMemo({ input, dim, onInputChange }: { input: FurnitureInput; dim: { baseHeightMm: number; wallHeightMm: number; baseDepthMm: number; wallDepthMm: number }; onInputChange: (next: FurnitureInput) => void }) {
  const meta = input.work_order_meta ?? {};
  const set = (patch: Partial<NonNullable<FurnitureInput["work_order_meta"]>>) => onInputChange({ ...input, work_order_meta: { ...meta, ...patch } });
  const doorLabel = DOOR_STYLE_LABEL[input.door_style ?? "flat"] ?? String(input.door_style ?? "민자");
  const matColor = `${input.material ?? "-"} / ${input.color ?? "-"}`;

  const upperRows: [string, string][] = [
    ["자재/색상", matColor],
    ["문짝", doorLabel],
    ["손잡이", input.handle_type ?? "-"],
    ["상부장 크기", `높이 ${dim.wallHeightMm} · 깊이 ${dim.wallDepthMm}`],
  ];
  const lowerRows: [string, string][] = [
    ["자재/색상", matColor],
    ["상판", getCountertopOption(input.countertop_type).name],
    ["걸레받이", hasToeKickEnabled(input.toe_kick_option) ? "있음 (100)" : "없음"],
    ["손잡이", input.handle_type ?? "-"],
    ["하부장 크기", `높이 ${dim.baseHeightMm} · 깊이 ${dim.baseDepthMm}`],
  ];

  const fixtures: string[] = [];
  if (getSinkOption(input.sink_option).id !== "none") fixtures.push(`싱크 ${getSinkOption(input.sink_option).name}`);
  if (getFaucetOption(input.faucet_option).id !== "none") fixtures.push(`수전 ${getFaucetOption(input.faucet_option).name}`);
  if (getCooktopOption(input.cooktop_option).id !== "none") fixtures.push(`쿡탑 ${getCooktopOption(input.cooktop_option).name}`);
  if (getHoodOption(input.hood_option).id !== "none") fixtures.push(`후드 ${getHoodOption(input.hood_option).name}`);
  if (getMicrowaveOption(input.microwave_option).id !== "none") fixtures.push(`전자레인지 ${getMicrowaveOption(input.microwave_option).name}`);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SpecCard color={UPPER} title="(상) 상부장 사양" rows={upperRows} memo={meta.upperMemo ?? ""} onMemo={(v) => set({ upperMemo: v })} />
      <SpecCard color={INK} title="(하) 하부장 사양" rows={lowerRows} extra={`설비: ${fixtures.length ? fixtures.join(", ") : "없음"}`} memo={meta.lowerMemo ?? ""} onMemo={(v) => set({ lowerMemo: v })} />
    </div>
  );
}
