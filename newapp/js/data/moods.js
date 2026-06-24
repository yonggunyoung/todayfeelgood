// 기분 정의 (디자인 독립 데이터). 색은 css/styles.css(--mood-*)가 단일 출처(D13).
// reasons = "구름이가 고른 이유" 칩 문구(기분별).
export const MOODS = [
  { id: 'happy',   ko: '행복', reasons: ['신나는 하루엔', '기분 좋게', '구름이도 방방'] },
  { id: 'flutter', ko: '설렘', reasons: ['두근거릴 땐', '설레는 마음에', '오늘 같은 날엔'] },
  { id: 'calm',    ko: '평온', reasons: ['한 박자 쉬어가라고', '포근하게', '잔잔한 오후엔'] },
  { id: 'blue',    ko: '우울', reasons: ['혼자가 아니야', '토닥토닥', '비 오는 마음에'] },
  { id: 'angry',   ko: '화남', reasons: ['후- 식히게', '속이 뻥 뚫리게', '오늘은 좀 세게'] },
];

export const MOOD_IDS = new Set(MOODS.map((m) => m.id));
export const moodById = (id) => MOODS.find((m) => m.id === id) || null;
