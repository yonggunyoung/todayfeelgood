/* 글꾸미 — ui.js : DOM 헬퍼 · 토스트 · 복사칩(복사+즐겨찾기) 팩토리. */
"use strict";

import { addHistory, toggleFavorite, isFavorite } from "./store.js";

// el("button.copy", {onclick}, ["텍스트", childNode]) 식 간결 생성기.
export function el(tag, props, children) {
  const m = String(tag).match(/^([a-z0-9]+)?(.*)$/i);
  const name = m[1] || "div";
  const node = document.createElement(name);
  const rest = m[2] || "";
  rest.replace(/([.#])([\w-]+)/g, (_, t, v) => { t === "." ? node.classList.add(v) : (node.id = v); return ""; });
  if (props) for (const k in props) {
    const v = props[k];
    if (k === "class") node.className = node.className ? node.className + " " + v : v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (v != null && v !== false) node.setAttribute(k, v === true ? "" : v);
  }
  if (children != null) appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null || c === false) return;
    node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  });
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

// 토스트(#toast-root 필요).
let toastTimer = null;
export function toast(msg, kind) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  clear(root);
  const t = el("div.toast" + (kind ? "." + kind : ""), { role: "status" }, msg);
  root.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove("show"); setTimeout(() => clear(root), 250); }, 1600);
}

// 클립보드 복사(+ 폴백) → 토스트 + 최근기록.
export async function copy(text, kind) {
  if (!text) return false;
  let ok = false;
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; }
  } catch { /* 폴백 */ }
  if (!ok) {
    try {
      const ta = el("textarea", { style: { position: "fixed", opacity: "0", top: "0" } });
      ta.value = text; document.body.appendChild(ta); ta.focus(); ta.select();
      ok = document.execCommand("copy"); ta.remove();
    } catch { ok = false; }
  }
  if (ok) { addHistory(text, kind); toast("복사됐어요 ✓"); }
  else toast("복사 실패 — 길게 눌러 직접 복사하세요", "warn");
  return ok;
}

// 네이티브 공유(가능하면). 실패 시 복사로 폴백.
export async function share(text) {
  if (navigator.share) {
    try { await navigator.share({ text }); addHistory(text, "share"); return true; }
    catch { /* 취소/미지원 → 폴백 */ }
  }
  return copy(text);
}

// 복사칩: 누르면 복사, ★ 누르면 즐겨찾기. 결과 미리보기 카드에 두루 사용.
export function copyChip(text, opts) {
  opts = opts || {};
  const kind = opts.kind || "text";
  const chip = el("button.chip", { type: "button", title: "탭하면 복사", "aria-label": "복사: " + text });
  const label = el("span.chip-text", { text: opts.label != null ? opts.label : text });
  const star = el("button.chip-star", {
    type: "button", title: "즐겨찾기", "aria-pressed": isFavorite(text) ? "true" : "false",
    text: isFavorite(text) ? "★" : "☆",
    onclick: (e) => {
      e.stopPropagation();
      const on = toggleFavorite(text, kind);
      star.textContent = on ? "★" : "☆";
      star.setAttribute("aria-pressed", on ? "true" : "false");
      toast(on ? "즐겨찾기에 담음 ★" : "즐겨찾기 해제");
    },
  });
  chip.append(label, star);
  chip.addEventListener("click", () => copy(text, kind));
  return chip;
}

// 디바운스(입력 → 미리보기 갱신).
export function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
