"use client";

import { useEffect, useState } from "react";
import { kitchenModuleTypeLabels, type KitchenModuleType } from "@/lib/kitchen";
import type { DoorSwing } from "@/components/preview3d/types";

const TYPES: KitchenModuleType[] = ["door", "drawer", "pullout", "open", "sink_base", "cooktop", "gas", "microwave", "oven", "dishwasher"];
const SWINGS: { id: "pair" | "left" | "right"; label: string }[] = [
  { id: "pair", label: "2짝" },
  { id: "left", label: "좌개" },
  { id: "right", label: "우개" },
];

function NumField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (mm: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
    else setDraft(String(value));
  };
  return (
    <label className="flex flex-1 flex-col items-stretch gap-0.5">
      <span className="text-[9px] font-black text-slate-400">{label}</span>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        inputMode="numeric"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-center text-[12px] font-black text-ink outline-none focus:border-brand"
      />
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-black transition ${active ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-black text-slate-400">{label}</div>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

/** 3D에서 칸 선택 시 캔버스 우측 하단에 고정으로 뜨는 편집 패널 (캐비닛을 가리지 않음) */
export function Kitchen3DEditDock({
  visible,
  label,
  part,
  moduleType,
  widthMm,
  heightMm,
  depthMm,
  swing,
  shelfCount,
  drawerCount,
  hasHandle,
  canRemove,
  onWidth,
  onHeight,
  onDepth,
  onType,
  onSwing,
  onHandle,
  onShelf,
  onDrawer,
  onAdd,
  onRemove,
  onClear,
  applyToAll,
  onToggleApplyToAll,
}: {
  visible: boolean;
  label: string;
  part: "base" | "wall";
  moduleType: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  swing: DoorSwing;
  shelfCount: number;
  drawerCount: number;
  hasHandle: boolean;
  canRemove: boolean;
  onWidth: (mm: number) => void;
  onHeight: (mm: number) => void;
  onDepth: (mm: number) => void;
  onType: (t: KitchenModuleType) => void;
  onSwing: (s: DoorSwing) => void;
  onHandle: (has: boolean) => void;
  onShelf: (n: number) => void;
  onDrawer: (n: number) => void;
  onAdd: (side: "left" | "right") => void;
  onRemove: () => void;
  onClear: () => void;
  applyToAll: boolean;
  onToggleApplyToAll: () => void;
}) {
  if (!visible) return null;
  const isDoor = part === "wall" || moduleType === "door" || moduleType === "sink_base";
  const showHandle = part === "wall" || moduleType !== "open";
  const showDrawer = part === "base" && moduleType === "drawer";
  const showShelf = !showDrawer && (part === "wall" || !["drawer", "pullout", "microwave", "oven", "dishwasher"].includes(moduleType));
  const stepCount = showDrawer ? drawerCount : shelfCount;
  const stepMin = showDrawer ? 1 : 0;
  const stepMax = showDrawer ? 3 : 8;
  const applyStep = (n: number) => {
    const c = Math.min(stepMax, Math.max(stepMin, n));
    if (showDrawer) onDrawer(c);
    else onShelf(c);
  };

  return (
    <div className="pointer-events-auto absolute bottom-2 right-2 z-40 flex max-h-[calc(100%-1rem)] w-[228px] flex-col gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white/96 p-3 shadow-card backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-ink">{label}</span>
        <button type="button" onClick={onClear} aria-label="선택 해제" className="grid h-6 w-6 place-items-center rounded-md bg-soft text-sm font-black leading-none text-slate-500 hover:bg-slate-100">×</button>
      </div>

      <button
        type="button"
        onClick={onToggleApplyToAll}
        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-black transition ${applyToAll ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
      >
        <span>전체 적용 ({part === "wall" ? "상부장" : "하부장"} 전체)</span>
        <span className={`grid h-4 w-7 place-items-center rounded-full text-[9px] ${applyToAll ? "bg-white/30" : "bg-white"}`}>{applyToAll ? "ON" : "OFF"}</span>
      </button>
      {applyToAll && <div className="-mt-1 text-[9px] font-bold text-amber-600">아래에서 바꾸면 {part === "wall" ? "상부장" : "하부장"} 전체에 한 번에 적용돼요</div>}

      <div className="flex items-end gap-1.5">
        <NumField label="가로" value={widthMm} min={150} max={1000} onChange={onWidth} />
        <NumField label="높이" value={heightMm} min={300} max={1200} onChange={onHeight} />
        <NumField label="깊이" value={depthMm} min={250} max={800} onChange={onDepth} />
      </div>
      <div className="-mt-1 text-[9px] font-bold text-slate-400">가로=칸별 · 높이/깊이={part === "wall" ? "상부" : "하부"} 전체</div>

      <Row label="종류">
        {TYPES.map((t) => (
          <Chip key={t} active={moduleType === t} onClick={() => onType(t)}>{kitchenModuleTypeLabels[t]}</Chip>
        ))}
      </Row>

      {isDoor && (
        <Row label="문 방향">
          {SWINGS.map((s) => (
            <Chip key={s.id} active={swing === s.id} onClick={() => onSwing(s.id)}>{s.label}</Chip>
          ))}
        </Row>
      )}

      {showHandle && (
        <Row label="손잡이">
          <Chip active={hasHandle} onClick={() => onHandle(true)}>있음</Chip>
          <Chip active={!hasHandle} onClick={() => onHandle(false)}>없음</Chip>
        </Row>
      )}

      {(showShelf || showDrawer) && (
        <Row label={showDrawer ? "서랍 단수" : "선반 단수"}>
          <button type="button" disabled={stepCount <= stepMin} onClick={() => applyStep(stepCount - 1)} className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-base font-black text-slate-600 hover:bg-slate-200 disabled:opacity-30">−</button>
          <span className="w-7 text-center text-sm font-black text-ink">{stepCount}</span>
          <button type="button" disabled={stepCount >= stepMax} onClick={() => applyStep(stepCount + 1)} className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-base font-black text-slate-600 hover:bg-slate-200 disabled:opacity-30">＋</button>
        </Row>
      )}

      <div className="border-t border-slate-100 pt-2">
        <div className="mb-1 text-[10px] font-black text-slate-400">선택 칸 기준 추가</div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onAdd("left")} className="flex-1 rounded-lg bg-brand px-2 py-1.5 text-[11px] font-black text-white hover:bg-brand/90">← 왼쪽 추가</button>
          <button type="button" onClick={() => onAdd("right")} className="flex-1 rounded-lg bg-brand px-2 py-1.5 text-[11px] font-black text-white hover:bg-brand/90">오른쪽 추가 →</button>
          <button type="button" disabled={!canRemove} onClick={onRemove} className="rounded-lg bg-rose-500 px-2 py-1.5 text-[11px] font-black text-white hover:bg-rose-400 disabled:opacity-35">삭제</button>
        </div>
      </div>
    </div>
  );
}
