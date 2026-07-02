"use client";

import { useRef, useState } from "react";
import { parseSimpleRoomActions, type RoomAction, type RoomCommandResult, type RoomStateSummary } from "@/lib/roomCommands";

type ChatMessage = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = ["아일랜드장 추가해줘", "선반장 추가하고 화이트로", "싱크대 폭 2400으로", "선택한 가구 90도 회전", "전체 자동 정렬"];

export function RoomCommandChat({
  state,
  onActions,
  onClose,
}: {
  state: RoomStateSummary;
  onActions: (actions: RoomAction[]) => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "무엇을 만들어 드릴까요? 예: ‘아일랜드장 추가해줘’, ‘싱크대 폭 2400으로’" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: message }]);
    setLoading(true);
    try {
      const res = await fetch("/api/room-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, state: stateRef.current }),
      });
      const data = (await res.json()) as RoomCommandResult & { error?: string };
      if (data.error) {
        setMessages((m) => [...m, { role: "assistant", text: `오류: ${data.error}` }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: data.reply || "완료했어요." }]);
        const actions = data.actions?.length ? data.actions : parseSimpleRoomActions(message, stateRef.current);
        if (actions.length) onActions(actions);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "연결에 실패했어요. 잠시 후 다시 시도해 주세요." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pointer-events-auto flex h-full w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/97 shadow-2xl backdrop-blur">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2">
        <div className="flex items-center gap-1.5 text-[12px] font-black text-ink">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-[10px] text-white">AI</span>
          AI로 만들기
        </div>
        <button type="button" onClick={onClose} aria-label="닫기" className="grid h-7 w-7 place-items-center rounded-lg bg-soft text-base font-black leading-none text-slate-500 hover:bg-slate-100">×</button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-1.5 text-[12px] font-semibold ${m.role === "user" ? "bg-brand text-white" : "bg-slate-100 text-slate-700"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-[11px] font-bold text-slate-400">생각 중…</div>}
      </div>

      <div className="shrink-0 border-t border-slate-100 px-3 py-2">
        <div className="mb-1.5 flex flex-wrap gap-1">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} disabled={loading} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 hover:bg-slate-200 disabled:opacity-50">{s}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="명령을 입력하세요…"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-[13px] font-semibold text-slate-800 outline-none focus:border-brand"
          />
          <button type="submit" disabled={loading || !input.trim()} className="rounded-xl bg-brand px-3 py-2 text-[12px] font-black text-white disabled:bg-slate-300">보내기</button>
        </form>
      </div>
    </div>
  );
}
