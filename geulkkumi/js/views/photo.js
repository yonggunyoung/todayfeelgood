/* 글꾸미 — views/photo.js : 사진/이미지 → 도트(브라유)·문자·블록·이모지 아트.
 * 캔버스로 다운샘플 → 밝기 그리드 → ascii-art 엔진 → 텍스트 + PNG 저장.
 */
"use strict";

import { el, clear, copy, toast, debounce, share } from "../ui.js";
import { setSetting, settings } from "../store.js";
import { render as renderArt, imageDataToLum } from "../engine/ascii-art.js";
import { RAMPS, EMOJI_PALETTES, ART_MODES } from "../data/ramps.js";
import { downloadArtPng } from "../png.js";

// 모드별 픽셀 그리드 크기(문자 셀 종횡비 보정 + 세로 폭주 방지 상한).
function dims(mode, cols, ar) {
  const MAXH = 420;
  if (mode === "braille") { const pw = cols * 2; return { pw, ph: Math.min(MAXH, Math.max(4, Math.round(pw * ar))) }; }
  if (mode === "halfblocks") { const pw = cols; return { pw, ph: Math.min(MAXH, Math.max(2, Math.round(pw * ar))) }; }
  if (mode === "emoji") { const pw = cols; return { pw, ph: Math.min(120, Math.max(1, Math.round(pw * ar))) }; }
  const pw = cols; return { pw, ph: Math.min(MAXH, Math.max(1, Math.round(pw * ar * 0.5))) }; // ascii/blocks: 모노 셀 1:2
}

