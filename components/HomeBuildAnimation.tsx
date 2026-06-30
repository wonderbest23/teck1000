/** 홈 히어로 — 커서가 팔레트와 공간을 왔다갔다 하며 레이어(가구)를 하나씩 놓는 미리보기 데모 (CSS only) */
export function HomeBuildAnimation({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 132" className={className} aria-hidden role="img">
      {/* 공간(점선 가이드) + 바닥 그림자 */}
      <ellipse cx="74" cy="112" rx="50" ry="6.5" fill="#0f172a" opacity="0.07" />
      <rect className="db-rise" x="30" y="24" width="88" height="84" rx="7" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 5" />

      {/* 팔레트(집는 곳) */}
      <g className="db-rise">
        <rect x="124" y="20" width="24" height="20" rx="4" fill="#eef2f5" stroke="#cbd5e1" strokeWidth="1.5" />
        <rect x="129" y="25" width="14" height="4" rx="2" fill="#94a3b8" />
        <rect x="129" y="32" width="10" height="4" rx="2" fill="#cbd5e1" />
      </g>

      {/* 놓이는 레이어들 (아래→위 순서로 쌓임) */}
      <g className="db-place-a">
        <rect x="36" y="82" width="72" height="22" rx="4" fill="#e7f0f2" stroke="#155e75" strokeWidth="2" />
        <rect x="60" y="90" width="24" height="4" rx="2" fill="#155e75" opacity="0.55" />
      </g>
      <g className="db-place-b">
        <rect x="36" y="58" width="72" height="22" rx="4" fill="#eaf2ee" stroke="#0d9488" strokeWidth="2" />
        <rect x="60" y="66" width="24" height="4" rx="2" fill="#0d9488" opacity="0.55" />
      </g>
      <g className="db-place-c">
        <rect x="36" y="34" width="72" height="22" rx="4" fill="#f1edf7" stroke="#7c3aed" strokeWidth="2" />
        <rect x="60" y="42" width="24" height="4" rx="2" fill="#7c3aed" opacity="0.55" />
      </g>

      {/* 놓을 때 반짝임 */}
      <g className="db-spark-a"><path d="M74 80 l2 4.4 4.4 2 -4.4 2 -2 4.4 -2 -4.4 -4.4 -2 4.4 -2 Z" fill="#f59e0b" /></g>
      <g className="db-spark-b"><path d="M74 56 l2 4.4 4.4 2 -4.4 2 -2 4.4 -2 -4.4 -4.4 -2 4.4 -2 Z" fill="#f59e0b" /></g>
      <g className="db-spark-c"><path d="M74 32 l2 4.4 4.4 2 -4.4 2 -2 4.4 -2 -4.4 -4.4 -2 4.4 -2 Z" fill="#f59e0b" /></g>

      {/* 왔다갔다 하는 커서 */}
      <g className="db-cursor">
        <path d="M0 0 L0 18 L5 13 L9 21 L12 19.5 L8 12 L15 12 Z" fill="#172033" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
