/* 글꾸미 — views/saved.js : 보관함(즐겨찾기 · 최근 복사). 스토어 구독으로 실시간 갱신. */
"use strict";

import { el, clear, copy, share, toast } from "../ui.js";
import { getState, subscribe, removeFavorite, clearHistory, toggleFavorite, isFavorite } from "../store.js";

function row(item, { onRemove, removable }) {
  const text = item.text;
  const val = el("button.saved-val", { type: "button", title: "탭하면 복사", onclick: () => copy(text, item.kind) }, text);
  const fav = el("button.saved-act", {
    type: "button", title: "즐겨찾기", text: isFavorite(text) ? "★" : "☆",
    onclick: () => { const on = toggleFavorite(text, item.kind); toast(on ? "즐겨찾기 ★" : "해제"); },
  });
  const acts = el("div.saved-acts", null, [
    fav,
    el("button.saved-act", { type: "button", title: "공유", text: "🔗", onclick: () => share(text) }),
    removable && el("button.saved-act", { type: "button", title: "삭제", text: "✕", onclick: onRemove }),
  ]);
  return el("div.saved-row", null, [val, acts]);
}

function mount(root) {
  let seg = "fav";
  const wrap = el("div.view.view-saved");
  const segRow = el("div.segmented");
  const body = el("div.saved-body", { "aria-live": "polite" });

  function renderBody() {
    const s = getState();
    clear(body);
    if (seg === "fav") {
      if (!s.favorites.length) { body.append(empty("아직 즐겨찾기가 없어요", "마음에 드는 글씨·기호의 ☆ 를 눌러 담아보세요")); return; }
      s.favorites.forEach((it) => body.append(row(it, { removable: true, onRemove: () => removeFavorite(it.text) })));
    } else {
      if (!s.history.length) { body.append(empty("최근 기록이 없어요", "복사하면 여기에 쌓여요")); return; }
      body.append(el("div.toolbar", null, [
        el("button.tbtn", { type: "button", onclick: () => { clearHistory(); toast("기록을 비웠어요"); } }, "🧹 기록 비우기"),
      ]));
      s.history.forEach((it) => body.append(row(it, { removable: false })));
    }
  }
  function empty(title, sub) {
    return el("div.empty-box", null, [el("div.empty-emoji", null, "🗂️"), el("strong", null, title), el("p", null, sub)]);
  }

  [["fav", "즐겨찾기 ★"], ["recent", "최근"]].forEach(([id, name]) => {
    const b = el("button.seg" + (id === seg ? ".on" : ""), { type: "button" }, name);
    b.onclick = () => { seg = id; segRow.querySelectorAll(".seg").forEach((x) => x.classList.toggle("on", x === b)); renderBody(); };
    segRow.append(b);
  });

  const unsub = subscribe(() => renderBody());
  wrap.append(segRow, body);
  root.append(wrap);
  renderBody();
  return () => unsub(); // 탭 전환 시 구독 해제
}

export default { id: "saved", label: "보관함", icon: "🗂️", mount };
