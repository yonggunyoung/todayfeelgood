/* 글꾸미 — ascii-art.js : 밝기 그리드 → 문자/도트/블록/이모지 아트 (순수·무 DOM).
 * 핵심 도트: 브라유(U+2800~)는 한 글자에 2×4 점을 담아 고해상도 도트 아트가 된다.
 * 입력 lum = { w, h, data:[0..255 * w*h] }  (0=검정, 255=흰색, 행 우선)
 * 픽셀 샘플링(canvas)은 뷰에서, 매핑 로직은 전부 여기(순수) → tests에서 검증.
 */
"use strict";

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

// lum(0..255) → 밝기 Float(0..1) 배열, invert/gamma/contrast/brightness 적용.
// 반환 brightness: 0=어둠(잉크), 1=밝음(배경).
export function toBrightness(lum, opts) {
  opts = opts || {};
  const invert = !!opts.invert;
  const gamma = opts.gamma > 0 ? opts.gamma : 1;
  const contrast = opts.contrast != null ? opts.contrast : 1;
  const brightness = opts.brightness != null ? opts.brightness : 0;
  const n = lum.w * lum.h;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = clamp01(lum.data[i] / 255);
    if (gamma !== 1) v = Math.pow(v, 1 / gamma);
    v = (v - 0.5) * contrast + 0.5 + brightness;
    v = clamp01(v);
    if (invert) v = 1 - v;
    out[i] = v;
  }
  return { w: lum.w, h: lum.h, data: out };
}

// 문자(ASCII) 아트. ramp: 어두움→밝음 순서(예: "@%#*+=-:. ")
export function toAscii(bright, ramp) {
  ramp = ramp && ramp.length ? ramp : "@%#*+=-:. ";
  const last = ramp.length - 1;
  let out = "";
  for (let y = 0; y < bright.h; y++) {
    for (let x = 0; x < bright.w; x++) {
      const b = bright.data[y * bright.w + x];
      out += ramp[Math.round(b * last)];
    }
    if (y < bright.h - 1) out += "\n";
  }
  return out;
}

// Floyd–Steinberg 디더링 → 0/1 격자(1=잉크/켜짐). 매끄러운 도트 표현용.
function dither(bright) {
  const w = bright.w, h = bright.h;
  const buf = Float32Array.from(bright.data); // 복사(오차 확산으로 변형)
  const on = new Uint8Array(w * h);
  const add = (x, y, e) => { if (x >= 0 && x < w && y >= 0 && y < h) buf[y * w + x] += e; };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = buf[i];
      const nw = old < 0.5 ? 0 : 1;     // 0=검정(잉크)
      on[i] = nw === 0 ? 1 : 0;
      const err = old - nw;
      add(x + 1, y, err * 7 / 16);
      add(x - 1, y + 1, err * 3 / 16);
      add(x, y + 1, err * 5 / 16);
      add(x + 1, y + 1, err * 1 / 16);
    }
  }
  return on;
}

// 켜짐(잉크) 판정 격자 만들기.
function inkGrid(bright, opts) {
  if (opts && opts.dither) return dither(bright);
  const th = opts && opts.threshold != null ? opts.threshold : 0.5;
  const w = bright.w, h = bright.h, on = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) on[i] = bright.data[i] < th ? 1 : 0; // 어두우면 잉크
  return on;
}

// 브라유 도트 아트. 한 글자 = 가로2 × 세로4 점.
const BRAILLE_BITS = [
  [0x01, 0x02, 0x04, 0x40], // x=0 열 (y=0..3)
  [0x08, 0x10, 0x20, 0x80], // x=1 열 (y=0..3)
];
export function toBraille(bright, opts) {
  const on = inkGrid(bright, opts);
  const w = bright.w, h = bright.h;
  const cols = Math.ceil(w / 2), rows = Math.ceil(h / 4);
  let out = "";
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      let bits = 0;
      for (let dx = 0; dx < 2; dx++) {
        for (let dy = 0; dy < 4; dy++) {
          const px = cx * 2 + dx, py = cy * 4 + dy;
          if (px < w && py < h && on[py * w + px]) bits |= BRAILLE_BITS[dx][dy];
        }
      }
      out += String.fromCodePoint(0x2800 + bits);
    }
    if (cy < rows - 1) out += "\n";
  }
  return out;
}

// 하프블록: 한 글자 = 가로1 × 세로2 (세로 해상도 2배, 풀블록 질감).
const HALF = [" ", "▀", "▄", "█"]; // bit0=위, bit1=아래
export function toHalfBlocks(bright, opts) {
  const on = inkGrid(bright, opts);
  const w = bright.w, h = bright.h, rows = Math.ceil(h / 2);
  let out = "";
  for (let cy = 0; cy < rows; cy++) {
    for (let x = 0; x < w; x++) {
      const top = (cy * 2 < h && on[(cy * 2) * w + x]) ? 1 : 0;
      const bot = (cy * 2 + 1 < h && on[(cy * 2 + 1) * w + x]) ? 2 : 0;
      out += HALF[top | bot];
    }
    if (cy < rows - 1) out += "\n";
  }
  return out;
}

// 블록 음영(농담): "█▓▒░ " 같은 ramp로 ASCII와 동일 방식.
export function toBlocks(bright, ramp) {
  return toAscii(bright, ramp && ramp.length ? ramp : "█▓▒░ ");
}

// 이모지 아트. palette: 어두움→밝음 순서 배열. 한 픽셀 = 이모지 1개.
export function toEmoji(bright, palette) {
  const pal = palette && palette.length ? palette : ["⬛", "🟦", "🟩", "🟨", "🟧", "⬜"];
  const last = pal.length - 1;
  let out = "";
  for (let y = 0; y < bright.h; y++) {
    for (let x = 0; x < bright.w; x++) {
      out += pal[Math.round(bright.data[y * bright.w + x] * last)];
    }
    if (y < bright.h - 1) out += "\n";
  }
  return out;
}

// 통합 디스패처. opts.mode: ascii|braille|halfblocks|blocks|emoji
export function render(lum, opts) {
  opts = opts || {};
  const bright = toBrightness(lum, opts);
  switch (opts.mode) {
    case "braille": return toBraille(bright, opts);
    case "halfblocks": return toHalfBlocks(bright, opts);
    case "blocks": return toBlocks(bright, opts.ramp);
    case "emoji": return toEmoji(bright, opts.palette);
    case "ascii":
    default: return toAscii(bright, opts.ramp);
  }
}

// 편의: ImageData 유사 객체({width,height,data:RGBA}) → lum. 투명은 흰 배경 합성.
export function imageDataToLum(img) {
  const w = img.width, h = img.height, src = img.data, out = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = src[i * 4], g = src[i * 4 + 1], b = src[i * 4 + 2], a = src[i * 4 + 3] / 255;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    out[i] = Math.round(a * l + (1 - a) * 255); // 투명 → 흰색
  }
  return { w, h, data: out };
}
