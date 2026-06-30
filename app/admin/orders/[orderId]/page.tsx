import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminOrderStatusControls } from "@/components/admin/AdminOrderStatusControls";
import { CreateWorkOrderButton } from "@/components/admin/CreateWorkOrderButton";
import { orderStatusLabels } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { getStoredOrder } from "@/lib/orderStore";

export const dynamic = "force-dynamic";

const VERDICT_TAG: Record<string, { label: string; cls: string }> = {
  ready: { label: "바로주문", cls: "bg-emerald-50 text-emerald-700" },
  needs_review: { label: "검수요청", cls: "bg-amber-50 text-amber-800" },
  inquiry_required: { label: "제조문의", cls: "bg-violet-50 text-violet-700" },
  blocked: { label: "검토필요", cls: "bg-rose-50 text-rose-700" },
};

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await getStoredOrder(orderId);
  if (!order) notFound();

  // 작업지시서 프리셋 — 주문의 대표 품목(첫 품목)에서 요약 추출
  const firstItem = order.items[0];
  const fi = firstItem?.input;
  const isKitchen = fi?.productType === "kitchen_full_set";
  const moduleCount = isKitchen ? (fi?.kitchen_modules_mm?.length ?? 0) : 1;
  const hasWall = isKitchen ? ((fi?.kitchen_wall_hidden_indices?.length ?? 0) < moduleCount) : false;
  const workOrderPreset = {
    title: `${order.customer.name} ${firstItem?.name ?? "제작"}`,
    date: order.schedule?.requested_install_date || "",
    approved: false,
    assignee: "",
    orderNumber: order.order_number,
    widthMm: fi?.width_mm ?? 0,
    moduleCount,
    hasWall,
    layout: (isKitchen && fi?.kitchen_layout_shape === "l_shape" ? "ㄱ자" : "일자") as "일자" | "ㄱ자",
    note: order.items.map((it) => `${it.name}×${it.quantity}`).join(", "),
    price: Number(order.total_price ?? 0),
    partsCount: 0,
    input: fi,
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-brand">주문 상세 · {orderStatusLabels[order.status]}</p>
          <h1 className="mt-3 text-4xl font-black text-ink">{order.order_number}</h1>
          <p className="mt-2 text-slate-600">{order.customer.name} · {order.customer.phone}</p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <CreateWorkOrderButton preset={workOrderPreset} />
          <Link href={`/admin/manufacturing/${order.id}`} className="rounded-2xl bg-brand px-6 py-4 font-black text-white">
            제작지시서 보기
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl bg-white p-6 shadow-card">
          <h2 className="text-2xl font-black text-ink">주문 품목 ({order.items.length}종)</h2>
          <div className="mt-4 space-y-3">
            {order.items.map((item) => {
              const tag = item.order_verdict ? VERDICT_TAG[item.order_verdict] : null;
              return (
                <div key={item.id} className="rounded-2xl bg-soft p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-ink">{item.name} x {item.quantity}</span>
                      {tag && <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${tag.cls}`}>{tag.label}</span>}
                    </div>
                    <span className="font-black text-brand">{formatMoney(item.lineTotal)}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {item.input.width_mm} x {item.input.height_mm} x {item.input.depth_mm}mm · {item.input.material}
                  </div>
                  {item.checklist_confirmations && item.checklist_confirmations.length > 0 && (
                    <div className="mt-1 text-[11px] font-bold text-emerald-600">고객 확인 {item.checklist_confirmations.length}건 완료</div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-ink px-5 py-4 text-white">
            <span className="text-sm font-bold">합계 · 원판 {order.sheet_count}장</span>
            <span className="text-2xl font-black">{formatMoney(order.total_price)}</span>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-card">
            <h2 className="text-2xl font-black text-ink">배송/설치</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <Info label="주소" value={order.customer.shipping_address || "-"} />
              <Info label="희망 배송" value={order.schedule.requested_delivery_date || "-"} />
              <Info label="희망 설치" value={order.schedule.visit_required ? order.schedule.requested_install_date || "-" : "배송만"} />
              <Info label="요청사항" value={order.customer.memo || "-"} />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-card">
            <h2 className="text-2xl font-black text-ink">검수 / 상태 변경</h2>
            <div className="mt-4">
              <AdminOrderStatusControls orderId={order.id} currentStatus={order.status} reviewNote={order.review_note} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl bg-soft p-4">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-900">{value}</span>
    </div>
  );
}
