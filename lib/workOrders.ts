// 제작 작업지시서 — 서버(API) 저장으로 직원 간 공유. (타입 + 클라이언트 API 헬퍼)

import type { FurnitureInput } from "@/lib/types";

/** 공정 단계 — 어머니가 한눈에 보는 진행 흐름 */
export const WORK_STAGES = ["대기", "재단", "엣지", "조립", "검수", "완료"] as const;
export type WorkOrderStatus = (typeof WORK_STAGES)[number];

export type WorkOrder = {
  id: string;
  title: string; // 고객/현장명
  date: string; // 제작 예정일 YYYY-MM-DD
  status: WorkOrderStatus; // 공정 단계
  approved: boolean; // 최종 승인(완료 후 어머니가 확정)
  assignee: string; // 담당자
  orderNumber: string; // 연결된 주문번호(있으면)
  widthMm: number;
  moduleCount: number;
  hasWall: boolean;
  layout: "일자" | "ㄱ자";
  note: string;
  price: number;
  partsCount: number;
  input?: FurnitureInput; // 도면 복원용(선택)
  stockApplied?: boolean; // 최종 승인 시 합판 재고를 차감했는지(멱등 보장)
  createdAt: number;
};

/** 'YYYY-MM-DD' 로컬 날짜 문자열 (타임존 안전) */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── 클라이언트 API 헬퍼 (서버 공유 저장) ──
export async function fetchWorkOrders(): Promise<WorkOrder[]> {
  try {
    const res = await fetch("/api/work-orders", { cache: "no-store" });
    const data = (await res.json()) as { orders?: WorkOrder[] };
    return data.orders ?? [];
  } catch {
    return [];
  }
}

export async function createWorkOrder(order: Omit<WorkOrder, "id" | "createdAt">): Promise<WorkOrder | null> {
  try {
    const res = await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    const data = (await res.json()) as { order?: WorkOrder; error?: string };
    return data.order ?? null;
  } catch {
    return null;
  }
}

export async function deleteWorkOrder(id: string): Promise<void> {
  try {
    await fetch(`/api/work-orders/${id}`, { method: "DELETE" });
  } catch {
    // 무시
  }
}

export async function setWorkOrderStatus(id: string, status: WorkOrderStatus): Promise<void> {
  try {
    await fetch(`/api/work-orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  } catch {
    // 무시
  }
}

export async function setWorkOrderAssignee(id: string, assignee: string): Promise<void> {
  try {
    await fetch(`/api/work-orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignee }) });
  } catch {
    // 무시
  }
}

export async function setWorkOrderApproved(id: string, approved: boolean): Promise<void> {
  try {
    await fetch(`/api/work-orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved }) });
  } catch {
    // 무시
  }
}

export async function setWorkOrderDate(id: string, date: string): Promise<void> {
  try {
    await fetch(`/api/work-orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date }) });
  } catch {
    // 무시
  }
}
