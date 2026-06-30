"use client";

import { useEffect, useRef, useState } from "react";

const INK = "#0f172a";
const FILL = "#f1f5f9";

export type StripTypeOption = { value: string; label: string };

function sum(arr: number[]) {
  return arr.reduce((s, v) => s + v, 0);
}
function cum(arr: number[], i: number) {
  return arr.slice(0, i).reduce((s, v) => s + v, 0);
}
function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

type Drag = { divider: number; startX: number; mmPerPx: number; baseA: number; baseB: number; preview: number[] };

/**
 * 한 줄(가로) 모듈을 도면처럼 편집하는 컴포넌트.
 * - 칸 경계 드래그 → 옆 칸이 줄어 총길이 유지(자동 맞춤)
 * - 숫자 더블클릭 → 그 칸만 수정
 * - 아래 카드에서 종류 변경 / 추가 / 삭제
 * 3D 레이캐스트가 아닌 순수 SVG/DOM이라 모바일·데스크톱 모두 안정적.
 */
export function ModuleStripPlan({
  modules,
  types,
  typeOptions,
  typeLabels,
  minWidthMm,
  maxWidthMm,
  depthMm,
  accent,
  canAdd,
  canRemove,
  addLabel = "+ 칸 추가",
  onCommit,
}: {
  modules: number[];
  types: string[];
  typeOptions: StripTypeOption[];
  typeLabels: Record<string, string>;
  minWidthMm: number;
  maxWidthMm: number;
  depthMm: number;
  accent: string;
  canAdd: boolean;
  canRemove: boolean;
  addLabel?: string;
  onCommit: (modules: number[], types: string[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [editing, setEditing] = useState<number | null>(null);

  const view = drag ? drag.preview : modules;
  const totalW = sum(view);

  const padX = 360;
  const padT = 300;
  const padB = 320;
  const vbW = totalW + padX * 2;
  const vbH = depthMm + padT + padB;

  useEffect(() => {
    if (!drag) return;
    function onMove(event: PointerEvent) {
      setDrag((cur) => {
        if (!cur) return cur;
        const deltaMm = (event.clientX - cur.startX) * cur.mmPerPx;
        let a = clamp(cur.baseA + deltaMm, minWidthMm, maxWidthMm);
        let b = cur.baseA + cur.baseB - a;
        if (b < minWidthMm) {
          b = minWidthMm;
          a = cur.baseA + cur.baseB - b;
        }
        const preview = [...cur.preview];
        preview[cur.divider - 1] = a;
        preview[cur.divider] = b;
        return { ...cur, preview };
      });
    }
    function onUp() {
      setDrag((cur) => {
        if (cur) onCommit(cur.preview, types);
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

  function startDrag(divider: number, event: React.PointerEvent) {
    event.stopPropagation();
    event.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDrag({
      divider,
      startX: event.clientX,
      mmPerPx: vbW / rect.width,
      baseA: modules[divider - 1],
      baseB: modules[divider],
      preview: [...modules],
    });
  }

  function editWidth(i: number, mm: number) {
    onCommit(view.map((w, j) => (j === i ? clamp(mm, minWidthMm, maxWidthMm) : w)), types);
    setEditing(null);
  }
  function setType(i: number, value: string) {
    onCommit(modules, types.map((t, j) => (j === i ? value : t)));
  }
  function addModule() {
    const ref = modules[modules.length - 1] ?? 600;
    onCommit([...modules, clamp(ref, minWidthMm, maxWidthMm)], [...types, types[types.length - 1] ?? typeOptions[0]?.value ?? "door"]);
  }
  function removeModule(i: number) {
    if (!canRemove || modules.length <= 1) return;
    onCommit(modules.filter((_, j) => j !== i), types.filter((_, j) => j !== i));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-black text-slate-500">도면 편집 · 총 {totalW}mm · {modules.length}칸</div>
        <div className="text-[11px] font-bold" style={{ color: accent }}>경계 드래그 / 숫자 더블클릭</div>
      </div>

      <svg ref={svgRef} viewBox={`${-padX} ${-padT} ${vbW} ${vbH}`} className="w-full touch-none select-none rounded-2xl border border-slate-200 bg-white" style={{ aspectRatio: `${vbW} / ${vbH}` }}>
        {/* 총길이 치수 */}
        <line x1={0} y1={-150} x2={totalW} y2={-150} stroke={accent} strokeWidth={6} />
        <line x1={0} y1={-180} x2={0} y2={-120} stroke={accent} strokeWidth={6} />
        <line x1={totalW} y1={-180} x2={totalW} y2={-120} stroke={accent} strokeWidth={6} />
        <text x={totalW / 2} y={-190} textAnchor="middle" fontSize={86} fontWeight={800} fill={accent}>총 {totalW}mm</text>

        <rect x={0} y={0} width={totalW} height={depthMm} fill={FILL} stroke={INK} strokeWidth={9} />
        {view.map((w, i) => {
          const x = cum(view, i);
          const cx = x + w / 2;
          return (
            <g key={`m-${i}`}>
              {i > 0 && <line x1={x} y1={0} x2={x} y2={depthMm} stroke={INK} strokeWidth={5} />}
              <text x={cx} y={depthMm / 2 + 64} textAnchor="middle" fontSize={48} fontWeight={700} fill="#64748b">{typeLabels[types[i]] ?? "칸"}</text>
              {editing === i ? (
                <foreignObject x={cx - 140} y={depthMm / 2 - 70} width={280} height={130}>
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <input
                      autoFocus
                      type="number"
                      defaultValue={Math.round(w)}
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => editWidth(i, Number(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") editWidth(i, Number((e.target as HTMLInputElement).value));
                        if (e.key === "Escape") setEditing(null);
                      }}
                      style={{ width: "92%", height: "78%", textAlign: "center", fontSize: 64, fontWeight: 800, color: INK, border: `4px solid ${accent}`, borderRadius: 14, outline: "none" }}
                    />
                  </div>
                </foreignObject>
              ) : (
                <text x={cx} y={depthMm / 2 + 6} textAnchor="middle" fontSize={72} fontWeight={800} fill={INK} pointerEvents="all" style={{ cursor: "pointer" }} onDoubleClick={() => setEditing(i)}>
                  {Math.round(w)}
                </text>
              )}
            </g>
          );
        })}
        {view.map((_w, i) =>
          i === 0 ? null : (
            <g key={`h-${i}`} style={{ cursor: "ew-resize" }} onPointerDown={(e) => startDrag(i, e)}>
              <rect x={cum(view, i) - 36} y={0} width={72} height={depthMm} fill="transparent" pointerEvents="all" />
              <rect x={cum(view, i) - 9} y={depthMm / 2 - 70} width={18} height={140} rx={9} fill={accent} opacity={0.9} pointerEvents="all" />
            </g>
          ),
        )}
      </svg>

      {/* 칸별 종류 / 추가·삭제 */}
      <div className="space-y-2">
        {modules.map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-xs font-black text-slate-500">{i + 1}번</span>
            <span className="w-16 shrink-0 text-xs font-bold text-slate-400">{Math.round(w)}mm</span>
            <select
              value={typeOptions.some((t) => t.value === types[i]) ? types[i] : typeOptions[0]?.value}
              onChange={(e) => setType(i, e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-brand"
            >
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeModule(i)}
              disabled={!canRemove || modules.length <= 1}
              className="ml-auto rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-black text-rose-600 disabled:opacity-40"
            >
              삭제
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addModule}
          disabled={!canAdd}
          className="w-full rounded-lg bg-brand px-3 py-2.5 text-sm font-black text-white disabled:opacity-40"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
