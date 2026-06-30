import { NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/orderStore";
import { orderStatusLabels } from "@/lib/data";
import type { OrderStatus } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  let body: { status?: string; reviewNote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const status = body.status as OrderStatus;
  if (!status || !(status in orderStatusLabels)) {
    return NextResponse.json({ error: "유효하지 않은 주문 상태입니다." }, { status: 400 });
  }

  const order = await updateOrderStatus(orderId, status, body.reviewNote);
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ id: order.id, status: order.status });
}
