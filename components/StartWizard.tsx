"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CategoryArt, ProductArt } from "@/components/ProductArt";
import { ManualCustomArt, TemplateFastArt } from "@/components/StartMethodArt";
import { catalogCategories, getCategoryById, productLabels } from "@/lib/catalog";
import { productTemplates } from "@/lib/data";
import { readRecentDesigns, removeRecentDesign, restoreToDraft, type DraftEntry } from "@/lib/quoteHistory";
import type { ProductTemplate, ProductType } from "@/lib/types";

type Method = "template" | "manual";
type WizardStep = "method" | "category" | "product" | "manual";

export function StartWizard() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("method");
  const [method, setMethod] = useState<Method | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [productSlug, setProductSlug] = useState<ProductType | null>(null);

  const [manualTitle, setManualTitle] = useState("");
  const [manualWidth, setManualWidth] = useState("900");
  const [manualHeight, setManualHeight] = useState("1800");
  const [manualDepth, setManualDepth] = useState("400");
  const [manualNote, setManualNote] = useState("");
  const [recent, setRecent] = useState<DraftEntry[]>([]);
  useEffect(() => {
    setRecent(readRecentDesigns());
  }, []);

  const productMap = useMemo(() => new Map(productTemplates.map((product) => [product.slug, product])), []);
  const category = categoryId ? getCategoryById(categoryId) : null;
  const categoryProducts = useMemo(() => {
    if (!category) return [] as ProductTemplate[];
    return category.slugs
      .map((slug) => productMap.get(slug))
      .filter((product): product is ProductTemplate => Boolean(product));
  }, [category, productMap]);

  const totalSteps = method === "manual" ? 2 : 3;
  const currentStepIndex =
    step === "method" ? 1 : step === "category" ? 2 : step === "product" || step === "manual" ? totalSteps : 1;

  function goBack() {
    if (step === "product") {
      setProductSlug(null);
      setStep("category");
      return;
    }
    if (step === "category") {
      setCategoryId(null);
      setStep("method");
      return;
    }
    if (step === "manual") {
      setStep("method");
      return;
    }
    router.push("/");
  }

  function chooseMethod(next: Method) {
    setMethod(next);
    if (next === "template") setStep("category");
    else startManualPreview(); // 폼 생략 — 바로 미리보기 화면에서 추가·수정
  }

  function startTemplatePreview() {
    if (!productSlug) return;
    router.push(`/custom/${productSlug}?fresh=1`);
  }

  function resumeDesign(entry: DraftEntry) {
    restoreToDraft(entry); // 작업 슬롯에 되살림 → 진입 시 복원(새로 시작 아님)
    router.push(`/custom/${entry.slug}`);
  }

  function deleteDesign(entry: DraftEntry) {
    removeRecentDesign(entry);
    setRecent(readRecentDesigns());
  }

  function startManualPreview() {
    const params = new URLSearchParams({
      manual: "1",
      fresh: "1",
      w: manualWidth,
      h: manualHeight,
      d: manualDepth,
    });
    if (manualTitle.trim()) params.set("title", manualTitle.trim());
    if (manualNote.trim()) params.set("note", manualNote.trim());
    router.push(`/custom/custom_shelf?${params.toString()}`);
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg pb-28 lg:max-w-4xl">
      <header className="sticky top-[57px] z-20 border-b border-slate-100 bg-[#fafbfc]/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200"
            aria-label="이전"
          >
            ←
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-brand">STEP {currentStepIndex} / {totalSteps}</p>
            <p className="text-sm font-black text-ink">{stepTitle(step)}</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${(currentStepIndex / totalSteps) * 100}%` }}
          />
        </div>
      </header>

      <div className="px-4 pt-6">
        {step === "method" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black leading-tight text-ink">어떻게 시작할까요?</h1>
              <p className="mt-2 text-sm text-slate-500">템플릿으로 빠르게, 또는 직접 사양을 입력해 제작할 수 있습니다.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => chooseMethod("template")}
                className="group flex flex-col rounded-3xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:ring-brand active:scale-[0.98]"
              >
                <div className="mb-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#eaf3f5] to-[#f6f4ee]">
                  <TemplateFastArt className="h-24 w-full" />
                </div>
                <p className="text-[15px] font-black text-ink">템플릿으로 빠르게</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">카테고리 → 상품 선택 → 3D 미리보기</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-brand">시작 <span aria-hidden>›</span></span>
              </button>

              <button
                type="button"
                onClick={() => chooseMethod("manual")}
                className="group flex flex-col rounded-3xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:ring-violet-500 active:scale-[0.98]"
              >
                <div className="mb-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#f3eefb] to-[#f6f4ee]">
                  <ManualCustomArt className="h-24 w-full" />
                </div>
                <p className="text-[15px] font-black text-ink">수동 커스텀 제작</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">사이즈·구성을 직접 조절해 제작</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-violet-600">시작 <span aria-hidden>›</span></span>
              </button>
            </div>

            {recent.length > 0 && (
              <div className="pt-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-black text-ink">최근 저장 내역</p>
                  <span className="text-[11px] font-bold text-slate-400">이어서 작업하려면 선택</span>
                </div>
                <div className="space-y-2">
                  {recent.map((entry, i) => (
                    <div
                      key={`${entry.slug}-${entry.ts}-${i}`}
                      className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200 transition focus-within:ring-brand"
                    >
                      <button type="button" onClick={() => resumeDesign(entry)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.99]">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                          <ProductArt slug={entry.slug} className="h-9 w-9" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-ink">{productLabels[entry.slug] ?? entry.name}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                            {entry.input.width_mm}×{entry.input.height_mm}×{entry.input.depth_mm}mm
                            {entry.input.material ? ` · ${entry.input.material}` : ""}
                          </p>
                        </div>
                      </button>
                      <span className="shrink-0 rounded-lg bg-brand/10 px-2.5 py-1 text-[11px] font-black text-brand">불러오기</span>
                      <button
                        type="button"
                        aria-label="삭제"
                        onClick={() => deleteDesign(entry)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === "category" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black text-ink">카테고리를 골라주세요</h1>
              <p className="mt-2 text-sm text-slate-500">만들 가구 종류를 선택하면 다음 단계에서 상품을 고릅니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {catalogCategories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(item.id);
                    setStep("product");
                  }}
                  className="overflow-hidden rounded-2xl bg-white text-left ring-1 ring-slate-200 transition active:scale-[0.98]"
                >
                  <div className="h-24" style={{ backgroundColor: item.bg }}>
                    <CategoryArt id={item.id} className="h-full w-full" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-black text-ink">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{item.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "product" && category && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-bold text-brand">{category.title}</p>
              <h1 className="mt-1 text-2xl font-black text-ink">상품을 선택하세요</h1>
              <p className="mt-2 text-sm text-slate-500">선택 후 3D 미리보기와 견적으로 이어집니다.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {categoryProducts.map((product) => {
                const selected = productSlug === product.slug;
                const label = productLabels[product.slug] ?? product.name;
                return (
                  <button
                    key={product.slug}
                    type="button"
                    onClick={() => setProductSlug(product.slug as ProductType)}
                    className={`overflow-hidden rounded-2xl bg-white text-left ring-2 transition ${
                      selected ? "ring-brand" : "ring-slate-200"
                    }`}
                  >
                    <div
                      className="flex aspect-square items-center justify-center"
                      style={{ backgroundColor: category.bg }}
                    >
                      <ProductArt slug={product.slug as ProductType} className="h-[72%] w-[72%]" />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-black leading-tight text-ink">{label}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!productSlug}
              onClick={startTemplatePreview}
              className="w-full rounded-2xl bg-brand py-4 text-base font-black text-white shadow-lg shadow-brand/20 disabled:opacity-40"
            >
              3D 미리보기 시작
            </button>
          </div>
        )}

        {step === "manual" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-ink">수동 커스텀 제작</h1>
              <p className="mt-2 text-sm text-slate-500">원하는 제작 내용과 사이즈를 입력하세요. 3D 미리보기로 확인 후 견적을 받을 수 있습니다.</p>
            </div>

            <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-600">제작명</span>
                <input
                  className="field"
                  placeholder="예: 거실 벽면 수납장"
                  value={manualTitle}
                  onChange={(event) => setManualTitle(event.target.value)}
                />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-600">가로(mm)</span>
                  <input className="field" type="number" value={manualWidth} onChange={(e) => setManualWidth(e.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-600">높이(mm)</span>
                  <input className="field" type="number" value={manualHeight} onChange={(e) => setManualHeight(e.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-600">깊이(mm)</span>
                  <input className="field" type="number" value={manualDepth} onChange={(e) => setManualDepth(e.target.value)} />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-slate-600">요청사항</span>
                <textarea
                  className="field min-h-[96px] resize-none"
                  placeholder="문짝 개수, 색상, 설치 위치 등 자유롭게 적어주세요."
                  value={manualNote}
                  onChange={(event) => setManualNote(event.target.value)}
                />
              </label>
            </div>

            <p className="text-center text-[11px] text-slate-400">
              수동 제작은 기본 선반장 3D로 미리보기 후 견적이 산출됩니다.
            </p>

            <button
              type="button"
              onClick={startManualPreview}
              className="w-full rounded-2xl bg-brand py-4 text-base font-black text-white shadow-lg shadow-brand/20"
            >
              3D 미리보기 시작
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 px-4 text-center">
        <Link href="/my/orders" className="text-xs font-bold text-slate-400 underline-offset-2 hover:text-brand hover:underline">
          주문 내역 보기
        </Link>
      </div>
    </div>
  );
}

function stepTitle(step: WizardStep) {
  if (step === "method") return "시작 방법";
  if (step === "category") return "카테고리";
  if (step === "product") return "상품 선택";
  return "수동 입력";
}

