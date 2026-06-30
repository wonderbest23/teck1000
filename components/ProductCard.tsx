import Link from "next/link";
import Image from "next/image";
import type { ProductTemplate } from "@/lib/types";

export function ProductCard({ product }: { product: ProductTemplate }) {
  return (
    <Link href={`/custom/${product.slug}`} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:border-brand">
      <div className="mb-5 overflow-hidden rounded-2xl bg-soft">
        <Image
          src={product.imageSrc}
          alt={product.imageHint}
          width={640}
          height={420}
          className="h-44 w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <h3 className="text-xl font-black text-ink">{product.name}</h3>
      <p className="mt-3 min-h-14 text-sm leading-6 text-slate-600">{product.description}</p>
      <div className="mt-5 text-sm font-bold text-brand group-hover:underline">사이즈 입력하고 견적받기</div>
    </Link>
  );
}
