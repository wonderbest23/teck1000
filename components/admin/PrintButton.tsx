"use client";

export function PrintButton({ label = "PDF로 저장 / 인쇄" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-2xl bg-brand px-6 py-3 text-sm font-black text-white"
    >
      {label}
    </button>
  );
}
