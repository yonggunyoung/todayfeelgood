/* 글꾸미 — main.js : 셸 라우팅 · 공유 타깃 · 테마 · PWA 설치. (ESM 진입점) */
"use strict";

import { el, clear } from "./ui.js";
import { settings, setSetting } from "./store.js";
import fonts, { prefill } from "./views/fonts.js";
import photo from "./views/photo.js";
import draw from "./views/draw.js";
import library from "./views/library.js";
import saved from "./views/saved.js";

const VIEWS = [fonts, photo, draw, library, saved];
const byId = Object.fromEntries(VIEWS.map((v) => [v.id, v]));

const viewRoot = document.getElementById("view");
const tabbar = document.getElementById("tabbar");
let cleanup = null;

function setActive(id) {
  tabbar.querySelectorAll(".tab").forEach((b) => {
    const on = b.dataset.tab === id;
    b.classList.toggle("on", on);
    b.setAttribute("aria-current", on ? "page" : "false");
  });
}

function render(id) {
  if (!byId[id]) id = "fonts";
  if (cleanup) { try { cleanup(); } catch { /* 격리 */ } cleanup = null; }
  clear(viewRoot);
  setActive(id);
  cleanup = byId[id].mount(viewRoot) || null;
  document.title = (byId[id].label) + " · 글꾸미";
  window.scrollTo(0, 0);
}

function buildTabs() {
  VIEWS.forEach((v) => {
    const b = el("button.tab", { type: "button", dataset: { tab: v.id }, "aria-label": v.label }, [
      el("span.tab-ico", null, v.icon), el("span.tab-label", null, v.label),
    ]);
    b.onclick = () => { if (location.hash.slice(1) === v.id) render(v.id); else location.hash = v.id; };
    tabbar.append(b);
  });
}

// ── 테마 ──────────────────────────────────────────────────
const THEME_CYCLE = { auto: "light", light: "dark", dark: "auto" };
const THEME_ICON = { auto: "🌗", light: "☀️", dark: "🌙" };
function applyTheme() {
  const pref = settings().theme || "auto";
  const dark = pref === "dark" || (pref === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]'); // 상태바 색도 테마 따라가게
  if (meta) meta.setAttribute("content", dark ? "#14101a" : "#ff7eb6");
  const btn = document.getElementById("theme-btn");
  if (btn) btn.textContent = THEME_ICON[pref];
}

// ── 공유 타깃: 다른 앱에서 '공유'로 들어온 텍스트를 변환 화면에 채움 ──
function readShared() {
  const p = new URLSearchParams(location.search);
  const text = p.get("text") || p.get("title") || p.get("q") || p.get("share") || "";
  return text.trim();
}

function boot() {
  buildTabs();
  applyTheme();
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);

  const themeBtn = document.getElementById("theme-btn");
  if (themeBtn) themeBtn.onclick = () => { setSetting("theme", THEME_CYCLE[settings().theme || "auto"]); applyTheme(); };

  const shared = readShared();
  if (shared) prefill(shared);

  const initial = (byId[location.hash.slice(1)] && !shared) ? location.hash.slice(1) : "fonts";
  render(initial);
  window.addEventListener("hashchange", () => render(location.hash.slice(1)));

  // PWA 설치 버튼
  let deferred = null;
  const installBtn = document.getElementById("install-btn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); deferred = e;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn) installBtn.onclick = async () => {
    if (!deferred) return;
    deferred.prompt(); await deferred.userChoice; deferred = null; installBtn.hidden = true;
  };
  window.addEventListener("appinstalled", () => { if (installBtn) installBtn.hidden = true; });

  // 후원 링크(선택): 아래 URL을 채우면 푸터에 ☕ 후원 버튼이 나타남.
  const SUPPORT_URL = ""; // 예: "https://buymeacoffee.com/..." 또는 토스 익명송금 링크
  const support = document.getElementById("support-link");
  if (support && SUPPORT_URL) { support.href = SUPPORT_URL; support.target = "_blank"; support.rel = "noopener"; support.hidden = false; }

  // 서비스워커(오프라인)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
}

boot();
