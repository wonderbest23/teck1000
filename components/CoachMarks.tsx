"use client";

// 초보자 안내 코치마크 — 대상 요소를 노란 링으로 강조하고, 통통 튀는 화살표와 말풍선으로
// "여기 눌러요!"를 순서대로 안내한다. 한 번 완료(또는 건너뛰기)하면 다시 뜨지 않는다.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type CoachStep = { selector: string; text: string };

const DONE_KEY = "teck_coach_v1";

export function CoachMarks({ steps }: { steps: CoachStep[] }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(DONE_KEY)) setEnabled(true);
    } catch {
      /* noop */
    }
  }, []);

  // 대상 위치 추적 — 레이아웃 변화(패널 열림 등)에도 따라붙게 주기 갱신
  useEffect(() => {
    if (!enabled) return;
    const step = steps[idx];
    if (!step) return;
    const update = () => {
      const el = document.querySelector(step.selector);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    const timer = window.setInterval(update, 350);
    window.addEventListener("resize", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", update);
    };
  }, [enabled, idx, steps]);

  if (!enabled || idx >= steps.length) return null;

  const finish = () => {
    setEnabled(false);
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {
      /* noop */
    }
  };
  const next = () => (idx + 1 >= steps.length ? finish() : setIdx(idx + 1));
  if (!rect) return null; // 대상이 없으면 이 스텝은 표시하지 않음(다음으로 넘어갈 수 있게 버튼은 유지하고 싶지만 단순화)

  const arrowBelow = rect.bottom < window.innerHeight - 220; // 대상이 위쪽이면 화살표를 대상 아래에서 위로

  return createPortal(
    <>
      {/* 대상 강조 링 */}
      <div
        className="pointer-events-none fixed z-[90] animate-pulse rounded-xl ring-4 ring-amber-400/90"
        style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
      />
      {/* 대상을 가리키는 통통 튀는 화살표 */}
      <span
        className="pointer-events-none fixed z-[95] animate-bounce text-4xl drop-shadow-lg"
        aria-hidden="true"
        style={{
          left: Math.min(Math.max(rect.left + rect.width / 2 - 18, 8), window.innerWidth - 44),
          top: arrowBelow ? rect.bottom + 6 : rect.top - 48,
        }}
      >
        {arrowBelow ? "👆" : "👇"}
      </span>
      {/* 말풍선 — 화면 하단 중앙 고정(위치 계산 불안정 제거) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[95] flex justify-center px-4">
        <div className="pointer-events-auto w-[300px] rounded-2xl bg-slate-900/95 p-3 text-white shadow-2xl ring-1 ring-white/10">
          <p className="text-[12px] font-black leading-5">{steps[idx].text}</p>
          <div className="mt-2 flex items-center justify-between">
            <button type="button" onClick={finish} className="text-[10px] font-bold text-slate-400 hover:text-white">건너뛰기</button>
            <button type="button" onClick={next} className="rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-black text-slate-900 hover:bg-amber-300">
              {idx + 1 >= steps.length ? "시작하기!" : `다음 (${idx + 1}/${steps.length})`}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
