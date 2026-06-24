/* 글꾸미 — data/symbols-unicode.js : 유니코드 블록을 코드포인트로 직접 생성한 대규모 특수문자.
 * 글자를 손으로 옮기지 않고 범위로 만들어 '깨진 문자·오타 0'. (라이브러리 브라우즈/검색/복사용)
 * 일부 미할당 코드포인트가 □로 보일 수 있으나, 픽커 용도라 허용(멋글씨 변환 Tier와 별개). */
"use strict";

function range(start, end) {
  const a = [];
  for (let c = start; c <= end; c++) a.push(String.fromCodePoint(c));
  return a;
}

export const UNICODE_CATS = [
  { id: "u-arrows", name: "화살표 전체", keywords: "화살표 arrow 방향 ← → ↑ ↓", items: range(0x2190, 0x21FF) },
  { id: "u-box", name: "선·표 테두리", keywords: "box 선 테두리 표 라인 ─ │ ┌ ╔", items: range(0x2500, 0x257F) },
  { id: "u-block", name: "블록·음영", keywords: "block 블록 음영 채움 █ ▓ ▒ ░", items: range(0x2580, 0x259F) },
  { id: "u-geo", name: "도형 전체", keywords: "도형 geometric 네모 동그라미 세모 ■ ● ▲ ◆", items: range(0x25A0, 0x25FF) },
  { id: "u-misc", name: "기호·자연", keywords: "날씨 별 종교 체스 카드 기타 ☀ ☂ ♥ ♫ ☯", items: range(0x2600, 0x26FF) },
  { id: "u-dingbat", name: "딩뱃·별", keywords: "별 가위 체크 손 꽃 dingbat ✂ ✓ ✦ ❀ ➜", items: range(0x2700, 0x27BF) },
  { id: "u-braille", name: "점자(도트)", keywords: "점자 braille 도트 dot 점 ⠿ ⣿", items: range(0x2800, 0x28FF) },
  { id: "u-enclosed", name: "원·괄호 번호", keywords: "원문자 번호 enclosed ① ⑴ ⒜ ⓐ", items: range(0x2460, 0x24FF) },
  { id: "u-cjksym", name: "CJK 괄호·기호", keywords: "괄호 구두점 일본 cjk 「 」 【 】 〜", items: range(0x3000, 0x303F) },
  { id: "u-math", name: "수학 기호", keywords: "수학 math 부호 ∑ ∞ ≠ ± √ ∴", items: range(0x2200, 0x22FF) },
  { id: "u-tech", name: "기술·키보드", keywords: "키보드 명령 technical ⌘ ⌥ ⏏ ⎋ ⌫", items: range(0x2300, 0x237F) },
  { id: "u-currency", name: "통화 전체", keywords: "돈 통화 currency ₩ € £ ₿ ₽", items: range(0x20A0, 0x20BF) },
  { id: "u-suppArrows", name: "화살표 더보기", keywords: "화살표 보조 arrow ➶ ➷ ⟶ ⤴", items: range(0x2B00, 0x2B59) },
  { id: "u-superSub", name: "위·아래 첨자", keywords: "첨자 superscript subscript ⁰ ₁ ⁺", items: range(0x2070, 0x209C) },
];
