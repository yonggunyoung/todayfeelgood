/* 글꾸미 — png.js : 아트 텍스트 → PNG 캔버스 렌더 + 다운로드(사진/그리기 공용). */
"use strict";
import { el, toast } from "./ui.js";

const BRAND = "글꾸미 · geulkkumi";
const FOOT = 22; // 하단 브랜드 띠(공유 시 출처 — 바이럴 훅)

export function textToCanvas(text, mode) {
  const emoji = mode === "emoji";
  const fontPx = emoji ? 18 : 13;
  const lineH = Math.round(fontPx * (emoji ? 1.12 : 0.92));
  const font = `${fontPx}px ${emoji ? "system-ui, 'Apple Color Emoji','Segoe UI Emoji'" : "ui-monospace, Menlo, Consolas, monospace"}`;
  const brandFont = "11px ui-monospace, Menlo, Consolas, monospace";
  const lines = String(text || "").split("\n");
  const meas = document.createElement("canvas").getContext("2d");
  meas.font = font;
  let maxW = 1; for (const ln of lines) maxW = Math.max(maxW, meas.measureText(ln).width);
  meas.font = brandFont; const brandW = meas.measureText(BRAND).width;
  const pad = 18;
  const cnv = el("canvas");
  cnv.width = Math.ceil(Math.max(maxW, brandW)) + pad * 2;
  cnv.height = lines.length * lineH + pad * 2 + FOOT;
  const ctx = cnv.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cnv.width, cnv.height);
  ctx.font = font; ctx.textBaseline = "top"; ctx.fillStyle = "#16181d";
  lines.forEach((ln, i) => ctx.fillText(ln, pad, pad + i * lineH));
  ctx.font = brandFont; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#c2bcc9"; // 은은한 회색
  ctx.fillText(BRAND, cnv.width - pad - brandW, cnv.height - 9);
  return cnv;
}

export function downloadArtPng(text, mode, filename) {
  if (!text) { toast("먼저 변환하세요", "warn"); return; }
  textToCanvas(text, mode).toBlob((blob) => {
    if (!blob) { toast("저장 실패", "warn"); return; }
    const a = el("a", { href: URL.createObjectURL(blob), download: filename || "geulkkumi-art.png" });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("이미지로 저장했어요 ✓");
  }, "image/png");
}
