"use client";

import { useEffect, useState } from "react";
import { fetchBoardStock, setBoardStockQty, type BoardStock } from "@/lib/boardStock";

/** 합판(원판) 재고 입력 — 어머니가 입고 시 수량을 갱신. 최종 승인 시 자동 차감됨. */
export function BoardStockEditor() {
  const [stock, setStock] = useState<BoardStock[]>([]);
  const [savingCode, setSavingCode] = useState<string | null>(null);

  useEffect(() => {
    fetchBoardStock().then(setStock);
  }, []);

  async function save(specCode: string, quantity: number) {
    const qty = Math.max(0, Math.floor(quantity));
    setStock((prev) => prev.map((s) => (s.specCode === specCode ? { ...s, quantity: qty } : s)));
    setSavingCode(specCode);
    await setBoardStockQty(specCode, qty);
    setSavingCode(null);
  }

  if (stock.length === 0) {
    return <p className="mt-4 text-sm font-bold text-slate-400">재고 정보를 불러오는 중…</p>;
  }

  return (
    <div className="mt-4 space-y-2">
      {stock.map((s) => (
        <div key={s.specCode} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-soft px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-black text-ink">{s.label}</div>
            <div className="text-[11px] font-bold text-slate-400">{s.specCode}</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => save(s.specCode, s.quantity - 1)} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-lg font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">−</button>
            <input
              type="number"
              value={s.quantity}
              min={0}
              onChange={(e) => setStock((prev) => prev.map((x) => (x.specCode === s.specCode ? { ...x, quantity: Math.max(0, Number(e.target.value) || 0) } : x)))}
              onBlur={(e) => save(s.specCode, Number(e.target.value) || 0)}
              className="w-20 rounded-xl border border-slate-300 px-2 py-2 text-center text-sm font-black text-slate-800 outline-none focus:border-brand"
            />
            <span className="text-sm font-bold text-slate-500">장</span>
            <button type="button" onClick={() => save(s.specCode, s.quantity + 1)} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-lg font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">＋</button>
            {savingCode === s.specCode && <span className="text-[11px] font-bold text-emerald-600">저장됨</span>}
          </div>
        </div>
      ))}
      <p className="pt-1 text-[11px] font-bold text-slate-400">합판이 들어오면 수량을 늘리세요. 작업을 <b>최종 승인</b>하면 그 작업에 쓴 합판만큼 자동으로 줄어듭니다.</p>
    </div>
  );
}
