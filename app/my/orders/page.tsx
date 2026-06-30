import Link from "next/link";
import { orderStatusLabels } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { listStoredOrders } from "@/lib/orderStore";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const orders = await listStoredOrders();

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="text-2xl font-black text-ink">주문 내역</h1>
      <p className="mt-1 text-sm text-slate-500">동방씽크에서 제작한 주문을 확인하세요.</p>

      <div className="mt-6 space-y-3">
        {orders.length === 0 && (
          <div className="rounded-2xl bg-soft p-6 text-center text-sm font-bold text-slate-500">아직 주문 내역이 없습니다.</div>
        )}
        {orders.map((order) => {
          const title = order.items.length > 1 ? `${order.items[0].name} 외 ${order.items.length - 1}건` : order.items[0]?.name ?? "맞춤 주문";
          return (
            <Link
              key={order.id}
              href={`/order/${order.id}`}
              className="block rounded-2xl bg-white p-4 ring-1 ring-slate-100 transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-ink">{title}</div>
                  <div className="mt-1 text-xs text-slate-500">{order.order_number}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-black text-brand">{formatMoney(order.total_price)}</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-400">{orderStatusLabels[order.status]}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        href="/custom/kitchen_full_set"
        className="mt-8 flex w-full items-center justify-center rounded-2xl bg-ink py-4 text-sm font-black text-white"
      >
        새 제작 시작하기
      </Link>
    </main>
  );
}
