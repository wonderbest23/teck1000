// =============================================================
// components/preview3d/controls/KitchenPresetPicker.tsx
// 2단계 질문("형태 → 길이")으로 프리셋을 고르는 시작 화면.
// 빈 캔버스 대신 "완성된 주방에서 빼고 바꾸기" 경험 제공.
//
// [통합 노트]
// - QuoteBuilder 에서 kitchen_full_set 신규 생성 시 Preview3D/RoomScene 대신 먼저 렌더.
// - onApply(nextInput) 은 기존 setInput(=undo 스택) 경로로 연결 → 자동 실행취소 가능.
// =============================================================

"use client";

import { useState, type ReactNode } from "react";
import {
  KITCHEN_PRESETS,
  type KitchenPreset,
  applyKitchenPreset,
  fitPresetToWidth,
} from "@/lib/kitchenPresets";

type Shape = "straight" | "l_shape";

interface Props<T extends Record<string, unknown>> {
  /** 현재 FurnitureInput (소재 등 유지하며 레이아웃만 덮어씀) */
  currentInput: T;
  onApply: (nextInput: T) => void;
  /** "직접 구성할게요" → 기존 빈 캔버스 플로우로 이탈 */
  onSkip?: () => void;
}

export function KitchenPresetPicker<T extends Record<string, unknown>>({
  currentInput,
  onApply,
  onSkip,
}: Props<T>) {
  const [shape, setShape] = useState<Shape | null>(null);
  const [customWidth, setCustomWidth] = useState<string>("");

  const presets = KITCHEN_PRESETS.filter((p) => p.shape === shape);

  const apply = (preset: KitchenPreset) => {
    onApply(applyKitchenPreset(currentInput, preset));
  };

  const applyCustomWidth = () => {
    const w = parseInt(customWidth, 10);
    if (!Number.isFinite(w) || w < 1200 || w > 6000) return;
    if (!presets.length) return;
    const base = presets.reduce((a, b) =>
      Math.abs(a.totalWidthMm - w) < Math.abs(b.totalWidthMm - w) ? a : b,
    );
    apply(fitPresetToWidth(base, w));
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      {/* Step 1: 형태 */}
      <p className="text-sm font-semibold text-slate-900">주방 형태를 골라주세요</p>
      <p className="mt-0.5 text-xs text-slate-500">
        완성된 표준 구성에서 시작해요. 나중에 얼마든지 바꿀 수 있어요.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <ShapeCard active={shape === "straight"} onClick={() => setShape("straight")} title="일자형" desc="한쪽 벽면">
          <svg viewBox="0 0 64 40" className="h-10 w-full">
            <rect x="6" y="22" width="52" height="10" rx="2" className="fill-slate-300" />
            <rect x="6" y="8" width="52" height="7" rx="2" className="fill-slate-200" />
          </svg>
        </ShapeCard>
        <ShapeCard active={shape === "l_shape"} onClick={() => setShape("l_shape")} title="ㄱ자형" desc="코너 활용">
          <svg viewBox="0 0 64 40" className="h-10 w-full">
            <rect x="6" y="22" width="52" height="10" rx="2" className="fill-slate-300" />
            <rect x="48" y="4" width="10" height="28" rx="2" className="fill-slate-300" />
          </svg>
        </ShapeCard>
      </div>

      {/* Step 2: 길이 프리셋 */}
      {shape && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-900">전체 길이는요?</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => apply(p)}
                className="rounded-2xl border border-slate-200 p-3 text-left transition hover:border-slate-900 hover:shadow-sm active:scale-[0.99]"
              >
                <span className="block text-sm font-bold text-slate-900">{p.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{p.description}</span>
              </button>
            ))}
          </div>

          {/* 직접 입력 */}
          <div className="mt-3 flex items-center gap-2">
            <input
              inputMode="numeric"
              placeholder="직접 입력 (mm)"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value.replace(/\D/g, ""))}
              className="w-36 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
            <button
              onClick={applyCustomWidth}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              disabled={!customWidth}
            >
              이 길이로 시작
            </button>
          </div>
        </div>
      )}

      {onSkip && (
        <button
          onClick={onSkip}
          className="mt-5 text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
        >
          프리셋 없이 직접 구성할게요
        </button>
      )}
    </div>
  );
}

function ShapeCard({
  active,
  onClick,
  title,
  desc,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
        active ? "border-slate-900 bg-slate-50 shadow-sm" : "border-slate-200 hover:border-slate-400"
      }`}
    >
      {children}
      <span className="mt-2 block text-sm font-bold text-slate-900">{title}</span>
      <span className="block text-[11px] text-slate-500">{desc}</span>
    </button>
  );
}
