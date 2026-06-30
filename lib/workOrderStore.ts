// 제작 작업지시서 서버 저장소 — Postgres(가용 시) + 인메모리 폴백. (orderStore와 동일한 패턴)

import { adjustBoardStock } from "@/lib/boardStockStore";
import { getPool } from "@/lib/db";
import { computeJobEconomics } from "@/lib/jobEconomics";
import type { FurnitureInput } from "@/lib/types";
import type { WorkOrder, WorkOrderStatus } from "@/lib/workOrders";

let backend: "db" | "memory" | null = null;
const memory: WorkOrder[] = [];

async function ensure(): Promise<"db" | "memory"> {
  if (backend) return backend;
  try {
    const client = await getPool().connect();
    try {
      await client.query(`create table if not exists work_orders (
        id text primary key,
        title text not null,
        date text not null,
        status text not null default '대기',
        width_mm integer,
        module_count integer,
        has_wall boolean,
        layout text,
        note text,
        price numeric,
        parts_count integer,
        input_data jsonb,
        created_at bigint
      )`);
      // 기존 테이블에 신규 컬럼 보강(담당자/주문번호/최종승인)
      await client.query("alter table work_orders add column if not exists assignee text");
      await client.query("alter table work_orders add column if not exists order_number text");
      await client.query("alter table work_orders add column if not exists approved boolean default false");
      await client.query("alter table work_orders add column if not exists stock_applied boolean default false");
      backend = "db";
    } finally {
      client.release();
    }
  } catch {
    backend = "memory";
  }
  return backend;
}

type Row = {
  id: string;
  title: string;
  date: string;
  status: string;
  approved: boolean | null;
  assignee: string | null;
  order_number: string | null;
  width_mm: number | null;
  module_count: number | null;
  has_wall: boolean | null;
  layout: string | null;
  note: string | null;
  price: string | number | null;
  parts_count: number | null;
  input_data: FurnitureInput | null;
  stock_applied: boolean | null;
  created_at: string | number | null;
};

function rowToWO(r: Row): WorkOrder {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    status: (r.status as WorkOrderStatus) ?? "대기",
    approved: Boolean(r.approved),
    assignee: r.assignee ?? "",
    orderNumber: r.order_number ?? "",
    widthMm: Number(r.width_mm ?? 0),
    moduleCount: Number(r.module_count ?? 0),
    hasWall: Boolean(r.has_wall),
    layout: r.layout === "ㄱ자" ? "ㄱ자" : "일자",
    note: r.note ?? "",
    price: Number(r.price ?? 0),
    partsCount: Number(r.parts_count ?? 0),
    input: r.input_data ?? undefined,
    stockApplied: Boolean(r.stock_applied),
    createdAt: Number(r.created_at ?? 0),
  };
}

/** 작업 1건의 합판 사용량만큼 재고를 차감(sign=-1)하거나 복구(sign=+1). input 없으면 무시. */
async function applyStockForInput(input: FurnitureInput | undefined, sign: 1 | -1): Promise<void> {
  if (!input) return;
  try {
    const { sheetsBySpec } = computeJobEconomics(input);
    for (const s of sheetsBySpec) {
      await adjustBoardStock(s.specCode, sign * s.count);
    }
  } catch {
    // 계산 실패 시 재고는 건드리지 않음
  }
}

export async function listWorkOrders(): Promise<WorkOrder[]> {
  if ((await ensure()) === "memory") return [...memory].sort((a, b) => b.createdAt - a.createdAt);
  const { rows } = await getPool().query<Row>("select * from work_orders order by created_at desc");
  return rows.map(rowToWO);
}

export async function createWorkOrder(input: Omit<WorkOrder, "id" | "createdAt">): Promise<WorkOrder> {
  const item: WorkOrder = { ...input, id: `wo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now() };
  if ((await ensure()) === "memory") {
    memory.unshift(item);
    return item;
  }
  await getPool().query(
    `insert into work_orders (id,title,date,status,approved,assignee,order_number,width_mm,module_count,has_wall,layout,note,price,parts_count,input_data,created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [item.id, item.title, item.date, item.status, item.approved, item.assignee, item.orderNumber, item.widthMm, item.moduleCount, item.hasWall, item.layout, item.note, item.price, item.partsCount, item.input ? JSON.stringify(item.input) : null, item.createdAt],
  );
  return item;
}

export async function deleteWorkOrder(id: string): Promise<void> {
  if ((await ensure()) === "memory") {
    const i = memory.findIndex((o) => o.id === id);
    if (i >= 0) memory.splice(i, 1);
    return;
  }
  await getPool().query("delete from work_orders where id = $1", [id]);
}

export async function updateWorkOrder(id: string, patch: { status?: WorkOrderStatus; date?: string; assignee?: string; approved?: boolean }): Promise<void> {
  if ((await ensure()) === "memory") {
    const o = memory.find((x) => x.id === id);
    if (o) {
      if (patch.status) o.status = patch.status;
      if (patch.date) o.date = patch.date;
      if (patch.assignee !== undefined) o.assignee = patch.assignee;
      if (patch.approved !== undefined) {
        o.approved = patch.approved;
        // 최종 승인 시 재고 차감 / 승인 취소 시 복구 (멱등)
        if (patch.approved && !o.stockApplied) {
          await applyStockForInput(o.input, -1);
          o.stockApplied = true;
        } else if (!patch.approved && o.stockApplied) {
          await applyStockForInput(o.input, 1);
          o.stockApplied = false;
        }
      }
    }
    return;
  }
  if (patch.status) await getPool().query("update work_orders set status = $2 where id = $1", [id, patch.status]);
  if (patch.date) await getPool().query("update work_orders set date = $2 where id = $1", [id, patch.date]);
  if (patch.assignee !== undefined) await getPool().query("update work_orders set assignee = $2 where id = $1", [id, patch.assignee]);
  if (patch.approved !== undefined) {
    const { rows } = await getPool().query<Row>("select input_data, stock_applied from work_orders where id = $1", [id]);
    const cur = rows[0];
    const stockApplied = Boolean(cur?.stock_applied);
    await getPool().query("update work_orders set approved = $2 where id = $1", [id, patch.approved]);
    if (patch.approved && !stockApplied) {
      await applyStockForInput(cur?.input_data ?? undefined, -1);
      await getPool().query("update work_orders set stock_applied = true where id = $1", [id]);
    } else if (!patch.approved && stockApplied) {
      await applyStockForInput(cur?.input_data ?? undefined, 1);
      await getPool().query("update work_orders set stock_applied = false where id = $1", [id]);
    }
  }
}
