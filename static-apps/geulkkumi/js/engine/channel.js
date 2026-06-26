/* 글꾸미 — channel.js : '어디에 붙이냐'에 따른 깨짐 진단·고지 코어 (순수·무 DOM).
 * 도트/아스키/이모지 그림과 멋글씨가 채널(카톡·인스타·디스코드·X…)마다
 * 글꼴(고정폭 vs 가변폭)·줄바꿈·결합문자 때문에 어떻게 깨지는지 분류하고,
 * 정확히 보이게 하는 방법(코드블록 등)과 채널별 주의를 알려준다.
 * 로직은 전부 여기(순수) → tests/channel.test.mjs 에서 검증.
 */
"use strict";

// 색 이모지(픽토그래프) 1글자 판정 — 🟥⬛❤️👻 등은 '셀' 모양이 어디서나 유지된다.
// ★ ✦ ♪ 같은 기호는 픽토그래프가 아님 → 고정폭 정렬에 의존(=mono).
const PICTO = /\p{Extended_Pictographic}/u;
const PICTO_G = /\p{Extended_Pictographic}/gu;
// 고정폭 정렬에 의존하는 '그림 문자'(박스/블록/브라유/사면기호/빗금 등).
const MONO_HINT = /[─-╿▀-▟⠀-⣿╱╲╳/\\|_¯‾]/;
// 결합문자(지옥체·취소선·밑줄 등) — 글자수 증가·일부 환경 깨짐.
const COMBINING = /[̀-ͯ҃-҉֑-ֽً-ٟ᪰-᫿᷀-᷿⃐-⃿︠-︯]/;

function lines(text) { return String(text == null ? "" : text).split(/\r?\n/); }
function cpLen(s) { return Array.from(s).length; }

// 폭(가로 칸수): 줄 중 최장 길이. 이모지는 보통 2배폭이라 셀 수로 따로도 센다.
function maxWidth(ls) { return ls.reduce((m, l) => Math.max(m, cpLen(l)), 0); }
function maxEmojiCells(ls) { return ls.reduce((m, l) => Math.max(m, (l.match(PICTO_G) || []).length), 0); }

/**
 * 텍스트/그림을 분류한다.
 * kind: 'emoji'(색 이모지 그림) | 'mono'(고정폭 의존 도트·아스키) | 'plain'(일반 글자·멋글씨)
 */
export function classify(text) {
  const t = String(text == null ? "" : text);
  const ls = lines(t);
  const multiline = ls.length > 1;
  const nonSpace = Array.from(t.replace(/\s/g, ""));
  const emoji = (t.match(PICTO_G) || []).length;
  const emojiRatio = nonSpace.length ? emoji / nonSpace.length : 0;
  const hasCombining = COMBINING.test(t);
  const hasAstral = /[\uD800-\uDBFF]/.test(t); // 서로게이트(수학 알파벳 멋글씨·일부 이모지)
  const astralFont = hasAstral && emoji === 0; // 깨질 위험이 있는 '멋글씨' 계열

  let kind = "plain";
  if (emojiRatio >= 0.4) kind = "emoji";
  else if (multiline || MONO_HINT.test(t)) kind = "mono";

  return {
    kind,
    multiline,
    lineCount: ls.length,
    width: maxWidth(ls),          // 코드포인트 기준 최장 줄
    emojiCells: maxEmojiCells(ls), // 이모지 그림의 가로 셀 수
    emoji,
    hasCombining,
    astralFont,
  };
}

// 디스코드·슬랙·깃허브에서 '고정폭 그대로' 보이게 코드블록으로 감싸기.
// 본문에 ``` 가 있으면 더 긴 펜스로 보호.
export function codeBlock(text) {
  const t = String(text == null ? "" : text);
  let fence = "```";
  while (t.includes(fence)) fence += "`";
  return fence + "\n" + t + "\n" + fence;
}

