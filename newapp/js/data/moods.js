// 기분 정의 (디자인 독립 데이터).
// color는 잠정값 — 최종 색은 디자인 토큰(preview.html)이 정한다. 여기선 매핑/식별만.
export const MOODS = [
  { id: 'happy',   ko: '행복', color: '#FFC95C' },
  { id: 'flutter', ko: '설렘', color: '#FF9A8B' },
  { id: 'calm',    ko: '평온', color: '#9CC3A6' },
  { id: 'blue',    ko: '우울', color: '#8AA0C9' },
  { id: 'angry',   ko: '화남', color: '#E2725B' },
];

export const MOOD_IDS = new Set(MOODS.map((m) => m.id));
export const moodById = (id) => MOODS.find((m) => m.id === id) || null;
