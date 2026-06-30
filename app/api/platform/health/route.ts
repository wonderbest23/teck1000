import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";

export async function GET() {
  try {
    const connected = await checkDatabaseConnection();
    if (!connected) {
      return NextResponse.json({ ok: false, connected: false }, { status: 503 });
    }
    const { rows } = await (await import("@/lib/db")).getPool().query("select count(*)::int as settings from platform_settings");
    return NextResponse.json({ ok: true, connected: true, settings: rows[0]?.settings ?? 0 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, connected: false, error: error instanceof Error ? error.message : "DB 오류" },
      { status: 503 },
    );
  }
}
