"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createWorkOrder, toDateKey } from "@/lib/workOrders";
import { KitchenDrawingView } from "@/components/admin/KitchenDrawingView";
import { CutSheetPanel } from "@/components/admin/CutSheetPanel";
import { ModuleListEditor } from "@/components/editor/ModuleListEditor";
import { defaultInput } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { calculateQuote } from "@/lib/quote";
import { useInputHistory } from "@/lib/hooks/useInputHistory";
import type { FurnitureInput } from "@/lib/types";
import { kitchenModuleTypeLabels, type KitchenModuleType } from "@/lib/kitchen";

const Preview3D = dynamic(() => import("@/components/Preview3D").then((mod) => mod.Preview3D), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[420px] items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500">
      3D 미리보기 준비 중...
    </div>
  ),
});

type PhotoDraft = {
  layoutShape: "straight" | "l_shape";
  cornerSide: "left" | "right";
  totalWidthMm: number;
  moduleCount: number;
  sideTotalWidthMm: number;
  sideModuleCount: number;
  sideModuleTypes: KitchenModuleType[];
  hasWall: boolean;
  hasSink: boolean;
  hasFaucet: boolean;
  hasCooktop: boolean;
  hasHood: boolean;
  sinkIndex: number;
  cooktopIndex: number;
  hoodIndex: number;
  moduleTypes: KitchenModuleType[];
  note: string;
};

const initialDraft: PhotoDraft = {
  layoutShape: "straight",
  cornerSide: "right",
  totalWidthMm: 2400,
  moduleCount: 4,
  sideTotalWidthMm: 0,
  sideModuleCount: 0,
  sideModuleTypes: [],
  hasWall: true,
  // 설비는 기본 OFF — 도면/사진에 실제로 있을 때만 켜진다 (허상 방지)
  hasSink: false,
  hasFaucet: false,
  hasCooktop: false,
  hasHood: false,
  sinkIndex: 0,
  cooktopIndex: 0,
  hoodIndex: 0,
  moduleTypes: ["drawer", "door", "door", "door"],
  note: "",
};

// ───────── 보정 학습 (in-context) ─────────
// 모델 파인튜닝은 불가하므로, 사람이 보정한 "AI추정 → 실제정답" 예시를 누적 저장해
// 다음 분석 때 프롬프트에 함께 넣어 같은 손글씨·표기 습관을 학습시킨다.
type LearnDraft = Pick<
  PhotoDraft,
  | "layoutShape"
  | "cornerSide"
  | "totalWidthMm"
  | "moduleCount"
  | "moduleTypes"
  | "sideTotalWidthMm"
  | "sideModuleCount"
  | "hasSink"
  | "hasFaucet"
  | "hasCooktop"
  | "hasHood"
  | "sinkIndex"
  | "cooktopIndex"
  | "hoodIndex"
>;
type LearnExample = { t: number; ai: LearnDraft; fixed: LearnDraft; note?: string; thumb?: string };
const LEARN_KEY = "teck_photo_learning";
const LEARN_MAX = 12;

/** 보정 사진을 작은 JPEG 썸네일(dataURL)로 축소 — 이미지 예시 학습/저장 비용 절감. */
async function makeThumb(file: File, maxDim = 320, quality = 0.6): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        resolve(null);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function toLearn(d: PhotoDraft): LearnDraft {
  return {
    layoutShape: d.layoutShape,
    cornerSide: d.cornerSide,
    totalWidthMm: d.totalWidthMm,
    moduleCount: d.moduleCount,
    moduleTypes: d.moduleTypes,
    sideTotalWidthMm: d.sideTotalWidthMm,
    sideModuleCount: d.sideModuleCount,
    hasSink: d.hasSink,
    hasFaucet: d.hasFaucet,
    hasCooktop: d.hasCooktop,
    hasHood: d.hasHood,
    sinkIndex: d.sinkIndex,
    cooktopIndex: d.cooktopIndex,
    hoodIndex: d.hoodIndex,
  };
}

