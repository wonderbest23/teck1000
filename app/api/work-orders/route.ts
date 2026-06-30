import { NextResponse } from "next/server";
import { createWorkOrder, listWorkOrders } from "@/lib/workOrderStore";
import type { WorkOrder } from "@/lib/workOrders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const orders = await listWorkOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "조회 실패", orders: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: Partial<WorkOrder>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!body.title?.trim() || !body.date) {
    return NextResponse.json({ error: "이름과 제작 예정일이 필요합니다." }, { status: 400 });
  }
  try {
    const order = await createWorkOrder({
      title: body.title.trim(),
      date: body.date,
      status: body.status ?? "대기",
      approved: Boolean(body.approved),
      assignee: body.assignee ?? "",
      orderNumber: body.orderNumber ?? "",
      widthMm: Number(body.widthMm ?? 0),
      moduleCount: Number(body.moduleCount ?? 0),
      hasWall: Boolean(body.hasWall),
      layout: body.layout === "ㄱ자" ? "ㄱ자" : "일자",
      note: body.note ?? "",
      price: Number(body.price ?? 0),
      partsCount: Number(body.partsCount ?? 0),
      input: body.input,
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "저장 실패" }, { status: 500 });
  }
}
