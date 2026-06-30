import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";
import {
  fetchPlatformSettings,
  fetchProcessStandards,
  hydratePlatformFromDatabase,
  savePlatformPreferences,
} from "@/lib/platformRepository";
import { FACTORY_PROCESS_PROFILES } from "@/lib/processStandards";
import { PRICING_TIER_LABELS } from "@/lib/pricingTier";

export async function GET() {
  try {
    const connected = await checkDatabaseConnection();
    if (!connected) {
      return NextResponse.json({ ok: false, databaseConnected: false, error: "DB 연결 실패" }, { status: 503 });
    }

    const state = await hydratePlatformFromDatabase();
    return NextResponse.json({
      ok: true,
      databaseConnected: true,
      factoryCode: state.factoryCode,
      pricingTier: state.pricingTier,
      factories: FACTORY_PROCESS_PROFILES,
      pricingTiers: PRICING_TIER_LABELS,
      settings: state.settings,
      processStandards: state.processStandards,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        databaseConnected: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
        factories: FACTORY_PROCESS_PROFILES,
        pricingTiers: PRICING_TIER_LABELS,
      },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { factoryCode?: string; pricingTier?: "public" | "contract" };
    if (!body.factoryCode || !body.pricingTier) {
      return NextResponse.json({ ok: false, error: "factoryCode와 pricingTier가 필요합니다." }, { status: 400 });
    }

    const state = await savePlatformPreferences({
      factoryCode: body.factoryCode,
      pricingTier: body.pricingTier,
    });

    return NextResponse.json({
      ok: true,
      databaseConnected: true,
      factoryCode: state.factoryCode,
      pricingTier: state.pricingTier,
      factories: FACTORY_PROCESS_PROFILES,
      settings: await fetchPlatformSettings(),
      processStandards: await fetchProcessStandards(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "저장 실패" },
      { status: 500 },
    );
  }
}
