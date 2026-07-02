"use client";

// =============================================================
// SceneSizePanel — 3D 캔버스 우측에 고정되는 깔끔한 사이즈 조절 패널.
// 3D 안 배지/핸들(드래그)은 유지하되, 정확한 값 조절은 여기서 −/＋·직접입력으로.
// 내용(rows)은 호출부가 데이터로 넘긴다 — 패널은 표시/입력만 담당.
// =============================================================

import { useEffect, useState, type ReactNode } from "react";

export type SizeRow = {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (mm: number) => void;
};

export type SizeGroup = { heading?: string; rows: SizeRow[] };

export type PanelMaterial = { name: string; color: string; tone: string };

export type PanelActions = {
  onRotate?: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
};

/** 주문 검증 결과 요약 — 불가/주의 사유를 패널에서 바로 보여준다. action은 "권장값으로 맞추기" 등 즉시 해결 버튼 */
export type PanelNotice = { level: "error" | "warning"; text: string; actionLabel?: string; onAction?: () => void };

function StepperRow({ row }: { row: SizeRow }) {
  const [draft, setDraft] = useState(String(row.value));
  useEffect(() => setDraft(String(row.value)), [row.value]);
  const commit = (n: number) => {
    if (!Number.isFinite(n)) {
      setDraft(String(row.value));
      return;
    }
    row.onChange(Math.min(row.max, Math.max(row.min, Math.round(n))));
  };
  return (
    <div className="flex items-center gap-1">
      <span className="w-8 shrink-0 text-[10px] font-black text-slate-500">{row.label}</span>
      <button
        type="button"
        aria-label={`${row.label} 줄이기`}
        disabled={row.value <= row.min}
        onClick={() => commit(row.value - row.step)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-base font-black text-slate-600 transition hover:bg-slate-200 active:scale-95 disabled:opacity-30"
      >
        −
      </button>
      <input
        value={draft}
        inputMode="numeric"
        onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, ""))}
        onBlur={() => commit(Number(draft))}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
        }}
        className="h-8 w-full min-w-0 rounded-lg border border-slate-200 text-center text-[12px] font-black text-ink outline-none focus:border-brand"
      />
      <button
        type="button"
        aria-label={`${row.label} 늘리기`}
        disabled={row.value >= row.max}
        onClick={() => commit(row.value + row.step)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-base font-black text-slate-600 transition hover:bg-slate-200 active:scale-95 disabled:opacity-30"
      >
        ＋
      </button>
    </div>
  );
}

export function SceneSizePanel({
  title,
  subtitle,
  groups,
  materials,
  actions,
  notice,
  onClose,
  variant = "overlay",
  children,
}: {
  title: string;
  subtitle?: string;
  groups: SizeGroup[];
  /** 소재 스와치 — 패널 안에서 바로 변경 */
  materials?: { list: PanelMaterial[]; current?: string; onSelect: (name: string, color: string) => void };
  /** 회전·복제·삭제 — 흩어져 있던 퀵 버튼을 패널 하단으로 통합 */
  actions?: PanelActions;
  /** 주문 불가/주의 사유 — 값을 바꾸다 규격을 벗어나면 왜 안 되는지 바로 안내 */
  notice?: PanelNotice | null;
  onClose: () => void;
  /** overlay=캔버스 우측 플로팅(데스크톱) · inline=섹션 아래 일반 흐름(모바일 — 미리보기를 가리지 않음) */
  variant?: "overlay" | "inline";
  /** 상단 커스텀 영역 — 하부/상부 토글 칩 등 */
  children?: ReactNode;
}) {
  return (
    <div
      className={
        variant === "inline"
          ? "flex w-full flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-card"
          : "pointer-events-auto absolute right-2 top-2 z-40 flex max-h-[calc(100%-1rem)] w-[208px] flex-col gap-2.5 overflow-y-auto rounded-2xl border border-slate-200/70 bg-white/90 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-md max-sm:hidden"
      }
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-black text-ink">{title}</div>
          {subtitle && <div className="mt-0.5 text-[10px] font-bold text-slate-400">{subtitle}</div>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="선택 해제"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-soft text-sm font-black leading-none text-slate-500 hover:bg-slate-100"
        >
          ×
        </button>
      </div>
      {notice && (
        <div className={`rounded-lg px-2 py-1.5 text-[10px] font-bold leading-4 ${notice.level === "error" ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"}`}>
          {notice.level === "error" ? "⚠ 주문 불가 — " : "ℹ 확인 필요 — "}
          {notice.text}
          {notice.actionLabel && notice.onAction && (
            <button
              type="button"
              onClick={notice.onAction}
              className={`mt-1.5 block w-full rounded-md px-2 py-1 text-[10px] font-black text-white transition ${notice.level === "error" ? "bg-rose-500 hover:bg-rose-400" : "bg-amber-500 hover:bg-amber-400"}`}
            >
              {notice.actionLabel}
            </button>
          )}
        </div>
      )}
      {children}
      {groups.map((group, index) => (
        <div key={group.heading ?? index} className="space-y-1.5">
          {group.heading && <div className="text-[10px] font-black text-slate-400">{group.heading}</div>}
          {group.rows.map((row) => (
            <StepperRow key={row.key} row={row} />
          ))}
        </div>
      ))}
      <p className="text-[9px] font-bold leading-4 text-slate-400">단위 mm · −/＋ 또는 직접 입력 후 Enter</p>
      {materials && (
        <div className="space-y-1.5 border-t border-slate-100 pt-2">
          <div className="text-[10px] font-black text-slate-400">소재</div>
          <div className="flex flex-wrap gap-1">
            {materials.list.map((m) => (
              <button
                key={m.name}
                type="button"
                title={m.name}
                aria-label={m.name}
                onClick={() => materials.onSelect(m.name, m.color)}
                className={`h-6 w-6 rounded-full border border-white/60 transition ${materials.current === m.name ? "ring-2 ring-brand" : "ring-1 ring-slate-200 hover:ring-slate-300"}`}
                style={{ background: m.tone }}
              />
            ))}
          </div>
        </div>
      )}
      {actions && (actions.onRotate || actions.onDuplicate || actions.onRemove) && (
        <div className="flex items-center gap-1 border-t border-slate-100 pt-2">
          {actions.onRotate && (
            <button type="button" title="90° 회전" onClick={actions.onRotate} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 text-[10px] font-black text-slate-600 transition hover:bg-slate-200">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" strokeLinecap="round" /><path d="M5 3v4h4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              회전
            </button>
          )}
          {actions.onDuplicate && (
            <button type="button" title="복제 (Ctrl+C/V)" onClick={actions.onDuplicate} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 text-[10px] font-black text-slate-600 transition hover:bg-slate-200">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" strokeLinecap="round" /></svg>
              복제
            </button>
          )}
          {actions.onRemove && (
            <button type="button" title="삭제" onClick={actions.onRemove} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-rose-50 text-[10px] font-black text-rose-600 transition hover:bg-rose-100">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" /></svg>
              삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
