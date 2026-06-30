"use client";

export function UndoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 5 10l4-4" />
      <path d="M5 10h9a5 5 0 0 1 5 5v1" />
    </svg>
  );
}

export function RedoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 14 4-4-4-4" />
      <path d="M19 10h-9a5 5 0 0 0-5 5v1" />
    </svg>
  );
}

/** 인라인 실행취소/다시실행 버튼 한 쌍 (3D 오버레이·도면 헤더 공용) */
export function HistoryButtons({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  className,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 ${className ?? ""}`}>
      <button
        type="button"
        title="되돌리기"
        aria-label="되돌리기"
        onClick={onUndo}
        disabled={!canUndo}
        className="grid h-8 w-8 place-items-center rounded-md bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 disabled:opacity-35"
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        title="앞으로가기"
        aria-label="앞으로가기"
        onClick={onRedo}
        disabled={!canRedo}
        className="grid h-8 w-8 place-items-center rounded-md bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 disabled:opacity-35"
      >
        <RedoIcon />
      </button>
    </div>
  );
}
