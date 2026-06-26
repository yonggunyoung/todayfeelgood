/* 글꾸미 키보드 — 메인 앱 엔진/데이터(동기화본)를 그대로 재사용.
 * 탭하면 Android 브리지 Gk.commit(value)로 현재 입력창에 직접 입력(복붙 불필요).
 * ⭐ 자주쓰기: ☆로 저장한 것 + 한 번 입력하면 '최근'에 자동 누적 → 어떤 앱에서든 원탭 재입력.
 * (저장소는 키보드 자체 WebView localStorage — 브라우저 앱과는 분리된 영역.) */
import { convertAll, zalgo } from "./engine/unicode-fonts.js";
import { chosung, circledHangul } from "./engine/hangul.js";
import { applyFrame } from "./engine/decorate.js";
import { FRAMES } from "./data/templates.js";
import { SYMBOLS } from "./data/symbols.js";
import { KAOMOJI } from "./data/kaomoji.js";

const q = document.getElementById("q");
const tabs = document.getElementById("tabs");
const out = document.getElementById("out");
document.getElementById("kb").onclick = () => { if (window.Gk && Gk.switchKeyboard) Gk.switchKeyboard(); };

// ── 자주쓰기/최근(키보드 자체 저장소) ──
const SKEY = "geulkkumi.kb.v1";
const MAX_FAV = 60, MAX_REC = 40;
const store = { favs: [], recents: [] };
try { const r = localStorage.getItem(SKEY); if (r) { const o = JSON.parse(r); if (Array.isArray(o.favs)) store.favs = o.favs; if (Array.isArray(o.recents)) store.recents = o.recents; } } catch { /* 무시 */ }
function persist() { try { localStorage.setItem(SKEY, JSON.stringify(store)); } catch { /* 무시 */ } }
const isFav = (v) => store.favs.includes(v);
function toggleFav(v) {
  if (!v) return;
  if (isFav(v)) store.favs = store.favs.filter((x) => x !== v);
  else { store.favs.unshift(v); if (store.favs.length > MAX_FAV) store.favs.length = MAX_FAV; }
  persist();
}
function pushRecent(v) {
  store.recents = store.recents.filter((x) => x !== v);
  store.recents.unshift(v);
  if (store.recents.length > MAX_REC) store.recents.length = MAX_REC;
  persist();
}

function commit(v) {
  if (!v) return;
  if (window.Gk && Gk.commit) Gk.commit(v);
  else if (navigator.clipboard) navigator.clipboard.writeText(v); // 브라우저 미리보기 폴백
  pushRecent(v);
  if (tab === "star") render(); // 최근 즉시 반영
}

let tab = (store.favs.length || store.recents.length) ? "star" : "font";
[["star", "⭐ 자주쓰기"], ["font", "멋글씨"], ["kao", "이모티콘"], ["sym", "특수문자"]].forEach(([id, name]) => {
  const b = document.createElement("button");
  b.className = "tab" + (id === tab ? " on" : ""); b.textContent = name; b.dataset.id = id;
  b.onclick = () => { tab = id; [...tabs.children].forEach((c) => c.classList.toggle("on", c === b)); render(); };
  tabs.appendChild(b);
});

// 멋글씨 행(이름+값) + ★ 저장 토글.
function row(name, val, risk) {
  const wrap = document.createElement("div"); wrap.className = "row-wrap";
  const b = document.createElement("button"); b.className = "row"; b.onclick = () => commit(val);
  const n = document.createElement("span"); n.className = "rn"; n.textContent = name + (risk ? " ⚠" : "");
  const v = document.createElement("span"); v.className = "rv"; v.textContent = val;
  b.append(n, v);
  const star = document.createElement("button");
  const paint = () => { star.className = "star" + (isFav(val) ? " on" : ""); star.textContent = isFav(val) ? "★" : "☆"; };
  star.title = "자주쓰기 저장"; paint();
  star.onclick = (e) => { e.stopPropagation(); toggleFav(val); paint(); };
  wrap.append(b, star); return wrap;
}
function cell(val) { const b = document.createElement("button"); b.className = "cell"; b.textContent = val; b.onclick = () => commit(val); return b; }

// ⭐ 자주쓰기 탭: ★ 저장 + 🕑 최근.
function favRow(val, recent) {
  const wrap = document.createElement("div"); wrap.className = "fav-row";
  const b = document.createElement("button"); b.className = "fav-val"; b.textContent = val; b.onclick = () => commit(val);
  const act = document.createElement("button"); act.className = "fav-x";
  act.textContent = recent ? "☆" : "✕";
  act.title = recent ? "자주쓰기에 저장" : "삭제";
  act.onclick = (e) => { e.stopPropagation(); toggleFav(val); render(); };
  wrap.append(b, act); return wrap;
}
function renderStar(frag) {
  if (!store.favs.length && !store.recents.length) {
    const e = document.createElement("div"); e.className = "empty";
    e.textContent = "여기에 자주 쓰는 글씨가 모여요. ‘멋글씨·이모티콘’에서 ☆ 를 누르면 저장되고, 한 번 입력한 건 ‘최근’에 자동으로 쌓여 — 어느 앱에서든 한 번에 다시 입력!";
    frag.append(e); return;
  }
  if (store.favs.length) {
    const s = document.createElement("div"); s.className = "sec"; s.textContent = "★ 저장한 것"; frag.append(s);
    store.favs.forEach((v) => frag.append(favRow(v, false)));
  }
  if (store.recents.length) {
    const s = document.createElement("div"); s.className = "sec"; s.textContent = "🕑 최근 (탭 → 입력 · ☆ → 저장)"; frag.append(s);
    store.recents.forEach((v) => frag.append(favRow(v, true)));
  }
}

function render() {
  const text = q.value.trim() || "미리보기";
  out.innerHTML = "";
  const frag = document.createDocumentFragment();
  if (tab === "star") {
    renderStar(frag);
  } else if (tab === "font") {
    if (/[가-힣]/.test(text)) {
      FRAMES.slice(0, 8).forEach((fr) => frag.append(row("꾸민 한글", applyFrame(fr.tpl, text))));
      frag.append(row("팔다리체", zalgo(text, 1, 0, 1), true));
      frag.append(row("초성", chosung(text)));
      const ch = circledHangul(text); if (ch !== text) frag.append(row("원문자", ch));
    }
    if (/[A-Za-z0-9]/.test(text) || !/[가-힣]/.test(text)) convertAll(text).forEach((s) => frag.append(row(s.name, s.result, s.risk)));
  } else if (tab === "kao") {
    const g = document.createElement("div"); g.className = "grid";
    KAOMOJI.flatMap((c) => c.items).slice(0, 300).forEach((it) => g.append(cell(it))); frag.append(g);
  } else {
    const g = document.createElement("div"); g.className = "grid sym";
    SYMBOLS.flatMap((c) => c.items).slice(0, 300).forEach((it) => g.append(cell(it))); frag.append(g);
  }
  out.append(frag);
}
q.addEventListener("input", render);
render();
