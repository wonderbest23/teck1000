import { hardwareItems, materials } from "@/lib/data";
import { BOARD_SHEET_SPECS, getApplicableSheetSpecs, getSheetUnitPrice } from "@/lib/boardPricing";
import { BoardStockEditor } from "@/components/admin/BoardStockEditor";
import { formatMoney } from "@/lib/format";

export default function MaterialsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-black text-ink">자재관리</h1>
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-2xl font-black">합판 재고</h2>
        <p className="mt-1 text-sm font-bold text-slate-500">남은 합판(원판) 장수를 관리하세요. 작업 최종 승인 시 자동으로 차감됩니다.</p>
        <BoardStockEditor />
      </section>
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-2xl font-black">자재 단가</h2>
        <div className="mt-4 overflow-x-auto"><table className="factory-table"><thead><tr><th>자재명</th><th>색상</th><th>두께</th><th>공개 m²</th><th>계약 m²</th><th>공개 장당</th><th>계약 장당</th></tr></thead><tbody>{materials.map((material) => {
          const spec = getApplicableSheetSpecs(material.name)[0];
          const publicSheet = getSheetUnitPrice(material.name, spec, "public");
          const contractSheet = getSheetUnitPrice(material.name, spec, "contract");
          return <tr key={material.name}><td>{material.name}</td><td>{material.color}</td><td>{material.thickness_mm}mm</td><td>{formatMoney(material.price_per_m2)}</td><td>{formatMoney(material.contract_price_per_m2)}</td><td>{formatMoney(publicSheet)}</td><td>{formatMoney(contractSheet)}</td></tr>;
        })}</tbody></table></div>
      </section>
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-2xl font-black">원판 규격 마스터</h2>
        <div className="mt-4 overflow-x-auto"><table className="factory-table"><thead><tr><th>코드</th><th>그룹</th><th>규격</th><th>공개 장당</th><th>계약 장당</th></tr></thead><tbody>{BOARD_SHEET_SPECS.map((spec) => <tr key={spec.code}><td>{spec.code}</td><td>{spec.materialGroup}</td><td>{spec.widthMm}×{spec.heightMm}×{spec.thicknessMm}mm</td><td>{spec.publicPricePerSheet != null ? formatMoney(spec.publicPricePerSheet) : "m² 환산"}</td><td>{spec.contractPricePerSheet != null ? formatMoney(spec.contractPricePerSheet) : "m² 환산"}</td></tr>)}</tbody></table></div>
      </section>
      <section className="mt-8 rounded-3xl bg-white p-6 shadow-card">
        <h2 className="text-2xl font-black">부속 단가</h2>
        <div className="mt-4 overflow-x-auto"><table className="factory-table"><thead><tr><th>부속명</th><th>단위</th><th>단가</th></tr></thead><tbody>{hardwareItems.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.unit}</td><td>{formatMoney(item.unit_price)}</td></tr>)}</tbody></table></div>
      </section>
    </main>
  );
}
