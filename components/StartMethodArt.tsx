/** 시작 방법 카드용 애니메이션 — 템플릿(빠르게) / 수동(직접 조절) */

/** 템플릿으로 빠르게 — 템플릿 타일들이 차르륵 나타나고 번개가 번쩍 */
export function TemplateFastArt({ className = "" }: { className?: string }) {
  const tiles = [
    { x: 22, y: 18, delay: "0s" },
    { x: 60, y: 18, delay: "0.18s" },
    { x: 22, y: 50, delay: "0.36s" },
    { x: 60, y: 50, delay: "0.54s" },
  ];
  return (
    <svg viewBox="0 0 120 92" className={className} aria-hidden role="img">
      {tiles.map((t, i) => (
        <g key={i} className="st-tile" style={{ animationDelay: t.delay }}>
          <rect x={t.x} y={t.y} width="34" height="26" rx="5" fill="#e7f0f2" stroke="#155e75" strokeWidth="2" />
          <rect x={t.x + 6} y={t.y + 7} width="22" height="3.5" rx="1.75" fill="#155e75" opacity="0.5" />
          <rect x={t.x + 6} y={t.y + 15} width="14" height="3.5" rx="1.75" fill="#155e75" opacity="0.3" />
        </g>
      ))}
      <g className="st-bolt">
        <path d="M64 30 L52 50 L60 50 L56 66 L72 44 L63 44 Z" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
      {/* 템플릿을 고르는 커서 */}
      <g className="st-tap">
        <path d="M0 0 L0 15 L4.2 11 L7.4 18 L10.2 16.6 L7 10.3 L12.6 10.3 Z" fill="#172033" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** 수동 커스텀 — 가구 박스를 커서로 끌어 사이즈를 직접 조절하는 느낌 */
export function ManualCustomArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 92" className={className} aria-hidden role="img">
      {/* 치수 가이드 */}
      <path d="M28 74 H92" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M28 71 v6 M92 71 v6" stroke="#cbd5e1" strokeWidth="1.5" />
      {/* 크기 조절되는 박스 */}
      <g className="st-resize">
        <rect x="40" y="22" width="40" height="40" rx="6" fill="#f1edf7" stroke="#7c3aed" strokeWidth="2.5" />
        <path d="M52 32 h16 M52 42 h16 M52 52 h10" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      </g>
      {/* 오른쪽 아래 리사이즈 핸들 */}
      <g className="st-handle">
        <circle cx="80" cy="62" r="6.5" fill="#7c3aed" stroke="#fff" strokeWidth="2" />
        <path d="M77 62 h6 M80 59 v6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      {/* 끌고 있는 커서 */}
      <g className="st-cursor2" transform="translate(84 66)">
        <path d="M0 0 L0 16 L4.5 11.5 L8 19 L11 17.5 L7.5 11 L13.5 11 Z" fill="#172033" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
