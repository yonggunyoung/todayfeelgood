/* 글꾸미 확장 패널 — 메인 앱 엔진/데이터를 그대로 재사용(무DOM 순수함수).
 * 선택 시 부모(content)로 결과를 postMessage → __gkInsert가 포커스 입력창에 삽입. */
import { convertAll, zalgo } from "../engine/unicode-fonts.js";
import { chosung, circledHangul } from "../engine/hangul.js";
import { applyFrame } from "../engine/decorate.js";
import { FRAMES } from "../data/templates.js";
import { SYMBOLS } from "../data/symbols.js";
import { KAOMOJI } from "../data/kaomoji.js";

const q = document.getElementById("q");
const tabs = document.getElementById("tabs");
const out = document.getElementById("out");
const toastEl = document.getElementById("toast");
document.getElementById("x").onclick = () => parent.postMessage({ __gk: "close" }, "*");

let tab = "font";
[["font", "멋글씨"], ["kao", "이모티콘"], ["sym", "특수문자"]].forEach(([id, name]) => {
  const b = document.createElement("button");
  b.className = "tab" + (id === tab ? " on" : ""); b.textContent = name;
  b.onclick = () => { tab = id; [...tabs.children].forEach((c) => c.classList.toggle("on", c === b)); render(); };
  tabs.appendChild(b);
});

let tT;
function toast(m) { toastEl.textContent = m; toastEl.classList.add("on"); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove("on"), 1100); }
function pick(v) { parent.postMessage({ __gk: "insert", value: v }, "*"); toast("입력했어요 ✓"); }

function row(name, val, risk) {
  const b = document.createElement("button"); b.className = "row"; b.onclick = () => pick(val);
  const n = document.createElement("span"); n.className = "rn"; n.textContent = name + (risk ? " ⚠" : "");
  const v = document.createElement("span"); v.className = "rv"; v.textContent = val;
  b.append(n, v); return b;
}
function cell(val) { const b = document.createElement("button"); b.className = "cell"; b.textContent = val; b.onclick = () => pick(val); return b; }

function render() {
  const text = q.value.trim() || "미리보기";
  out.innerHTML = "";
  if (tab === "font") {
    const f = document.createDocumentFragment();
    if (/[가-힣]/.test(text)) {
      FRAMES.slice(0, 8).forEach((fr) => f.append(row("꾸민 한글", applyFrame(fr.tpl, text))));
      f.append(row("팔다리체", zalgo(text, 1, 0, 1), true));
      f.append(row("초성", chosung(text)));
      const ch = circledHangul(text); if (ch !== text) f.append(row("원문자", ch));
    }
    if (/[A-Za-z0-9]/.test(text) || !/[가-힣]/.test(text)) {
      convertAll(text).forEach((s) => f.append(row(s.name, s.result, s.risk)));
    }
    out.append(f);
  } else if (tab === "kao") {
    const g = document.createElement("div"); g.className = "grid";
    KAOMOJI.flatMap((c) => c.items).slice(0, 300).forEach((it) => g.append(cell(it))); out.append(g);
  } else {
    const g = document.createElement("div"); g.className = "grid sym";
    SYMBOLS.flatMap((c) => c.items).slice(0, 300).forEach((it) => g.append(cell(it))); out.append(g);
  }
}
q.addEventListener("input", render);
window.addEventListener("message", (e) => { if ((e.data || {}).__gk === "focus") q.focus(); });
render();
