// 합판(원판) 재고 저장소 — Postgres(가용 시) + 인메모리 폴백. (workOrderStore와 동일한 패턴)

import { BOARD_SHEET_SPECS } from "@/lib/boardPricing";
import { getPool } from "@/lib/db";

export type BoardStock = {
  specCode: string;
  label: string; // 규격 설명 (예: "PB 1220×2440×18")
  quantity: number; // 남은 장수
  updatedAt: number;
};

function specLabel(code: string): string {
  const s = BOARD_SHEET_SPECS.find((x) => x.code === code);
  if (!s) return code;
  return `${s.materialGroup.toUpperCase()} ${s.widthMm}×${s.heightMm}×${s.thicknessMm}`;
}

const seeds: BoardStock[] = BOARD_SHEET_SPECS.map((s) => ({
  specCode: s.code,
  label: specLabel(s.code),
  quantity: 0,
  updatedAt: 0,
}));

let backend: "db" | "memory" | null = null;
const memory: BoardStock[] = seeds.map((s) => ({ ...s }));

async function ensure(): Promise<"db" | "memory"> {
  if (backend) return backend;
  try {
    const client = await getPool().connect();
    try {
      await client.query(`create table if not exists board_stock (
        spec_code text primary key,
        label text not null,
        quantity integer not null default 0,
        updated_at bigint
      )`);
      // 규격 마스터로 시드(없는 코드만)
      for (const s of seeds) {
        await client.query(
          "insert into board_stock (spec_code, label, quantity, updated_at) values ($1,$2,0,$3) on conflict (spec_code) do nothing",
          [s.specCode, s.label, Date.now()],
        );
      }
      backend = "db";
    } finally {
      client.release();
    }
  } catch {
    backend = "memory";
  }
  return backend;
}

type Row = { spec_code: string; label: string; quantity: number | string; updated_at: string | number | null };
function rowToStock(r: Row): BoardStock {
  return { specCode: r.spec_code, label: r.label, quantity: Number(r.quantity ?? 0), updatedAt: Number(r.updated_at ?? 0) };
}

export async function listBoardStock(): Promise<BoardStock[]> {
  if ((await ensure()) === "memory") return memory.map((s) => ({ ...s }));
  const { rows } = await getPool().query<Row>("select * from board_stock order by spec_code");
  return rows.map(rowToStock);
}

export async function setBoardStock(specCode: string, quantity: number): Promise<void> {
  const qty = Math.max(0, Math.floor(quantity));
  const label = specLabel(specCode);
  if ((await ensure()) === "memory") {
    const s = memory.find((x) => x.specCode === specCode);
    if (s) {
      s.quantity = qty;
      s.updatedAt = Date.now();
    } else {
      memory.push({ specCode, label, quantity: qty, updatedAt: Date.now() });
    }
    return;
  }
  await getPool().query(
    "insert into board_stock (spec_code, label, quantity, updated_at) values ($1,$2,$3,$4) on conflict (spec_code) do update set quantity = excluded.quantity, label = excluded.label, updated_at = excluded.updated_at",
    [specCode, label, qty, Date.now()],
  );
}

/** delta 만큼 증감(음수=차감). 0 미만으로는 내려가지 않음(floor 0). */
export async function adjustBoardStock(specCode: string, delta: number): Promise<void> {
  const label = specLabel(specCode);
  if ((await ensure()) === "memory") {
    const s = memory.find((x) => x.specCode === specCode);
    if (s) {
      s.quantity = Math.max(0, s.quantity + delta);
      s.updatedAt = Date.now();
    } else {
      memory.push({ specCode, label, quantity: Math.max(0, delta), updatedAt: Date.now() });
    }
    return;
  }
  await getPool().query(
    "insert into board_stock (spec_code, label, quantity, updated_at) values ($1,$2,greatest(0,$3),$4) on conflict (spec_code) do update set quantity = greatest(0, board_stock.quantity + $3), updated_at = excluded.updated_at",
    [specCode, label, delta, Date.now()],
  );
}