// kind가 mono(고정폭 의존)면 코드블록 복사를 권장.
export function needsCodeBlock(text) { return classify(text).kind === "mono"; }

// 인라인 한 줄 배지용 — {cls:'ok'|'info'|'warn', msg}. (미리보기·결과창 공용)
export function compatBadge(text) {
  const c = classify(text);
  if (c.hasCombining)
    return { cls: "warn", msg: "⚠ 결합문자 — 인스타 이름칸·일부 안드로이드에서 깨지거나 글자수가 늘 수 있어요" };
  if (c.kind === "mono")
    return { cls: "info", msg: "ⓘ 고정폭 전용 — 디스코드·슬랙은 ‘``` 복사’, 카톡·인스타는 도트·이모지 그림이 안전" };
  if (c.kind === "emoji")
    return { cls: "ok", msg: "✓ 모양은 어디서나 유지 — 색·디자인은 기기마다 조금 달라요" };
  if (c.astralFont)
    return { cls: "info", msg: "ⓘ 구형 기기에선 일부가 □로 보일 수 있어요 (전각·동그라미·볼드는 안전)" };
  return { cls: "ok", msg: "✓ 호환성 좋은 문자예요 — 어디든 잘 붙어요" };
}

// 좁은 폰 채팅 줄바꿈 임계 — 이모지는 셀이 넓어 더 빨리 줄바꿈.
const W_EMOJI = 16, W_MONO = 32;
export function widthWarning(text) {
  const c = classify(text);
  if (c.kind === "emoji" && c.emojiCells > W_EMOJI)
    return `가로 ${c.emojiCells}칸 — 좁은 폰 채팅에선 줄바꿈돼요. 더 작은 그림이나 PC·가로화면을 권장.`;
  if (c.kind === "mono" && c.width > W_MONO)
    return `가로 ${c.width}칸 — 폰에서 줄바꿈으로 틀어질 수 있어요(PC·가로화면 권장).`;
  return null;
}

// 채널별 주의·요령(복사 전 고지). 분류에 맞는 항목만 반환.
export function channelTips(text) {
  const c = classify(text);
  const tips = [];
  if (c.kind === "emoji") {
    tips.push(["📱 어디서나", "모양(픽셀 배치)은 유지돼요. 단 이모지 색·디자인은 아이폰/안드로이드/PC가 서로 달라요."]);
    tips.push(["💬 카톡·DM", "그대로 붙여넣기 OK. 한 줄이 길면 말풍선 폭에서 줄바꿈되니 가로 16칸 이하를 권장."]);
  } else if (c.kind === "mono") {
    tips.push(["🟣 디스코드·슬랙·깃허브", "‘``` 코드블록 복사’를 쓰면 고정폭으로 정확히 보여요(이 줄이 핵심)."]);
    tips.push(["💛 카톡·인스타·일반 채팅", "글자마다 폭이 달라 그림이 틀어져요 → 도트(브라유)·이모지 그림으로 바꾸면 안전."]);
    tips.push(["🔢 정렬", "맨 앞 공백은 사라질 수 있어요. 줄 끝 공백은 지우고, 모든 줄 길이를 같게 맞추면 덜 깨져요."]);
  } else {
    if (c.hasCombining) tips.push(["⚠ 이름칸", "인스타·카톡 ‘이름’ 한 줄칸에선 결합문자가 깨질 수 있어요 → 소개(bio)·채팅에 쓰세요."]);
    else if (c.astralFont) tips.push(["ⓘ 구형 기기", "아주 오래된 폰은 □로 보일 수 있어요. 전각·동그라미·볼드는 어디서나 안전."]);
    else tips.push(["✓ 호환성", "특수 글꼴이라도 대부분 환경에서 잘 보여요."]);
    tips.push(["🔗 인스타 이름 vs 소개", "‘이름’칸은 한 줄·길이 제한이 있어요. 여러 줄·긴 장식은 ‘소개(bio)’칸에 붙여넣기."]);
  }
  return tips;
}
