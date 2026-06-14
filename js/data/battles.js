// 광클대전 — "편 갈라 광클" 진영전의 소재(밈 떡밥) + 순수 계산 헬퍼.
// 소재 선정 기준: 10대 사이에서 '정체성'과 '도발거리'가 되는 음식 양자택일 밈을 우선 배치.
// (냉비서가 음식 앱이라 결이 맞고, 음식 밈은 한국에서 가장 빨리 퍼지는 편가르기 떡밥이다.)
// 같은 날짜면 전국 모두 같은 대전을 본다 → 같은 날 같은 떡밥으로 단톡방이 들끓도록(밈 동기화).

export const BATTLES = [
  { id: 'mintchoco', tag: '민초대전', q: '민트초코, 너는?',
    a: { key: 'mint', name: '민초단',   emoji: '🌿', color: '#12b39a', slogan: '치약? 이건 신이 내린 맛' },
    b: { key: 'anti', name: '반민초파', emoji: '🚫', color: '#7b6ef0', slogan: '디저트에 치약을 왜 넣냐고' },
    taunts: ['치약 자랑 그만 🪥', '민초 모르면 인생 손해 ㅋㅋ', '반민초는 미각 테러범', '결국 다 민초로 온다'] },

  { id: 'tangsuyuk', tag: '부먹찍먹', q: '탕수육은 역시?',
    a: { key: 'bu',  name: '부먹파', emoji: '🥣', color: '#e8633a', slogan: '소스에 촉촉하게 적셔야 진리' },
    b: { key: 'jjik', name: '찍먹파', emoji: '🥢', color: '#2f9ec4', slogan: '바삭함을 어떻게 포기해' },
    taunts: ['눅눅이들 잘 있냐 🫠', '소스 부으면 그게 탕수육 죽이야', '찍먹이 국룰 모르나', '부먹은 사랑입니다'] },

  { id: 'chicken', tag: '양념후라이드', q: '치킨 한 마리면?',
    a: { key: 'yn',  name: '양념파',   emoji: '🍗', color: '#d83838', slogan: '손에 묻은 양념까지 핥아먹는다' },
    b: { key: 'fr',  name: '후라이드파', emoji: '🍤', color: '#cf911f', slogan: '치킨 본연의 맛, 후라이드' },
    taunts: ['후라이드는 심심하지 않냐', '양념은 소스맛이지 치킨맛이냐 ㅋ', '반반? 회색분자 나가라', '결국 시키면 양념'] },

  { id: 'pineapple', tag: '파인애플피자', q: '파인애플 피자, 인정?',
    a: { key: 'o',   name: '하와이안단', emoji: '🍍', color: '#d9a400', slogan: '달콤짭짤 이게 천국' },
    b: { key: 'x',   name: '파인애플아웃', emoji: '🙅', color: '#3f8f4f', slogan: '피자에 과일은 반칙' },
    taunts: ['피자에 과일 올린 사람 누구야', '먹어보고 말해라 진짜 맛있음', '이탈리아 가면 잡혀간다', '단짠 모르면 입맛 초딩'] },

  { id: 'naengmyeon', tag: '물냉비냉', q: '여름엔 어떤 냉면?',
    a: { key: 'mul', name: '물냉파', emoji: '🧊', color: '#2f8fd0', slogan: '시원한 육수 들이켜는 그 맛' },
    b: { key: 'bib', name: '비냉파', emoji: '🌶️', color: '#d8452f', slogan: '매콤새콤 비벼야 제맛' },
    taunts: ['물냉은 밍밍하잖아', '비냉은 그냥 매운 국수지', '면치기 못하면 물냉 자격 없음', '둘 다 시키는 게 정답 아님?'] },

  { id: 'milk', tag: '딸기바나나우유', q: '편의점 우유는?',
    a: { key: 'st',  name: '딸기우유단', emoji: '🍓', color: '#e85a92', slogan: '핑크빛 행복 한 모금' },
    b: { key: 'bn',  name: '바나나우유단', emoji: '🍌', color: '#e0a800', slogan: '국민 단지우유 영원하라' },
    taunts: ['딸기우유는 색소맛 ㅋ', '바나나우유 안 먹어본 사람 있냐', '단지 모양 못 이김', '딸기우유가 더 고급짐'] },

  { id: 'gimbap', tag: '김밥꼬다리', q: '김밥, 어디부터 먹어?',
    a: { key: 'end', name: '꼬다리파', emoji: '🍙', color: '#8d6e63', slogan: '못생긴 끝이 제일 맛있어' },
    b: { key: 'mid', name: '가운데파', emoji: '🌀', color: '#3a9b4f', slogan: '예쁜 가운데가 정석이지' },
    taunts: ['꼬다리 안 주면 서운함', '가운데부터 먹는 건 국룰', '꼬다리 버리는 사람 손절', '엄마는 늘 꼬다리만 드셨지…'] },

  { id: 'mandu', tag: '군만두물만두', q: '만두는 역시?',
    a: { key: 'gun', name: '군만두파', emoji: '🥟', color: '#c07c2a', slogan: '바삭바삭 겉면이 생명' },
    b: { key: 'mul', name: '물만두파', emoji: '💧', color: '#4d9ec4', slogan: '촉촉하게 터지는 육즙' },
    taunts: ['군만두는 기름맛 아니냐', '물만두는 밋밋해', '냉동만두는 무조건 군만두', '둘 다 맛있는 거 인정하자 사실'] },
];

