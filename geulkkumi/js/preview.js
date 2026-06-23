/* 글꾸미 — preview.js : '붙여넣기 실측 미리보기'.
 * 변환 결과를 인스타·카톡·디스코드·X UI 목업(라이트/다크) 위에 실제 폰트로 렌더 →
 * "내 인스타 바이오/카톡 닉에서 어떻게 보이는지"를 복사 전에 확인(이 앱의 최대 차별점).
 */
"use strict";
import { el, openSheet, copy, toast } from "./ui.js";
import { addSlot, SLOT_CATS } from "./store.js";

// 결합문자/astral 감지로 호환성 한 줄 코멘트.
function compatNote(text) {
  const s = String(text || "");
  if (/[̀-ͯ҃-҉֑-ֽ⃐-⃰]/.test(s))
    return { cls: "warn", msg: "⚠ 결합문자 — 인스타 이름칸·일부 안드로이드에서 깨지거나 글자수가 늘 수 있어요" };
  if (/[\uD800-\uDBFF]/.test(s))
    return { cls: "info", msg: "ⓘ 일부 구형 기기에선 □로 보일 수 있어요 (전각·동그라미·볼드는 안전)" };
  return { cls: "ok", msg: "✓ 호환성 좋은 문자예요" };
}

function avatar(cls) { return el("div.pv-ava" + (cls ? "." + cls : "")); }

function igCard(text) {
  return el("div.pv-card.pv-ig", null, [
    el("div.pv-ig-top", null, [
      avatar("pv-ig-ava"),
      el("div.pv-ig-stats", null, [
        el("span", null, [el("b", null, "152"), el("small", null, "게시물")]),
        el("span", null, [el("b", null, "8.4만"), el("small", null, "팔로워")]),
        el("span", null, [el("b", null, "302"), el("small", null, "팔로잉")]),
      ]),
    ]),
    el("div.pv-ig-name", null, text),
    el("div.pv-ig-bio", null, "🎀 " + text + " 🎀\n매일매일 좋은하루 ✨"),
    el("div.pv-ig-btns", null, [el("span.pv-ig-btn", null, "팔로우"), el("span.pv-ig-btn.ghost", null, "메시지")]),
  ]);
}
function kakaoCard(text) {
  return el("div.pv-card.pv-kakao", null, [
    el("div.pv-kk-friend", null, [avatar("pv-kk-ava"), el("div.pv-kk-nick", null, text)]),
    el("div.pv-kk-chat", null, [
      el("div.pv-kk-line", null, [avatar("pv-kk-ava2"), el("div", null, [
        el("div.pv-kk-name", null, text),
        el("div.pv-kk-bubble", null, "안녕 " + text + " 🙌"),
      ])]),
    ]),
  ]);
}
function discordCard(text) {
  return el("div.pv-card.pv-discord", null, [
    el("div.pv-dc-row", null, [avatar("pv-dc-ava"), el("div.pv-dc-col", null, [
      el("div", null, [el("span.pv-dc-name", null, text), el("span.pv-dc-time", null, "오늘 오후 9:24")]),
      el("div.pv-dc-msg", null, text + " 들어왔어요 ✦"),
    ])]),
  ]);
}
function xCard(text) {
  return el("div.pv-card.pv-x", null, [
    el("div.pv-x-row", null, [avatar("pv-x-ava"), el("div.pv-x-col", null, [
      el("div.pv-x-head", null, [el("span.pv-x-name", null, text), el("span.pv-x-handle", null, "@geulkkumi · 1분")]),
      el("div.pv-x-msg", null, text + " ✨ 오늘 기분 최고"),
    ])]),
  ]);
}

export function buildPreview(text) {
  const t = String(text == null ? "" : text) || "미리보기";
  const wrap = el("div.pv");

  // 라이트/다크 토글
  const cards = el("div.pv-cards", null, [igCard(t), kakaoCard(t), discordCard(t), xCard(t)]);
  const seg = el("div.pv-theme");
  const mk = (mode, label) => {
    const b = el("button.pv-tbtn" + (mode === "light" ? ".on" : ""), { type: "button" }, label);
    b.onclick = () => { cards.classList.toggle("pv-dark", mode === "dark"); seg.querySelectorAll(".pv-tbtn").forEach((x) => x.classList.toggle("on", x === b)); };
    return b;
  };
  seg.append(mk("light", "☀️ 라이트"), mk("dark", "🌙 다크"));

  const note = compatNote(text);
  wrap.append(
    el("p.pv-lead", null, "실제 앱 화면에 붙였을 때 이렇게 보여요 — 복사 전에 확인하세요."),
    seg, cards,
    el("div.pv-note." + note.cls, null, note.msg),
    el("div.toolbar", null, [
      el("button.tbtn.primary", { type: "button", onclick: () => copy(text, "preview") }, "📋 이 글씨 복사"),
    ]),
    el("div.opt-title", null, "💾 슬롯에 담아두기 (보관함에서 꺼내 쓰기)"),
    el("div.chips", null, SLOT_CATS.map((cat) =>
      el("button.chip-opt", { type: "button", onclick: () => { addSlot(cat, text); toast("‘" + cat + "’ 슬롯에 담음 💾"); } }, cat))),
  );
  return wrap;
}

export function openPreview(text) {
  return openSheet(buildPreview(text), "📱 붙여넣기 미리보기");
}
