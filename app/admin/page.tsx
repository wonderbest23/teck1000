import Link from "next/link";
import { orderStatusLabels, sampleOrders } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { listBoardStock } from "@/lib/boardStockStore";
import { computeJobEconomics } from "@/lib/jobEconomics";
import { listWorkOrders } from "@/lib/workOrderStore";
import { toDateKey } from "@/lib/workOrders";

export const dynamic = "force-dynamic";

type Item = { href: string; icon: string; title: string; desc: string; accent?: boolean };

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "제작 · 일정",
    items: [
      { href: "/admin/schedule", icon: "📅", title: "제작 일정표", desc: "달력으로 일정·공정·담당자 확인", accent: true },
      { href: "/admin/photo-to-drawing", icon: "🖼️", title: "사진 → 도면 초안", desc: "사진 한 장으로 3D·도면·견적" },
      { href: "/admin/manufacturing/sample-1", icon: "📋", title: "제작지시서", desc: "공장 재단표·부속 지시서" },
    ],
  },
  {
    title: "주문",
    items: [{ href: "/admin/orders", icon: "🧾", title: "주문 관리", desc: "주문 확인·상태 변경·검수" }],
  },
  {
    title: "상품 · 자재 · 설정",
    items: [
      { href: "/admin/templates", icon: "🪑", title: "상품 템플릿", desc: "상품 종류·기본 규격 관리" },
      { href: "/admin/materials", icon: "🧱", title: "자재 관리", desc: "원판·소재·단가" },
      { href: "/admin/factory", icon: "🏭", title: "공장 · 단가 설정", desc: "제작 단가·마진 설정" },
      { href: "/admin/inquiry", icon: "💬", title: "제조사 스펙 문의", desc: "제조사에 사양 문의" },
    ],
  },
];

