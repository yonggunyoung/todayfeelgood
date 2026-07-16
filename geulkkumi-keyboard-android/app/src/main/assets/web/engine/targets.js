/* 글꾸미 — targets.js : '어디에 붙일지' 타깃별 실사용 호환 검사 (순수·무 DOM).
 * 채널마다 글자수 제한·결합문자 허용 여부가 달라 실제로 붙일 때 잘리거나 깨진다.
 * 타깃을 고르면: 남은 글자수 + 이 결과가 그 칸에서 안전한지(✓/⚠)를 판정한다.
 * 제한값은 2026 기준 공개 스펙/실측 통용치 — 서비스가 바꾸면 여기 숫자만 수정.
 */
"use strict";

import { classify } from "./channel.js";

// noCombining: 이름 한 줄칸이라 결합문자(지옥체·취소선)가 깨지기 쉬움.
// astralWarn: 구형 기기·일부 게임 엔진에서 보충평면(수학 알파벳) □ 위험 고지.
export const TARGETS = [
  { id: "free",     name: "자유",        emoji: "✨", max: Infinity },
  { id: "igName",   name: "인스타 이름", emoji: "📸", max: 30,  noCombining: true, astralWarn: true, oneLine: true },
  { id: "igBio",    name: "인스타 소개", emoji: "📝", max: 150 },
  { id: "kakaoNick",name: "카톡 닉",     emoji: "💬", max: 20,  noCombining: true, astralWarn: true, oneLine: true },
  { id: "discord",  name: "디코 닉",     emoji: "🎮", max: 32,  oneLine: true },
  { id: "gameNick", name: "게임 닉",     emoji: "🕹", max: 12,  noCombining: true, astralWarn: true, strict: true, oneLine: true },
  { id: "xName",    name: "X 이름",      emoji: "🐦", max: 50,  oneLine: true },
];

const BY_ID = Object.create(null);
for (const t of TARGETS) BY_ID[t.id] = t;
export function getTarget(id) { return BY_ID[id] || BY_ID.free; }

// 보이는 글자수(코드포인트). 결합문자는 서비스마다 셈이 달라 '보수적으로' 포함해 센다.
export function countFor(text) { return Array.from(String(text == null ? "" : text)).length; }

/**
 * 타깃 기준 종합 판정.
 * @returns { level:'ok'|'info'|'warn', count, max, over, notes:[string] }
 */
export function rateForTarget(targetId, text) {
  const t = getTarget(targetId);
  const s = String(text == null ? "" : text);
  const c = classify(s);
  const count = countFor(s);
  const notes = [];
  let level = "ok";
  const bump = (lv) => { if (lv === "warn" || level === "warn") level = "warn"; else level = lv; };

  if (t.max !== Infinity && count > t.max) { bump("warn"); notes.push(`${t.name} ${t.max}자 초과 (${count}자) — 잘려요`); }
  if (t.oneLine && c.multiline) { bump("warn"); notes.push("한 줄 칸이에요 — 줄바꿈이 사라지거나 잘려요"); }
  if (t.noCombining && c.hasCombining) { bump("warn"); notes.push("이 칸은 결합문자(지옥체·취소선)가 깨지기 쉬워요"); }
  if (t.strict && c.astralFont) { bump("warn"); notes.push("게임 닉은 특수 글꼴이 □ 되거나 거부될 수 있어요 — 전각·동그라미가 안전"); }
  else if (t.astralWarn && c.astralFont) { bump("info"); notes.push("구형 기기에선 □ 가능 (전각·볼드·동그라미는 안전)"); }
  if (!notes.length) notes.push(t.max === Infinity ? "제한 없음 — 자유롭게!" : `안전 — ${t.max - count}자 남음`);
  return { level, count, max: t.max, over: t.max === Infinity ? 0 : Math.max(0, count - t.max), notes };
}

// 카운터 문구: "12/20자 · 카톡 닉" 식. free면 일반 경고 유지용 null.
export function counterFor(targetId, text) {
  const t = getTarget(targetId);
  if (t.id === "free" || t.max === Infinity) return null;
  const count = countFor(text);
  return { text: `${count}/${t.max}자 · ${t.name}`, over: count > t.max };
}
