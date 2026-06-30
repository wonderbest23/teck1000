"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const CONSULT_PHONE = "1668-0000"; // TODO: 실제 상담 전화번호로 교체
const SUGGESTIONS = ["싱크대 견적이 궁금해요", "신발장 맞춤 제작 가능한가요?", "제작 기간은 얼마나 걸려요?", "실측 상담 받고 싶어요"];

export function ConsultChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "안녕하세요! 동방씽크 상담 도우미예요. 원하는 가구나 궁금한 점을 알려주시면 바로 안내해 드릴게요. 통화 상담은 아래 ‘전화상담’을 눌러주세요." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((m) => [...m, { role: "assistant", content: data.error ? `오류: ${data.error}` : data.reply || "죄송해요, 다시 말씀해 주세요." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "연결에 실패했어요. 전화상담을 이용해 주세요." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="상담">
      <button type="button" aria-label="상담 닫기" onClick={onClose} className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" />
      <div className="relative z-10 flex h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[640px] sm:max-h-[88vh] sm:rounded-3xl">
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-[11px] font-black text-white">AI</span>
            <div>
              <p className="text-sm font-black text-ink">상담하기</p>
              <p className="text-[10px] font-bold text-emerald-500">● 지금 바로 답변</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="grid h-8 w-8 place-items-center rounded-lg bg-soft text-lg font-black leading-none text-slate-500 hover:bg-slate-100">×</button>
        </div>

        {/* 메시지 */}
        <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-[#fafbfc] px-4 py-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[84%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] font-medium leading-5 ${m.role === "user" ? "bg-brand text-white" : "bg-white text-slate-700 ring-1 ring-slate-100"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-[11px] font-bold text-slate-400">입력 중…</div>}
        </div>

        {/* 추천 질문 */}
        <div className="shrink-0 border-t border-slate-100 px-3 pt-2">
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} disabled={loading} className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600 hover:bg-slate-200 disabled:opacity-50">{s}</button>
            ))}
          </div>
        </div>

        {/* 입력 + 전화상담 */}
        <div className="shrink-0 border-t border-slate-100 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-1.5">
            <a
              href={`tel:${CONSULT_PHONE.replace(/-/g, "")}`}
              aria-label="전화상담"
              className="flex shrink-0 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[12px] font-black text-emerald-600"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L17 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z" strokeLinejoin="round" /></svg>
              전화상담
            </a>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="메시지를 입력하세요…"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-[13px] font-medium text-slate-800 outline-none focus:border-brand"
            />
            <button type="submit" disabled={loading || !input.trim()} className="shrink-0 rounded-xl bg-brand px-3 py-2 text-[12px] font-black text-white disabled:bg-slate-300">전송</button>
          </form>
        </div>
      </div>
    </div>
  );
}