function loadLearning(): LearnExample[] {
  try {
    const raw = window.localStorage.getItem(LEARN_KEY);
    const list = raw ? (JSON.parse(raw) as LearnExample[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** AI추정과 사람보정이 다르면 학습 예시로 저장. 저장됐으면 true. */
function saveLearningExample(aiDraft: PhotoDraft, fixedDraft: PhotoDraft, note?: string, thumb?: string | null): boolean {
  const ai = toLearn(aiDraft);
  const fixed = toLearn(fixedDraft);
  if (JSON.stringify(ai) === JSON.stringify(fixed)) return false;
  try {
    const list = loadLearning();
    list.push({ t: Date.now(), ai, fixed, note: note?.trim() || undefined, thumb: thumb || undefined });
    const trimmed = list.slice(-LEARN_MAX);
    window.localStorage.setItem(LEARN_KEY, JSON.stringify(trimmed));
    return true;
  } catch {
    // 용량 초과 등 — 썸네일 없이 한 번 더 시도
    try {
      const list = loadLearning();
      list.push({ t: Date.now(), ai, fixed, note: note?.trim() || undefined });
      window.localStorage.setItem(LEARN_KEY, JSON.stringify(list.slice(-LEARN_MAX)));
      return true;
    } catch {
      return false;
    }
  }
}

function clearLearning() {
  try {
    window.localStorage.removeItem(LEARN_KEY);
  } catch {
    // 무시
  }
}

export function KitchenPhotoStudio() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [draft, setDraft] = useState<PhotoDraft>(initialDraft);
  const initialInput = useMemo(() => buildKitchenInput(initialDraft), []);
  const { input, set: setInputValue, reset: resetInput, undo, redo, canUndo, canRedo } = useInputHistory(initialInput);
  const setInput = (value: FurnitureInput | ((current: FurnitureInput) => FurnitureInput)) =>
    setInputValue(typeof value === "function" ? (value as (current: FurnitureInput) => FurnitureInput)(input) : value);
  const [selModule, setSelModule] = useState<number | null>(null);
  const [status, setStatus] = useState("주방 사진을 고르면 AI가 자동으로 분석을 시작해요.");
  // 1: 사진 올리기 → 2: AI 분석·값 확인 → 3: 3D·견적 결과
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [analyzed, setAnalyzed] = useState(false);
  const [viewTab, setViewTab] = useState<"3d" | "drawing" | "manufacturing">("3d");
  const [hydrated, setHydrated] = useState(false);
  // 보정 학습: AI가 추정한 원본 스냅샷 + 누적 학습 건수 + 현재 사진 썸네일
  const [aiDraft, setAiDraft] = useState<PhotoDraft | null>(null);
  const [learnCount, setLearnCount] = useState(0);
  const [photoThumb, setPhotoThumb] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  // 작업지시서 저장(일정표용)
  const [woTitle, setWoTitle] = useState("");
  const [woDate, setWoDate] = useState("");
  const [woNote, setWoNote] = useState("");
  const [woAssignee, setWoAssignee] = useState("");
  const [woSaved, setWoSaved] = useState(false);
  useEffect(() => {
    if (!woDate) setWoDate(toDateKey(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLearnCount(loadLearning().length);
  }, []);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  useEffect(() => {
    try {
      setApiKey(window.localStorage.getItem("teck_anthropic_key") ?? "");
    } catch {
      // localStorage 접근 불가 시 무시
    }
  }, []);

  // 자동 복원 — 새로고침/이탈 후 다시 와도 작성하던 설계가 유지된다
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("teck_photo_studio");
      if (raw) {
        const saved = JSON.parse(raw) as {
          draft?: PhotoDraft;
          input?: FurnitureInput;
          step?: 1 | 2 | 3;
          viewTab?: "3d" | "drawing" | "manufacturing";
          analyzed?: boolean;
          photoName?: string;
        };
        if (saved.draft) setDraft(normalizeDraft({ ...initialDraft, ...saved.draft }));
        if (saved.input) resetInput(saved.input);
        if (saved.step) setStep(saved.step);
        if (saved.viewTab) setViewTab(saved.viewTab);
        if (typeof saved.analyzed === "boolean") setAnalyzed(saved.analyzed);
        if (saved.photoName) setPhotoName(saved.photoName);
        if (saved.input || saved.draft) setStatus("이전에 작성하던 설계를 불러왔어요. 이어서 진행하세요.");
      }
    } catch {
      // 무시
    }
    setHydrated(true);
  }, []);

  // 자동 저장 (복원 완료 후에만 — 초기 기본값으로 덮어쓰지 않도록)
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        "teck_photo_studio",
        JSON.stringify({ draft, input, step, viewTab, analyzed, photoName }),
      );
    } catch {
      // 무시
    }
  }, [hydrated, draft, input, step, viewTab, analyzed, photoName]);

  // Ctrl/⌘+Z = 되돌리기, Ctrl+Y / ⌘⇧Z = 다시실행 (입력 필드 포커스 시 제외)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  function saveApiKey(value: string) {
    setApiKey(value);
    try {
      if (value.trim()) window.localStorage.setItem("teck_anthropic_key", value.trim());
      else window.localStorage.removeItem("teck_anthropic_key");
    } catch {
      // 저장 실패 무시
    }
  }

  const quote = useMemo(() => calculateQuote(input), [input]);
  const modules = input.kitchen_modules_mm ?? [];
  const visibleParts = quote.parts.filter((part) => part.quantity > 0).slice(0, 8);

  const [woSaving, setWoSaving] = useState(false);
  async function saveWorkOrder() {
    if (woSaving) return;
    setWoSaving(true);
    const nd = normalizeDraft(draft);
    const saved = await createWorkOrder({
      title: woTitle.trim() || "이름 없는 작업",
      date: woDate || toDateKey(new Date()),
      status: "대기",
      approved: false,
      assignee: woAssignee.trim(),
      orderNumber: "",
      widthMm: input.width_mm,
      moduleCount: nd.moduleCount,
      hasWall: nd.hasWall,
      layout: nd.layoutShape === "l_shape" ? "ㄱ자" : "일자",
      note: woNote.trim(),
      price: quote.finalPrice,
      partsCount: quote.parts.reduce((sum, part) => sum + part.quantity, 0),
      input,
    });
    setWoSaving(false);
    if (saved) {
      setWoSaved(true);
      window.setTimeout(() => setWoSaved(false), 2600);
    }
  }

  function handlePhoto(file?: File) {
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
    setPhotoName(file.name);
    setPhotoFile(file);
    setAnalyzed(false);
    setPhotoThumb(null);
    void makeThumb(file).then(setPhotoThumb); // 보정 학습용 썸네일 준비
    // 업로드하면 곧바로 AI 분석 시작 (버튼 다시 누를 필요 없음)
    setStep(2);
    void analyzePhoto(file);
  }

  async function analyzePhoto(fileArg?: File) {
    const file = fileArg ?? photoFile;
    if (!file) {
      setStatus("먼저 사진을 올려주세요.");
      return;
    }
    setAnalyzing(true);
    setAnalyzeError(null);
    setStatus("AI가 사진을 분석하는 중입니다…");
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read fail"));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1] ?? "";
      const response = await fetch("/api/photo-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // examples: 지금까지 사람이 보정한 예시를 함께 보내 같은 습관을 학습시킨다
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type || "image/jpeg", note: draft.note, apiKey, examples: loadLearning() }),
      });
      const data = await response.json();
      if (!response.ok) {
        const msg = data?.error ?? "AI 분석에 실패했습니다.";
        setAnalyzeError(msg);
        setStatus(msg);
        return;
      }
      // API 응답(스키마 키)을 PhotoDraft로 매핑
      const d = data.draft as {
        layoutShape?: "straight" | "l_shape";
        cornerSide?: "left" | "right";
        totalWidthMm?: number;
        moduleCount?: number;
        sideTotalWidthMm?: number;
        sideModuleCount?: number;
        sideModuleTypes?: KitchenModuleType[];
        moduleTypes?: KitchenModuleType[];
        hasWall?: boolean;
        hasSink?: boolean;
        hasCooktop?: boolean;
        hasHood?: boolean;
        sinkIndex?: number;
        cooktopIndex?: number;
        hoodIndex?: number;
        note?: string;
      };
      const nextDraft = normalizeDraft({
        ...draft,
        layoutShape: d.layoutShape ?? draft.layoutShape,
        cornerSide: d.cornerSide ?? draft.cornerSide,
        totalWidthMm: d.totalWidthMm ?? draft.totalWidthMm,
        moduleCount: d.moduleCount ?? draft.moduleCount,
        sideTotalWidthMm: d.sideTotalWidthMm ?? draft.sideTotalWidthMm,
        sideModuleCount: d.sideModuleCount ?? draft.sideModuleCount,
        sideModuleTypes: d.sideModuleTypes ?? draft.sideModuleTypes,
        moduleTypes: d.moduleTypes ?? draft.moduleTypes,
        hasWall: d.hasWall ?? draft.hasWall,
        hasSink: d.hasSink ?? draft.hasSink,
        hasFaucet: d.hasSink ?? draft.hasFaucet,
        hasCooktop: d.hasCooktop ?? draft.hasCooktop,
        hasHood: d.hasHood ?? draft.hasHood,
        sinkIndex: d.sinkIndex ?? draft.sinkIndex,
        cooktopIndex: d.cooktopIndex ?? draft.cooktopIndex,
        hoodIndex: d.hoodIndex ?? draft.hoodIndex,
        note: d.note ?? draft.note,
      });
      setDraft(nextDraft);
      setAiDraft(nextDraft); // AI 추정 원본 스냅샷(보정 학습 비교용)
      setAnalyzed(true);
      setStatus(
        learnCount > 0
          ? `AI 분석 완료 (보정 학습 ${learnCount}건 반영). 값을 확인하고 ‘3D 만들기’를 누르세요.`
          : "AI 분석이 끝났어요. 아래 값이 맞는지 확인하고, 맞으면 ‘3D 만들기’를 누르세요.",
      );
    } catch {
      setAnalyzeError("분석 요청 중 오류가 발생했습니다. 네트워크를 확인하고 다시 시도해주세요.");
      setStatus("분석 요청 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setAnalyzing(false);
    }
  }

  function updateDraft(next: Partial<PhotoDraft>) {
    setDraft((current) => normalizeDraft({ ...current, ...next }));
  }

  function updateModuleType(index: number, type: KitchenModuleType) {
    setDraft((current) => {
      const moduleTypes = normalizeModuleTypes(current.moduleTypes, current.moduleCount);
      moduleTypes[index] = type;
      return normalizeDraft({ ...current, moduleTypes });
    });
  }

  // ㄱ자 측면 칸 타입 변경 → draft + 3D 동시 반영
  function updateSideModuleType(index: number, type: KitchenModuleType) {
    const nextTypes = replaceAt(normalizeModuleTypes(draft.sideModuleTypes, draft.sideModuleCount), index, type);
    const nextDraft = normalizeDraft({ ...draft, sideModuleTypes: nextTypes });
    setDraft(nextDraft);
    setInput(buildKitchenInput(nextDraft));
  }

  // ‘3D 만들기’ 버튼: 이 시점에만 3D·견적이 만들어진다 (그 전엔 절대 안 뜸)
  function generatePreview() {
    const nextDraft = inferDraftFromText(draft);
    // 보정 학습: AI 추정과 사람이 확정한 값이 다르면 예시로 저장 (다음 분석에 반영)
    let learnedMsg = "";
    if (aiDraft && saveLearningExample(aiDraft, nextDraft, nextDraft.note, photoThumb)) {
      const count = loadLearning().length;
      setLearnCount(count);
      learnedMsg = ` 보정 내용이 학습됐어요(누적 ${count}건) — 다음엔 더 정확해집니다.`;
    }
    setDraft(nextDraft);
    resetInput(buildKitchenInput(nextDraft));
    setStep(3);
    setStatus(`3D 미리보기와 견적이 만들어졌어요. 3D에서 장을 눌러 수정할 수 있어요.${learnedMsg}`);
  }

  function restart() {
    setStep(1);
    setAnalyzed(false);
    setDraft(initialDraft);
    resetInput(buildKitchenInput(initialDraft));
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    setPhotoName("");
    setPhotoFile(null);
    setPhotoThumb(null);
    setAiDraft(null);
    try {
      window.localStorage.removeItem("teck_photo_studio");
    } catch {
      // 무시
    }
    setStatus("처음부터 다시 시작합니다. 사진을 올려주세요.");
  }

  function applyInput(nextInput: FurnitureInput) {
    setInput(nextInput);
    setStatus("3D에서 수정한 내용이 부품표와 견적에 반영되었습니다.");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:max-w-5xl">
      <div className="text-center">
        <p className="text-sm font-black text-brand">사진으로 주방 만들기</p>
        <h1 className="mt-1 text-3xl font-black text-ink">사진 한 장이면 3D와 견적이 나와요</h1>
      </div>

      {/* 단계 표시 — 한 번에 한 단계만 진행 */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {[
          { n: 1, label: "사진 올리기" },
          { n: 2, label: "AI 분석·확인" },
          { n: 3, label: "3D·견적 결과" },
        ].map((s, index) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-black ${
                  step === s.n ? "bg-brand text-white" : step > s.n ? "bg-cyan-100 text-brand" : "bg-slate-200 text-slate-500"
                }`}
              >
                {step > s.n ? "✓" : s.n}
              </div>
              <span className={`mt-1 text-[11px] font-bold ${step === s.n ? "text-ink" : "text-slate-400"}`}>{s.label}</span>
            </div>
            {index < 2 && <div className={`h-0.5 w-8 ${step > s.n ? "bg-brand" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      <p className="mx-auto mt-5 max-w-xl rounded-2xl bg-soft px-4 py-3 text-center text-sm font-bold leading-6 text-slate-700">
        {status}
      </p>

      {/* ───────── STEP 1: 사진 올리기 ───────── */}
      {step === 1 && (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="text-xl font-black text-ink">① 주방 사진을 올려주세요</div>
          <p className="mt-1 text-sm text-slate-500">지금 쓰는 싱크대 사진, 손으로 그린 그림 모두 괜찮아요.</p>

          <label className="mt-5 flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-brand hover:bg-cyan-50">
            {photoUrl ? (
              <img src={photoUrl} alt="업로드한 주방 참고 사진" className="h-[300px] w-full rounded-2xl object-cover" />
            ) : (
              <span className="px-8 text-base font-bold leading-7 text-slate-500">
                여기를 눌러
                <br />
                사진을 선택하세요
              </span>
            )}
            <input className="sr-only" type="file" accept="image/*" onChange={(event) => handlePhoto(event.target.files?.[0])} />
          </label>
          {photoName && <div className="mt-3 truncate text-center text-sm font-bold text-slate-600">📷 {photoName}</div>}

          <details className="mt-4 rounded-2xl bg-soft px-4 py-3">
            <summary className="cursor-pointer text-xs font-black text-slate-500">AI 분석 키 설정 (한 번만)</summary>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => saveApiKey(event.target.value)}
              placeholder="sk-ant-..."
              autoComplete="off"
              aria-label="Anthropic API 키"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              {apiKey ? "키가 저장되어 있어요. 바로 분석할 수 있어요." : "console.anthropic.com에서 받은 키를 한 번만 붙여넣으면 됩니다."}
            </p>
          </details>

          <p className="mt-5 rounded-2xl bg-cyan-50 px-4 py-3 text-center text-sm font-bold text-brand">
            사진을 고르면 AI가 바로 분석을 시작해요.
          </p>
        </div>
      )}

      {/* ───────── STEP 2: AI 분석 & 값 확인 ───────── */}
      {step === 2 && (
        <div className="mt-6 space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xl font-black text-ink">② AI가 사진을 읽고 있어요</div>
              {learnCount > 0 && (
                <span className="flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-black text-violet-700">
                  보정 학습 {learnCount}건 반영 중
                  <button
                    type="button"
                    onClick={() => { clearLearning(); setLearnCount(0); }}
                    className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-400 ring-1 ring-slate-200"
                  >
                    초기화
                  </button>
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">사진에서 크기·칸 수·싱크/쿡탑/후드를 자동으로 찾아 채워줘요. 값을 고쳐서 만들면 다음 분석에 학습돼요.</p>

            <div className="mt-4 flex items-center gap-4">
              {photoUrl && <img src={photoUrl} alt="업로드한 사진" className="h-24 w-32 flex-shrink-0 rounded-xl object-cover" />}
              <div className="flex-1">
                {analyzing ? (
                  <div className="flex items-center justify-center gap-2 rounded-2xl bg-soft px-5 py-4 text-center text-base font-black text-slate-600">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand" aria-hidden />
                    AI가 사진을 읽는 중… 잠시만요
                  </div>
                ) : analyzeError ? (
                  <div className="rounded-2xl bg-rose-50 px-5 py-4 text-center text-sm font-black text-rose-700">⚠ {analyzeError}</div>
                ) : analyzed ? (
                  <div className="rounded-2xl bg-cyan-50 px-5 py-4 text-center text-base font-black text-brand">✓ 분석 완료! 아래 값을 확인하세요</div>
                ) : (
                  <div className="rounded-2xl bg-soft px-5 py-4 text-center text-base font-black text-slate-600">분석 준비 중…</div>
                )}
                <button
                  type="button"
                  onClick={() => analyzePhoto()}
                  disabled={!photoFile || analyzing}
                  className={`mt-2 w-full rounded-xl px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${analyzeError ? "bg-rose-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-300"}`}
                >
                  {analyzing ? "분석 중…" : analyzeError ? "다시 시도" : "다시 분석하기"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="text-lg font-black text-ink">값이 맞는지 확인해 주세요</div>
            <p className="mt-1 text-sm text-slate-500">틀린 곳이 있으면 직접 고쳐도 돼요.</p>

            {/* 배치 모양 */}
            <div className="mt-4">
              <div className="text-xs font-black text-slate-500">주방 모양</div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Toggle label="일자형" active={draft.layoutShape === "straight"} onClick={() => updateDraft({ layoutShape: "straight" })} />
                <Toggle label="ㄱ자형" active={draft.layoutShape === "l_shape"} onClick={() => updateDraft({ layoutShape: "l_shape", sideModuleCount: draft.sideModuleCount || 2, sideTotalWidthMm: draft.sideTotalWidthMm || 1200 })} />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <NumberField label={draft.layoutShape === "l_shape" ? "메인 가로 mm" : "전체 가로 mm"} value={draft.totalWidthMm} min={1200} max={4200} step={100} onChange={(value) => updateDraft({ totalWidthMm: value })} />
              <NumberField label="하부장 칸 수" value={draft.moduleCount} min={2} max={7} step={1} onChange={(value) => updateDraft({ moduleCount: value })} />
            </div>

            {draft.layoutShape === "l_shape" && (
              <div className="mt-3 rounded-2xl bg-cyan-50/60 p-3">
                <div className="text-xs font-black text-brand">ㄱ자 측면(꺾인) 다리</div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <NumberField label="측면 길이 mm" value={draft.sideTotalWidthMm} min={400} max={3600} step={100} onChange={(value) => updateDraft({ sideTotalWidthMm: value })} />
                  <NumberField label="측면 칸 수" value={draft.sideModuleCount} min={1} max={5} step={1} onChange={(value) => updateDraft({ sideModuleCount: value })} />
                </div>
                <div className="mt-2">
                  <div className="text-xs font-black text-slate-500">코너 위치 (측면이 붙는 쪽)</div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <Toggle label="왼쪽" active={draft.cornerSide === "left"} onClick={() => updateDraft({ cornerSide: "left" })} />
                    <Toggle label="오른쪽" active={draft.cornerSide === "right"} onClick={() => updateDraft({ cornerSide: "right" })} />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Toggle label="상부장" active={draft.hasWall} onClick={() => updateDraft({ hasWall: !draft.hasWall })} />
              <Toggle label="싱크볼" active={draft.hasSink} onClick={() => updateDraft({ hasSink: !draft.hasSink, hasFaucet: !draft.hasSink ? true : draft.hasFaucet })} />
              <Toggle label="수전" active={draft.hasFaucet} onClick={() => updateDraft({ hasFaucet: !draft.hasFaucet, hasSink: !draft.hasFaucet ? true : draft.hasSink })} />
              <Toggle label="쿡탑" active={draft.hasCooktop} onClick={() => updateDraft({ hasCooktop: !draft.hasCooktop })} />
              <Toggle label="후드" active={draft.hasHood} onClick={() => updateDraft({ hasHood: !draft.hasHood, hasWall: !draft.hasHood ? true : draft.hasWall })} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <IndexField label="싱크볼 위치" value={draft.sinkIndex} count={draft.moduleCount} disabled={!draft.hasSink} onChange={(value) => updateDraft({ sinkIndex: value })} />
              <IndexField label="쿡탑 위치" value={draft.cooktopIndex} count={draft.moduleCount} disabled={!draft.hasCooktop} onChange={(value) => updateDraft({ cooktopIndex: value, hoodIndex: value })} />
              <IndexField label="후드 위치" value={draft.hoodIndex} count={draft.moduleCount} disabled={!draft.hasHood} onChange={(value) => updateDraft({ hoodIndex: value })} />
            </div>

            <label className="mt-4 block space-y-1 text-xs font-bold text-slate-700">
              메모 (선택)
              <textarea
                className="field min-h-20 text-sm"
                value={draft.note}
                placeholder="예: 총 3000, 싱크볼 오른쪽, 후드 있음, 서랍 1칸"
                onChange={(event) => updateDraft({ note: event.target.value })}
              />
            </label>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="rounded-2xl bg-slate-200 px-5 py-4 text-base font-black text-slate-600">
              ← 사진 다시
            </button>
            <button type="button" onClick={generatePreview} className="flex-1 rounded-2xl bg-brand px-5 py-4 text-base font-black text-white">
              3D 만들기 →
            </button>
          </div>
        </div>
      )}

      {/* ───────── STEP 3: 3D · 견적 결과 ───────── */}
      {step === 3 && (
        <div className="mt-6 space-y-5">
          {/* 보기 전환: 3D ↔ 도면 */}
          <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewTab("3d")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-black transition ${viewTab === "3d" ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
            >
              3D 보기
            </button>
            <button
              type="button"
              onClick={() => setViewTab("drawing")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-black transition ${viewTab === "drawing" ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
            >
              도면 보기
            </button>
            <button
              type="button"
              onClick={() => setViewTab("manufacturing")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-black transition ${viewTab === "manufacturing" ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}
            >
              제작지시
            </button>
          </div>

          {viewTab === "manufacturing" ? (
            <CutSheetPanel input={input} title={woTitle || "제작 미리보기"} />
          ) : viewTab === "3d" ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
              <Preview3D
                input={input}
                onInputChange={applyInput}
                verdict={quote.verdictResult?.verdict}
                onModuleSelect={setSelModule}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
              />
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-card">
              <KitchenDrawingView
                input={input}
                onInputChange={applyInput}
                showElevation={false}
                selectedIndex={selModule}
                onSelectIndex={setSelModule}
                history={{ canUndo, canRedo, onUndo: undo, onRedo: redo }}
              />
            </div>
          )}

          {/* 칸별 정밀 인스펙터 — 도면/3D에서 칸을 누르면 그 칸의 모든 속성을 편집 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-card">
            <ModuleListEditor input={input} onChange={(partial) => applyInput({ ...input, ...partial })} selectedIndex={selModule ?? undefined} onSelectIndex={setSelModule} />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black text-ink">③ 칸 구성 확인</h2>
              <div className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                {input.kitchen_layout_shape === "l_shape" ? "ㄱ자 " : ""}메인 {modules.reduce((sum, value) => sum + value, 0)}mm
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-500">3D에서 장을 눌러도 되고, 아래에서 도어장/서랍장/레일장을 바꿀 수 있어요.</p>

            {input.kitchen_layout_shape === "l_shape" && (input.kitchen_side_modules_mm?.length ?? 0) > 0 && (
              <div className="mt-4 rounded-2xl bg-cyan-50/60 p-3">
                <div className="text-sm font-black text-brand">
                  ㄱ자 측면 다리 · {input.kitchen_corner === "left" ? "왼쪽" : "오른쪽"} 코너 · 총 {(input.kitchen_side_modules_mm ?? []).reduce((sum, value) => sum + value, 0)}mm
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(input.kitchen_side_modules_mm ?? []).map((width, index) => (
                    <div key={index} className="rounded-xl bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-ink">측면 {index + 1}번</div>
                          <div className="mt-1 text-xs font-bold text-slate-500">{width}mm</div>
                        </div>
                        <div className="flex gap-1">
                          {(["door", "drawer", "pullout"] as KitchenModuleType[]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => updateSideModuleType(index, type)}
                              className={`rounded-lg px-2 py-1 text-xs font-black ${
                                (input.kitchen_side_module_types?.[index] ?? "door") === type ? "bg-brand text-white" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
                              }`}
                            >
                              {typeLabel(type)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] font-bold text-slate-400">측면 칸 추가·삭제·가로조정은 3D에서 측면 칸을 눌러서도 할 수 있어요.</p>
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {modules.map((width, index) => (
                <div key={index} className="rounded-2xl bg-soft p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-ink">{index + 1}번 하부장</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">{width}mm</div>
                    </div>
                    <div className="flex gap-1">
                      {(["door", "drawer", "pullout"] as KitchenModuleType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            updateModuleType(index, type);
                            setInput(buildKitchenInput(normalizeDraft({ ...draft, moduleTypes: replaceAt(draft.moduleTypes, index, type) })));
                          }}
                          className={`rounded-lg px-2 py-1 text-xs font-black ${
                            (input.kitchen_module_types?.[index] ?? "door") === type ? "bg-brand text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          {typeLabel(type)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-lg font-black text-ink">견적 요약</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Summary label="예상 견적" value={formatMoney(quote.finalPrice)} />
              <Summary label="원판" value={`${quote.sheetCount}장`} />
              <Summary label="부품" value={`${quote.parts.reduce((sum, part) => sum + part.quantity, 0)}개`} />
              <Summary label="판재 면적" value={`${quote.boardAreaM2.toFixed(2)}m2`} />
            </div>
            <button
              type="button"
              onClick={() => setViewTab((current) => (current === "drawing" ? "3d" : "drawing"))}
              className="mt-4 block w-full rounded-2xl bg-slate-950 px-5 py-4 text-center text-sm font-black text-white"
            >
              {viewTab === "drawing" ? "3D 미리보기 보기" : "제조 도면(평면도) 보기"}
            </button>
          </div>

          {/* 작업지시서 저장 — 일정표(캘린더)에 등록 */}
          <div className="rounded-3xl border border-brand/30 bg-brand/5 p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-ink">📋 작업지시서 저장</h2>
              <Link href="/admin/schedule" className="rounded-lg bg-white px-3 py-1.5 text-xs font-black text-brand ring-1 ring-brand/30 hover:bg-brand/10">📅 일정표 보기</Link>
            </div>
            <p className="mt-1 text-xs font-bold text-slate-500">이름과 제작 예정일을 정하면 일정표(달력)에 등록돼요.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-black text-slate-600">고객/현장 이름
                <input value={woTitle} onChange={(e) => setWoTitle(e.target.value)} placeholder="예: 김민지 고객님 주방" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-brand" />
              </label>
              <label className="text-xs font-black text-slate-600">제작 예정일
                <input type="date" value={woDate} onChange={(e) => setWoDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-brand" />
              </label>
              <label className="text-xs font-black text-slate-600">담당자(선택)
                <input value={woAssignee} onChange={(e) => setWoAssignee(e.target.value)} placeholder="예: 김기사" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-brand" />
              </label>
            </div>
            <label className="mt-3 block text-xs font-black text-slate-600">메모(선택)
              <input value={woNote} onChange={(e) => setWoNote(e.target.value)} placeholder="예: 후드 현장 확인 필요" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-brand" />
            </label>
            <button type="button" onClick={saveWorkOrder} disabled={woSaving} className="mt-4 block w-full rounded-2xl bg-brand px-5 py-4 text-center text-base font-black text-white hover:bg-brand/90 disabled:bg-slate-300">
              {woSaving ? "저장 중…" : woSaved ? "저장됐어요 ✓ — 일정표에서 확인하세요" : "작업지시서 저장하기"}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-lg font-black text-ink">생성된 부품 초안</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="factory-table">
                <thead>
                  <tr>
                    <th>부품명</th>
                    <th>가로</th>
                    <th>세로</th>
                    <th>수량</th>
                    <th>자재</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleParts.map((part) => (
                    <tr key={`${part.name}-${part.width_mm}-${part.height_mm}`}>
                      <td>{part.name}</td>
                      <td>{part.width_mm}mm</td>
                      <td>{part.height_mm}mm</td>
                      <td>{part.quantity}</td>
                      <td>{part.material} / {part.color}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] font-bold text-slate-400">※ 공장 재단표에는 타공 항목이 포함되지 않습니다. 배수·수전·가스·콘센트 구멍은 아래 ‘현장 타공’으로 분류됩니다.</p>
          </div>

          {quote.siteTasks.length > 0 && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-card">
              <h2 className="text-lg font-black text-amber-800">현장 타공·조정 (시공자 작업)</h2>
              <p className="mt-1 text-xs font-bold text-amber-700">공장에서 미리 뚫지 않습니다. 설치 시 시공자가 현장 상황에 맞춰 작업합니다.</p>
              <ul className="mt-3 space-y-2">
                {quote.siteTasks.map((task) => (
                  <li key={task.name} className="flex items-start gap-2 rounded-xl bg-white px-3 py-2">
                    <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black text-white ${task.category === "타공" ? "bg-rose-600" : task.category === "조정" ? "bg-amber-600" : "bg-sky-600"}`}>{task.category}</span>
                    <div>
                      <div className="text-sm font-black text-slate-800">{task.name}</div>
                      {task.note && <div className="text-xs font-bold text-slate-500">{task.note}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-2xl bg-slate-200 px-5 py-4 text-base font-black text-slate-600">
              ← 값 다시 고치기
            </button>
            <button type="button" onClick={restart} className="rounded-2xl bg-white px-5 py-4 text-base font-black text-slate-500 ring-1 ring-slate-300">
              처음부터
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildKitchenInput(draft: PhotoDraft): FurnitureInput {
  const normalized = normalizeDraft(draft);
  const modules = distributeWidth(normalized.totalWidthMm, normalized.moduleCount);
  const moduleTypes = normalizeModuleTypes(normalized.moduleTypes, normalized.moduleCount);
  const wallHidden = normalized.hasWall ? [] : modules.map((_, index) => index);
  const isL = normalized.layoutShape === "l_shape";
  const sideModules = isL ? distributeWidth(normalized.sideTotalWidthMm, normalized.sideModuleCount) : [];
  const sideModuleTypes = isL ? normalizeModuleTypes(normalized.sideModuleTypes, normalized.sideModuleCount) : [];

  return {
    ...defaultInput,
    productType: "kitchen_full_set",
    width_mm: modules.reduce((sum, value) => sum + value, 0),
    height_mm: 850,
    depth_mm: 600,
    kitchen_base_height_mm: 850,
    kitchen_base_depth_mm: 600,
    kitchen_wall_height_mm: 800,
    kitchen_wall_depth_mm: 340,
    color: "무광 화이트",
    material: "UV 하이그로시 화이트",
    has_door: true,
    door_count: normalized.moduleCount,
    shelf_count: 1,
    kitchen_template: "kitchen_2400_standard",
    countertop_type: "none",
    toe_kick_option: "none",
    sink_option: normalized.hasSink ? "single_780" : "none",
    faucet_option: normalized.hasFaucet ? "basic_cobra" : "none",
    hood_option: normalized.hasHood ? "haatz_slide_600" : "none",
    cooktop_option: normalized.hasCooktop ? "gas_3burner_560" : "none",
    microwave_option: "none",
    drawer_module_count: moduleTypes.filter((type) => type === "drawer").length,
    pullout_module_count: moduleTypes.filter((type) => type === "pullout").length,
    kitchen_modules_mm: modules,
    kitchen_base_modules_mm: [...modules],
    kitchen_wall_modules_mm: [...modules],
    kitchen_module_types: moduleTypes,
    kitchen_drawer_counts: modules.map(() => 3),
    kitchen_base_shelf_counts: modules.map(() => 1),
    kitchen_wall_shelf_counts: modules.map(() => 1),
    kitchen_door_swings: modules.map(() => "pair"),
    kitchen_wall_hidden_indices: wallHidden,
    kitchen_layout_shape: isL ? "l_shape" : "straight",
    kitchen_corner: normalized.cornerSide,
    kitchen_side_modules_mm: sideModules,
    kitchen_side_module_types: sideModuleTypes,
    kitchen_side_has_wall: normalized.hasWall,
    sink_module_index: normalized.sinkIndex,
    cooktop_module_index: normalized.cooktopIndex,
    hood_module_index: normalized.hoodIndex,
    door_style: "flat",
  };
}

function inferDraftFromText(draft: PhotoDraft): PhotoDraft {
  const note = draft.note;
  const widthMatch = note.match(/([1-4]\d{3})/);
  const totalWidthMm = widthMatch ? Number(widthMatch[1]) : draft.totalWidthMm;
  const moduleCount = clamp(Math.round(totalWidthMm / 600), 2, 7);
  const hasSink = draft.hasSink || /싱크|개수대|수전/.test(note);
  const hasFaucet = draft.hasFaucet || /수전|싱크/.test(note);
  const hasCooktop = draft.hasCooktop || /쿡탑|가스|렌지|인덕션/.test(note);
  const hasHood = draft.hasHood || /후드/.test(note);
  const sinkIndex = /왼쪽|좌측/.test(note) ? 0 : /오른쪽|우측/.test(note) ? moduleCount - 1 : clamp(draft.sinkIndex, 0, moduleCount - 1);
  const cooktopIndex = clamp(draft.cooktopIndex, 0, moduleCount - 1);
  const moduleTypes = normalizeModuleTypes(draft.moduleTypes, moduleCount);
  if (/서랍/.test(note)) moduleTypes[0] = "drawer";
  if (/망장|인출/.test(note)) moduleTypes[Math.max(0, moduleCount - 1)] = "pullout";

  return normalizeDraft({
    ...draft,
    totalWidthMm,
    moduleCount,
    hasSink,
    hasFaucet,
    hasCooktop,
    hasHood,
    hasWall: draft.hasWall || hasHood,
    sinkIndex,
    cooktopIndex,
    hoodIndex: hasHood ? cooktopIndex : draft.hoodIndex,
    moduleTypes,
  });
}

function normalizeDraft(draft: PhotoDraft): PhotoDraft {
  const moduleCount = clamp(Math.round(draft.moduleCount), 2, 7);
  const isL = draft.layoutShape === "l_shape";
  const sideModuleCount = isL ? clamp(Math.round(draft.sideModuleCount || 1), 1, 5) : 0;
  const sideTotalWidthMm = isL ? clamp(Math.round((draft.sideTotalWidthMm || 1200) / 10) * 10, 400, 3600) : 0;
  return {
    ...draft,
    totalWidthMm: clamp(Math.round(draft.totalWidthMm / 10) * 10, 1200, 4200),
    moduleCount,
    sideModuleCount,
    sideTotalWidthMm,
    sideModuleTypes: normalizeModuleTypes(draft.sideModuleTypes ?? [], sideModuleCount),
    cornerSide: draft.cornerSide === "left" ? "left" : "right",
    sinkIndex: clamp(draft.sinkIndex, 0, moduleCount - 1),
    cooktopIndex: clamp(draft.cooktopIndex, 0, moduleCount - 1),
    hoodIndex: clamp(draft.hoodIndex, 0, moduleCount - 1),
    moduleTypes: normalizeModuleTypes(draft.moduleTypes, moduleCount),
  };
}

function normalizeModuleTypes(types: KitchenModuleType[], count: number) {
  return Array.from({ length: count }, (_, index) => types[index] ?? "door");
}

function distributeWidth(totalWidthMm: number, moduleCount: number) {
  const base = Math.floor(totalWidthMm / moduleCount / 10) * 10;
  const modules = Array.from({ length: moduleCount }, () => base);
  let remain = totalWidthMm - base * moduleCount;
  for (let index = modules.length - 1; index >= 0 && remain > 0; index -= 1) {
    const add = Math.min(100, remain);
    modules[index] += add;
    remain -= add;
  }
  return modules;
}

function replaceAt<T>(items: T[], index: number, value: T) {
  const next = [...items];
  next[index] = value;
  return next;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function typeLabel(type: KitchenModuleType) {
  // 앱 전체와 동일한 정식 명칭 사용 (도어장/서랍장/레일장 …) — 화면마다 이름이 달라 보이는 혼란 방지
  return kitchenModuleTypeLabels[type] ?? "도어장";
}

function NumberField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-1 text-xs font-bold text-slate-700">
      {label}
      <input className="field py-2 text-sm" type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function IndexField({ label, value, count, disabled, onChange }: { label: string; value: number; count: number; disabled?: boolean; onChange: (value: number) => void }) {
  return (
    <label className="space-y-1 text-xs font-bold text-slate-700">
      {label}
      <select className="field py-2 text-sm" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))}>
        {Array.from({ length: count }, (_, index) => (
          <option key={index} value={index}>{index + 1}번 칸</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl px-3 py-2 text-sm font-black ${active ? "bg-brand text-white" : "bg-soft text-slate-600"}`}>
      {label}
    </button>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-soft px-4 py-3">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <b className="text-ink">{value}</b>
    </div>
  );
}
