"use client";

import { useMemo, useState } from "react";
import {
  accessories,
  baseCabinetShippingFor,
  doorColors,
  doorFinishNote,
  epPanels,
  getInstallTier,
  getRemovalPrice,
  hoodDrillingOption,
  installFloorSurcharge,
  installRegionSurcharge,
  installServiceableRegions,
  orderPolicy,
  productSpecs,
  wallCabinets,
  wallCabinetShippingFor,
} from "@/lib/retailCatalog";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const doorTypeLabel = { "1door": "1도어형", double: "양문 도어형", triple: "3도어형" } as const;

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
      <h2 className="text-base font-black text-ink">{title}</h2>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function RetailSpecSheet() {
  const [color, setColor] = useState(doorColors[0].name);
  const [cabinetKind, setCabinetKind] = useState<"wall" | "base">("base");
  const [shipWidth, setShipWidth] = useState(1200);
  const [totalWidth, setTotalWidth] = useState(2400);
  const [floor, setFloor] = useState(1);
  const [noElevator, setNoElevator] = useState(false);
  const [surchargeRegion, setSurchargeRegion] = useState(false);
  const [withRemoval, setWithRemoval] = useState(false);

  const shipCost = useMemo(
    () => (cabinetKind === "wall" ? wallCabinetShippingFor(shipWidth) : baseCabinetShippingFor(shipWidth)),
    [cabinetKind, shipWidth],
  );

  const install = useMemo(() => {
    const tier = getInstallTier(totalWidth);
    if (!tier) return null;
    let floorAdd = 0;
    if (noElevator && floor >= installFloorSurcharge.appliesFromFloor) {
      floorAdd =
        installFloorSurcharge.baseSurcharge +
        (floor - installFloorSurcharge.appliesFromFloor) * installFloorSurcharge.perFloorSurcharge;
    }
    const regionAdd = surchargeRegion ? installRegionSurcharge.price : 0;
    const removal = withRemoval ? getRemovalPrice(totalWidth) ?? 0 : 0;
    const total = tier.sinkPrice + tier.wallPrice + floorAdd + regionAdd + removal;
    return { tier, floorAdd, regionAdd, removal, total };
  }, [totalWidth, floor, noElevator, surchargeRegion, withRemoval]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <header className="px-1">
        <h1 className="text-xl font-black text-ink">모듈형 싱크대 규격·비용 안내</h1>
        <p className="mt-1 text-sm text-slate-500">주문 후 제작되는 상품입니다. 사이즈·구성·색상·손잡이를 선택하세요.</p>
      </header>

      {/* 상부장 규격 */}
      <Card title="상부장 규격" sub="후드장 외 전 규격 D320 · H800 · 내부 2단선반 / 시공목·시공피스 기본 포함">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="py-2 pr-3 font-semibold">품명</th>
                <th className="py-2 pr-3 font-semibold">규격 (W×D×H)</th>
                <th className="py-2 font-semibold">도어 / 선반</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {wallCabinets.map((c) => (
                <tr key={c.code} className="border-t border-slate-100">
                  <td className="py-2 pr-3 font-bold">{c.name}</td>
                  <td className="py-2 pr-3 tabular-nums text-slate-600">
                    {c.width_mm}×{c.depth_mm}×{c.height_mm}
                  </td>
                  <td className="py-2 text-slate-600">
                    {doorTypeLabel[c.door_type]}
                    {c.door_side_selectable ? "(좌/우 선택)" : ""} · {c.shelf_count > 0 ? `${c.shelf_count}단선반` : "선반 없음"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 도어 색상 */}
      <Card title="도어 색상 (11 colors)" sub={doorFinishNote}>
        <div className="flex flex-wrap gap-2.5">
          {doorColors.map((c) => {
            const active = c.name === color;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                className={`flex flex-col items-center gap-1 rounded-xl p-1.5 transition ${active ? "ring-2 ring-brand" : "ring-1 ring-slate-200"}`}
              >
                <span className="h-9 w-9 rounded-lg ring-1 ring-slate-200" style={{ backgroundColor: c.tone }} />
                <span className="text-[10px] font-semibold text-slate-600">{c.name}</span>
                {c.soldOut ? <span className="text-[9px] font-bold text-rose-500">품절</span> : null}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs font-semibold text-brand">선택: {color}</p>
      </Card>

      {/* 배송비 계산기 */}
      <Card title="택배 배송비 계산" sub="사이즈별 평균 부과 기준 · 지역에 따라 감액/추가 가능">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-soft p-1 text-xs font-bold">
            {(["base", "wall"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setCabinetKind(k)}
                className={`rounded-full px-3 py-1.5 transition ${cabinetKind === k ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
              >
                {k === "base" ? "하부장(개수대·조리대)" : "상부장"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <input
            type="range"
            min={300}
            max={1200}
            step={100}
            value={shipWidth}
            onChange={(e) => setShipWidth(Number(e.target.value))}
            className="flex-1 accent-brand"
          />
          <span className="w-16 text-right text-sm font-bold tabular-nums text-ink">{shipWidth}mm</span>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-soft px-4 py-3">
          <span className="text-xs font-semibold text-slate-500">예상 배송비</span>
          <span className="text-lg font-black text-brand tabular-nums">{won(shipCost)}</span>
        </div>
      </Card>

      {/* 방문시공비 계산기 */}
      <Card title="방문 시공비 계산" sub={`신청 가능: ${installServiceableRegions.join(" · ")}`}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">총 구매 사이즈</span>
          <input
            type="range"
            min={600}
            max={3600}
            step={100}
            value={totalWidth}
            onChange={(e) => setTotalWidth(Number(e.target.value))}
            className="flex-1 accent-brand"
          />
          <span className="w-16 text-right text-sm font-bold tabular-nums text-ink">{totalWidth}mm</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <label className="flex items-center gap-1.5 rounded-full bg-soft px-3 py-1.5 font-semibold text-slate-600">
            <input type="checkbox" checked={noElevator} onChange={(e) => setNoElevator(e.target.checked)} className="accent-brand" />
            엘리베이터 없음
          </label>
          {noElevator ? (
            <label className="flex items-center gap-1.5 rounded-full bg-soft px-3 py-1.5 font-semibold text-slate-600">
              층수
              <input
                type="number"
                min={1}
                max={20}
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
                className="w-12 rounded-md border border-slate-200 px-1.5 py-0.5 text-center"
              />
            </label>
          ) : null}
          <label className="flex items-center gap-1.5 rounded-full bg-soft px-3 py-1.5 font-semibold text-slate-600">
            <input type="checkbox" checked={surchargeRegion} onChange={(e) => setSurchargeRegion(e.target.checked)} className="accent-brand" />
            추가비 지역(+3만)
          </label>
          <label className="flex items-center gap-1.5 rounded-full bg-soft px-3 py-1.5 font-semibold text-slate-600">
            <input type="checkbox" checked={withRemoval} onChange={(e) => setWithRemoval(e.target.checked)} className="accent-brand" />
            기존 제품 철거
          </label>
        </div>

        {install ? (
          <div className="mt-3 space-y-1.5 rounded-xl bg-soft px-4 py-3 text-xs text-slate-600">
            <Row label={`개수대/조리대 (${install.tier.label})`} value={won(install.tier.sinkPrice)} />
            <Row label="상부장(시공목 포함)" value={won(install.tier.wallPrice)} />
            {install.floorAdd > 0 ? <Row label="층별 추가" value={won(install.floorAdd)} /> : null}
            {install.regionAdd > 0 ? <Row label="지역 추가" value={won(install.regionAdd)} /> : null}
            {install.removal > 0 ? <Row label="철거비" value={won(install.removal)} /> : null}
            <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="text-sm font-bold text-ink">시공비 합계</span>
              <span className="text-lg font-black text-brand tabular-nums">{won(install.total)}</span>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-rose-500">해당 사이즈 시공 구간이 없습니다.</p>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          {installRegionSurcharge.regions.slice(0, 6).join(", ")} 등 일부 지역은 +3만원(톨게이트 별도).
        </p>
      </Card>

      {/* 옵션 가격표 */}
      <Card title="추가 옵션 가격" sub="주문 시 함께 결제 불가 · 고객센터 문의">
        <h3 className="text-xs font-bold text-slate-500">후드장 타공</h3>
        <div className="mt-1.5 flex items-center justify-between border-b border-slate-100 pb-2 text-sm">
          <span className="text-ink">후드장 타공 (지름 {hoodDrillingOption.holeDiameterMm}mm)</span>
          <span className="font-bold tabular-nums text-ink">{won(hoodDrillingOption.price)}</span>
        </div>

        <h3 className="mt-4 text-xs font-bold text-slate-500">EP 마감판넬 (두께 18mm)</h3>
        <ul className="mt-1.5 space-y-1.5 text-sm">
          {epPanels.map((p, i) => (
            <li key={i} className="flex items-center justify-between">
              <span className="text-ink">
                {p.target} W{p.width_mm}×H{p.height_mm}
                {p.backShelf ? ` (뒷선반 ${p.backShelf})` : ""}
              </span>
              <span className="font-bold tabular-nums text-ink">{won(p.price)}</span>
            </li>
          ))}
        </ul>

        <h3 className="mt-4 text-xs font-bold text-slate-500">부속 및 악세사리</h3>
        <ul className="mt-1.5 space-y-1.5 text-sm">
          {accessories.map((a) => (
            <li key={a.name} className="flex items-center justify-between gap-3">
              <span className="text-ink">
                {a.name}
                {a.soldOut ? <span className="ml-1 text-[11px] font-bold text-rose-500">품절</span> : null}
                {a.note ? <span className="ml-1 text-[11px] text-slate-400">— {a.note}</span> : null}
              </span>
              <span className="shrink-0 font-bold tabular-nums text-ink">{won(a.price)}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* 제품 사양·마감 */}
      <Card title="제품 사양 · 마감" sub="견적·부품표와 동일 기준의 실제 제작 사양">
        <div className="divide-y divide-slate-100">
          {productSpecs.map((spec) => (
            <div key={spec.name} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
              <span className="w-24 shrink-0 text-xs font-black text-slate-500">{spec.name}</span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-ink">{spec.value}</div>
                {spec.note && <div className="text-xs text-slate-500">{spec.note}</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 정책 */}
      <Card title="주문 · 취소 · 반품 안내">
        <ul className="space-y-2 text-sm text-slate-600">
          <li>· 주문 후 취소는 주문 시점으로부터 <b className="text-ink">{orderPolicy.cancelWindowDays}일 이내</b>에만 가능합니다.</li>
          <li>· 제품 수령 후 불량 확인은 <b className="text-ink">{orderPolicy.defectReportDays}일 이내</b> 판매처로 연락 바랍니다.</li>
          <li>· 주문 제작 상품으로 <b className="text-ink">변심 반품 및 교환이 어렵습니다.</b></li>
          <li>· 택배 가능 지역: {orderPolicy.courierRegions.join(" · ")} (그 외 지방은 화물 착불)</li>
          <li>
            · 고객센터 <b className="text-ink">{orderPolicy.customerCenter.tel}</b> / {orderPolicy.customerCenter.mobile}
            <span className="text-slate-400"> ({orderPolicy.customerCenter.hours})</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}
