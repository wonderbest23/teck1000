"use client";

import Link from "next/link";
import { useState } from "react";
import { createWorkOrder, toDateKey, type WorkOrder } from "@/lib/workOrders";

type Preset = Omit<WorkOrder, "id" | "createdAt" | "status">;

export function CreateWorkOrderButton({ preset }: { preset: Preset }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(preset.date || toDateKey(new Date()));
  const [assignee, setAssignee] = useState(preset.assignee || "");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  async function save() {
    setState("saving");
    const ok = await createWorkOrder({ ...preset, status: "대기", date: date || toDateKey(new Date()), assignee: assignee.trim() });
    setState(ok ? "done" : "idle");
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-2xl bg-white px-6 py-4 font-black text-brand ring-2 ring-brand/30 hover:bg-brand/5">
        📋 작업지시서로 등록
      </button>
    );
  }
  return (
    <div className="w-full rounded-2xl border border-brand/30 bg-brand/5 p-4 sm:w-[22rem]">
      <p className="text-sm font-black text-ink">작업지시서 등록 (일정표에 추가)</p>
      <label className="mt-2 block text-xs font-black text-slate-600">제작 예정일
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-brand" />
      </label>
      <label className="mt-2 block text-xs font-black text-slate-600">담당자(선택)
        <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="예: 김기사" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-brand" />
      </label>
      {state === "done" ? (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm font-black text-emerald-600">등록됐어요 ✓</span>
          <Link href="/admin/schedule" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-black text-white">일정표 보기</Link>
        </div>
      ) : (
        <button type="button" onClick={save} disabled={state === "saving"} className="mt-3 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-black text-white hover:bg-brand/90 disabled:bg-slate-300">
          {state === "saving" ? "등록 중…" : "일정표에 등록"}
        </button>
      )}
    </div>
  );
}
