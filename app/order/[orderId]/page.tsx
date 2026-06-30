import Link from "next/link";
import { notFound } from "next/navigation";
import { orderStatusLabels } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { getStoredOrder } from "@/lib/orderStore";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await getStoredOrder(orderId);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <section className="rounded-3xl bg-white p-8 shadow-card">
        <p className="text-sm font-black text-brand">주문 요청 완료</p>
        <h1 className="mt-3 text-3xl font-black text-ink sm:text-4xl">주문번호 {order.order_number}</h1>
        <p className="mt-2 text-sm text-slate-500">관리자 검토 후 제작 가능 여부와 일정을 확정해 연락드립니다.</p>

        <div className="mt-8 grid gap-3 text-slate-700">
          <Row label="주문상태" value={orderStatusLabels[order.status]} />
          <Row label="주문자" value={`${order.customer.name} · ${order.customer.phone}`} />
          <Row label="배송지" value={order.customer.shipping_address || "-"} />
          {order.schedule.requested_delivery_date && (
            <Row
              label="희망 일정"
              value={`배송 ${order.schedule.requested_delivery_date}${order.schedule.visit_required ? ` · 설치 ${order.schedule.requested_install_date}` : " · 배송만"}`}
            />
          )}
          <Row label="원판 소요" value={`${order.sheet_count}장`} />
        </div>

        <div className="mt-8">
          <div className="text-sm font-black text-ink">주문 품목 ({order.items.length}종)</div>
          <div className="mt-3 space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="rounded-2xl bg-soft p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-ink">{item.name} x {item.quantity}</span>
                      {item.order_verdict && <VerdictTag verdict={item.order_verdict} />}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {item.input.width_mm} x {item.input.height_mm} x {item.input.depth_mm}mm · {item.input.material}
                    </div>
                  </div>
                  <div className="text-lg font-black text-brand">{formatMoney(item.lineTotal)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-2xl bg-ink px-5 py-4 text-white">
          <span className="text-sm font-bold">합계</span>
          <span className="text-2xl font-black">{formatMoney(order.total_price)}</span>
        </div>

        {order.customer.memo && (
          <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3 text-sm leading-6 text-violet-900">
            <span className="font-black">요청사항</span>
            <p className="mt-1 whitespace-pre-wrap">{order.customer.memo}</p>
          </div>
        )}

        <Link href="/my/orders" className="mt-6 block rounded-2xl bg-brand px-6 py-4 text-center font-black text-white">
          주문 내역 보기
        </Link>
      </section>
    </main>
  );
}

function VerdictTag({ verdict }: { verdict: NonNullable<import("@/lib/orderStore").StoredOrderItem["order_verdict"]> }) {
  const map: Record<string, { label: string; cls: string }> = {
    ready: { label: "바로주문", cls: "bg-emerald-50 text-emerald-700" },
    needs_review: { label: "검수요청", cls: "bg-amber-50 text-amber-800" },
    inquiry_required: { label: "제조문의", cls: "bg-violet-50 text-violet-700" },
    blocked: { label: "검토필요", cls: "bg-rose-50 text-rose-700" },
  };
  const tag = map[verdict];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${tag.cls}`}>{tag.label}</span>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl bg-soft p-4">
      <span className="font-bold">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
