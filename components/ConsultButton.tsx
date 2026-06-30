"use client";

import { useState } from "react";
import { ConsultChat } from "@/components/ConsultChat";

export function ConsultButton({ variant }: { variant: "hero" | "banner" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "hero" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white/70 py-3 text-sm font-black text-ink active:scale-[0.99]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l0.9-5A8 8 0 1 1 21 12Z" strokeLinejoin="round" /><path d="M8.5 12h7M8.5 9h7M8.5 15h4" strokeLinecap="round" /></svg>
          상담하기
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-xl bg-white px-3 py-2 text-[11px] font-black text-ink">
          무료 상담 신청 ›
        </button>
      )}
      {open && <ConsultChat onClose={() => setOpen(false)} />}
    </>
  );
}
