import Link from "next/link";
import { orderStatusLabels } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";
import { listStoredOrders } from "@/lib/orderStore";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listStoredOrders();

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-black text-ink">주문관리</h1>
      <p className="mt-2 text-slate-500">접수된 실주문을 검수·확정합니다. 총 {orders.length}건</p>
      <div className="mt-8 overflow-x-auto rounded-3xl bg-white p-4 shadow-card">
        <table className="factory-table">
          <thead>
            <tr><th>주문번호</th><th>고객명</th><th>품목</th><th>금액</th><th>주문상태</th><th>주문일</th></tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const title = order.items.length > 1 ? `${order.items[0]?.name} 외 ${order.items.length - 1}건` : order.items[0]?.name ?? "-";
              return (
                <tr key={order.id}>
                  <td><Link className="font-black text-brand" href={`/admin/orders/${order.id}`}>{order.order_number}</Link></td>
                  <td>{order.customer.name}</td>
                  <td>{title}</td>
                  <td>{formatMoney(order.total_price)}</td>
                  <td>{orderStatusLabels[order.status]}</td>
                  <td>{formatDate(order.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
