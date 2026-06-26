/* 글꾸미 — ads.js : 광고 슬롯(기본 OFF). 자세한 전략은 MONETIZE.md.
 * 활성화: index.html <head> 에 한 줄(본인 퍼블리셔 ID로 교체) —
 *   <script>window.GEULKKUMI_ADS = { client: "ca-pub-XXXXXXXXXXXXXXXX", librarySlot: "1234567890" };</script>
 * client 가 없으면 모든 함수가 무동작(no-op) → 도구 셸은 광고 없이 깨끗하게 유지된다.
 * 절대 규칙: 결과 리스트·복사 동선 위에는 광고 X. 슬롯은 '스크롤 끝' 1개만.
 */
"use strict";

const CFG = (typeof window !== "undefined" && window.GEULKKUMI_ADS) || {};

export function adsEnabled() { return !!(CFG && CFG.client); }

let loaded = false;
function loadOnce() {
  if (loaded || !adsEnabled() || typeof document === "undefined") return;
  loaded = true;
  const s = document.createElement("script");
  s.async = true; s.crossOrigin = "anonymous";
  s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(CFG.client);
  document.head.appendChild(s);
}

// 광고 슬롯 DOM 반환. OFF면 null → 호출부에서 아무것도 추가하지 않는다(레이아웃 변화 0).
export function adSlot(slotId, opts) {
  if (!adsEnabled() || typeof document === "undefined") return null;
  opts = opts || {};
  loadOnce();
  const box = document.createElement("div");
  box.className = "ad-slot";
  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.display = "block";
  ins.setAttribute("data-ad-client", CFG.client);
  if (slotId || CFG.librarySlot) ins.setAttribute("data-ad-slot", String(slotId || CFG.librarySlot));
  ins.setAttribute("data-ad-format", opts.format || "auto");
  ins.setAttribute("data-full-width-responsive", "true");
  box.appendChild(ins);
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* 로더 미도착 — 무시 */ }
  return box;
}
