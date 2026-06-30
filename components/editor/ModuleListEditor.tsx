"use client";

import { useState } from "react";
import {
  KITCHEN_DIMENSION_LIMITS,
  getKitchenSetDimensions,
  getKitchenTemplate,
  kitchenModuleTypeLabels,
  normalizeKitchenLayerWidths,
  normalizeKitchenModules,
  snapKitchenDimensionMm,
  type KitchenModuleType,
} from "@/lib/kitchen";
import { KITCHEN_STANDARDS, snapKitchenModuleWidthMm } from "@/lib/platformConfig";
import {
  getWardrobeDrawerCountLimits,
  normalizeWardrobeModules,
  wardrobeModuleTypeLabels,
  type WardrobeModuleType,
} from "@/lib/wardrobe";
import type { FurnitureInput } from "@/lib/types";

const KITCHEN_TYPES: KitchenModuleType[] = ["door", "drawer", "pullout", "open", "sink_base", "cooktop", "gas", "microwave", "oven", "dishwasher"];
const WARDROBE_TYPES: WardrobeModuleType[] = ["hang", "hang2", "shelf", "drawer"];
const KIT_SWING: { id: "pair" | "left" | "right"; label: string }[] = [
  { id: "pair", label: "2짝(양개)" },
  { id: "left", label: "1짝(좌)" },
  { id: "right", label: "1짝(우)" },
];
const WAR_SWING: { id: "pair" | "left" | "right"; label: string }[] = [
  { id: "pair", label: "양개" },
  { id: "left", label: "좌경첩" },
  { id: "right", label: "우경첩" },
];

function fill<T>(arr: T[] | undefined, n: number, def: T): T[] {
  return Array.from({ length: n }, (_, i) => arr?.[i] ?? def);
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black transition ${active ? "bg-brand text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-black text-slate-500">{label}</div>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

/** −/＋ 와 직접입력이 가능한 mm 스테퍼 (범위·스냅 적용) */
function Stepper({ value, min, max, step, onChange, suffix = "mm" }: { value: number; min: number; max: number; step: number; onChange: (mm: number) => void; suffix?: string }) {
  const clamp = (mm: number) => snapKitchenDimensionMm(mm, min, max, step);
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onChange(clamp(value - step))} className="grid h-7 w-7 place-items-center rounded-lg bg-white text-base font-black text-slate-600 ring-1 ring-slate-200">−</button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        inputMode="numeric"
        onChange={(event) => onChange(clamp(Number(event.target.value)))}
        className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-xs font-black text-ink outline-none focus:border-brand"
      />
      <button type="button" onClick={() => onChange(clamp(value + step))} className="grid h-7 w-7 place-items-center rounded-lg bg-white text-base font-black text-slate-600 ring-1 ring-slate-200">＋</button>
      <span className="text-[10px] font-bold text-slate-400">{suffix}</span>
    </div>
  );
}

