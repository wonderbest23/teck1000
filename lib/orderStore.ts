// 주문 저장소 (mock / 인메모리) — 추후 Supabase 등 실제 DB로 교체 가능한 구조.
// 서버 프로세스 메모리에 보관하므로 재시작 시 초기화된다 (개발/데모용).

import { calculateCompositeQuote } from "@/lib/order";
import { calculateQuote } from "@/lib/quote";
import { sampleOrders } from "@/lib/data";
import type { CompositeOrderDraft, CustomerInfo, FurnitureInput, Order, OrderStatus, RequestedSchedule } from "@/lib/types";

export type StoredOrderItem = {
  id: string;
  name: string;
  quantity: number;
  input: FurnitureInput;
  lineTotal: number;
  order_verdict?: "ready" | "needs_review" | "inquiry_required" | "blocked";
  checklist_confirmations?: string[];
};

export type StoredOrder = {
  id: string;
  order_number: string;
  created_at: string;
  status: OrderStatus;
  customer: CustomerInfo;
  schedule: RequestedSchedule;
  items: StoredOrderItem[];
  total_price: number;
  sheet_count: number;
  review_note?: string;
};

// globalThis에 보관해 dev 핫리로드 사이에도 유지
const globalForOrders = globalThis as unknown as { __teckOrders?: StoredOrder[] };

function seedFromSamples(): StoredOrder[] {
  return sampleOrders.map((order) => ({
    id: order.id,
    order_number: order.order_number,
    created_at: order.created_at,
    status: order.status,
    customer: {
      name: order.customer_name,
      phone: order.phone,
      email: order.email,
      shipping_address: order.shipping_address,
      memo: order.request_memo,
    },
    schedule: { requested_delivery_date: "", requested_install_date: "", visit_required: false },
    items: [
      {
        id: `${order.id}-1`,
        name: order.product_name,
        quantity: 1,
        input: order.input,
        lineTotal: order.total_price,
      },
    ],
    total_price: order.total_price,
    sheet_count: order.quote.sheetCount,
  }));
}

function store(): StoredOrder[] {
  if (!globalForOrders.__teckOrders) {
    globalForOrders.__teckOrders = seedFromSamples();
  }
  return globalForOrders.__teckOrders;
}

function makeOrderNumber(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const time = `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}`;
  return `${year}${month}${day}-${time}`;
}

// ---- 백엔드 선택: DB 가용 시 Postgres, 아니면 인메모리 ----

let backendPromise: Promise<"db" | "memory"> | null = null;

async function resolveBackend(): Promise<"db" | "memory"> {
  if (!backendPromise) {
    backendPromise = (async () => {
      try {
        const { pingDb } = await import("@/lib/orderRepo");
        const ok = await Promise.race([
          pingDb(),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2500)),
        ]);
        if (!ok) {
          console.warn(
            "[orderStore] DB 연결 실패 — 인메모리 모드로 동작합니다. ⚠ 주문 데이터는 서버 재시작 시 사라집니다. 운영 전 DATABASE_URL/마이그레이션을 확인하세요.",
          );
        }
        return ok ? "db" : "memory";
      } catch {
        console.warn(
          "[orderStore] DB 모듈 로드/핑 실패 — 인메모리 모드(데이터 비영속). 운영 전 DB 연결을 확인하세요.",
        );
        return "memory";
      }
    })();
  }
  return backendPromise;
}

/** 현재 주문 저장 백엔드 (관리자 진단용). "memory"면 비영속. */
export async function getOrderBackend(): Promise<"db" | "memory"> {
  return resolveBackend();
}

function createOrderInMemory(draft: CompositeOrderDraft): StoredOrder {
  const quote = calculateCompositeQuote(draft);
  const now = new Date();
  const id = `ord-${now.getTime().toString(36)}`;
  const order: StoredOrder = {
    id,
    order_number: makeOrderNumber(now),
    created_at: now.toISOString(),
    status: "submitted",
    customer: draft.customer,
    schedule: draft.schedule,
    items: quote.itemQuotes.map((line) => ({
      id: line.item.id,
      name: line.item.name,
      quantity: line.item.quantity,
      input: line.item.input,
      lineTotal: line.lineTotal,
      order_verdict: line.item.order_verdict,
      checklist_confirmations: line.item.checklist_confirmations,
    })),
    total_price: quote.totalPrice,
    sheet_count: quote.boardCutPlan.summaries.reduce((sum, summary) => sum + summary.sheet_count, 0),
  };
  store().unshift(order);
  return order;
}

export async function createOrder(draft: CompositeOrderDraft): Promise<StoredOrder> {
  if ((await resolveBackend()) === "db") {
    const { createOrderInDb } = await import("@/lib/orderRepo");
    return createOrderInDb(draft);
  }
  return createOrderInMemory(draft);
}

export async function getStoredOrder(id: string): Promise<StoredOrder | undefined> {
  if ((await resolveBackend()) === "db") {
    const { getOrderFromDb } = await import("@/lib/orderRepo");
    return getOrderFromDb(id);
  }
  return store().find((order) => order.id === id || order.order_number === id);
}

export async function listStoredOrders(): Promise<StoredOrder[]> {
  if ((await resolveBackend()) === "db") {
    const { listOrdersFromDb } = await import("@/lib/orderRepo");
    return listOrdersFromDb();
  }
  return [...store()];
}

export async function updateOrderStatus(id: string, status: OrderStatus, reviewNote?: string): Promise<StoredOrder | undefined> {
  if ((await resolveBackend()) === "db") {
    const { updateStatusInDb } = await import("@/lib/orderRepo");
    return updateStatusInDb(id, status, reviewNote);
  }
  const order = store().find((entry) => entry.id === id || entry.order_number === id);
  if (!order) return undefined;
  order.status = status;
  if (reviewNote !== undefined) order.review_note = reviewNote;
  return order;
}

/** 제작지시서용: 복합 주문의 각 품목을 단일 Order 형태로 변환 */
export function toManufacturingOrders(order: StoredOrder): Order[] {
  return order.items.map((item, index) => ({
    id: `${order.id}-${index + 1}`,
    order_number: `${order.order_number}-${index + 1}`,
    customer_name: order.customer.name,
    phone: order.customer.phone,
    email: order.customer.email,
    shipping_address: order.customer.shipping_address,
    request_memo: order.customer.memo,
    product_name: item.name,
    status: order.status,
    total_price: item.lineTotal,
    input: item.input,
    quote: calculateQuote(item.input),
    created_at: order.created_at,
  }));
}
