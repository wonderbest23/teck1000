"use client";

import { useEffect, useMemo, useState } from "react";
import { ManufacturingTabs } from "@/components/ManufacturingTabs";
import { fetchBoardStock, type BoardStock } from "@/lib/boardStock";
import { calculateQuote } from "@/lib/quote";
import { computeJobEconomics } from "@/lib/jobEconomics";
import type { FurnitureInput, Order } from "@/lib/types";

/** input 1건으로 제작지시(재단표) + 원가 요약을 보여줌. 스튜디오/일정표 공용. */
export function CutSheetPanel({ input, title = "작업" }: { input: FurnitureInput; title?: string }) {
  const [stock, setStock] = useState<BoardStock[]>([]);
  const [showDrawing, setShowDrawing] = useState(true);

  useEffect(() => {
    fetchBoardStock().then(setStock);
  }, []);

  const eco = useMemo(() => computeJobEconomics(input), [input]);
  const order = useMemo<Order>(
    () => ({
      id: "preview",
      order_number: title,
      customer_name: title,
      phone: "",
      email: "",
      shipping_address: "",
      request_memo: "",
      product_name: title,
      status: "confirmed",
      total_price: eco.salePrice,
      input,
      quote: calculateQuote(input),
      created_at: new Date().toISOString(),
    }),
    [input, title, eco.salePrice],
  );

  const stockByCode = useMemo(() => new Map(stock.map((s) => [s.specCode, s.quantity])), [stock]);

  return (
    <div className="space-y-5">
      {/* 원가 한눈에 */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-base font-black text-ink">💰 이 작업 한눈에</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Eco tone="slate" label="합판 사용" value={`${eco.sheetCount}장`} />
          <Eco tone="rose" label="원가(썼다)" value={`${eco.totalCost.toLocaleString()}원`} />
          <Eco tone="brand" label="판매가" value={`${eco.salePrice.toLocaleString()}원`} />
          <Eco tone="emerald" label="이익(벌 수 있다)" value={`${eco.profit.toLocaleString()}원`} />
        </div>

        {/* 규격별 합판 + 재고 충분/부족 */}
        <div className="mt-4 space-y-1.5">
          {eco.sheetsBySpec.map((s) => {
            const have = stockByCode.get(s.specCode) ?? 0;
            const ok = have >= s.count;
            return (
              <div key={s.specCode} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-[13px] font-bold text-slate-600">{s.material} · {s.count}장 필요</span>
                <span className={`rounded-lg px-2 py-0.5 text-[11px] font-black ${ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {ok ? `재고 ${have}장 · 충분` : `재고 ${have}장 · ${s.count - have}장 부족`}
                </span>
              </div>
            );
          })}
          <p className="pt-1 text-[11px] font-bold text-slate-400">원가는 계약가(자재 원가) 기준이에요. 최종 승인하면 재고에서 합판이 자동으로 빠집니다.</p>
        </div>
      </section>

      {/* 재단 도면 (기존 제작지시서 재사용) */}
      <button
        type="button"
        onClick={() => setShowDrawing((v) => !v)}
        className="rounded-xl bg-white px-4 py-2 text-sm font-black text-brand ring-1 ring-brand/30 hover:bg-brand/5"
      >
        {showDrawing ? "재단 도면 접기 ▲" : "재단 도면 펼치기 ▼"}
      </button>
      {showDrawing && <ManufacturingTabs order={order} />}
    </div>
  );
}

function Eco({ tone, label, value }: { tone: "slate" | "rose" | "brand" | "emerald"; label: string; value: string }) {
  const cls =
    tone === "rose"
      ? "bg-rose-50 text-rose-700"
      : tone === "brand"
        ? "bg-brand/10 text-brand"
        : tone === "emerald"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-700";
  return (
    <div className={`rounded-2xl p-3 text-center ${cls}`}>
      <div className="text-[11px] font-black opacity-80">{label}</div>
      <div className="mt-1 break-keep text-lg font-black leading-tight">{value}</div>
    </div>
  );
}