function mount(root) {
  const st = settings();
  let img = null;            // 로드된 HTMLImageElement
  const opt = {
    mode: st.artMode || "braille",
    width: st.artWidth || 80,
    invert: false, dither: true,
    ramp: "classic", palette: "mono",
    contrast: 1, brightness: 0,
  };

  const wrap = el("div.view.view-photo");
  const pre = el("pre.art-out", { "aria-label": "변환 결과" });
  const dz = el("label.dropzone", { tabindex: "0" }, [
    el("div.dz-emoji", null, "🖼️"),
    el("div", null, "사진을 끌어다 놓거나 탭해서 선택"),
    el("div.dz-sub", null, "JPG·PNG·움짤 첫 장 — 도트/문자/이모지로 변환"),
  ]);
  const file = el("input", { type: "file", accept: "image/*", style: { display: "none" } });
  dz.append(file);

  // ── 옵션 UI ──────────────────────────────────────────────
  const modeRow = el("div.chips");
  ART_MODES.forEach((m) => {
    const b = el("button.chip-opt", { type: "button", title: m.hint, "data-mode": m.id }, m.name);
    if (m.id === opt.mode) b.classList.add("on");
    b.onclick = () => {
      opt.mode = m.id; setSetting("artMode", m.id);
      modeRow.querySelectorAll(".chip-opt").forEach((x) => x.classList.toggle("on", x.dataset.mode === m.id));
      syncSubOpts(); process();
    };
    modeRow.append(b);
  });

  const widthLabel = el("span.opt-val", null, String(opt.width));
  const widthSlider = el("input", { type: "range", min: "16", max: "140", value: String(opt.width), class: "slider" });
  widthSlider.oninput = () => {
    opt.width = Math.min(opt.mode === "emoji" ? 44 : 140, +widthSlider.value);
    widthLabel.textContent = String(opt.width); setSetting("artWidth", opt.width); processDebounced();
  };

  const invertBtn = el("button.toggle", { type: "button" }, "반전");
  invertBtn.onclick = () => { opt.invert = !opt.invert; invertBtn.classList.toggle("on", opt.invert); process(); };
  const ditherBtn = el("button.toggle.on", { type: "button" }, "디더");
  ditherBtn.onclick = () => { opt.dither = !opt.dither; ditherBtn.classList.toggle("on", opt.dither); process(); };

  const rampSel = el("select.select");
  RAMPS.forEach((r) => rampSel.append(el("option", { value: r.id }, r.name)));
  rampSel.value = opt.ramp;
  rampSel.onchange = () => { opt.ramp = rampSel.value; process(); };

  const palSel = el("select.select");
  EMOJI_PALETTES.forEach((p) => palSel.append(el("option", { value: p.id }, p.name)));
  palSel.value = opt.palette;
  palSel.onchange = () => { opt.palette = palSel.value; process(); };

  const contrast = el("input", { type: "range", min: "0.4", max: "2.2", step: "0.1", value: "1", class: "slider" });
  contrast.oninput = () => { opt.contrast = +contrast.value; processDebounced(); };
  const bright = el("input", { type: "range", min: "-0.4", max: "0.4", step: "0.05", value: "0", class: "slider" });
  bright.oninput = () => { opt.brightness = +bright.value; processDebounced(); };

  const rampWrap = el("label.opt", null, ["문자셋", rampSel]);
  const palWrap = el("label.opt", null, ["이모지", palSel]);
  function syncSubOpts() {
    const m = opt.mode;
    ditherBtn.style.display = (m === "braille" || m === "halfblocks") ? "" : "none";
    rampWrap.style.display = (m === "ascii" || m === "blocks") ? "" : "none";
    palWrap.style.display = (m === "emoji") ? "" : "none";
    if (m === "emoji" && opt.width > 44) { opt.width = 44; widthSlider.value = "44"; widthLabel.textContent = "44"; }
  }

  const advanced = el("details.adv", null, [
    el("summary", null, "세부 조정"),
    el("div.opt-row", null, [ditherBtn]),
    el("label.opt", null, ["명암", contrast]),
    el("label.opt", null, ["밝기", bright]),
  ]);
  const optionsBox = el("div.options", null, [
    el("div.opt-title", null, "변환 방식"), modeRow,
    el("label.opt", null, ["가로 ", widthSlider, widthLabel]),
    el("div.opt-row", null, [invertBtn]),
    rampWrap, palWrap,
    advanced,
  ]);

  // ── 결과 액션 ────────────────────────────────────────────
  const actions = el("div.toolbar", null, [
    el("button.tbtn.primary", { type: "button", onclick: () => copy(pre.textContent, "art") }, "📋 복사"),
    el("button.tbtn", { type: "button", onclick: () => share(pre.textContent) }, "🔗 공유"),
    el("button.tbtn", { type: "button", onclick: savePng }, "🖼️ 이미지 저장"),
  ]);

  // ── 처리 ────────────────────────────────────────────────
  function process() {
    if (!img) { pre.textContent = ""; pre.classList.add("empty"); return; }
    pre.classList.remove("empty");
    const ar = img.naturalHeight / img.naturalWidth || 1;
    const { pw, ph } = dims(opt.mode, opt.width, ar);
    const c = el("canvas"); c.width = pw; c.height = ph;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, pw, ph);
    ctx.drawImage(img, 0, 0, pw, ph);
    const lum = imageDataToLum(ctx.getImageData(0, 0, pw, ph));
    const out = renderArt(lum, {
      mode: opt.mode, invert: opt.invert, dither: opt.dither,
      contrast: opt.contrast, brightness: opt.brightness,
      ramp: (RAMPS.find((r) => r.id === opt.ramp) || {}).chars,
      palette: (EMOJI_PALETTES.find((p) => p.id === opt.palette) || {}).chars,
    });
    pre.textContent = out;
    pre.classList.toggle("emoji", opt.mode === "emoji");
  }
  const processDebounced = debounce(process, 120);

  function loadFile(f) {
    if (!f || !/^image\//.test(f.type)) { toast("이미지 파일을 올려주세요", "warn"); return; }
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => { img = im; URL.revokeObjectURL(url); syncSubOpts(); process(); toast("불러왔어요 — 옵션을 바꿔보세요"); };
    im.onerror = () => { URL.revokeObjectURL(url); toast("이미지를 열 수 없어요", "warn"); };
    im.src = url;
  }
  function savePng() {
    if (!pre.textContent) { toast("먼저 사진을 변환하세요", "warn"); return; }
    downloadArtPng(pre.textContent, opt.mode, "geulkkumi-photo.png");
  }

  // 입력 이벤트
  dz.addEventListener("click", () => file.click());
  dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); file.click(); } });
  file.addEventListener("change", () => loadFile(file.files[0]));
  ["dragover", "dragenter"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove("over")));
  dz.addEventListener("drop", (e) => { e.preventDefault(); if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });
  wrap._onPaste = (e) => {
    const it = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
    if (it) loadFile(it.getAsFile());
  };
  document.addEventListener("paste", wrap._onPaste);

  wrap.append(
    el("p.lead", null, "사진을 도트(브라유)·문자·이모지 그림으로. 결과는 고정폭(모노) 앱·디스코드에서 가장 잘 보여요."),
    dz, pre, actions, optionsBox,
  );
  syncSubOpts();
  root.append(wrap);
  return () => document.removeEventListener("paste", wrap._onPaste); // 탭 전환 시 리스너 정리
}

export default { id: "photo", label: "사진아트", icon: "🖼️", mount };
