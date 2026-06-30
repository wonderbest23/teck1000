"use client";

import type { ReactNode } from "react";
import { doorStyleLabels } from "@/components/preview3d/materials";
import { normalizeWardrobeModules, type WardrobeModuleType } from "@/lib/wardrobe";
import type { DoorStyle } from "@/components/preview3d/types";
import type { FurnitureInput } from "@/lib/types";

const handleTypeOptions = ["기본 손잡이", "댐핑", "무손잡이"];
const moduleTypeOrder: WardrobeModuleType[] = ["hang", "hang2", "shelf", "drawer"];
type WardrobeSwing = NonNullable<FurnitureInput["wardrobe_door_swings"]>[number];
const doorSwingOptions: Array<{ id: WardrobeSwing; label: string }> = [
  { id: "pair", label: "양개(좌우)" },
  { id: "left", label: "좌측 경첩" },
  { id: "right", label: "우측 경첩" },
];

function Chip({
  active,
  onClick,
  children,
  disabled,
  tone = "brand",
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  tone?: "brand" | "danger" | "dark";
}) {
  const activeClass = tone === "danger" ? "bg-rose-600 text-white" : tone === "dark" ? "bg-slate-950 text-white" : "bg-brand text-white";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black transition disabled:opacity-40 ${
        active ? activeClass : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 text-[11px] font-black text-slate-500">{title}</div>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </section>
  );
}

/** 붙박이장 모듈(행거/선반/서랍 칸) 추가·삭제·교체 패널 — 주방 세트와 같은 흐름 */
export function WardrobeSelectionPanel({
  editable,
  visible,
  input,
  doorStyle,
  selectedIndex,
  moduleTypeLabels,
  canAdd,
  canRemove,
  selectedSwing,
  onChange,
  onDoorStyleChange,
  onSetModuleType,
  onSetDoorSwing,
  onAddModule,
  onRemoveModule,
  onMoveLeft,
  onMoveRight,
  onClearSelection,
}: {
  editable: boolean;
  visible: boolean;
  input: FurnitureInput;
  doorStyle: DoorStyle;
  selectedIndex: number | null;
  moduleTypeLabels: Record<WardrobeModuleType, string>;
  canAdd: boolean;
  canRemove: boolean;
  selectedSwing: WardrobeSwing;
  onChange: (partial: Partial<FurnitureInput>) => void;
  onDoorStyleChange?: (style: DoorStyle) => void;
  onSetModuleType: (type: WardrobeModuleType) => void;
  onSetDoorSwing: (swing: WardrobeSwing) => void;
  onAddModule: () => void;
  onRemoveModule: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onClearSelection?: () => void;
}) {
  if (!editable || !visible) return null;

  const layout = normalizeWardrobeModules(input.wardrobe_modules_mm, input.wardrobe_module_types, input.width_mm);
  const moduleCount = layout.modules.length;
  const sliding = input.open_type?.includes("슬라이딩") ?? false;
  const hasSelection = selectedIndex !== null && selectedIndex < moduleCount;
  const selectedType = hasSelection ? layout.moduleTypes[selectedIndex] : undefined;

  return (
    <div className="border-t border-slate-200 bg-white px-3 py-3 sm:px-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-500">붙박이장 구성 · 총 {moduleCount}칸 · {layout.width_mm}mm</div>
          <div className="mt-0.5 text-sm font-black text-ink">
            {hasSelection ? `${selectedIndex + 1}번 칸 — ${moduleTypeLabels[selectedType as WardrobeModuleType]}` : "칸을 선택하거나 새 칸을 추가하세요"}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Chip tone="dark" onClick={onAddModule} disabled={!canAdd}>+ 칸 추가</Chip>
          {hasSelection && <Chip onClick={onClearSelection}>선택 해제</Chip>}
        </div>
      </div>

      <div className="space-y-3">
        {!hasSelection && (
          <div className="rounded-xl bg-sky-50 px-3 py-2 text-[11px] font-bold leading-5 text-sky-900">
            3D에서 각 칸을 클릭하면 행거장·선반장·서랍장으로 바꾸거나, 폭·칸수를 조절하고 좌우로 옮길 수 있어요. “+ 칸 추가”로 옆에 칸을 늘릴 수 있습니다.
          </div>
        )}

        {hasSelection && (
          <>
            <Section title="칸 종류">
              {moduleTypeOrder.map((type) => (
                <Chip key={type} active={selectedType === type} onClick={() => onSetModuleType(type)}>
                  {moduleTypeLabels[type]}
                </Chip>
              ))}
            </Section>

            {selectedType !== "drawer" && (
              <Section title="문 열림 방향">
                {doorSwingOptions.map((option) => (
                  <Chip key={option.id} active={selectedSwing === option.id} onClick={() => onSetDoorSwing(option.id)}>
                    {option.label}
                  </Chip>
                ))}
              </Section>
            )}

            <Section title="칸 배치">
              <Chip onClick={onMoveLeft} disabled={selectedIndex === 0}>← 왼쪽으로</Chip>
              <Chip onClick={onMoveRight} disabled={selectedIndex >= moduleCount - 1}>오른쪽으로 →</Chip>
              <Chip tone="danger" onClick={onRemoveModule} disabled={!canRemove}>칸 삭제</Chip>
            </Section>
          </>
        )}

        <Section title="개폐 방식 (전체)">
          {(["여닫이", "슬라이딩"] as const).map((openType) => (
            <Chip
              key={openType}
              active={openType === "슬라이딩" ? sliding : !sliding}
              onClick={() => onChange({ open_type: openType })}
            >
              {openType}
            </Chip>
          ))}
        </Section>

        <Section title="문짝 디자인 (전체)">
          {onDoorStyleChange &&
            (Object.entries(doorStyleLabels) as [DoorStyle, string][]).map(([style, label]) => (
              <Chip key={style} active={doorStyle === style} onClick={() => onDoorStyleChange(style)}>
                {label.replace(" 문짝", "")}
              </Chip>
            ))}
        </Section>

        <Section title="손잡이 (전체)">
          {handleTypeOptions.map((option) => (
            <Chip key={option} active={input.handle_type === option} onClick={() => onChange({ handle_type: option })}>
              {option.replace(" 손잡이", "")}
            </Chip>
          ))}
        </Section>
      </div>
    </div>
  );
}
