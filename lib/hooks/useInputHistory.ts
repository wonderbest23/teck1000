"use client";

import { useCallback, useRef, useState } from "react";
import type { FurnitureInput } from "@/lib/types";

function serialize(input: FurnitureInput) {
  return JSON.stringify(input);
}

export type InputHistory = {
  /** 현재 입력값 (실제 React state) */
  input: FurnitureInput;
  /** 되돌릴 수 있는 변경. 같은 값이면 무시(dedup). 한 제스처를 1스텝으로 모으려면 coalesce:true */
  set: (next: FurnitureInput, opts?: { coalesce?: boolean }) => void;
  /** 경계 이벤트(템플릿 적용·사진 재생성·초기화) — 입력 교체 + 히스토리 비움(되돌리기 대상 아님) */
  reset: (next: FurnitureInput) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

/**
 * FurnitureInput 한 벌에 대한 실행취소/다시실행 스택.
 * Preview3D 내부에만 있던 히스토리 로직을 끌어올려, 3D·2D(도면) 편집이 한 스택을 공유하게 한다.
 * (commit-on-every-change 모델: 드래그는 호출부에서 pointerup 1회 커밋으로 이미 모임)
 */
export function useInputHistory(initial: FurnitureInput, options?: { limit?: number }): InputHistory {
  const limit = options?.limit ?? 60;
  const [input, setInputState] = useState<FurnitureInput>(initial);
  const latestRef = useRef<FurnitureInput>(initial);
  const signatureRef = useRef<string>(serialize(initial));
  const undoStackRef = useRef<FurnitureInput[]>([]);
  const redoStackRef = useRef<FurnitureInput[]>([]);
  const coalescingRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const set = useCallback(
    (next: FurnitureInput, opts?: { coalesce?: boolean }) => {
      const nextSignature = serialize(next);
      if (nextSignature === signatureRef.current) return; // no-op dedup
      // 제스처 중간 프레임(coalesce)이고 이미 한 번 기록했다면 새 스텝을 쌓지 않고 교체
      const coalesce = Boolean(opts?.coalesce) && coalescingRef.current;
      if (!coalesce) {
        undoStackRef.current.push(latestRef.current);
        if (undoStackRef.current.length > limit) undoStackRef.current.shift();
        redoStackRef.current = [];
      }
      coalescingRef.current = Boolean(opts?.coalesce);
      latestRef.current = next;
      signatureRef.current = nextSignature;
      setInputState(next);
      syncFlags();
    },
    [limit, syncFlags],
  );

  const reset = useCallback(
    (next: FurnitureInput) => {
      undoStackRef.current = [];
      redoStackRef.current = [];
      coalescingRef.current = false;
      latestRef.current = next;
      signatureRef.current = serialize(next);
      setInputState(next);
      syncFlags();
    },
    [syncFlags],
  );

  const undo = useCallback(() => {
    const previous = undoStackRef.current.pop();
    if (!previous) return;
    redoStackRef.current.push(latestRef.current);
    coalescingRef.current = false;
    latestRef.current = previous;
    signatureRef.current = serialize(previous);
    setInputState(previous);
    syncFlags();
  }, [syncFlags]);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(latestRef.current);
    if (undoStackRef.current.length > limit) undoStackRef.current.shift();
    coalescingRef.current = false;
    latestRef.current = next;
    signatureRef.current = serialize(next);
    setInputState(next);
    syncFlags();
  }, [limit, syncFlags]);

  return { input, set, reset, undo, redo, canUndo, canRedo };
}
