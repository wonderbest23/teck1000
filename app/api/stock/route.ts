import { NextResponse } from "next/server";
import { listBoardStock, setBoardStock } from "@/lib/boardStockStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stock = await listBoardStock();
    return NextResponse.json({ stock });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "조회 실패", stock: [] }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: { specCode?: string; quantity?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!body.specCode || typeof body.quantity !== "number") {
    return NextResponse.json({ error: "규격 코드와 수량이 필요합니다." }, { status: 400 });
  }
  try {
    await setBoardStock(body.specCode, body.quantity);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "저장 실패" }, { status: 500 });
  }
}
