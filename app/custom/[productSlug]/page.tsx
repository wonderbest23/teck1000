import { Suspense } from "react";
import { notFound } from "next/navigation";
import { QuoteBuilder } from "@/components/QuoteBuilder";
import { getProduct } from "@/lib/data";
import type { ProductType } from "@/lib/types";

export default async function ProductQuotePage({ params }: { params: Promise<{ productSlug: string }> }) {
  const { productSlug } = await params;
  const product = getProduct(productSlug);
  if (!product) notFound();

  return (
    <main className="px-3 py-6 sm:px-4">{/* 폭은 EditorShell이 제어 (모바일 max-w-3xl / PC lg:max-w-6xl). 여기서 좁게 캡하지 않는다 */}
      <Suspense fallback={<div className="py-20 text-center text-sm text-slate-500">미리보기 불러오는 중...</div>}>
        <QuoteBuilder productType={product.slug as ProductType} />
      </Suspense>
    </main>
  );
}
