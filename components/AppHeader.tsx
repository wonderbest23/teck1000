import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3.5 lg:max-w-3xl">
        <Link href="/" className="text-xl font-black tracking-tight text-ink">
          동방씽크
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/my/orders"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" /></svg>
            주문내역
          </Link>
          <Link
            href="/login"
            aria-label="메뉴"
            className="grid h-9 w-9 place-items-center rounded-full text-slate-700 transition hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
