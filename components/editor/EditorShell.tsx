"use client";

import { useEffect, type ReactNode } from "react";

export type ShellCategory = { id: string; label: string; icon: string };

/**
 * 캔바식 에디터 셸 — 좌측 카테고리 레일 + 항상 보이는 캔버스.
 *  - PC(≥lg): [레일 + 큰 미리보기 + 우측 옵션 패널] 2분할. 옵션 패널 상시 표시.
 *  - 모바일/태블릿(<lg): 카테고리를 누르면 옵션이 하단 팝업(모달)으로 뜬다.
 * 상태: activeCat = 사용자가 명시적으로 연/선택한 칸(모바일 팝업 게이트). effectiveCat =
 * activeCat ?? 첫 칸 (데스크톱 패널/레일 하이라이트가 항상 표시할 칸). 순수 CSS 반응형이라
 * 하이드레이션 불일치/팝업 플래시가 없다.
 */
export function EditorShell({
  header,
  categories,
  activeCat,
  effectiveCat,
  onSelectCat,
  panelTitle,
  panelHeading,
  panel,
  canvas,
  belowCanvas,
  toolbar,
  footer,
  overlay = false,
}: {
  header?: ReactNode;
  categories: ShellCategory[];
  activeCat: string | null;
  effectiveCat: string | null;
  onSelectCat: (id: string | null) => void;
  panelTitle?: string;
  panelHeading?: string;
  panel?: ReactNode;
  canvas: ReactNode;
  belowCanvas?: ReactNode;
  /** 오버레이 모드 상단 툴바 왼쪽 영역(상품명·모드·토글 등) — 카테고리 버튼과 한 줄로 정리 */
  toolbar?: ReactNode;
  footer?: ReactNode;
  /** 전체화면 미리보기 모드 — 미리보기가 화면을 채우고, 상단 한 줄 툴바 + 우측 옵션 드로어로 정리 */
  overlay?: boolean;
}) {
  // (모바일 팝업) ESC로 닫기 + 열려 있는 동안 배경 스크롤 잠금. activeCat이 있을 때만 동작.
  useEffect(() => {
    if (!activeCat) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSelectCat(null);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [activeCat, onSelectCat]);

  if (overlay) {
    return (
      <div className="w-full pb-24">
        {header}
        {/* 전체화면 미리보기 — 최상단 한 줄 툴바(섹션) + 그 아래 캔버스 */}
        <div className="flex h-[58dvh] min-h-[360px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-card lg:h-[64dvh]">
          {/* 상단 툴바 — 상품명·모드·토글 + 카테고리를 한 줄로 깔끔하게 (가로 스크롤) */}
          <div className="shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto px-2.5 py-2">
              {toolbar}
              {toolbar && categories.length > 0 && <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />}
              {categories.map((cat) => {
                const active = activeCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    title={cat.label}
                    aria-label={cat.label}
                    aria-pressed={active}
                    onClick={() => onSelectCat(active ? null : cat.id)}
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-base transition ${active ? "border-brand bg-brand text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    <span className="leading-none">{cat.icon}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 캔버스 */}
          <div className="relative flex-1">{canvas}</div>
        </div>

        {belowCanvas}
        {footer}

        {/* 옵션 미니 팝업(하단 바텀시트) — 미리보기는 그대로 보이고 아래에서 작은 창만 뜬다 */}
        {activeCat && (
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={panelTitle || "옵션"}>
            {/* 바깥 클릭 시 닫힘 (어둡게 가리지 않아 미리보기가 계속 보임) */}
            <button type="button" aria-label="옵션 닫기" onClick={() => onSelectCat(null)} className="absolute inset-0 bg-transparent" />
            <div className="absolute inset-x-0 bottom-0 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <div className="text-sm font-black text-ink">{panelHeading || panelTitle}</div>
                  <button type="button" onClick={() => onSelectCat(null)} aria-label="옵션 닫기" className="grid h-7 w-7 place-items-center rounded-lg bg-soft text-base font-black leading-none text-slate-500 hover:bg-slate-100">×</button>
                </div>
                <div className="max-h-[46vh] overflow-y-auto px-4 py-3">{panel}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-1 pb-28 lg:max-w-6xl">
      {header}

      <div className="mt-1 flex items-start gap-2 lg:gap-4">
        {/* 카테고리 레일 (양쪽 레이아웃 공통) */}
        <div className="flex w-[48px] shrink-0 flex-col gap-1">
          {categories.map((cat) => {
            const isExplicit = activeCat === cat.id; // 모바일 강조(명시 선택)
            const isEffective = effectiveCat === cat.id; // 데스크톱 강조(기본=첫 칸)
            return (
              <button
                key={cat.id}
                type="button"
                title={cat.label}
                aria-label={cat.label}
                aria-pressed={isEffective}
                onClick={() => onSelectCat(isExplicit ? null : cat.id)}
                className={[
                  "flex flex-col items-center gap-0.5 rounded-xl border py-2 transition",
                  isExplicit
                    ? "border-brand bg-brand text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                  // 데스크톱(lg+)에서는 effectiveCat 기준으로 덮어쓴다
                  isEffective
                    ? "lg:border-brand lg:bg-brand lg:text-white lg:shadow-sm"
                    : "lg:border-slate-200 lg:bg-white lg:text-slate-500 lg:hover:bg-slate-50",
                ].join(" ")}
              >
                <span className="text-base leading-none">{cat.icon}</span>
                <span className="px-0.5 text-center text-[10px] font-black leading-tight">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* 캔버스 — flex-1, 미리보기 */}
        <div className="min-w-0 flex-1">
          {canvas}
          {belowCanvas}
        </div>

        {/* 데스크톱 옵션 패널 — lg+ 상시 표시 (모바일에서는 숨김) */}
        <aside className="hidden w-[340px] shrink-0 lg:block xl:w-[360px]" aria-label={panelHeading || panelTitle || "옵션"}>
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-card">
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-5 py-3 text-base font-black text-ink">
              {panelHeading || panelTitle}
            </div>
            <div className="px-5 py-4">{panel}</div>
          </div>
        </aside>
      </div>

      {footer}

      {/* 모바일/태블릿 옵션 팝업(모달) — lg 미만에서만, 명시 선택 시에만 */}
      {activeCat && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={panelTitle || "옵션"}
        >
          {/* 배경 (눌러서 닫기) */}
          <button
            type="button"
            aria-label="옵션 닫기"
            onClick={() => onSelectCat(null)}
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
          />

          {/* 팝업 카드 */}
          <div className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[86vh] sm:max-w-2xl sm:rounded-3xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="text-base font-black text-ink">{panelTitle}</div>
              <button
                type="button"
                onClick={() => onSelectCat(null)}
                className="grid h-8 w-8 place-items-center rounded-lg bg-soft text-lg font-black leading-none text-slate-500 hover:bg-slate-100"
                aria-label="옵션 닫기"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">{panel}</div>
          </div>
        </div>
      )}
    </div>
  );
}
