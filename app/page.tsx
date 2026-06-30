import Link from "next/link";
import { CategoryArt } from "@/components/ProductArt";
import { HomeProductGrid } from "@/components/HomeProductGrid";
import { HomeBuildAnimation } from "@/components/HomeBuildAnimation";
import { ConsultButton } from "@/components/ConsultButton";
import { catalogCategories, featuredSlugs } from "@/lib/catalog";

const STEPS = [
  { n: 1, label: "공간 선택", icon: SpaceIcon },
  { n: 2, label: "사이즈 입력", icon: RulerIcon },
  { n: 3, label: "자재 선택", icon: LayersIcon },
  { n: 4, label: "견적 확인", icon: CheckIcon },
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-[100dvh] max-w-lg bg-[#fafbfc] pb-28 lg:max-w-3xl">
      <div className="space-y-5 px-4 pt-4">
        {/* 히어로 */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#eef2f5] to-[#f7f4ee] p-5 ring-1 ring-slate-100">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h1 className="text-[1.55rem] font-black leading-tight tracking-tight text-ink">
                맞춤 인테리어<br />제작 플랫폼
              </h1>
              <p className="mt-2 text-[13px] leading-5 text-slate-500">
                10초 3D 미리보기로<br />내 공간에 딱 맞는 가구를 만들고<br />견적을 바로 확인하세요.
              </p>
            </div>
            <div className="relative h-28 w-32 shrink-0 overflow-hidden rounded-2xl bg-white/75 ring-1 ring-white/80 sm:h-32 sm:w-40">
              <HomeBuildAnimation className="h-full w-full" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/start" className="flex items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-sm font-black text-white shadow-lg shadow-ink/15 active:scale-[0.99]">
              제작 시작하기 <span aria-hidden>→</span>
            </Link>
            <ConsultButton variant="hero" />
          </div>
        </section>

        {/* 진행 단계 */}
        <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex flex-1 items-center">
                <div className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="db-bob flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-brand ring-1 ring-slate-200" style={{ animationDelay: `${i * 0.3}s` }}>
                    <s.icon />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-ink text-[9px] font-black text-white">{s.n}</span>
                    <span className="text-[11px] font-black text-slate-600">{s.label}</span>
                  </div>
                </div>
                {i < STEPS.length - 1 && <span className="mx-0.5 mb-6 hidden flex-1 border-t border-dashed border-slate-200 sm:block" />}
              </div>
            ))}
          </div>
        </section>

        {/* 검색 */}
        <Link href="/start" className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm text-slate-400 ring-1 ring-slate-200">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" strokeLinecap="round" /></svg>
          어떤 가구를 만들까요?
        </Link>

        {/* 카테고리 */}
        <section className="grid grid-cols-3 gap-2.5">
          {catalogCategories.slice(0, 3).map((cat) => (
            <Link key={cat.id} href="/start" className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200 transition active:scale-[0.98]">
              <span className="flex h-12 w-full items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: cat.bg }}>
                <CategoryArt id={cat.id} className="h-full w-full" />
              </span>
              <span className="flex items-center gap-0.5 text-[12px] font-black text-ink">{cat.title}<span className="text-slate-300">›</span></span>
            </Link>
          ))}
        </section>

        {/* 맞춤 제작 상품 */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-black text-ink">맞춤 제작 상품</h2>
            <Link href="/start" className="flex items-center gap-0.5 text-xs font-bold text-slate-400">전체 보기 ›</Link>
          </div>
          <HomeProductGrid slugs={featuredSlugs} />
        </section>

        {/* 무료 실측 상담 배너 */}
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3.5 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" /></svg>
            </span>
            <div>
              <p className="text-sm font-black">지금 제작하면 무료 실측 상담 제공</p>
              <p className="mt-0.5 text-[11px] text-white/60">전문가가 정확한 사이즈를 도와드려요.</p>
            </div>
          </div>
          <ConsultButton variant="banner" />
        </div>
      </div>
    </main>
  );
}

function SpaceIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 9 12 4l8 5v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9Z" strokeLinejoin="round" /></svg>;
}
function RulerIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="8" width="18" height="8" rx="1.5" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" strokeLinecap="round" /></svg>;
}
function LayersIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m12 3 9 5-9 5-9-5 9-5Z" strokeLinejoin="round" /><path d="m3 13 9 5 9-5" strokeLinejoin="round" /></svg>;
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m8.5 12 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
