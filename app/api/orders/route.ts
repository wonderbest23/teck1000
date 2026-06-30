import { NextResponse } from "next/server";
import { createOrder, listStoredOrders } from "@/lib/orderStore";
import { validateOrderInput } from "@/lib/order-validation";
import type { CompositeOrderDraft } from "@/lib/types";

export async function POST(request: Request) {
  let draft: CompositeOrderDraft;
  try {
    draft = (await request.json()) as CompositeOrderDraft;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!draft?.items?.length) {
    return NextResponse.json({ error: "장바구니에 담긴 품목이 없습니다." }, { status: 400 });
  }
  if (!draft.customer?.name?.trim() || !draft.customer?.phone?.trim() || !draft.customer?.shipping_address?.trim()) {
    return NextResponse.json({ error: "주문자 정보(이름/연락처/주소)를 입력해주세요." }, { status: 400 });
  }

  // 서버측 검증 강제 — 브라우저 우회 방지. 차단(blocked) 항목이 있으면 주문 거부.
  const blocked = draft.items
    .map((item, index) => ({ index, name: item.name, result: validateOrderInput(item.input) }))
    .filter((entry) => entry.result.verdict === "blocked");
  if (blocked.length > 0) {
    const first = blocked[0];
    const reason = first.result.issues.find((issue) => issue.blocksOrder)?.message ?? "제작 불가 구성입니다.";
    return NextResponse.json(
      {
        error: `주문할 수 없는 항목이 있습니다: ${first.name} — ${reason}`,
        blockedItems: blocked.map((entry) => ({ index: entry.index, name: entry.name, verdict: entry.result.verdict })),
      },
      { status: 422 },
    );
  }

  const order = await createOrder(draft);
  return NextResponse.json({ id: order.id, order_number: order.order_number, total_price: order.total_price }, { status: 201 });
}

export async function GET() {
  return NextResponse.json({ orders: await listStoredOrders() });
}
