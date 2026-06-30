"use client";

import type { VerdictLevel } from "@/lib/interior/types";

// 대비 강화: 진한 배경 + 흰 글씨 (WCAG AA 충족, 3D 위에서도 가독)
const VERDICT_STYLES: Record<VerdictLevel, string> = {
  가능: "border-emerald-700 bg-emerald-600 text-white",
  주의: "border-amber-600 bg-amber-500 text-white",
  불가: "border-rose-700 bg-rose-600 text-white",
  제작문의: "border-violet-700 bg-violet-600 text-white",
};

export function PreviewVerdictBadge({
  verdict,
  topIssue,
  onClick,
}: {
  verdict?: VerdictLevel;
  topIssue?: string;
  onClick?: () => void;
}) {
  if (!verdict) return null;
  const clickable = Boolean(onClick) && verdict !== "가능";

  return (
    <div className={`absolute right-2 top-10 z-20 flex max-w-[58%] flex-col items-end gap-1 ${clickable ? "pointer-events-auto" : "pointer-events-none"}`}>
      <button
        type="button"
        onClick={clickable ? onClick : undefined}
        disabled={!clickable}
        aria-label={`제작 가능 여부: ${verdict}${clickable ? " — 눌러서 해결" : ""}`}
        className={`rounded-full border px-2.5 py-1 text-[11px] font-black shadow-sm ${VERDICT_STYLES[verdict]} ${clickable ? "cursor-pointer" : "cursor-default"}`}
      >
        {verdict}
      </button>
      {topIssue && verdict !== "가능" && (
        <button
          type="button"
          onClick={clickable ? onClick : undefined}
          disabled={!clickable}
          aria-label={`확인 필요: ${topIssue}${clickable ? " — 눌러서 해결" : ""}`}
          className={`line-clamp-2 rounded-lg border px-2 py-1 text-right text-[10px] font-bold leading-snug shadow-sm ${VERDICT_STYLES[verdict]} ${clickable ? "cursor-pointer hover:brightness-110" : "cursor-default"}`}
        >
          {topIssue}
          {clickable && <span className="ml-1 underline">해결하기 →</span>}
        </button>
      )}
    </div>
  );
}
