import { RetailSpecSheet } from "@/components/RetailSpecSheet";

export const metadata = {
  title: "모듈형 싱크대 규격·비용 안내",
  description: "상부장 규격, 도어 색상, 배송비·방문시공비·옵션 가격 안내",
};

export default function CatalogPage() {
  return (
    <main className="bg-[#fafbfc]">
      <RetailSpecSheet />
    </main>
  );
}
