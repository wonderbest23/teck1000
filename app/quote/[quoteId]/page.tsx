import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { getStoredOrder } from "@/lib/orderStore";

export const dynamic = "force-dynamic";

export default async function QuotePage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const order = await getStoredOrder(quoteId);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <section className="rounded-3xl bg-white p-8 shadow-card">
        <p className="text-sm font-black text-brand">견적 확인</p>
        <h1 className="mt-3 text-3xl font-black text-ink sm:text-4xl">견적 {order.order_number}</h1>
        <p className="mt-4 text-slate-600">선택하신 구성 기준 예상 견적입니다.</p>
        <div className="mt-6 space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between rounded-2xl bg-soft px-4 py-3 text-sm">
              <span className="font-bold text-ink">{item.name} x {item.quantity}</span>
              <span className="font-black text-slate-700">{formatMoney(item.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-soft p-6 text-3xl font-black text-brand">{formatMoney(order.total_price)}</div>
        <Link href={`/order/${order.id}`} className="mt-6 block rounded-2xl bg-brand px-6 py-4 text-center font-black text-white">
          주문 상세 보기
        </Link>
      </section>
    </main>
  );
}
