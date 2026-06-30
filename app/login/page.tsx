import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg flex-col px-4 pb-28 pt-8">
      <p className="text-sm font-bold text-brand">동방씽크</p>
      <h1 className="mt-2 text-2xl font-black text-ink">로그인하고 제작을 이어가세요</h1>
      <p className="mt-2 text-sm text-slate-500">견적과 주문 내역을 한곳에서 확인할 수 있습니다.</p>

      <form className="mt-8 space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-600">휴대폰 번호</span>
          <input
            type="tel"
            placeholder="010-0000-0000"
            className="field"
            autoComplete="tel"
          />
        </label>
        <button
          type="button"
          className="w-full rounded-2xl bg-ink py-4 text-sm font-black text-white transition active:scale-[0.99]"
        >
          인증번호 받기
        </button>
      </form>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-center text-xs leading-5 text-slate-500">
        MVP 단계에서는 로그인 없이도 제작과 견적 확인이 가능합니다.
      </div>

      <div className="mt-auto space-y-2 pt-10">
        <Link
          href="/start"
          className="flex w-full items-center justify-center rounded-2xl bg-brand py-4 text-sm font-black text-white"
        >
          로그인 없이 제작 시작
        </Link>
        <Link
          href="/my/orders"
          className="flex w-full items-center justify-center rounded-2xl py-3 text-sm font-bold text-slate-600"
        >
          주문 내역 보기
        </Link>
      </div>
    </main>
  );
}
