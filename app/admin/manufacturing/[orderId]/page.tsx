import { notFound } from "next/navigation";
import { ManufacturingTabs } from "@/components/ManufacturingTabs";
import { getStoredOrder, toManufacturingOrders } from "@/lib/orderStore";
import { hydratePlatformFromDatabase } from "@/lib/platformRepository";

export const dynamic = "force-dynamic";

export default async function ManufacturingPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    await hydratePlatformFromDatabase();
  } catch {
    // mock 모드: DB 없이도 제작지시서 표시
  }

  const stored = await getStoredOrder(orderId);
  if (!stored) notFound();
  const manufacturingOrders = toManufacturingOrders(stored);

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black text-brand">제작지시서 · {stored.order_number}</p>
          <h1 className="mt-1 text-3xl font-black text-ink">{stored.customer.name} · {stored.items.length}개 품목</h1>
        </div>
        <a href={`/admin/manufacturing/${stored.id}/print`} className="rounded-2xl border-2 border-brand px-5 py-3 text-sm font-black text-brand">
          작업지시서 PDF
        </a>
      </div>
      {manufacturingOrders.map((order, index) => (
        <section key={order.id}>
          {manufacturingOrders.length > 1 && (
            <h2 className="mb-3 text-xl font-black text-slate-700">품목 {index + 1}. {order.product_name}</h2>
          )}
          <ManufacturingTabs order={order} />
        </section>
      ))}
    </main>
  );
}