/* ── 순수 헬퍼 (결정적·테스트 대상) ───────────────────────────── */

// 날짜 문자열(YYYY-MM-DD) → 에폭 일수. 전국 동기화의 기준값(같은 날=같은 숫자).
export function dayNumber(dateStr) {
  const ms = Date.parse(dateStr + 'T00:00:00Z');
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 86400000);
}

// 오늘의 대전 — 날짜로 결정 (전국 동일). 도발·소재가 매일 자동 로테이션.
export function battleOfDay(dateStr) {
  return BATTLES[((dayNumber(dateStr) % BATTLES.length) + BATTLES.length) % BATTLES.length];
}

// 시작 흐름 편향(%): a편 기준 -6.0 ~ +6.0. 같은 날이면 전국 모두 같은 출발선.
export function dailyBias(dateStr, battle) {
  const seed = fnv1a(dateStr + '|' + (battle?.id || ''));
  return (seed % 1201) / 100 - 6; // -6.00 .. +6.00
}

// 연속 광클 streak → 콤보 배수 (1.0 ~ 3.0). 손가락을 멈추면 줄어든다.
export function comboMult(streak) {
  return Math.min(3, 1 + Math.max(0, streak) * 0.04);
}

// 기여도(콤보 가중 누적 탭) → 칭호. 스샷해서 자랑하는 핵심 밈 요소.
const TITLES = [
  [0, '구경꾼 👀'], [50, '일반인 🙂'], [150, '광클 입문 🐣'], [300, '손가락 좀 쓰네 ✌️'],
  [500, '광클러 ⚡'], [800, '광클 고수 🔥'], [1200, '광클의 신 👑'], [1800, '손가락 분신술 🌀'],
];
export function titleForTaps(taps) {
  let label = TITLES[0][1];
  for (const [n, l] of TITLES) if (taps >= n) label = l;
  return label;
}

// 기여도 → 예상 전국 등수 (재미용·결정적). 많이 누를수록 상위. 실제 랭킹은 🏆 화면이 담당.
export function rankEstimate(taps, pop = 87431) {
  const frac = Math.max(0, Math.min(1, 1 - taps / 2000));
  return Math.max(1, Math.round(pop * (0.0002 + 0.9998 * frac * frac)));
}

// 천 단위 콤마 (3,412)
export function comma(n) {
  return Math.round(n).toLocaleString('ko-KR');
}

function fnv1a(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
