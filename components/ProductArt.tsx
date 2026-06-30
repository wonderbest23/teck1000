import type { ProductType } from "@/lib/types";
import type { JSX } from "react";

type ArtProps = { className?: string };

export function CategoryArt({ id, className = "" }: { id: string; className?: string }) {
  if (id === "kitchen") return <KitchenCategoryArt className={className} />;
  if (id === "storage") return <StorageCategoryArt className={className} />;
  if (id === "entrance") return <EntranceCategoryArt className={className} />;
  if (id === "wardrobe") return <WardrobeCategoryArt className={className} />;
  return null;
}

export function ProductArt({ slug, className = "" }: { slug: ProductType; className?: string }) {
  const map: Record<ProductType, (p: ArtProps) => JSX.Element> = {
    kitchen_full_set: KitchenFullSetArt,
    kitchen_base_cabinet: KitchenBaseArt,
    kitchen_island: KitchenIslandArt,
    kitchen_wall_cabinet: KitchenWallArt,
    custom_shelf: ShelfArt,
    gap_cabinet: GapCabinetArt,
    shoe_cabinet: ShoeCabinetArt,
    built_in_wardrobe: WardrobeArt,
  };
  const Component = map[slug];
  return <Component className={className} />;
}

function KitchenCategoryArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 360 144" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect x="48" y="18" width="264" height="48" rx="8" fill="#fff" stroke="#155e75" strokeWidth="3" opacity=".95" />
      <rect x="48" y="78" width="264" height="14" rx="4" fill="#cbd5e1" opacity=".9" />
      <rect x="48" y="96" width="264" height="36" rx="8" fill="#fff" stroke="#155e75" strokeWidth="3" opacity=".95" />
      <path d="M136 24v38M224 24v38M136 102v24M224 102v24" stroke="#94a3b8" strokeWidth="2" />
    </svg>
  );
}

function StorageCategoryArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 360 144" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect x="56" y="20" width="110" height="104" rx="8" fill="#fff" stroke="#b45309" strokeWidth="3" />
      <path d="M62 52h98M62 82h98M62 112h98" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
      <rect x="194" y="28" width="54" height="96" rx="8" fill="#fff" stroke="#b45309" strokeWidth="3" />
      <path d="M206 36v80M236 36v80" stroke="#94a3b8" strokeWidth="2" />
    </svg>
  );
}

function EntranceCategoryArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 360 144" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect x="98" y="24" width="164" height="96" rx="8" fill="#fff" stroke="#475569" strokeWidth="3" />
      <path d="M114 48h132M114 72h132M114 96h132" stroke="#cbd5e1" strokeWidth="2" />
      <path d="M130 104c10-8 22-8 32 0M198 104c10-8 22-8 32 0" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function WardrobeCategoryArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 360 144" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect x="108" y="16" width="144" height="112" rx="8" fill="#fff" stroke="#6d28d9" strokeWidth="3" />
      <path d="M180 20v104" stroke="#94a3b8" strokeWidth="2" />
      <rect x="148" y="64" width="10" height="28" rx="2" fill="#6d28d9" />
      <rect x="202" y="64" width="10" height="28" rx="2" fill="#6d28d9" />
    </svg>
  );
}

function KitchenFullSetArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect x="20" y="8" width="160" height="42" rx="6" fill="#fff" stroke="#155e75" strokeWidth="3" />
      <rect x="20" y="58" width="160" height="10" rx="3" fill="#cbd5e1" />
      <rect x="20" y="72" width="160" height="52" rx="6" fill="#fff" stroke="#155e75" strokeWidth="3" />
      <path d="M76 14v36M124 14v36M76 78v40M124 78v40" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="92" cy="96" r="3" fill="#155e75" />
      <circle cx="108" cy="96" r="3" fill="#155e75" />
      <ellipse cx="100" cy="128" rx="70" ry="8" fill="#0f172a" opacity=".08" />
    </svg>
  );
}

function KitchenBaseArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 120" className={className} aria-hidden>
      <rect x="30" y="18" width="140" height="72" rx="6" fill="#fff" stroke="#155e75" strokeWidth="3" />
      <rect x="30" y="8" width="140" height="12" rx="4" fill="#e2e8f0" />
      <path d="M82 24v58M118 24v58" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="96" cy="52" r="3" fill="#155e75" />
      <circle cx="112" cy="52" r="3" fill="#155e75" />
      <ellipse cx="100" cy="98" rx="60" ry="7" fill="#0f172a" opacity=".08" />
    </svg>
  );
}

function KitchenIslandArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 120" className={className} aria-hidden>
      {/* 상판(오버행) + 독립형 하부장 — 사방에서 접근하는 아일랜드 */}
      <rect x="22" y="44" width="156" height="14" rx="4" fill="#cbd5e1" />
      <rect x="38" y="58" width="124" height="40" rx="5" fill="#fff" stroke="#155e75" strokeWidth="3" />
      <path d="M80 58v40M120 58v40" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="66" cy="78" r="2.6" fill="#155e75" />
      <circle cx="94" cy="78" r="2.6" fill="#155e75" />
      <circle cx="106" cy="78" r="2.6" fill="#155e75" />
      <circle cx="134" cy="78" r="2.6" fill="#155e75" />
      <ellipse cx="100" cy="104" rx="66" ry="7" fill="#0f172a" opacity=".08" />
    </svg>
  );
}

function KitchenWallArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 100" className={className} aria-hidden>
      <rect x="35" y="16" width="130" height="52" rx="5" fill="#fff" stroke="#155e75" strokeWidth="3" />
      <path d="M82 22v44M118 22v44" stroke="#94a3b8" strokeWidth="2" />
      <rect x="88" y="58" width="24" height="3" rx="1.5" fill="#64748b" />
      <ellipse cx="100" cy="82" rx="55" ry="6" fill="#0f172a" opacity=".08" />
    </svg>
  );
}

function ShelfArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect x="48" y="12" width="104" height="108" rx="5" fill="#fff" stroke="#b45309" strokeWidth="3" />
      <path d="M52 42h96M52 72h96M52 102h96" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
      <rect x="62" y="48" width="28" height="18" rx="3" fill="#fde68a" />
      <rect x="96" y="78" width="36" height="18" rx="3" fill="#fdba74" />
      <ellipse cx="100" cy="126" rx="48" ry="7" fill="#0f172a" opacity=".08" />
    </svg>
  );
}

function GapCabinetArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect x="72" y="10" width="56" height="112" rx="5" fill="#fff" stroke="#b45309" strokeWidth="3" />
      <path d="M88 18v96M112 18v96" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="96" cy="66" r="3" fill="#b45309" />
      <ellipse cx="100" cy="128" rx="32" ry="7" fill="#0f172a" opacity=".08" />
    </svg>
  );
}

function ShoeCabinetArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect x="36" y="28" width="128" height="84" rx="6" fill="#fff" stroke="#475569" strokeWidth="3" />
      <path d="M52 48h96M52 72h96M52 96h96" stroke="#cbd5e1" strokeWidth="2" />
      <path d="M68 100c8-6 18-6 26 0M108 100c8-6 18-6 26 0" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="100" cy="120" rx="58" ry="7" fill="#0f172a" opacity=".08" />
    </svg>
  );
}

function WardrobeArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect x="40" y="10" width="120" height="112" rx="6" fill="#fff" stroke="#6d28d9" strokeWidth="3" />
      <path d="M100 14v104" stroke="#94a3b8" strokeWidth="2" />
      <rect x="72" y="58" width="8" height="24" rx="2" fill="#6d28d9" />
      <rect x="120" y="58" width="8" height="24" rx="2" fill="#6d28d9" />
      <ellipse cx="100" cy="128" rx="52" ry="7" fill="#0f172a" opacity=".08" />
    </svg>
  );
}
