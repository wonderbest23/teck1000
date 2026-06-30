import type { VerdictLevel } from "@/lib/interior/types";

const VERDICT_STYLES: Record<VerdictLevel, string> = {
  가능: "bg-emerald-50 text-emerald-800 border-emerald-200",
  주의: "bg-amber-50 text-amber-900 border-amber-200",
  불가: "bg-rose-50 text-rose-800 border-rose-200",
  제작문의: "bg-violet-50 text-violet-800 border-violet-200",
};

export function VerdictPanel({
  verdict,
  issues,
  compact = false,
}: {
  verdict: VerdictLevel;
  issues: Array<{ verdict: VerdictLevel; message: string; code?: string }>;
  compact?: boolean;
}) {
  const topIssues = issues.filter((item) => item.verdict !== "가능").slice(0, compact ? 2 : 8);

  return (
    <section className="space-y-2">
      <div className={`inline-flex rounded-2xl border px-4 py-2 text-sm font-black ${VERDICT_STYLES[verdict]}`}>
        판정: {verdict}
      </div>
      {topIssues.length > 0 && (
        <ul className="space-y-2">
          {topIssues.map((item) => (
            <li
              key={`${item.code ?? item.message}-${item.verdict}`}
              className={`rounded-xl border px-3 py-2 text-sm ${VERDICT_STYLES[item.verdict]}`}
            >
              {item.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
