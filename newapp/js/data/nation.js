// 오늘 기분 — 전국 기분 날씨 예시 분포 (증분4 Firebase 집계 전 콜드스타트 "날씨 톤").
// 한 곳에서 정의해 홈 게이지·전국 날씨 뷰·공유 카드가 같은 수치를 쓴다(D13 단일 출처).
export const NATION = [
  ['happy', 58], ['flutter', 16], ['calm', 14], ['blue', 8], ['angry', 4],
];
// "전국 맑음 N%" — 가장 큰 비중(행복=맑음).
export const NATION_SUNNY = NATION[0][1];

// 기분 → 전국 '날씨' 표현 (최다 기분에 따라 헤드라인 전환).
export const WEATHER = { happy: '맑음', flutter: '반짝임', calm: '산들바람', blue: '비', angry: '천둥' };
