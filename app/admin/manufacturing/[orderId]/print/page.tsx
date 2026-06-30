import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/PrintButton";
import { orderStatusLabels } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { getStoredOrder, toManufacturingOrders } from "@/lib/orderStore";

export const dynamic = "force-dynamic";

export default async function WorkOrderPrintPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const stored = await getStoredOrder(orderId);
  if (!stored) notFound();
  const orders = toManufacturingOrders(stored);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8 text-slate-900 print:px-0 print:py-0">
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 12mm; } body { -webkit-print-color-adjust: exact; } }`}</style>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black text-brand">작업지시서 (WORK ORDER)</div>
          <h1 className="mt-1 text-2xl font-black">{stored.order_number}</h1>
        </div>
        <PrintButton />
      </div>

      <table className="mb-6 w-full border-collapse text-sm">
        <tbody>
          <Row2 a="고객" av={`${stored.customer.name} / ${stored.customer.phone}`} b="상태" bv={orderStatusLabels[stored.status]} />
          <Row2 a="배송지" av={stored.customer.shipping_address || "-"} b="원판 소요" bv={`${stored.sheet_count}장`} />
          <Row2 a="희망 배송/설치" av={`${stored.schedule.requested_delivery_date || "-"} / ${stored.schedule.visit_required ? stored.schedule.requested_install_date || "-" : "배송만"}`} b="합계" bv={formatMoney(stored.total_price)} />
          {stored.review_note && <Row2 a="검수 메모" av={stored.review_note} b="" bv="" />}
        </tbody>
      </table>

      {orders.map((order, index) => (
        <section key={order.id} className="mb-8 break-inside-avoid">
          <h2 className="mb-2 border-b-2 border-slate-900 pb-1 text-lg font-black">
            품목 {index + 1}. {order.product_name} — {order.input.width_mm}×{order.input.height_mm}×{order.input.depth_mm}mm / {order.input.material}
          </h2>

          <h3 className="mt-3 text-sm font-black text-slate-600">재단 부재 (BOM)</h3>
          <table className="mt-1 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-left">
                <Th>부재명</Th><Th>가로(mm)</Th><Th>세로(mm)</Th><Th>수량</Th><Th>자재</Th><Th>비고</Th>
              </tr>
            </thead>
            <tbody>
              {order.quote.parts.map((part, i) => (
                <tr key={`${part.name}-${i}`} className="border-b border-slate-200">
                  <Td>{part.name}</Td><Td>{part.width_mm}</Td><Td>{part.height_mm}</Td><Td>{part.quantity}</Td><Td>{part.material}</Td><Td>{part.note ?? ""}</Td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-600">하드웨어</h3>
              <table className="mt-1 w-full border-collapse text-xs">
                <tbody>
                  {order.quote.hardwareTasks.map((task, i) => (
                    <tr key={`${task.hardware_name}-${i}`} className="border-b border-slate-200">
                      <Td>{task.hardware_name} {task.spec ? `(${task.spec})` : ""}</Td>
                      <Td>{task.quantity}{task.unit}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-600">엣지 가공</h3>
              <table className="mt-1 w-full border-collapse text-xs">
                <tbody>
                  {order.quote.edgeTasks.filter((task) => task.total_edge_length_mm > 0).map((task, i) => (
                    <tr key={`${task.part_name}-${i}`} className="border-b border-slate-200">
                      <Td>{task.part_name}</Td>
                      <Td>{task.note}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="border border-slate-300 px-2 py-1 font-black">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="border border-slate-200 px-2 py-1">{children}</td>;
}
function Row2({ a, av, b, bv }: { a: string; av: string; b: string; bv: string }) {
  return (
    <tr className="border-b border-slate-200">
      <td className="bg-slate-50 px-2 py-1 font-black">{a}</td>
      <td className="px-2 py-1">{av}</td>
      <td className="bg-slate-50 px-2 py-1 font-black">{b}</td>
      <td className="px-2 py-1">{bv}</td>
    </tr>
  );
}
