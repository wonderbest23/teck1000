import Link from "next/link";
import { CategoryArt, ProductArt } from "@/components/ProductArt";
import { catalogCategories, productLabels } from "@/lib/catalog";
import type { ProductTemplate, ProductType } from "@/lib/types";

export function HomeCatalog({ products }: { products: ProductTemplate[] }) {
  const productMap = new Map(products.map((product) => [product.slug, product]));

  return (
    <div className="space-y-8">
      {catalogCategories.map((category) => {
        const items = category.slugs
          .map((slug) => productMap.get(slug))
          .filter((product): product is ProductTemplate => Boolean(product));
        if (items.length === 0) return null;

        return (
          <section key={category.id} id={category.id} className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-100/80">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                style={{ backgroundColor: category.bg }}
              >
                <CategoryArt id={category.id} className="h-full w-full scale-125" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-ink">{category.title}</h2>
                <p className="text-xs text-slate-500">{category.subtitle}</p>
              </div>
              <Link
                href="/start"
                className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200"
              >
                전체
              </Link>
            </div>

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
              {items.map((product) => (
                <ProductTile
                  key={product.slug}
                  product={product}
                  label={productLabels[product.slug] ?? product.name}
                  accent={category.accent}
                  bg={category.bg}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ProductTile({
  product,
  label,
  accent,
  bg,
}: {
  product: ProductTemplate;
  label: string;
  accent: string;
  bg: string;
}) {
  return (
    <Link
      href={`/custom/${product.slug}`}
      className="group w-[7.75rem] shrink-0 snap-start sm:w-[8.5rem]"
    >
      <div
        className="relative flex aspect-[4/5] flex-col overflow-hidden rounded-2xl ring-1 ring-slate-100 transition duration-200 group-active:scale-[0.97]"
        style={{ backgroundColor: bg }}
      >
        <div className="flex flex-1 items-center justify-center px-2 pt-3">
          <ProductArt
            slug={product.slug as ProductType}
            className="h-full max-h-[5.5rem] w-full transition duration-300 group-hover:scale-105"
          />
        </div>
        <div className="border-t border-white/60 bg-white/70 px-2 py-2 backdrop-blur-sm">
          <p className="line-clamp-2 text-center text-[11px] font-black leading-tight text-ink">{label}</p>
        </div>
        <div
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm"
          style={{ backgroundColor: accent }}
          aria-hidden
        >
          <CubeIcon />
        </div>
      </div>
      <p className="mt-1.5 text-center text-[10px] font-medium text-slate-400">3D 미리보기</p>
    </Link>
  );
}

function CubeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 1 11 4v4l-5 3-5-3V4l5-3Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 1v10M6 7 11 4M6 7 1 4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
