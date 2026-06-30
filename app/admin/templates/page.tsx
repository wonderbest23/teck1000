import { productTemplates } from "@/lib/data";

export default function TemplatesPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-black text-ink">상품템플릿관리</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {productTemplates.map((product) => <div key={product.slug} className="rounded-3xl bg-white p-6 shadow-card"><h2 className="text-xl font-black">{product.name}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{product.description}</p><p className="mt-4 text-sm font-bold text-brand">{product.minWidth}mm - {product.maxWidth}mm</p></div>)}
      </div>
    </main>
  );
}
