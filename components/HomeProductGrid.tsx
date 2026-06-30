"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductArt } from "@/components/ProductArt";
import { productFromPrice, productLabels } from "@/lib/catalog";
import type { ProductType } from "@/lib/types";

export function HomeProductGrid({ slugs }: { slugs: ProductType[] }) {
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  return (
    <div className="grid grid-cols-2 gap-3">
      {slugs.map((slug) => {
        const price = productFromPrice[slug];
        return (
          <Link
            key={slug}
            href={`/custom/${slug}?fresh=1`}
            className="group overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition active:scale-[0.99]"
          >
            <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-50">
              <span className="absolute inset-0 flex items-center justify-center">
                <ProductArt slug={slug} className="h-[70%] w-[70%] transition duration-300 group-hover:scale-105" />
              </span>
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-ink/85 px-2 py-1 text-[10px] font-black text-white backdrop-blur">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" strokeLinejoin="round" /></svg>
                3D
              </span>
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-black leading-tight text-ink">{productLabels[slug] ?? slug}</p>
                <button
                  type="button"
                  aria-label="찜하기"
                  onClick={(e) => { e.preventDefault(); setLiked((m) => ({ ...m, [slug]: !m[slug] })); }}
                  className="-m-1 shrink-0 p-1 text-slate-300 transition hover:text-rose-400"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill={liked[slug] ? "#f43f5e" : "none"} stroke={liked[slug] ? "#f43f5e" : "currentColor"} strokeWidth="1.8"><path d="M12 20s-7-4.35-9.5-8.5C1 8 2.5 4.5 6 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 7-2.5 4.15-9.5 8.5-9.5 8.5Z" strokeLinejoin="round" /></svg>
                </button>
              </div>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">맞춤 제작 · 다양한 옵션</p>
              {price != null && (
                <p className="mt-1.5 text-[13px] font-black text-ink">
                  예상가 <span className="text-brand">{price.toLocaleString()}원~</span>
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
