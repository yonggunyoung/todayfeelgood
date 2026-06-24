/* 글꾸미 키보드 — 메인 앱 엔진/데이터(동기화본)를 그대로 재사용.
 * 선택 시 Android 브리지 Gk.commit(value)로 현재 입력창에 직접 입력(복붙 불필요). */
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

function commit(v) {
  if (window.Gk && Gk.commit) Gk.commit(v);
  else if (navigator.clipboard) navigator.clipboard.writeText(v); // 브라우저 미리보기 폴백
}

let tab = "font";
[["font", "멋글씨"], ["kao", "이모티콘"], ["sym", "특수문자"]].forEach(([id, name]) => {
  const b = document.createElement("button");
  b.className = "tab" + (id === tab ? " on" : ""); b.textContent = name;
  b.onclick = () => { tab = id; [...tabs.children].forEach((c) => c.classList.toggle("on", c === b)); render(); };
  tabs.appendChild(b);
});

function row(name, val, risk) {
  const b = document.createElement("button"); b.className = "row"; b.onclick = () => commit(val);
  const n = document.createElement("span"); n.className = "rn"; n.textContent = name + (risk ? " ⚠" : "");
  const v = document.createElement("span"); v.className = "rv"; v.textContent = val;
  b.append(n, v); return b;
}
function cell(val) { const b = document.createElement("button"); b.className = "cell"; b.textContent = val; b.onclick = () => commit(val); return b; }

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
    if (/[A-Za-z0-9]/.test(text) || !/[가-힣]/.test(text)) convertAll(text).forEach((s) => f.append(row(s.name, s.result, s.risk)));
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
render();