export default async function AdminPage() {
  const total = sampleOrders.reduce((sum, order) => sum + order.total_price, 0);
  const pending = sampleOrders.filter((order) => order.status !== "completed").length;

  // 어머니용 '이번 달 한눈에' — 작업지시서(일정표) 기준
  const orders = await listWorkOrders();
  const stock = await listBoardStock();
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayKey = toDateKey(now);
  const thisMonth = orders.filter((o) => o.date.startsWith(ym));

  // 이번 달 '최종 승인'된 작업 = 확정 매출/원가. input이 있으면 정밀 계산, 없으면 price로 대체.
  const approvedThisMonth = thisMonth.filter((o) => o.approved);
  let earned = 0; // 번 돈(판매)
  let spent = 0; // 쓴 돈(원가)
  let sheetsUsed = 0; // 합판 사용
  for (const o of approvedThisMonth) {
    if (o.input) {
      const eco = computeJobEconomics(o.input);
      earned += eco.salePrice;
      spent += eco.totalCost;
      sheetsUsed += eco.sheetCount;
    } else {
      earned += o.price;
    }
  }
  const profit = earned - spent;
  const stockLeft = stock.reduce((s, x) => s + x.quantity, 0);
  const todoThisMonth = thisMonth.filter((o) => !o.approved).length;
  const todayTodo = orders.filter((o) => o.date === todayKey && !o.approved).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm font-black text-brand">관리자</p>
      <h1 className="mt-1 text-3xl font-black text-ink">무엇을 하시겠어요?</h1>

      {/* 이번 달 한눈에 — 어머니용 큰 숫자 */}
      <section className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-ink">📅 {now.getMonth() + 1}월 한눈에</h2>
          <Link href="/admin/schedule" className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-black text-brand">일정표 열기 ›</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Big tone="emerald" label="이번 달 번 돈" value={`${earned.toLocaleString()}원`} sub="최종 승인한 작업" />
          <Big tone="rose" label="이번 달 쓴 돈" value={`${spent.toLocaleString()}원`} sub="자재·제작 원가" />
          <Big tone="brand" label="남은 이익" value={`${profit.toLocaleString()}원`} sub="번 돈 − 쓴 돈" />
          <Big tone="amber" label="처리할 일" value={`${todoThisMonth}건`} sub="이번 달 미승인" />
          <Big tone="brand" label="오늘 할 일" value={`${todayTodo}건`} sub={`${now.getMonth() + 1}월 ${now.getDate()}일`} />
          <Big tone="slate" label="남은 합판" value={`${stockLeft}장`} sub={`이번 달 ${sheetsUsed}장 사용`} />
        </div>
        {orders.length === 0 && (
          <p className="mt-3 text-[12px] font-bold text-slate-400">아직 등록된 작업이 없어요 — 아래 ‘사진 업로드’로 작업을 만들면 여기에 표시돼요.</p>
        )}
      </section>

      {/* 메인 CTA — 사진 업로드 */}
      <Link
        href="/admin/photo-to-drawing"
        className="mt-5 flex flex-col items-center gap-3 rounded-3xl bg-gradient-to-br from-brand to-[#0e4a5c] px-6 py-9 text-center text-white shadow-card transition active:scale-[0.99]"
      >
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15">
          <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1l1-1.5h9L17.5 6h1A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.4" /></svg>
        </span>
        <div>
          <p className="text-xl font-black">📷 주방 사진 업로드</p>
          <p className="mt-1 text-sm font-bold text-white/75">사진 한 장이면 3D·도면·견적이 자동으로 만들어져요</p>
        </div>
        <span className="mt-1 rounded-full bg-white px-5 py-2.5 text-sm font-black text-brand">사진 올리고 시작하기 →</span>
      </Link>

      {/* 빠른 현황 */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat title="전체 주문" value={`${sampleOrders.length}건`} />
        <Stat title="제작 대기" value={`${pending}건`} />
        <Stat title="예상 매출" value={formatMoney(total)} />
      </div>

      {/* 카테고리별 메뉴 */}
      {SECTIONS.map((section) => (
        <section key={section.title} className="mt-7">
          <h2 className="mb-2 px-1 text-sm font-black text-slate-500">{section.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center gap-3 rounded-2xl p-4 shadow-card ring-1 transition active:scale-[0.99] ${it.accent ? "bg-brand text-white ring-brand" : "bg-white ring-slate-100 hover:ring-brand/40"}`}
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${it.accent ? "bg-white/15" : "bg-slate-50"}`}>{it.icon}</span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-black">{it.title}</span>
                  <span className={`block text-[12px] font-semibold ${it.accent ? "text-white/75" : "text-slate-500"}`}>{it.desc}</span>
                </span>
                <span className={`ml-auto text-lg ${it.accent ? "text-white/70" : "text-slate-300"}`}>›</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* 최근 주문 */}
      <section className="mt-7 rounded-3xl bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">최근 주문</h2>
          <Link href="/admin/orders" className="text-xs font-black text-brand">전체 보기 ›</Link>
        </div>
        <div className="space-y-2">
          {sampleOrders.slice(0, 5).map((order) => (
            <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between rounded-2xl bg-soft px-4 py-3 hover:bg-slate-100">
              <span className="text-sm font-bold text-slate-700">{order.order_number} · {order.customer_name}</span>
              <b className="text-xs font-black text-brand">{orderStatusLabels[order.status]}</b>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-card">
      <div className="text-[11px] font-bold text-slate-500">{title}</div>
      <div className="mt-1 text-lg font-black text-brand">{value}</div>
    </div>
  );
}

function Big({ tone, label, value, sub }: { tone: "emerald" | "amber" | "brand" | "rose" | "slate"; label: string; value: string; sub: string }) {
  const toneCls =
    tone === "emerald" ? "bg-emerald-50 text-emerald-700"
    : tone === "amber" ? "bg-amber-50 text-amber-700"
    : tone === "rose" ? "bg-rose-50 text-rose-700"
    : tone === "slate" ? "bg-slate-100 text-slate-700"
    : "bg-brand/10 text-brand";
  return (
    <div className={`rounded-2xl p-3 text-center ${toneCls}`}>
      <div className="text-[11px] font-black opacity-80">{label}</div>
      <div className="mt-1 break-keep text-xl font-black leading-tight sm:text-2xl">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold opacity-70">{sub}</div>
    </div>
  );
}
