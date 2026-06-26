/* 글꾸미 — main.js : 셸 라우팅 · 공유 타깃 · 테마 · PWA 설치. (ESM 진입점) */
"use strict";

import { el, clear, openSheet, copy, copyChip, toast } from "./ui.js";
import { settings, setSetting, bumpTab, topTab, getState, getSlots } from "./store.js";
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

// 상단 로고 → 홈(멋글씨, 대표 화면)으로. (자주 쓰는 탭은 '앱 진입 시' 자동 — 별개 개념)
const HOME = "fonts";
function goHome() { if (location.hash.slice(1) === HOME) render(HOME); else location.hash = HOME; }

// ⚡ 빠른 불러오기 — 어느 화면에서나 즐겨찾기·슬롯을 원탭 복사.
function openQuick() {
  const s = getState();
  const favs = (s.favorites || []).slice(0, 30);
  const slots = getSlots().slice(0, 30);
  const box = el("div.quick");
  if (!favs.length && !slots.length) {
    box.append(el("div.empty-note", null, "아직 즐겨찾기·슬롯이 없어요 — 마음에 드는 글씨의 ☆ 나 미리보기의 💾 슬롯에 담아두면 여기서 바로 꺼내 써요."));
  } else {
    if (slots.length) {
      box.append(el("div.opt-title", null, "💾 슬롯 (닉·바이오)"));
      const g = el("div.quick-list");
      slots.forEach((sl) => g.append(el("button.quick-chip", { type: "button", title: "탭하면 복사", onclick: () => copy(sl.text, "slot") },
        [el("span.slot-cat", null, sl.cat), el("span.quick-text", null, sl.text)])));
      box.append(g);
    }
    if (favs.length) {
      box.append(el("div.opt-title", null, "★ 즐겨찾기"));
      const g = el("div.chips");
      favs.forEach((f) => g.append(copyChip(f.text, { kind: f.kind, label: f.text })));
      box.append(g);
    }
  }
  openSheet(box, "⚡ 빠른 불러오기");
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

// 설치(standalone) 여부 — 브라우저 탭에선 뒤로가기 가드를 걸지 않는다(웹 관례 존중).
function isStandalone() {
  try { return matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }
  catch { return false; }
}

// 뒤로가기로 '완전 종료'를 막고 한 번 더 눌러야 나가게(설치앱 한정). 바닥에 가드 엔트리.
function setupBackGuard(initial) {
  if (!isStandalone()) return;
  let armed = 0;
  try {
    history.replaceState({ g: 1 }, "");                       // 바닥 = 가드
    history.pushState({ tab: initial }, "", "#" + initial);   // 앱 진입 엔트리(항상 해시 보유)
  } catch { return; }
  window.addEventListener("popstate", (e) => {
    if (!(e.state && e.state.g === 1)) return; // 가드가 아니면 내부 탭 이동 → hashchange가 렌더
    const now = Date.now();
    if (now - armed < 2000) { try { history.back(); } catch { /* 종료 */ } return; } // 두 번째 → 실제 종료
    armed = now;
    try { history.pushState({ tab: topTab("fonts") }, "", "#" + topTab("fonts")); } catch { /* noop */ }
    toast("한 번 더 누르면 나가요 👋", "warn");
  });
}

function boot() {
  buildTabs();
  applyTheme();
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);

  const themeBtn = document.getElementById("theme-btn");
  if (themeBtn) themeBtn.onclick = () => { setSetting("theme", THEME_CYCLE[settings().theme || "auto"]); applyTheme(); };

  // 상단 로고 → 홈. 키보드(Enter/Space)로도.
  const brand = document.querySelector("#topbar .brand");
  if (brand) {
    brand.setAttribute("role", "button"); brand.setAttribute("tabindex", "0"); brand.setAttribute("aria-label", "홈으로");
    brand.style.cursor = "pointer";
    brand.addEventListener("click", goHome);
    brand.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goHome(); } });
  }
  // ⚡ 빠른 불러오기
  const quickBtn = document.getElementById("quick-btn");
  if (quickBtn) quickBtn.onclick = openQuick;

  const shared = readShared();
  if (shared) prefill(shared);

  // 진입 화면: 공유로 들어오면 멋글씨, 명시적 해시가 있으면 그 탭, 아니면 '자주 쓰는 탭'.
  let initial = "fonts";
  if (!shared) { const h = location.hash.slice(1); initial = byId[h] ? h : topTab("fonts"); }
  render(initial);
  setupBackGuard(initial); // 설치앱에서 뒤로가기 종료 방지(브라우저는 무동작)
  // 사용자 탭 이동(해시 변경)마다 빈도 누적 → 다음 진입의 기본 탭에 반영.
  window.addEventListener("hashchange", () => { const id = location.hash.slice(1); render(id); if (byId[id]) bumpTab(id); });

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
