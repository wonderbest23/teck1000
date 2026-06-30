"use client";

import { useState, type ReactNode } from "react";
import { ORDER_VERDICT_LABELS, PRODUCT_REQUIREMENTS, type OrderValidationResult, type OrderVerdict } from "@/lib/order-validation";
import { fieldLabel } from "@/lib/order-validation/messages";
import { cooktopOptions, countertopOptions, faucetOptions, hoodOptions, microwaveOptions, sinkOptions, toeKickOptions } from "@/lib/kitchen";
import type { FurnitureInput } from "@/lib/types";

const VERDICT_STYLE: Record<OrderVerdict, string> = {
  ready: "bg-emerald-50 text-emerald-800 border-emerald-200",
  needs_review: "bg-amber-50 text-amber-900 border-amber-200",
  inquiry_required: "bg-violet-50 text-violet-800 border-violet-200",
  blocked: "bg-rose-50 text-rose-800 border-rose-200",
};

// 값 선택만으로 해소되는 검수/경고 이슈 → 해당 필드를 즉시 입력 컨트롤로 노출
const RESOLVABLE_ISSUE_FIELDS: Record<string, string[]> = {
  MISSING_BASE_SUPPORT: ["toe_kick_option", "leg_option"],
};

// 카탈로그 옵션으로 바로 고를 수 있는 필드
const CATALOG_SELECTS: Record<string, Array<{ id: string; name: string }>> = {
  countertop_type: countertopOptions,
  toe_kick_option: toeKickOptions,
  sink_option: sinkOptions,
  faucet_option: faucetOptions,
  cooktop_option: cooktopOptions,
  hood_option: hoodOptions,
  microwave_option: microwaveOptions,
};

