/* 글꾸미 확장 — 포커스된 입력창 근처에 배지를 띄우고, 클릭 시 미니 패널(iframe)을 연다.
 * Shadow DOM으로 페이지 CSS 오염 차단. 패널이 보낸 결과는 __gkInsert로 입력창에 삽입. */
(function () {
  if (window.__gkMount) { window.__gkMount.toggle(); return; }
  const api = {};
  window.__gkMount = api;

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
  const shadow = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  const style = document.createElement("style");
  style.textContent =
    ".gk-badge{position:fixed;pointer-events:auto;border:0;border-radius:999px;padding:7px 12px;" +
    "font:700 13px/1 -apple-system,system-ui,'Apple SD Gothic Neo',sans-serif;color:#fff;" +
    "background:linear-gradient(135deg,#ff7eb6,#b388ff);box-shadow:0 6px 18px rgba(255,95,162,.45);cursor:pointer}" +
    ".gk-badge:active{transform:scale(.94)}" +
    ".gk-panel{position:fixed;pointer-events:auto;width:304px;height:404px;border:0;border-radius:16px;" +
    "box-shadow:0 18px 50px rgba(80,40,90,.35);background:#fff}";
  shadow.appendChild(style);

  const badge = document.createElement("button");
  badge.type = "button"; badge.className = "gk-badge"; badge.textContent = "글꾸미 ✨";
  badge.style.display = "none";
  badge.addEventListener("mousedown", (e) => e.preventDefault()); // 입력창 포커스/선택영역 보존
  badge.addEventListener("click", togglePanel);
  shadow.appendChild(badge);

  let iframe = null, panelOpen = false, lastEditable = null, enabled = true;

  function isEditable(n) {
    return !!n && (n.isContentEditable || n.tagName === "TEXTAREA" ||
      (n.tagName === "INPUT" && /^(text|search|url|email|tel|password|)$/i.test(n.type || "")));
  }
  function place() {
    if (!lastEditable) return;
    const r = lastEditable.getBoundingClientRect();
    const x = Math.max(8, Math.min(r.right - 86, window.innerWidth - 94));
    const y = Math.max(6, r.top - 34);
    badge.style.left = x + "px"; badge.style.top = y + "px";
    if (iframe && panelOpen) {
      iframe.style.left = Math.max(8, Math.min(x, window.innerWidth - 312)) + "px";
      iframe.style.top = Math.min(y + 34, window.innerHeight - 412) + "px";
    }
  }
  function showBadge() { if (!enabled) return; badge.style.display = "block"; place(); }
  function hideBadge() { badge.style.display = "none"; }

  document.addEventListener("focusin", (e) => {
    const t = (e.composedPath && e.composedPath()[0]) || e.target;
    if (isEditable(t)) { lastEditable = t; showBadge(); }
  }, true);
  document.addEventListener("focusout", () => {
    setTimeout(() => { if (!panelOpen && !isEditable(document.activeElement)) hideBadge(); }, 200);
  }, true);
  window.addEventListener("scroll", () => { if (badge.style.display === "block") place(); }, true);
  window.addEventListener("resize", place);

  function ensurePanel() {
    if (iframe) return;
    iframe = document.createElement("iframe");
    iframe.className = "gk-panel";
    iframe.src = chrome.runtime.getURL("panel/panel.html");
    iframe.style.display = "none";
    shadow.appendChild(iframe);
  }
  function togglePanel() {
    ensurePanel(); panelOpen = !panelOpen;
    iframe.style.display = panelOpen ? "block" : "none"; place();
    if (panelOpen) { try { iframe.contentWindow.postMessage({ __gk: "focus" }, "*"); } catch (e) { /* noop */ } }
  }

  window.addEventListener("message", (e) => {
    const d = e.data || {};
    if (d.__gk == null) return;
    if (d.__gk === "insert") { if (window.__gkInsert) window.__gkInsert(lastEditable, d.value); }
    else if (d.__gk === "close") { panelOpen = false; if (iframe) iframe.style.display = "none"; }
  });

  api.toggle = function () {
    enabled = !enabled;
    if (!enabled) { hideBadge(); panelOpen = false; if (iframe) iframe.style.display = "none"; }
    else if (lastEditable) showBadge();
  };

  if (isEditable(document.activeElement)) { lastEditable = document.activeElement; showBadge(); }
})();
