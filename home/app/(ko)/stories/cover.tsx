// 아티클 커버 이미지 — 외부 사진(저작권·애드센스 리스크) 대신 이모지 + 그라데이션 SVG로 생성.
// D-articles-2: 시각 요소를 0비용·저작권 프리로 추가(애드센스 '빈약한 콘텐츠' 보강 + UX).
//   gradient id는 slug 기반으로 고유화(같은 페이지에 여러 커버가 떠도 충돌 X).
export function Cover({
  emoji,
  color = "#4f7bd8",
  id,
  height = 160,
}: {
  emoji?: string;
  color?: string;
  id: string;
  height?: number;
}) {
  const gid = `cov-${id}`;
  return (
    <svg
      viewBox={`0 0 800 ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", borderRadius: 14 }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor="#11151f" />
        </linearGradient>
      </defs>
      <rect width="800" height={height} fill={`url(#${gid})`} />
      <rect width="800" height={height} fill="rgba(0,0,0,0.12)" />
      <text
        x="400"
        y={height / 2}
        fontSize={Math.round(height * 0.46)}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {emoji ?? "⚡"}
      </text>
    </svg>
  );
}
