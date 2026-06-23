/* 글꾸미 — hangul.js : 한글 변환 코어 (순수·무 DOM).
 * 자모 분해(흩뿌리기) · 초성체 추출 · 한글 데코. instafont는 영문 전용이라
 * 한글은 별도 코어로 처리(snskeyboard의 fancyfont/초성 계열 대응).
 */
"use strict";

const LEAD = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ".split("");           // 19 초성
const VOWEL = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ".split("");        // 21 중성
const TAIL = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ".split(""); // 28 종성(0=없음)

const SBASE = 0xAC00, SLAST = 0xD7A3, VCOUNT = 21, TCOUNT = 28;

export function isSyllable(ch) {
  const c = ch.codePointAt(0);
  return c >= SBASE && c <= SLAST;
}

// 한 음절 → [초성, 중성, 종성('' 가능)]
export function decomposeSyllable(ch) {
  if (!isSyllable(ch)) return [ch, "", ""];
  const idx = ch.codePointAt(0) - SBASE;
  const tail = idx % TCOUNT;
  const vowel = ((idx - tail) / TCOUNT) % VCOUNT;
  const lead = Math.floor(idx / (VCOUNT * TCOUNT));
  return [LEAD[lead], VOWEL[vowel], tail ? TAIL[tail] : ""];
}

// 자모 분해(흩뿌리기): "안녕" → "ㅇㅏㄴㄴㅕㅇ" (sep로 사이 간격 지정 가능)
export function decompose(text, sep) {
  sep = sep == null ? "" : String(sep);
  const out = [];
  for (const ch of String(text == null ? "" : text)) {
    if (isSyllable(ch)) out.push(decomposeSyllable(ch).join(""));
    else out.push(ch);
  }
  return out.join(sep);
}

// 초성체: "안녕하세요" → "ㅇㄴㅎㅅㅇ" (한글이 아니면 원형 유지)
export function chosung(text) {
  let out = "";
  for (const ch of String(text == null ? "" : text)) {
    out += isSyllable(ch) ? decomposeSyllable(ch)[0] : ch;
  }
  return out;
}

// 한글 데코: 음절 사이에 기호 끼우기. "사랑","🌸" → "사🌸랑"
export function deco(text, symbol) {
  return Array.from(String(text == null ? "" : text)).join(String(symbol == null ? "" : symbol));
}

// 원문자/괄호 한글 — 유니코드에 존재하는 14개 기본 음절(가~하)만 변환, 나머지는 원형.
const BASE14 = "가나다라마바사아자차카타파하".split("");
const CIRCLED_KO = {}, PAREN_KO = {};
BASE14.forEach((s, i) => { CIRCLED_KO[s] = String.fromCodePoint(0x326E + i); PAREN_KO[s] = String.fromCodePoint(0x320E + i); });

export function circledHangul(text) {
  return Array.from(String(text == null ? "" : text)).map((c) => CIRCLED_KO[c] || c).join("");
}
export function parenHangul(text) {
  return Array.from(String(text == null ? "" : text)).map((c) => PAREN_KO[c] || c).join("");
}

export const JAMO = { LEAD, VOWEL, TAIL };