export function PreOrderCheckPanel({
  input,
  validation,
  checklistState,
  onChecklistChange,
  onInputChange,
}: {
  input: FurnitureInput;
  validation: OrderValidationResult;
  checklistState: Record<string, boolean>;
  onChecklistChange: (id: string, checked: boolean) => void;
  onInputChange: (partial: Partial<FurnitureInput>) => void;
}) {
  const blockingIssues = validation.issues.filter((issue) => issue.blocksOrder);
  const reviewIssues = validation.issues.filter((issue) => !issue.blocksOrder && issue.level !== "info");
  // site_photos는 별도 업로더, 나머지 누락 항목은 여기서 바로 입력
  const actionableMissing = validation.missingFields.filter((field) => field !== "site_photos");
  // 값 선택만으로 풀리는 검수 이슈(예: 걸레받이/지지구조)의 필드도 컨트롤로 노출
  const resolvableIssueCodes = new Set(validation.issues.map((issue) => issue.code).filter((code) => code in RESOLVABLE_ISSUE_FIELDS));
  const resolvableFields = [...resolvableIssueCodes].flatMap((code) => RESOLVABLE_ISSUE_FIELDS[code]);
  const actionableFields = Array.from(new Set([...actionableMissing, ...resolvableFields]));
  const requirement = PRODUCT_REQUIREMENTS[input.productType];
  const isWardrobe = input.productType === "built_in_wardrobe";
  const isKitchen = input.productType === "kitchen_full_set" || input.productType === "kitchen_base_cabinet";

  return (
    <section id="pre-order-check" className="scroll-mt-24 space-y-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-black text-ink">주문 가능 여부</div>
        <span className={`rounded-md border px-2 py-0.5 text-[11px] font-black ${VERDICT_STYLE[validation.verdict]}`}>
          {ORDER_VERDICT_LABELS[validation.verdict]}
        </span>
      </div>

      {actionableFields.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
          <div className="mb-2 text-xs font-black leading-snug text-rose-700">⚠ 아래를 입력·선택하면 경고가 해소됩니다</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {actionableFields.map((field) => (
              <QuickFixField key={field} field={field} input={input} onInputChange={onInputChange} />
            ))}
          </div>
        </div>
      )}

      {blockingIssues.filter((issue) => !issue.field || !actionableFields.includes(issue.field)).length > 0 && (
        <ul className="space-y-1.5">
          {blockingIssues
            .filter((issue) => !issue.field || !actionableFields.includes(issue.field))
            .map((issue) => (
              <li key={issue.code} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold leading-snug text-rose-700">
                {issue.message}
              </li>
            ))}
        </ul>
      )}

      {(isWardrobe || isKitchen) && (
        <MeasurementSection input={input} isWardrobe={isWardrobe} onInputChange={onInputChange} />
      )}

      {requirement.requiresSitePhotos && (
        <SitePhotoUploader photos={input.site_photos ?? []} onChange={(photos) => onInputChange({ site_photos: photos })} />
      )}

      {reviewIssues.filter((issue) => !resolvableIssueCodes.has(issue.code)).length > 0 && (
        <ul className="space-y-1.5">
          {reviewIssues
            .filter((issue) => !resolvableIssueCodes.has(issue.code))
            .map((issue) => (
              <li key={issue.code} className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold leading-snug text-amber-900">
                {issue.message}
              </li>
            ))}
        </ul>
      )}

      <div className="border-t border-slate-100 pt-3">
        <div className="mb-2 text-xs font-black text-slate-500">주문 전 확인사항</div>
        <ul className="space-y-2">
          {validation.checklist.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-2 text-xs font-semibold leading-snug text-slate-600">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                  checked={Boolean(checklistState[item.id])}
                  onChange={(event) => onChecklistChange(item.id, event.target.checked)}
                />
                <span>
                  {item.label}
                  {item.required && <span className="ml-0.5 text-rose-500">*</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const NUMERIC_QUICKFIX = new Set([
  "drain_position_x_mm",
  "hood_position_x_mm",
  "water_position_x_mm",
  "gas_position_x_mm",
  "total_wall_length_mm",
  "width_mm",
  "height_mm",
  "depth_mm",
  "door_count",
  "shelf_count",
]);

function QuickFixField({
  field,
  input,
  onInputChange,
}: {
  field: string;
  input: FurnitureInput;
  onInputChange: (partial: Partial<FurnitureInput>) => void;
}) {
  // 카탈로그 옵션이 있는 필드는 셀렉트로 바로 적용
  const catalog = CATALOG_SELECTS[field];
  if (catalog) {
    const current = String((input as Record<string, unknown>)[field] ?? "none");
    return (
      <Field label={fieldLabel(field)}>
        <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-700" value={current} onChange={(event) => onInputChange({ [field]: event.target.value } as Partial<FurnitureInput>)}>
          {catalog.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  if (field === "energy_type") {
    return (
      <Field label={fieldLabel(field)}>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-700"
          value={input.energy_type ?? ""}
          onChange={(event) => onInputChange({ energy_type: (event.target.value || undefined) as FurnitureInput["energy_type"] })}
        >
          <option value="">선택</option>
          <option value="gas">가스</option>
          <option value="induction">인덕션</option>
          <option value="hybrid">하이브리드</option>
        </select>
      </Field>
    );
  }

  if (field === "leg_option") {
    return (
      <Field label={fieldLabel(field)}>
        <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-700" value={input.leg_option ?? ""} onChange={(event) => onInputChange({ leg_option: event.target.value || undefined })}>
          <option value="">선택</option>
          <option value="standard_legs">조절 다리</option>
          <option value="hidden_legs">숨김 다리</option>
        </select>
      </Field>
    );
  }

  const numeric = NUMERIC_QUICKFIX.has(field);
  const value = (input as Record<string, unknown>)[field];
  return (
    <Field label={fieldLabel(field)}>
      <input
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-700"
        type={numeric ? "number" : "text"}
        value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
        placeholder={numeric ? "mm" : "입력"}
        onChange={(event) => {
          const raw = event.target.value;
          onInputChange({ [field]: numeric ? Number(raw) : raw } as Partial<FurnitureInput>);
        }}
      />
    </Field>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1 text-xs font-bold text-slate-600">
      {label}
      {children}
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <input
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-700"
        type="number"
        value={typeof value === "number" ? String(value) : ""}
        placeholder={placeholder ?? "mm"}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === "" ? undefined : Number(raw));
        }}
      />
    </Field>
  );
}

function MeasurementSection({
  input,
  isWardrobe,
  onInputChange,
}: {
  input: FurnitureInput;
  isWardrobe: boolean;
  onInputChange: (partial: Partial<FurnitureInput>) => void;
}) {
  return (
    <div className="rounded-xl bg-soft p-3">
      <div className="mb-2 text-xs font-black leading-snug text-slate-500">현장 실측 {isWardrobe ? "(좁은 쪽 기준 제작)" : "(설치 벽/설비 위치)"}</div>
      {isWardrobe ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberInput label="좌측 벽 높이" value={input.room_height_left_mm} onChange={(v) => onInputChange({ room_height_left_mm: v })} />
          <NumberInput label="우측 벽 높이" value={input.room_height_right_mm} onChange={(v) => onInputChange({ room_height_right_mm: v })} />
          <NumberInput label="상단 폭" value={input.room_width_top_mm} onChange={(v) => onInputChange({ room_width_top_mm: v })} />
          <NumberInput label="하단 폭" value={input.room_width_bottom_mm} onChange={(v) => onInputChange({ room_width_bottom_mm: v })} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberInput label="설치 벽 전체 길이" value={input.total_wall_length_mm} onChange={(v) => onInputChange({ total_wall_length_mm: v })} />
          <NumberInput label="수전 위치(좌측벽 기준)" value={input.water_position_x_mm} onChange={(v) => onInputChange({ water_position_x_mm: v })} />
          {input.cooktop_option && input.cooktop_option !== "none" && (
            <NumberInput label="가스/콘센트 위치" value={input.gas_position_x_mm} onChange={(v) => onInputChange({ gas_position_x_mm: v })} />
          )}
        </div>
      )}
    </div>
  );
}

function SitePhotoUploader({ photos, onChange }: { photos: string[]; onChange: (photos: string[]) => void }) {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const names: string[] = [];
    const nextPreviews: Record<string, string> = {};
    Array.from(files).forEach((file, index) => {
      const key = `${file.name}-${index}`;
      names.push(key);
      try {
        nextPreviews[key] = URL.createObjectURL(file);
      } catch {
        // 미리보기 실패 무시
      }
    });
    setPreviews((current) => ({ ...current, ...nextPreviews }));
    onChange([...photos, ...names]);
  }

  function removeAt(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <div className="text-[10px] font-black leading-snug text-violet-800">현장 사진 (선택 · 제작 확정 전 필수)</div>
        <span className="shrink-0 text-[10px] font-bold text-violet-500">{photos.length}장</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {photos.map((photo, index) => (
          <div key={photo} className="relative h-11 w-11 overflow-hidden rounded-lg bg-white ring-1 ring-violet-200">
            {previews[photo] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previews[photo]} alt="현장" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[8px] font-bold text-slate-400">사진</span>
            )}
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="absolute right-0 top-0 grid h-3.5 w-3.5 place-items-center rounded-bl-md bg-rose-600 text-[9px] font-black leading-none text-white"
            >
              ×
            </button>
          </div>
        ))}
        <label className="grid h-11 w-11 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-violet-300 text-xl font-black text-violet-400">
          +
          <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />
        </label>
      </div>
      <p className="mt-1.5 text-[9px] leading-snug text-violet-700">견적·접수는 사진 없이 가능, 제작 확정 전 검수 단계에서 확인합니다.</p>
    </div>
  );
}
