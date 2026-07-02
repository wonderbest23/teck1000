"use client";

import type { ReactNode } from "react";
import { doorStyleLabels } from "@/components/preview3d/materials";
import { getDoorCountOptions, productRules } from "@/lib/rules";
import type { DoorStyle } from "@/components/preview3d/types";
import type { FurnitureInput } from "@/lib/types";

const handleTypeOptions = ["기본 손잡이", "댐핑", "무손잡이"];
const doorSwingOptions: Array<{ id: NonNullable<FurnitureInput["door_swing"]>; label: string }> = [
  { id: "pair", label: "양개(좌우)" },
  { id: "left", label: "좌측 경첩" },
  { id: "right", label: "우측 경첩" },
];

function Chip({
  active,
  onClick,
  children,
  disabled,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black transition disabled:opacity-40 ${
        active ? "bg-brand text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
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
      <div className="flex flex-wrap gap-1">{children}</div>
    </section>
  );
}

/**
 * 비주방 가구를 3D에서 선택했을 때 아래에 뜨는 옵션 패널.
 * 주방의 KitchenSelectionPanel과 동일한 흐름(선택 → 옵션 편집)을 비주방 제품에 맞춰 제공한다.
 */
export function StorageSelectionPanel({
  editable,
  visible,
  input,
  doorStyle,
  onChange,
  onDoorStyleChange,
  onClearSelection,
}: {
  editable: boolean;
  visible: boolean;
  input: FurnitureInput;
  doorStyle: DoorStyle;
  onChange: (partial: Partial<FurnitureInput>) => void;
  onDoorStyleChange?: (style: DoorStyle) => void;
  onClearSelection?: () => void;
}) {
  if (!editable || !visible) return null;

  const rules = productRules[input.productType];
  const doorOptions = getDoorCountOptions(input.productType, input.width_mm, true);
  const isWardrobe = input.productType === "built_in_wardrobe";
  const isShoe = input.productType === "shoe_cabinet";
  const hasDoor = input.has_door;
  const bottomSpace = input.bottom_space ?? 0;

  return (
    <div className="border-t border-slate-200 bg-white px-3 py-3 sm:px-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-500">선택한 항목</div>
          <div className="mt-0.5 text-sm font-black text-ink">{rules.label}</div>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
        >
          선택 해제
        </button>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl bg-sky-50 px-3 py-2 text-[11px] font-bold leading-5 text-sky-900">
          3D에서 가구를 클릭하면 치수(가로·높이·깊이)와 선반 칸수를 바로 조절할 수 있어요. 아래에서 문/손잡이 등 옵션을 고르세요.
        </div>

        <Section title="문짝 디자인">
          {onDoorStyleChange &&
            (Object.entries(doorStyleLabels) as [DoorStyle, string][]).map(([style, label]) => (
              <Chip key={style} active={doorStyle === style} onClick={() => onDoorStyleChange(style)}>
                {label.replace(" 문짝", "")}
              </Chip>
            ))}
        </Section>

        {(rules.allowsDoorless || doorOptions.length > 0) && (
          <Section title="문 구성">
            {rules.allowsDoorless && (
              <Chip active={!hasDoor} onClick={() => onChange({ has_door: false, door_count: 0 })}>
                문 없음
              </Chip>
            )}
            {doorOptions.map((count) => (
              <Chip
                key={count}
                active={hasDoor && input.door_count === count}
                onClick={() => onChange({ has_door: true, door_count: count })}
              >
                문 {count}개
              </Chip>
            ))}
          </Section>
        )}

        {isWardrobe && (
          <Section title="개폐 방식">
            {(() => {
              const sliding = input.open_type?.includes("슬라이딩") ?? false;
              return (["여닫이", "슬라이딩"] as const).map((openType) => (
                <Chip
                  key={openType}
                  active={openType === "슬라이딩" ? sliding : !sliding}
                  onClick={() => onChange({ open_type: openType })}
                >
                  {openType}
                </Chip>
              ));
            })()}
          </Section>
        )}

        {(input.open_type?.includes("슬라이딩") ?? false) && (
          <Section title="슬라이딩 열림 방향">
            {(["left", "right"] as const).map((direction) => (
              <Chip
                key={direction}
                active={(input.door_swing ?? "right") === direction}
                onClick={() => onChange({ door_swing: direction })}
              >
                {direction === "left" ? "좌측 열림" : "우측 열림"}
              </Chip>
            ))}
          </Section>
        )}

        {isShoe && (
          <Section title="신발장 옵션">
            <Chip active={Boolean(input.shoe_shelf_angle)} onClick={() => onChange({ shoe_shelf_angle: !input.shoe_shelf_angle })}>
              경사선반
            </Chip>
            <Chip disabled={bottomSpace <= 0} onClick={() => onChange({ bottom_space: Math.max(0, bottomSpace - 20) })}>
              하부 띄움 −
            </Chip>
            <span className="px-1 text-[11px] font-bold text-slate-500">{bottomSpace}mm</span>
            <Chip disabled={bottomSpace >= 200} onClick={() => onChange({ bottom_space: Math.min(200, bottomSpace + 20) })}>
              하부 띄움 +
            </Chip>
          </Section>
        )}

        {hasDoor && (
          <Section title="문 열림 방향">
            {doorSwingOptions.map((option) => (
              <Chip
                key={option.id}
                active={(input.door_swing ?? "pair") === option.id}
                onClick={() => onChange({ door_swing: option.id })}
              >
                {option.label}
              </Chip>
            ))}
          </Section>
        )}

        {hasDoor && (
          <Section title="손잡이">
            {handleTypeOptions.map((option) => (
              <Chip key={option} active={input.handle_type === option} onClick={() => onChange({ handle_type: option })}>
                {option.replace(" 손잡이", "")}
              </Chip>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}
