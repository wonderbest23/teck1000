"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FACTORY_PROCESS_PROFILES,
  setActiveFactoryCode,
  type FactoryProcessProfile,
} from "@/lib/processStandards";
import {
  getActivePricingTier,
  PRICING_TIER_LABELS,
  setActivePricingTier,
  type PricingTier,
} from "@/lib/pricingTier";

type ConfigResponse = {
  ok: boolean;
  databaseConnected?: boolean;
  factoryCode?: string;
  pricingTier?: PricingTier;
  factories?: FactoryProcessProfile[];
  error?: string;
};

export function FactorySettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [factoryCode, setFactoryCode] = useState("default");
  const [pricingTier, setPricingTier] = useState<PricingTier>(getActivePricingTier());
  const [factories, setFactories] = useState<FactoryProcessProfile[]>(FACTORY_PROCESS_PROFILES);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platform/config")
      .then((response) => response.json())
      .then((data: ConfigResponse) => {
        if (data.ok && data.factoryCode && data.pricingTier) {
          setDbConnected(Boolean(data.databaseConnected));
          setFactoryCode(data.factoryCode);
          setPricingTier(data.pricingTier);
          setFactories(data.factories ?? FACTORY_PROCESS_PROFILES);
          setActiveFactoryCode(data.factoryCode);
          setActivePricingTier(data.pricingTier);
        } else {
          setError(data.error ?? "DB에 연결되지 않았습니다. 세션 설정만 사용합니다.");
          setFactories(data.factories ?? FACTORY_PROCESS_PROFILES);
        }
      })
      .catch(() => setError("설정을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const profile = useMemo(
    () => factories.find((candidate) => candidate.factoryCode === factoryCode) ?? factories[0],
    [factories, factoryCode],
  );

  async function persist(nextFactory: string, nextTier: PricingTier) {
    setSaving(true);
    setError(null);
    setActiveFactoryCode(nextFactory);
    setActivePricingTier(nextTier);

    try {
      const response = await fetch("/api/platform/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factoryCode: nextFactory, pricingTier: nextTier }),
      });
      const data: ConfigResponse = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "저장 실패");
      }
      setDbConnected(true);
      setFactories(data.factories ?? factories);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "DB 저장 실패 — 세션에만 반영됨");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-3xl bg-white p-6 text-sm text-slate-600 shadow-card">DB 설정 불러오는 중…</div>;
  }

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl px-4 py-3 text-sm font-bold ${dbConnected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
      >
        {dbConnected ? "PostgreSQL 연결됨 — 설정이 DB에 저장됩니다." : "DB 미연결 — npm run db:up 후 개발 서버를 재시작하세요."}
        {saving && <span className="ml-2 text-slate-500">저장 중…</span>}
      </div>
      {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <section className="rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-2xl font-black text-ink">공장 프로필</h2>
        <p className="mt-2 text-sm text-slate-600">재단 kerf·trim·공정 순서·포장 규칙이 제작지시서와 재단 플랜에 반영됩니다.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {factories.map((candidate) => (
            <button
              key={candidate.factoryCode}
              type="button"
              onClick={() => {
                setFactoryCode(candidate.factoryCode);
                void persist(candidate.factoryCode, pricingTier);
              }}
              className={`rounded-2xl border p-4 text-left transition ${
                factoryCode === candidate.factoryCode ? "border-brand bg-brand/5" : "border-slate-200 bg-soft"
              }`}
            >
              <div className="font-black text-ink">{candidate.label}</div>
              <div className="mt-2 text-xs leading-5 text-slate-600">
                kerf {candidate.kerfMm}mm · trim {candidate.trimWidthMm}mm
                <br />
                공정: {candidate.cutSequence.join(" → ")}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-2xl font-black text-ink">단가 정책</h2>
        <p className="mt-2 text-sm text-slate-600">공개가는 고객 견적, 계약가는 공급·원가 산출에 사용합니다.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(PRICING_TIER_LABELS) as PricingTier[]).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => {
                setPricingTier(tier);
                void persist(factoryCode, tier);
              }}
              className={`rounded-2xl px-4 py-3 text-sm font-black ${
                pricingTier === tier ? "bg-brand text-white" : "bg-soft text-slate-700"
              }`}
            >
              {PRICING_TIER_LABELS[tier]}
            </button>
          ))}
        </div>
      </section>

      {profile && (
        <section className="rounded-3xl bg-soft p-6">
          <h3 className="text-lg font-black text-ink">현재 적용값</h3>
          <dl className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <dt className="font-bold text-slate-500">공장</dt>
              <dd>{profile.label}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">단가</dt>
              <dd>{PRICING_TIER_LABELS[pricingTier]}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">포장</dt>
              <dd>{profile.packingRule}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">주방 설치 인시</dt>
              <dd>{profile.installHoursKitchen}h</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}
