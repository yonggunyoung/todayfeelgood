/* 글꾸미 — preview.js : '붙여넣기 실측 미리보기'.
 * 변환 결과를 인스타·카톡·디스코드·X UI 목업(라이트/다크) 위에 실제 폰트로 렌더 →
 * "내 인스타 바이오/카톡 닉에서 어떻게 보이는지"를 복사 전에 확인(이 앱의 최대 차별점).
 */
"use strict";
import { el, openSheet, copy, toast } from "./ui.js";
import { addSlot, SLOT_CATS } from "./store.js";
import { classify, compatBadge, channelTips, widthWarning, codeBlock } from "./engine/channel.js";

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

// 채널별 주의 목록(공용).
function tipsBlock(text) {
  return el("div.pv-tips", null, channelTips(text).map(([head, msg]) =>
    el("div.pv-tip", null, [el("b", null, head), el("span", null, " " + msg)])));
}

// 고정폭/가변폭 한 박스 — 같은 그림이 글꼴에 따라 어떻게 달라지는지 눈으로 비교.
function artBox(label, text, mono) {
  return el("div.pv-artbox" + (mono ? ".mono" : ".prop"), null, [
    el("div.pv-artcap", null, label),
    el("pre.pv-artpre", {
      style: {
        margin: "0", whiteSpace: "pre", overflowX: "auto", fontSize: "12px", lineHeight: "1.15",
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" : "inherit",
      },
    }, text),
  ]);
}

// 여러 줄(도트·아스키·이모지 그림) 미리보기 — 깨짐 비교 + 코드블록 복사 + 채널 고지.
function buildArtPreview(text) {
  const c = classify(text);
  const wrap = el("div.pv");
  const kids = [el("p.pv-lead", null, "채널마다 글꼴이 달라요 — 붙이기 전에 어떻게 보일지 확인하세요.")];
  if (c.kind === "emoji") {
    kids.push(artBox("📱 어디서나 (이모지 그림은 모양 유지)", text, false));
  } else {
    kids.push(artBox("✅ 고정폭 — 디스코드 ```·슬랙·PC (정확한 모양)", text, true));
    kids.push(artBox("⚠️ 일반 채팅 — 카톡·인스타 (글꼴 때문에 살짝 틀어짐)", text, false));
  }
  const ww = widthWarning(text);
  if (ww) kids.push(el("div.pv-note.warn", null, "↔ " + ww));
  kids.push(tipsBlock(text));
  const tools = [el("button.tbtn.primary", { type: "button", onclick: () => copy(text, "art") }, "📋 그대로 복사")];
  if (c.kind !== "emoji")
    tools.push(el("button.tbtn", { type: "button", onclick: () => copy(codeBlock(text), "art") }, "⟨⟩ 디스코드용 ``` 복사"));
  kids.push(el("div.toolbar", null, tools));
  wrap.append(...kids);
  return wrap;
}

// 한 줄(닉/바이오) 미리보기 — 인스타·카톡·디스코드·X 목업.
function buildSocialPreview(text) {
  const t = text || "미리보기";
  const wrap = el("div.pv");
  const cards = el("div.pv-cards", null, [igCard(t), kakaoCard(t), discordCard(t), xCard(t)]);
  const seg = el("div.pv-theme");
  const mk = (mode, label) => {
    const b = el("button.pv-tbtn" + (mode === "light" ? ".on" : ""), { type: "button" }, label);
    b.onclick = () => { cards.classList.toggle("pv-dark", mode === "dark"); seg.querySelectorAll(".pv-tbtn").forEach((x) => x.classList.toggle("on", x === b)); };
    return b;
  };
  seg.append(mk("light", "☀️ 라이트"), mk("dark", "🌙 다크"));

  const note = compatBadge(text);
  wrap.append(
    el("p.pv-lead", null, "실제 앱 화면에 붙였을 때 이렇게 보여요 — 복사 전에 확인하세요."),
    seg, cards,
    el("div.pv-note." + note.cls, null, note.msg),
    tipsBlock(text),
    el("div.toolbar", null, [
      el("button.tbtn.primary", { type: "button", onclick: () => copy(text, "preview") }, "📋 이 글씨 복사"),
    ]),
    el("div.opt-title", null, "💾 슬롯에 담아두기 (보관함에서 꺼내 쓰기)"),
    el("div.chips", null, SLOT_CATS.map((cat) =>
      el("button.chip-opt", { type: "button", onclick: () => { addSlot(cat, text); toast("‘" + cat + "’ 슬롯에 담음 💾"); } }, cat))),
  );
  return wrap;
}

export function buildPreview(text) {
  const t = String(text == null ? "" : text) || "미리보기";
  // 여러 줄이면 '그림'으로 보고 깨짐 비교 미리보기, 한 줄이면 SNS 목업.
  return classify(t).multiline ? buildArtPreview(t) : buildSocialPreview(t);
}

export function openPreview(text) {
  return openSheet(buildPreview(text), "📱 붙여넣기 미리보기");
}
