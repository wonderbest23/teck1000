"use client";

import type { ProductType } from "@/lib/types";

export function PreviewUnsupported({ productType }: { productType: ProductType }) {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl bg-slate-100 p-6 text-center">
      <div className="text-sm font-black text-slate-700">3D 미리보기 미지원</div>
      <div className="mt-2 text-xs text-slate-500">
        상품 타입 <span className="font-bold">{productType}</span>에 대한 전용 렌더러가 없습니다.
      </div>
    </div>
  );
}
