import { FactorySettingsPanel } from "@/components/FactorySettingsPanel";

export default function AdminFactoryPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-sm font-black text-brand">운영 설정</p>
      <h1 className="mt-3 text-4xl font-black text-ink">공장·단가 프로필</h1>
      <p className="mt-2 text-slate-600">공장별 재단 기준과 공개가/계약가 정책을 관리합니다.</p>
      <div className="mt-8">
        <FactorySettingsPanel />
      </div>
    </main>
  );
}
