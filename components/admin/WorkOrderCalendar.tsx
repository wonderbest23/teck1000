"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CutSheetPanel } from "@/components/admin/CutSheetPanel";
import { computeJobEconomics } from "@/lib/jobEconomics";
import {
  WORK_STAGES,
  fetchWorkOrders,
  deleteWorkOrder,
  setWorkOrderApproved,
  setWorkOrderAssignee,
  setWorkOrderStatus,
  toDateKey,
  type WorkOrder,
  type WorkOrderStatus,
} from "@/lib/workOrders";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const STATUS_STYLE: Record<WorkOrderStatus, string> = {
  대기: "bg-slate-100 text-slate-600 ring-slate-200",
  재단: "bg-amber-100 text-amber-700 ring-amber-200",
  엣지: "bg-orange-100 text-orange-700 ring-orange-200",
  조립: "bg-sky-100 text-sky-700 ring-sky-200",
  검수: "bg-violet-100 text-violet-700 ring-violet-200",
  완료: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};
const STATUS_DOT: Record<WorkOrderStatus, string> = {
  대기: "bg-slate-400",
  재단: "bg-amber-500",
  엣지: "bg-orange-500",
  조립: "bg-sky-500",
  검수: "bg-violet-500",
  완료: "bg-emerald-500",
};
type View = "month" | "week" | "day";