/** 칸 번호 선택 줄 — 누른 칸만 아래에 상세가 뜬다. */
function ModuleTabs({ count, selected, labelOf, onSelect }: { count: number; selected: number; labelOf: (i: number) => string; onSelect: (i: number) => void }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className={`flex shrink-0 flex-col items-center rounded-xl border px-3 py-1.5 transition ${
            selected === i ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          <span className="text-sm font-black leading-none">{i + 1}</span>
          <span className="mt-0.5 text-[10px] font-bold leading-none">{labelOf(i)}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * 좌측 바 "칸 편집" 패널 — 칸 번호를 누르면 그 칸만 상세가 떠서 종류·문 방향·서랍 단수를 조정.
 */
export function ModuleListEditor({
  input,
  onChange,
  selectedIndex,
  onSelectIndex,
}: {
  input: FurnitureInput;
  onChange: (partial: Partial<FurnitureInput>) => void;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
}) {
  const [localSel, setLocalSel] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const sel = selectedIndex ?? localSel; // 3D 선택과 동기화 (controlled) 또는 자체 상태
  const setSel = (index: number) => {
    setLocalSel(index);
    onSelectIndex?.(index);
  };

  if (input.productType === "kitchen_full_set") {
    const layout = normalizeKitchenModules(getKitchenTemplate(input.kitchen_template), input.kitchen_modules_mm, input.kitchen_module_types);
    const widths = normalizeKitchenLayerWidths(layout.modules, input.kitchen_base_modules_mm);
    const n = layout.modules.length;
    const i = Math.min(Math.max(sel, 0), n - 1);
    const types = fill(layout.moduleTypes, n, "door" as KitchenModuleType);
    const swings = fill(input.kitchen_door_swings, n, "pair");
    // 상부 문방향: 미설정 칸은 하부를 따름(표시), 편집 시 독립 배열로 굳음
    const wallSwings = Array.from({ length: n }, (_, k) => input.kitchen_wall_door_swings?.[k] ?? swings[k]);
    const drawers = fill(input.kitchen_drawer_counts, n, 3);
    const type = types[i];
    const isDoor = type === "door" || type === "sink_base";
    const baseShelves = fill(input.kitchen_base_shelf_counts, n, 1);
    const wallShelves = fill(input.kitchen_wall_shelf_counts, n, 1);
    const baseHidden = input.kitchen_base_hidden_indices ?? [];
    const wallHidden = input.kitchen_wall_hidden_indices ?? [];
    const noHandle = input.kitchen_no_handle_indices ?? [];
    const noHandleWall = input.kitchen_wall_no_handle_indices ?? [];
    const dim = getKitchenSetDimensions(input, getKitchenTemplate(input.kitchen_template));
    const lim = KITCHEN_DIMENSION_LIMITS;

    // 칸 폭 변경 — base==wall==main 동기(현 withModules 의미 유지)
    const setWidth = (mm: number) => {
      const next = widths.map((v, j) => (j === i ? snapKitchenModuleWidthMm(mm) : v));
      onChange({ kitchen_modules_mm: next, kitchen_base_modules_mm: next, kitchen_wall_modules_mm: next });
    };
    const toggleHidden = (layer: "base" | "wall") => {
      const cur = layer === "base" ? baseHidden : wallHidden;
      const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
      onChange(layer === "base" ? { kitchen_base_hidden_indices: next } : { kitchen_wall_hidden_indices: next });
    };

    return (
      <div className="space-y-3">
        <p className="rounded-xl bg-sky-50 px-3 py-2 text-[11px] font-bold leading-5 text-sky-900">
          칸을 누르면(도면·3D·여기 연동) 그 칸의 가로·종류·문 방향·서랍/선반 단수·숨김을 바꿀 수 있어요.
        </p>
        <ModuleTabs count={n} selected={i} labelOf={(idx) => kitchenModuleTypeLabels[types[idx]]} onSelect={setSel} />
        <div className="rounded-xl bg-soft p-3">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-black text-ink">{i + 1}번 칸</div>
            <div className="text-[11px] font-bold text-slate-400">{widths[i] ?? layout.modules[i]}mm</div>
          </div>
          <div className="mt-2 space-y-2.5">
            {/* 자주 쓰는 것 — 항상 보임 */}
            <Field label="가로(폭)">
              <Stepper value={widths[i] ?? layout.modules[i]} min={KITCHEN_STANDARDS.moduleWidthMinMm} max={KITCHEN_STANDARDS.moduleWidthMaxMm} step={10} onChange={setWidth} />
            </Field>
            <Field label="종류">
              {KITCHEN_TYPES.map((t) => (
                <Chip key={t} active={type === t} onClick={() => onChange({ kitchen_module_types: types.map((v, j) => (j === i ? t : v)) })}>
                  {kitchenModuleTypeLabels[t]}
                </Chip>
              ))}
            </Field>
            {isDoor && (
              <Field label="문 방향 (하부)">
                {KIT_SWING.map((s) => (
                  <Chip key={s.id} active={swings[i] === s.id} onClick={() => onChange({ kitchen_door_swings: swings.map((v, j) => (j === i ? s.id : v)) })}>
                    {s.label}
                  </Chip>
                ))}
              </Field>
            )}
            {type === "drawer" && (
              <Field label="서랍 단수">
                {[1, 2, 3].map((c) => (
                  <Chip key={c} active={(drawers[i] ?? 3) === c} onClick={() => onChange({ kitchen_drawer_counts: drawers.map((v, j) => (j === i ? c : v)) })}>
                    {c}단
                  </Chip>
                ))}
              </Field>
            )}

            {/* 고급 — 접힘 (덜 쓰는 것) */}
            <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="mt-1 flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-[11px] font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
              <span>고급 (상부 문·선반·손잡이·숨김·치수)</span>
              <span>{showAdvanced ? "▴" : "▾"}</span>
            </button>
            {showAdvanced && (
              <div className="space-y-2.5 border-t border-slate-200 pt-2.5">
                <Field label="표준폭 빠른선택">
                  {KITCHEN_STANDARDS.moduleWidthPresetsMm.map((p) => (
                    <Chip key={p} active={(widths[i] ?? layout.modules[i]) === p} onClick={() => setWidth(p)}>
                      {p}
                    </Chip>
                  ))}
                </Field>
                <Field label="문 방향 (상부)">
                  {KIT_SWING.map((s) => (
                    <Chip key={s.id} active={wallSwings[i] === s.id} onClick={() => onChange({ kitchen_wall_door_swings: wallSwings.map((v, j) => (j === i ? s.id : v)) })}>
                      {s.label}
                    </Chip>
                  ))}
                </Field>
                <Field label="하부 선반">
                  {[0, 1, 2, 3, 4, 5, 6].map((c) => (
                    <Chip key={c} active={(baseShelves[i] ?? 1) === c} onClick={() => onChange({ kitchen_base_shelf_counts: baseShelves.map((v, j) => (j === i ? c : v)) })}>
                      {c}
                    </Chip>
                  ))}
                </Field>
                <Field label="상부 선반">
                  {[0, 1, 2, 3, 4, 5, 6].map((c) => (
                    <Chip key={c} active={(wallShelves[i] ?? 1) === c} onClick={() => onChange({ kitchen_wall_shelf_counts: wallShelves.map((v, j) => (j === i ? c : v)) })}>
                      {c}
                    </Chip>
                  ))}
                </Field>
                <Field label="하부 손잡이">
                  <Chip active={!noHandle.includes(i)} onClick={() => onChange({ kitchen_no_handle_indices: noHandle.filter((x) => x !== i) })}>있음</Chip>
                  <Chip active={noHandle.includes(i)} onClick={() => onChange({ kitchen_no_handle_indices: noHandle.includes(i) ? noHandle : [...noHandle, i] })}>없음</Chip>
                </Field>
                <Field label="상부 손잡이">
                  <Chip active={!noHandleWall.includes(i)} onClick={() => onChange({ kitchen_wall_no_handle_indices: noHandleWall.filter((x) => x !== i) })}>있음</Chip>
                  <Chip active={noHandleWall.includes(i)} onClick={() => onChange({ kitchen_wall_no_handle_indices: noHandleWall.includes(i) ? noHandleWall : [...noHandleWall, i] })}>없음</Chip>
                </Field>
                <Field label="칸 숨김">
                  <Chip active={baseHidden.includes(i)} onClick={() => toggleHidden("base")}>하부 숨김</Chip>
                  <Chip active={wallHidden.includes(i)} onClick={() => toggleHidden("wall")}>상부 숨김</Chip>
                </Field>
                <div className="border-t border-slate-200 pt-2 text-[11px] font-black text-slate-500">전체 치수 (런 전체 적용)</div>
                <Field label="하부 높이">
                  <Stepper value={dim.baseHeightMm} min={lim.baseHeight.min} max={lim.baseHeight.max} step={lim.baseHeight.step} onChange={(mm) => onChange({ kitchen_base_height_mm: mm, height_mm: mm })} />
                </Field>
                <Field label="하부 깊이">
                  <Stepper value={dim.baseDepthMm} min={lim.baseDepth.min} max={lim.baseDepth.max} step={lim.baseDepth.step} onChange={(mm) => onChange({ kitchen_base_depth_mm: mm, depth_mm: mm })} />
                </Field>
                <Field label="상부 높이">
                  <Stepper value={dim.wallHeightMm} min={lim.wallHeight.min} max={lim.wallHeight.max} step={lim.wallHeight.step} onChange={(mm) => onChange({ kitchen_wall_height_mm: mm })} />
                </Field>
                <Field label="상부 깊이">
                  <Stepper value={dim.wallDepthMm} min={lim.wallDepth.min} max={lim.wallDepth.max} step={lim.wallDepth.step} onChange={(mm) => onChange({ kitchen_wall_depth_mm: mm })} />
                </Field>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (input.productType === "built_in_wardrobe") {
    const layout = normalizeWardrobeModules(input.wardrobe_modules_mm, input.wardrobe_module_types, input.width_mm);
    const n = layout.modules.length;
    const i = Math.min(Math.max(sel, 0), n - 1);
    const types = fill(layout.moduleTypes, n, "hang" as WardrobeModuleType);
    const swings = fill(input.wardrobe_door_swings, n, "pair");
    const drawerLimits = getWardrobeDrawerCountLimits(input.height_mm);
    const drawers = fill(input.wardrobe_drawer_counts, n, Math.min(4, drawerLimits.max));
    const shelves = fill(input.wardrobe_shelf_counts, n, 4);
    const drawerOptions = Array.from({ length: drawerLimits.max - drawerLimits.min + 1 }, (_, k) => drawerLimits.min + k);
    const type = types[i];

    return (
      <div className="space-y-3">
        <p className="rounded-xl bg-sky-50 px-3 py-2 text-[11px] font-bold leading-5 text-sky-900">
          편집할 칸을 누른 뒤 종류·문 방향·서랍/선반 단수를 바꾸세요. (서랍은 하부 구역 기준 최대 {drawerLimits.max}단)
        </p>
        <ModuleTabs count={n} selected={i} labelOf={(idx) => wardrobeModuleTypeLabels[types[idx]]} onSelect={setSel} />
        <div className="rounded-xl bg-soft p-3">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-black text-ink">{i + 1}번 칸</div>
            <div className="text-[11px] font-bold text-slate-400">{layout.modules[i]}mm</div>
          </div>
          <div className="mt-2 space-y-2">
            <Field label="종류">
              {WARDROBE_TYPES.map((t) => (
                <Chip key={t} active={type === t} onClick={() => onChange({ wardrobe_module_types: types.map((v, j) => (j === i ? t : v)) })}>
                  {wardrobeModuleTypeLabels[t]}
                </Chip>
              ))}
            </Field>
            {type !== "drawer" && (
              <Field label="문 방향">
                {WAR_SWING.map((s) => (
                  <Chip key={s.id} active={swings[i] === s.id} onClick={() => onChange({ wardrobe_door_swings: swings.map((v, j) => (j === i ? s.id : v)) })}>
                    {s.label}
                  </Chip>
                ))}
              </Field>
            )}
            {type === "drawer" && (
              <Field label="서랍 단수">
                {drawerOptions.map((c) => (
                  <Chip key={c} active={(drawers[i] ?? drawerLimits.min) === c} onClick={() => onChange({ wardrobe_drawer_counts: drawers.map((v, j) => (j === i ? c : v)) })}>
                    {c}단
                  </Chip>
                ))}
              </Field>
            )}
            {type === "shelf" && (
              <Field label="선반 단수">
                {[3, 4, 5, 6].map((c) => (
                  <Chip key={c} active={(shelves[i] ?? 4) === c} onClick={() => onChange({ wardrobe_shelf_counts: shelves.map((v, j) => (j === i ? c : v)) })}>
                    {c}단
                  </Chip>
                ))}
              </Field>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
