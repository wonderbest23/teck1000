import { catalogCategories, productLabels } from "@/lib/catalog";
import type { FurnitureInput, ProductType } from "@/lib/types";

/**
 * 작업본(draft) 저장/복원 + 최근 저장 내역(history).
 * - 작업 슬롯: teck_quote_<slug> (상품별 1개, 자동저장으로 새로고침 이어가기)
 * - 히스토리: teck_quote_history_v1 ('새로 시작' 시 기존 작업본을 보관)
 */
const DRAFT_PREFIX = "teck_quote_";
const HISTORY_KEY = "teck_quote_history_v1";
const HISTORY_CAP = 16;
const ALL_SLUGS = catalogCategories.flatMap((c) => c.slugs);

export type DraftEntry = { slug: ProductType; name: string; input: FurnitureInput; ts: number };

export function draftKey(slug: ProductType) {
  return `${DRAFT_PREFIX}${slug}`;
}

export function readDraft(slug: ProductType): FurnitureInput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(slug));
    if (!raw) return null;
    const v = JSON.parse(raw) as FurnitureInput;
    return v && v.productType === slug ? v : null;
  } catch {
    return null;
  }
}

export function writeDraft(slug: ProductType, input: FurnitureInput) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftKey(slug), JSON.stringify(input));
  } catch {
    // 용량 초과 등 무시
  }
}

export function removeDraft(slug: ProductType) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(slug));
  } catch {
    // 무시
  }
}

export function readHistory(): DraftEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as DraftEntry[]) : [];
  } catch {
    return [];
  }
}

const sig = (e: { slug: ProductType; input: FurnitureInput }) =>
  `${e.slug}-${e.input.width_mm}x${e.input.height_mm}x${e.input.depth_mm}-${e.input.material ?? ""}`;

function writeHistory(list: DraftEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_CAP)));
  } catch {
    // 무시
  }
}

/** '새로 시작' 시: 해당 상품의 기존 작업본을 히스토리에 보관하고 슬롯을 비운다. */
export function archiveDraft(slug: ProductType, name: string) {
  const draft = readDraft(slug);
  if (draft) {
    const entry: DraftEntry = { slug, name, input: draft, ts: Date.now() };
    const list = readHistory().filter((e) => sig(e) !== sig(entry));
    writeHistory([entry, ...list]);
  }
  removeDraft(slug);
}

/** 히스토리 항목을 작업 슬롯에 되살린다(이후 /custom/<slug> 진입 시 복원됨). */
export function restoreToDraft(entry: DraftEntry) {
  writeDraft(entry.slug, entry.input);
}

/** 최근 저장 내역에서 항목 삭제 — 히스토리에서 제거하고, 동일한 현재 작업 슬롯이면 그것도 비움. */
export function removeRecentDesign(entry: DraftEntry) {
  writeHistory(readHistory().filter((e) => sig(e) !== sig(entry)));
  const draft = readDraft(entry.slug);
  if (draft && sig({ slug: entry.slug, input: draft }) === sig(entry)) removeDraft(entry.slug);
}

/** 최근 저장 내역 — 현재 작업 슬롯 + 히스토리를 합쳐 중복 제거(최신순). */
export function readRecentDesigns(): DraftEntry[] {
  const live: DraftEntry[] = ALL_SLUGS.map((slug) => {
    const d = readDraft(slug);
    return d ? { slug, name: productLabels[slug] ?? slug, input: d, ts: 0 } : null;
  }).filter((e): e is DraftEntry => Boolean(e));
  const seen = new Set<string>();
  const out: DraftEntry[] = [];
  for (const e of [...live, ...readHistory()]) {
    const k = sig(e);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(e);
    }
  }
  return out.slice(0, 8);
}