export function WorkOrderCalendar() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string>(toDateKey(today));
  const [view, setView] = useState<View>("month");
  const [openCutSheet, setOpenCutSheet] = useState<string | null>(null);

  async function refresh() {
    setOrders(await fetchWorkOrders());
  }
  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 20000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byDate = useMemo(() => {
    const map = new Map<string, WorkOrder[]>();
    for (const o of orders) {
      const list = map.get(o.date) ?? [];
      list.push(o);
      map.set(o.date, list);
    }
    return map;
  }, [orders]);

  const monthCells = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { date: d, key: toDateKey(d), inMonth: d.getMonth() === month };
    });
  }, [year, month]);

  const weekCells = useMemo(() => {
    const sel = new Date(`${selected}T00:00:00`);
    const start = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate() - sel.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { date: d, key: toDateKey(d) };
    });
  }, [selected]);

  const todayKey = toDateKey(today);
  const selectedOrders = (byDate.get(selected) ?? []).slice().sort((a, b) => b.createdAt - a.createdAt);

  function goMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }
  function goDay(delta: number) {
    const d = new Date(`${selected}T00:00:00`);
    const n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
    setSelected(toDateKey(n));
    setYear(n.getFullYear());
    setMonth(n.getMonth());
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelected(todayKey);
  }
  async function setStage(o: WorkOrder, stage: WorkOrderStatus) {
    await setWorkOrderStatus(o.id, stage);
    refresh();
  }
  async function approve(o: WorkOrder, approved: boolean) {
    await setWorkOrderApproved(o.id, approved);
    refresh();
  }
  async function editAssignee(o: WorkOrder) {
    const name = window.prompt("담당자 이름", o.assignee || "");
    if (name === null) return;
    await setWorkOrderAssignee(o.id, name.trim());
    refresh();
  }
  async function remove(o: WorkOrder) {
    if (window.confirm("이 작업지시서를 삭제할까요?")) {
      await deleteWorkOrder(o.id);
      refresh();
    }
  }

  const headLabel =
    view === "day"
      ? selected.replace(/-/g, ". ")
      : view === "week"
        ? `${toDateKey(weekCells[0].date).replace(/-/g, ".")} ~ ${toDateKey(weekCells[6].date).slice(5).replace("-", ".")}`
        : `${year}년 ${month + 1}월`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-ink">제작 일정표</h1>
          <p className="mt-1 text-sm text-slate-500">작업지시서를 달력에서 한눈에 — 언제·누가·어느 공정인지 확인하세요.</p>
        </div>
        <Link href="/admin/photo-to-drawing" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-black text-white hover:bg-brand/90">+ 작업지시서 만들기</Link>
      </div>

      {/* 보기 전환 + 이동 */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-sm font-black">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className={`rounded-lg px-3 py-1.5 transition ${view === v ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}>
                {v === "month" ? "월" : v === "week" ? "주" : "일"}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => (view === "day" ? goDay(-1) : goMonth(-1))} aria-label="이전" className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">‹</button>
          <div className="min-w-[8.5rem] text-center text-lg font-black text-ink">{headLabel}</div>
          <button type="button" onClick={() => (view === "day" ? goDay(1) : goMonth(1))} aria-label="다음" className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">›</button>
          <button type="button" onClick={goToday} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-brand ring-1 ring-brand/30 hover:bg-brand/5">오늘</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
          {WORK_STAGES.map((s) => (
            <span key={s} className="flex items-center gap-1 text-slate-500"><span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[s]}`} />{s}</span>
          ))}
        </div>
      </div>

      {/* 월 보기 */}
      {view === "month" && (
        <>
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-black">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`py-1 ${i === 0 ? "text-rose-500" : i === 6 ? "text-sky-500" : "text-slate-500"}`}>{w}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {monthCells.map((c) => {
              const list = byDate.get(c.key) ?? [];
              const isToday = c.key === todayKey;
              const isSel = c.key === selected;
              return (
                <button key={c.key} type="button" onClick={() => setSelected(c.key)} className={`flex min-h-[88px] flex-col rounded-xl border p-1.5 text-left transition ${isSel ? "border-brand ring-2 ring-brand/30" : "border-slate-200"} ${c.inMonth ? "bg-white" : "bg-slate-50/60"} hover:border-brand`}>
                  <span className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-black ${isToday ? "bg-brand text-white" : c.inMonth ? "text-slate-700" : "text-slate-300"}`}>{c.date.getDate()}</span>
                  <span className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                    {list.slice(0, 3).map((o) => (
                      <span key={o.id} className={`truncate rounded px-1 py-0.5 text-[10px] font-black ring-1 ${STATUS_STYLE[o.status]}`}>{o.title}</span>
                    ))}
                    {list.length > 3 && <span className="px-1 text-[10px] font-black text-slate-400">+{list.length - 3}건</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* 주 보기 */}
      {view === "week" && (
        <div className="grid grid-cols-7 gap-1.5">
          {weekCells.map((c, i) => {
            const list = (byDate.get(c.key) ?? []).slice().sort((a, b) => b.createdAt - a.createdAt);
            const isToday = c.key === todayKey;
            const isSel = c.key === selected;
            return (
              <button key={c.key} type="button" onClick={() => setSelected(c.key)} className={`flex min-h-[200px] flex-col rounded-xl border p-1.5 text-left transition ${isSel ? "border-brand ring-2 ring-brand/30" : "border-slate-200"} bg-white hover:border-brand`}>
                <div className={`mb-1 text-center text-[11px] font-black ${i === 0 ? "text-rose-500" : i === 6 ? "text-sky-500" : "text-slate-500"}`}>{WEEKDAYS[i]} <span className={isToday ? "rounded bg-brand px-1 text-white" : "text-slate-700"}>{c.date.getDate()}</span></div>
                <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
                  {list.map((o) => (
                    <span key={o.id} className={`rounded px-1 py-0.5 text-[10px] font-black ring-1 ${STATUS_STYLE[o.status]}`}>
                      <span className="block truncate">{o.title}</span>
                      {o.assignee && <span className="block truncate opacity-70">👤 {o.assignee}</span>}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 선택 날짜 상세 (모든 보기 공통, 일 보기에선 메인) */}
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-base font-black text-ink">{selected.replace(/-/g, ". ")} 작업 {selectedOrders.length}건</h2>
        {selectedOrders.length === 0 ? (
          <p className="mt-3 text-sm font-bold text-slate-400">이 날짜에 등록된 작업지시서가 없어요.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {selectedOrders.map((o) => {
              const curIdx = WORK_STAGES.indexOf(o.status);
              return (
              <li key={o.id} className={`rounded-2xl border p-3 ${o.approved ? "border-emerald-200 bg-emerald-50/40" : "border-slate-100 bg-slate-50/50"}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-black text-ink">{o.title}</span>
                      {o.approved && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white">✅ 최종 승인됨</span>}
                      {o.orderNumber && <span className="rounded bg-ink/90 px-1.5 py-0.5 text-[10px] font-black text-white">주문 {o.orderNumber}</span>}
                    </div>
                    <div className="mt-0.5 text-[12px] font-bold text-slate-500">
                      {o.layout} · {o.widthMm}mm · {o.moduleCount}칸{o.hasWall ? " · 상부장" : ""} · {o.partsCount}부품 · {o.price.toLocaleString()}원
                    </div>
                    <button type="button" onClick={() => editAssignee(o)} className="mt-1 inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[11px] font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
                      👤 {o.assignee || "담당자 지정"}
                    </button>
                    {o.note && <div className="mt-1 text-[12px] font-semibold text-amber-600">📌 {o.note}</div>}
                  </div>
                  <button type="button" onClick={() => remove(o)} aria-label="삭제" className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-black text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">삭제</button>
                </div>

                {/* 공정 단계 — 하나씩 완료 처리 */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1">
                  {WORK_STAGES.slice(1).map((stage) => {
                    const k = WORK_STAGES.indexOf(stage);
                    const done = curIdx >= k;
                    const isCurrent = curIdx === k;
                    return (
                      <button
                        key={stage}
                        type="button"
                        disabled={o.approved}
                        onClick={() => setStage(o, isCurrent ? WORK_STAGES[k - 1] : stage)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-black ring-1 transition disabled:opacity-60 ${done ? "bg-emerald-500 text-white ring-emerald-500" : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"}`}
                      >
                        {done ? "✓ " : ""}{stage}
                      </button>
                    );
                  })}
                </div>

                {/* 최종 승인 */}
                <div className="mt-2">
                  {o.status !== "완료" ? (
                    <p className="text-[11px] font-bold text-slate-400">단계를 눌러 하나씩 완료 처리하세요. ‘완료’까지 끝나면 최종 승인이 떠요.{o.approved ? "" : " 최종 승인하면 합판 재고가 자동으로 빠집니다."}</p>
                  ) : o.approved ? (
                    <button type="button" onClick={() => approve(o, false)} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-black text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">승인 취소</button>
                  ) : (
                    <button type="button" onClick={() => approve(o, true)} className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-600">✅ 최종 승인하기 (합판 재고 자동 차감)</button>
                  )}
                </div>

                {/* 원가·재단 (input 있을 때만) */}
                {o.input && (() => {
                  const eco = computeJobEconomics(o.input);
                  const open = openCutSheet === o.id;
                  return (
                    <div className="mt-2.5 border-t border-slate-100 pt-2.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-700">합판 {eco.sheetCount}장</span>
                        <span className="rounded-lg bg-rose-50 px-2 py-1 text-rose-700">원가 {eco.totalCost.toLocaleString()}원</span>
                        <span className="rounded-lg bg-brand/10 px-2 py-1 text-brand">판매 {eco.salePrice.toLocaleString()}원</span>
                        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700">이익 {eco.profit.toLocaleString()}원</span>
                      </div>
                      <button type="button" onClick={() => setOpenCutSheet(open ? null : o.id)} className="mt-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-black text-brand ring-1 ring-brand/30 hover:bg-brand/5">
                        {open ? "재단도면 접기 ▲" : "📐 재단도면 보기 ▼"}
                      </button>
                      {open && (
                        <div className="mt-2">
                          <CutSheetPanel input={o.input} title={o.title} />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] font-bold text-slate-400">공정 단계를 차례로 눌러 완료 처리하고(다시 누르면 취소), ‘완료’까지 끝나면 <b>최종 승인</b>을 누르세요. 👤로 담당자를 지정합니다.</p>
      </div>
    </div>
  );
}
