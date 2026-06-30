import { ManufacturerInquiryForm } from "@/components/ManufacturerInquiryForm";

export default function AdminInquiryPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-black text-brand">운영</p>
      <h1 className="mt-3 text-4xl font-black text-ink">제조사 스펙 문의</h1>
      <p className="mt-2 text-slate-600">한국 종합인테리어 플랫폼 즉시 도입 기준서 — 미등록 필드 회수용</p>
      <div className="mt-8 rounded-3xl bg-white p-6 shadow-card">
        <ManufacturerInquiryForm />
      </div>
    </main>
  );
}
