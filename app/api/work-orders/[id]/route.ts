import { NextResponse } from "next/server";
import { deleteWorkOrder, updateWorkOrder } from "@/lib/workOrderStore";
import type { WorkOrderStatus } from "@/lib/workOrders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { status?: WorkOrderStatus; date?: string; assignee?: string; approved?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  try {
    await updateWorkOrder(id, { status: body.status, date: body.date, assignee: body.assignee, approved: body.approved });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "수정 실패" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteWorkOrder(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "삭제 실패" }, { status: 500 });
  }
}
