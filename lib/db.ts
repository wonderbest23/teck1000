import { createRequire } from "node:module";

// pg는 정적 import 하지 않는다 — Cloudflare Workers 번들에는 Node 전용 pg가 들어가면 안 되므로
// 간접 require로 지연 로딩한다(Node 서버에서만 실제 로드, Workers에선 호출 시 throw→메모리 폴백).
type PgPool = import("pg").Pool;
type PgPoolCtor = typeof import("pg").Pool;

let pool: PgPool | null = null;
let PoolCtor: PgPoolCtor | null = null;

function loadPoolCtor(): PgPoolCtor {
  if (!PoolCtor) {
    const req = createRequire(import.meta.url);
    PoolCtor = (req("pg") as typeof import("pg")).Pool;
  }
  return PoolCtor;
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
}

export function getPool(): PgPool {
  if (!pool) {
    const Pool = loadPoolCtor();
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      max: 5,
    });
    // 유휴 클라이언트 오류로 프로세스가 죽지 않도록 처리 (DB 미연결/네트워크 단절 대비)
    pool.on("error", () => {});
  }
  return pool;
}

export async function checkDatabaseConnection() {
  const client = await getPool().connect();
  try {
    await client.query("select 1");
    return true;
  } finally {
    client.release();
  }
}
