// 합판 재고 — 클라이언트 API 헬퍼

import type { BoardStock } from "@/lib/boardStockStore";

export type { BoardStock } from "@/lib/boardStockStore";

export async function fetchBoardStock(): Promise<BoardStock[]> {
  try {
    const res = await fetch("/api/stock", { cache: "no-store" });
    const data = (await res.json()) as { stock?: BoardStock[] };
    return data.stock ?? [];
  } catch {
    return [];
  }
}

export async function setBoardStockQty(specCode: string, quantity: number): Promise<void> {
  try {
    await fetch("/api/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ specCode, quantity }),
    });
  } catch {
    // 무시
  }
}
