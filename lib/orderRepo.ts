// 주문 저장소 — Postgres(pg) 실 DB 구현. orderStore가 DB 가용 시 이 모듈을 사용한다.

import type { PoolClient } from "pg";
import { getPool } from "@/lib/db";
import { calculateCompositeQuote } from "@/lib/order";
import type { CompositeOrderDraft, FurnitureInput, OrderStatus } from "@/lib/types";
import type { StoredOrder, StoredOrderItem } from "@/lib/orderStore";

function makeOrderNumber(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const t = `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}`;
  return `${y}${m}${d}-${t}`;
}

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  shipping_address: string | null;
  status: string;
  total_price: string;
  requested_delivery_date: string | null;
  requested_install_date: string | null;
  visit_required: boolean;
  memo: string | null;
  review_note: string | null;
  created_at: string;
};

type ItemRow = {
  id: string;
  item_name: string;
  quantity: number;
  input_data: FurnitureInput;
  calculated_price: string;
  order_verdict: string | null;
  checklist_confirmations: string[] | null;
};

function toIsoDate(value: string | null): string {
  if (!value) return "";
  return value.length > 10 ? value.slice(0, 10) : value;
}

async function loadOrder(row: OrderRow, items: ItemRow[]): Promise<StoredOrder> {
  const storedItems: StoredOrderItem[] = items.map((item) => ({
    id: item.id,
    name: item.item_name,
    quantity: item.quantity,
    input: item.input_data,
    lineTotal: Number(item.calculated_price),
    order_verdict: (item.order_verdict as StoredOrderItem["order_verdict"]) ?? undefined,
    checklist_confirmations: item.checklist_confirmations ?? undefined,
  }));

  const draft: CompositeOrderDraft = {
    items: storedItems.map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, input: item.input })),
    schedule: {
      requested_delivery_date: toIsoDate(row.requested_delivery_date),
      requested_install_date: toIsoDate(row.requested_install_date),
      visit_required: row.visit_required,
    },
    customer: { name: row.customer_name, phone: row.customer_phone ?? "", email: row.customer_email ?? "", shipping_address: row.shipping_address ?? "", memo: row.memo ?? "" },
  };
  const composite = calculateCompositeQuote(draft);
  const sheet_count = composite.boardCutPlan.summaries.reduce((sum, summary) => sum + summary.sheet_count, 0);

  return {
    id: row.id,
    order_number: row.order_number,
    created_at: row.created_at,
    status: row.status as OrderStatus,
    customer: draft.customer,
    schedule: draft.schedule,
    items: storedItems,
    total_price: Number(row.total_price),
    sheet_count,
    review_note: row.review_note ?? undefined,
  };
}

export async function createOrderInDb(draft: CompositeOrderDraft): Promise<StoredOrder> {
  const quote = calculateCompositeQuote(draft);
  const now = new Date();
  const orderNumber = makeOrderNumber(now);
  const client: PoolClient = await getPool().connect();
  try {
    await client.query("begin");
    const orderResult = await client.query<OrderRow>(
      `insert into orders (order_number, customer_name, customer_phone, customer_email, shipping_address, status, total_price, requested_delivery_date, requested_install_date, visit_required, memo)
       values ($1,$2,$3,$4,$5,'submitted',$6,$7,$8,$9,$10)
       returning *`,
      [
        orderNumber,
        draft.customer.name,
        draft.customer.phone || null,
        draft.customer.email || null,
        draft.customer.shipping_address || null,
        quote.totalPrice,
        draft.schedule.requested_delivery_date || null,
        draft.schedule.visit_required ? draft.schedule.requested_install_date || null : null,
        draft.schedule.visit_required,
        draft.customer.memo || null,
      ],
    );
    const orderRow = orderResult.rows[0];

    const itemRows: ItemRow[] = [];
    for (let index = 0; index < quote.itemQuotes.length; index += 1) {
      const line = quote.itemQuotes[index];
      const inserted = await client.query<ItemRow>(
        `insert into order_items (order_id, item_name, quantity, input_data, calculated_price, warnings, sort_order, order_verdict, checklist_confirmations)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         returning *`,
        [
          orderRow.id,
          line.item.name,
          line.item.quantity,
          JSON.stringify(line.item.input),
          line.lineTotal,
          JSON.stringify(line.quote.warnings ?? []),
          index,
          line.item.order_verdict ?? null,
          JSON.stringify(line.item.checklist_confirmations ?? []),
        ],
      );
      itemRows.push(inserted.rows[0]);
    }

    await client.query(
      `insert into order_status_logs (order_id, from_status, to_status, memo) values ($1, null, 'submitted', null)`,
      [orderRow.id],
    );
    await client.query("commit");
    return loadOrder(orderRow, itemRows);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function getOrderFromDb(id: string): Promise<StoredOrder | undefined> {
  const pool = getPool();
  const orderResult = await pool.query<OrderRow>(
    `select * from orders where id::text = $1 or order_number = $1 limit 1`,
    [id],
  );
  const orderRow = orderResult.rows[0];
  if (!orderRow) return undefined;
  const items = await pool.query<ItemRow>(`select * from order_items where order_id = $1 order by sort_order asc`, [orderRow.id]);
  return loadOrder(orderRow, items.rows);
}

export async function listOrdersFromDb(): Promise<StoredOrder[]> {
  const pool = getPool();
  const orders = await pool.query<OrderRow>(`select * from orders order by created_at desc`);
  if (orders.rows.length === 0) return [];
  const ids = orders.rows.map((row) => row.id);
  const items = await pool.query<ItemRow & { order_id: string }>(
    `select * from order_items where order_id = any($1::uuid[]) order by sort_order asc`,
    [ids],
  );
  const byOrder = new Map<string, ItemRow[]>();
  for (const item of items.rows) {
    const list = byOrder.get(item.order_id) ?? [];
    list.push(item);
    byOrder.set(item.order_id, list);
  }
  return Promise.all(orders.rows.map((row) => loadOrder(row, byOrder.get(row.id) ?? [])));
}

export async function updateStatusInDb(id: string, status: OrderStatus, reviewNote?: string): Promise<StoredOrder | undefined> {
  const pool = getPool();
  const existing = await pool.query<{ id: string; status: string }>(
    `select id, status from orders where id::text = $1 or order_number = $1 limit 1`,
    [id],
  );
  const row = existing.rows[0];
  if (!row) return undefined;
  await pool.query(
    `update orders set status = $2, review_note = coalesce($3, review_note), updated_at = now() where id = $1`,
    [row.id, status, reviewNote ?? null],
  );
  await pool.query(
    `insert into order_status_logs (order_id, from_status, to_status, memo) values ($1, $2, $3, $4)`,
    [row.id, row.status, status, reviewNote ?? null],
  );
  return getOrderFromDb(row.id);
}

export async function pingDb(): Promise<boolean> {
  try {
    await getPool().query("select 1");
    return true;
  } catch {
    return false;
  }
}
