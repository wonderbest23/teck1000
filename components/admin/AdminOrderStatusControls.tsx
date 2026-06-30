"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { orderStatusLabels, statusFlow } from "@/lib/data";
import type { OrderStatus } from "@/lib/types";

export function AdminOrderStatusControls({
  orderId,
  currentStatus,
  reviewNote,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  reviewNote?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [note, setNote] = useState(reviewNote ?? "");
  const [saving, setSaving] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(next: OrderStatus) {
    setSaving(next);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, reviewNote: note }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "상태 변경에 실패했습니다.");
        return;
      }
      setStatus(next);
      router.refresh();
    } catch {
      setError("네트워크 오류로 상태를 변경하지 못했습니다.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <div className="mb-3 text-sm font-bold text-slate-500">
        현재 상태: <span className="text-ink">{orderStatusLabels[status]}</span>
      </div>
      <textarea
        className="field min-h-20 w-full text-sm"
        placeholder="검수 메모 (제작 가능 여부, 보완 요청사항 등)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {(["reviewing", "confirmed", ...statusFlow.filter((s) => !["submitted", "reviewing", "confirmed"].includes(s))] as OrderStatus[]).map((next) => (
          <button
            key={next}
            type="button"
            disabled={saving !== null}
            onClick={() => changeStatus(next)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-50 ${
              status === next ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {saving === next ? "변경 중…" : orderStatusLabels[next]}
          </button>
        ))}
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => changeStatus("cancelled")}
          className={`rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-50 ${
            status === "cancelled" ? "border-rose-500 bg-rose-500 text-white" : "border-rose-300 text-rose-600 hover:bg-rose-50"
          }`}
        >
          취소
        </button>
      </div>
      {error && <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</div>}
    </div>
  );
}
