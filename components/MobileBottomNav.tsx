"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "홈", icon: HomeIcon },
  { href: "/start", label: "제작", icon: MakeIcon },
  { href: "/custom/kitchen_full_set?fresh=1", label: "미리보기", icon: PreviewIcon },
  { href: "/my/orders", label: "주문", icon: OrdersIcon },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  const isQuoteBuilder = pathname.startsWith("/custom/") && pathname !== "/custom/order";
  if (isQuoteBuilder) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : tab.href === "/start"
                ? pathname.startsWith("/start") || pathname.startsWith("/custom/")
                : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold transition ${
                active ? "bg-brand/8 text-brand" : "text-slate-400"
              }`}
            >
              <tab.icon active={active} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MakeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} />
      <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
    </svg>
  );
}

function PreviewIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3 3 8v8l9 5 9-5V8l-9-5Z" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinejoin="round" />
      <path d="m3 8 9 5 9-5M12 13v8" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinejoin="round" />
    </svg>
  );
}

function OrdersIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4h10l2 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8l2-4Z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinejoin="round"
      />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} />
      <path
        d="M5.5 20c1.2-3 4.1-5 6.5-5s5.3 2 6.5 5"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}
