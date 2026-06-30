"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clearCart, getCart, setCart } from "@/lib/cartStore";
import { materials, productTemplates } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { cooktopOptions, countertopOptions, faucetOptions, getKitchenTemplate, hoodOptions, kitchenTemplates, microwaveOptions, sinkOptions } from "@/lib/kitchen";
import {
  calculateCompositeQuote,
  createDefaultSchedule,
  createEmptyCustomer,
  createOrderItem,
  getMinimumDeliveryDate,
  getMinimumInstallDate,
  normalizeFurnitureInput,
} from "@/lib/order";
import { getDoorCountOptions, productRules } from "@/lib/rules";
import type { CompositeOrderDraft, CustomerInfo, FurnitureInput, OrderItemInput, ProductType, RequestedSchedule } from "@/lib/types";

const steps = ["장바구니", "날짜 지정", "주문자 정보", "주문 요청"];

export function MultiOrderBuilder() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<ProductType>("kitchen_full_set");
  const [items, setItems] = useState<OrderItemInput[]>([createOrderItem("kitchen_full_set")]);
  const [schedule, setSchedule] = useState<RequestedSchedule>(() => createDefaultSchedule());
  const [customer, setCustomer] = useState<CustomerInfo>(() => createEmptyCustomer());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // 장바구니(localStorage)에서 담아둔 상품을 불러온다.
  useEffect(() => {
    const cart = getCart();
    if (cart.length > 0) setItems(cart);
    loadedRef.current = true;
  }, []);

  // 장바구니 변경 사항을 localStorage에 유지한다.
  useEffect(() => {
    if (loadedRef.current) setCart(items);
  }, [items]);

  const draft: CompositeOrderDraft = { items, schedule, customer };
  const composite = useMemo(() => calculateCompositeQuote(draft), [items, schedule, customer]);
  const hardErrors = composite.warnings.filter((warning) => warning.type === "error");

  function addItem() {
    setItems((current) => [...current, createOrderItem(selectedProduct)]);
    setActiveStep(0);
  }

  function updateItem(itemId: string, updater: (item: OrderItemInput) => OrderItemInput) {
    setItems((current) => current.map((item) => (item.id === itemId ? updater(item) : item)));
  }

  function removeItem(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  async function submitDraft() {
    if (!composite.canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data?.error ?? "주문 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      clearCart();
      router.push(`/order/${data.id}`);
    } catch {
      setSubmitError("네트워크 오류로 주문을 전송하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <p className="text-sm font-black text-brand">장바구니</p>
          <h1 className="mt-2 text-4xl font-black text-ink">장바구니에서 주문 요청하기</h1>
          <p className="mt-3 text-slate-600">상품을 담고, 옵션을 수정한 뒤 희망 배송일과 설치일을 지정해 주문 요청서를 생성합니다.</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-4">
            {steps.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`rounded-2xl px-4 py-3 text-sm font-black ${activeStep === index ? "bg-brand text-white" : "bg-soft text-slate-600"}`}
              >
                {index + 1}. {step}
              </button>
            ))}
          </div>
        </div>

        {activeStep === 0 && (
          <StepCard title="1. 장바구니 품목" description="싱크대 세트, 신발장, 붙박이장 등 필요한 상품을 장바구니에 담아 한 번에 요청할 수 있습니다.">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <select className="field" value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value as ProductType)}>
                {productTemplates.map((product) => (
                  <option key={product.slug} value={product.slug}>
                    {product.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={addItem} className="rounded-2xl bg-brand px-5 py-3 font-black text-white">
                장바구니 담기
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {items.map((item, index) => (
                <OrderItemEditor key={item.id} index={index} item={item} onChange={(next) => updateItem(item.id, () => next)} onRemove={() => removeItem(item.id)} />
              ))}
              {items.length === 0 && <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">장바구니에 최소 1개 품목을 담아주세요.</div>}
            </div>
          </StepCard>
        )}

        {activeStep === 1 && (
          <StepCard title="2. 희망 날짜 지정" description="실제 확정일은 관리자 검토 후 확정됩니다. 고객은 희망일을 선택합니다.">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-slate-700">
                희망 배송일
                <input
                  className="field"
                  type="date"
                  min={getMinimumDeliveryDate()}
                  value={schedule.requested_delivery_date}
                  onChange={(event) => setSchedule((current) => ({ ...current, requested_delivery_date: event.target.value, requested_install_date: getMinimumInstallDate(event.target.value) }))}
                />
              </label>
              <label className="space-y-2 text-sm font-bold text-slate-700">
                설치 요청
                <select className="field" value={String(schedule.visit_required)} onChange={(event) => setSchedule((current) => ({ ...current, visit_required: event.target.value === "true" }))}>
                  <option value="true">설치 요청</option>
                  <option value="false">배송만 요청</option>
                </select>
              </label>
              {schedule.visit_required && (
                <label className="space-y-2 text-sm font-bold text-slate-700">
                  희망 설치일
                  <input
                    className="field"
                    type="date"
                    min={getMinimumInstallDate(schedule.requested_delivery_date)}
                    value={schedule.requested_install_date}
                    onChange={(event) => setSchedule((current) => ({ ...current, requested_install_date: event.target.value }))}
                  />
                </label>
              )}
            </div>
          </StepCard>
        )}

        {activeStep === 2 && (
          <StepCard title="3. 주문자 정보" description="관리자가 제작 가능 여부와 날짜를 확정하기 위해 필요한 정보입니다.">
            <div className="grid gap-4 md:grid-cols-2">
              <CustomerField label="주문자명" value={customer.name} onChange={(value) => setCustomer((current) => ({ ...current, name: value }))} />
              <CustomerField label="연락처" value={customer.phone} onChange={(value) => setCustomer((current) => ({ ...current, phone: value }))} />
              <CustomerField label="이메일" value={customer.email} onChange={(value) => setCustomer((current) => ({ ...current, email: value }))} />
              <CustomerField label="배송 주소" value={customer.shipping_address} onChange={(value) => setCustomer((current) => ({ ...current, shipping_address: value }))} />
              <label className="space-y-2 text-sm font-bold text-slate-700 md:col-span-2">
                요청사항
                <textarea className="field min-h-28" value={customer.memo} onChange={(event) => setCustomer((current) => ({ ...current, memo: event.target.value }))} placeholder="엘리베이터 유무, 설치 공간 특이사항, 기존 가구 철거 여부 등을 적어주세요." />
              </label>
            </div>
          </StepCard>
        )}

        {activeStep === 3 && (
          <StepCard title="4. 최종 확인" description="제작 불가 오류가 없을 때만 주문 요청서를 생성할 수 있습니다.">
            <div className="space-y-3">
              {composite.itemQuotes.map((line, index) => (
                <div key={line.item.id} className="rounded-2xl bg-soft p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-black text-ink">{index + 1}. {line.item.name} x {line.item.quantity}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {line.item.input.width_mm} x {line.item.input.height_mm} x {line.item.input.depth_mm}mm / {line.item.input.material}
                      </div>
                    </div>
                    <div className="text-xl font-black text-brand">{formatMoney(line.lineTotal)}</div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={submitDraft} disabled={!composite.canSubmit || submitting} className="mt-6 w-full rounded-2xl bg-brand px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              {submitting ? "주문 생성 중…" : "주문 요청서 생성"}
            </button>
            {submitError && (
              <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{submitError}</div>
            )}
          </StepCard>
        )}
      </section>

      <aside className="space-y-5">
        <div className="sticky top-24 rounded-3xl bg-white p-6 shadow-card">
          <div className="text-sm font-bold text-slate-500">장바구니 합계</div>
          <div className="mt-2 text-4xl font-black text-brand">{formatMoney(composite.totalPrice)}</div>
          <dl className="mt-5 space-y-2 text-sm text-slate-600">
            <Cost label="품목 수" value={`${items.length}개`} />
            <Cost label="판재비" value={formatMoney(composite.totalBoardCost)} />
            <Cost label="엣지비" value={formatMoney(composite.totalEdgeCost)} />
            <Cost label="가공/부속" value={formatMoney(composite.totalProcessingCost + composite.totalHardwareCost)} />
            <Cost label="원판 소요" value={`${composite.boardCutPlan.summaries.reduce((sum, summary) => sum + summary.sheet_count, 0)}장`} />
          </dl>
          {composite.warnings.length > 0 && (
            <div className="mt-5 space-y-2">
              {composite.warnings.map((warning, index) => (
                <div key={`${warning.message}-${index}`} className={`rounded-xl px-3 py-2 text-sm ${warning.type === "error" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>
                  {warning.message}
                </div>
              ))}
            </div>
          )}
          {hardErrors.length === 0 && <div className="mt-5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">현재 입력값은 주문 요청 가능합니다.</div>}
        </div>
      </aside>
    </div>
  );
}

function OrderItemEditor({ index, item, onChange, onRemove }: { index: number; item: OrderItemInput; onChange: (item: OrderItemInput) => void; onRemove: () => void }) {
  const input = item.input;
  const rules = productRules[input.productType];
  const doorOptions = getDoorCountOptions(input.productType, input.width_mm, input.has_door);

  function updateInput<K extends keyof FurnitureInput>(key: K, value: FurnitureInput[K]) {
    onChange({ ...item, input: normalizeFurnitureInput({ ...input, [key]: value }) });
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-500">품목 {index + 1}</div>
          <div className="text-xl font-black text-ink">{item.name}</div>
        </div>
        <button type="button" onClick={onRemove} className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600">
          삭제
        </button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {materials.map((material) => (
          <button
            key={material.name}
            type="button"
            title={material.name}
            onClick={() => onChange({ ...item, input: { ...input, material: material.name, color: material.color } })}
            className={`shrink-0 rounded-full p-1 ${input.material === material.name ? "bg-brand ring-4 ring-brand/20" : "bg-white ring-1 ring-slate-200"}`}
          >
            <span
              className="block h-8 w-8 rounded-full border-2 border-white"
              style={{
                background:
                  material.name.includes("합판") || material.name.includes("오크") || material.name.includes("MDF")
                    ? `repeating-linear-gradient(90deg, ${material.tone}, ${material.tone} 8px, rgba(255,255,255,.22) 8px, rgba(255,255,255,.22) 12px)`
                    : material.tone,
              }}
            />
          </button>
        ))}
      </div>

      {input.productType === "kitchen_full_set" && (
        <div className="mb-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
          <div className="text-sm font-black text-ink">싱크대 세트 옵션</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-slate-700">
              기본 규격
              <select className="field" value={input.kitchen_template} onChange={(event) => {
                const template = getKitchenTemplate(event.target.value);
                onChange({
                  ...item,
                  input: normalizeFurnitureInput({
                    ...input,
                    kitchen_template: template.id,
                    width_mm: template.width_mm,
                    height_mm: template.base_height_mm,
                    depth_mm: template.base_depth_mm,
                    kitchen_base_height_mm: template.base_height_mm,
                    kitchen_base_depth_mm: template.base_depth_mm,
                    kitchen_wall_height_mm: template.wall_height_mm,
                    kitchen_wall_depth_mm: template.wall_depth_mm,
                    door_count: template.modules.length,
                    kitchen_modules_mm: [...template.modules],
                    kitchen_module_types: template.modules.map(() => "door"),
                  }),
                });
              }}>
                {kitchenTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-bold text-slate-700">
              상판
              <select className="field" value={input.countertop_type} onChange={(event) => updateInput("countertop_type", event.target.value)}>
                {countertopOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-bold text-slate-700">
              싱크볼/배수 타공
              <select className="field" value={input.sink_option} onChange={(event) => updateInput("sink_option", event.target.value)}>
                {sinkOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-bold text-slate-700">
              수전/수전 타공
              <select className="field" value={input.faucet_option} onChange={(event) => updateInput("faucet_option", event.target.value)}>
                {faucetOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-bold text-slate-700">
              후드
              <select className="field" value={input.hood_option} onChange={(event) => updateInput("hood_option", event.target.value)}>
                {hoodOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-bold text-slate-700">
              쿡탑/가스렌지
              <select className="field" value={input.cooktop_option} onChange={(event) => updateInput("cooktop_option", event.target.value)}>
                {cooktopOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-bold text-slate-700">
              전자레인지장
              <select className="field" value={input.microwave_option} onChange={(event) => updateInput("microwave_option", event.target.value)}>
                {microwaveOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <NumberField label="서랍장 모듈" value={input.drawer_module_count ?? 0} onChange={(value) => updateInput("drawer_module_count", value)} />
            <NumberField label="인출식 레일장" value={input.pullout_module_count ?? 0} onChange={(value) => updateInput("pullout_module_count", value)} />
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <NumberField label="가로" value={input.width_mm} onChange={(value) => updateInput("width_mm", value)} />
        <NumberField label="높이" value={input.height_mm} onChange={(value) => updateInput("height_mm", value)} />
        <NumberField label="깊이" value={input.depth_mm} onChange={(value) => updateInput("depth_mm", value)} />
        <NumberField label="수량" value={item.quantity} onChange={(value) => onChange({ ...item, quantity: Math.max(1, value) })} />
        <NumberField label="칸 수" value={input.shelf_count} onChange={(value) => updateInput("shelf_count", value)} />
        <label className="space-y-2 text-sm font-bold text-slate-700">
          문 유무
          <select className="field" value={String(input.has_door)} disabled={!rules.allowsDoorless} onChange={(event) => updateInput("has_door", event.target.value === "true")}>
            {rules.allowsDoorless && <option value="false">문 없음</option>}
            <option value="true">문 있음</option>
          </select>
        </label>
        <label className="space-y-2 text-sm font-bold text-slate-700">
          문짝
          <select className="field" value={input.door_count} disabled={!input.has_door} onChange={(event) => updateInput("door_count", Number(event.target.value))}>
            {doorOptions.map((count) => (
              <option key={count} value={count}>{count}개</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-bold text-slate-700">
          손잡이
          <select className="field" value={input.handle_type} onChange={(event) => updateInput("handle_type", event.target.value)}>
            <option>기본 손잡이</option>
            <option>댐핑</option>
            <option>무손잡이</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function StepCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-card">
      <h2 className="text-2xl font-black text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-2 text-sm font-bold text-slate-700">
      {label}
      <input className="field" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function CustomerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2 text-sm font-bold text-slate-700">
      {label}
      <input className="field" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Cost({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-bold text-slate-900">{value}</dd>
    </div>
  );
}
