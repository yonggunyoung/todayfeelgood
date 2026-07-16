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

function downloadCanvas(cnv, filename) {
  cnv.toBlob((blob) => {
    if (!blob) { toast("저장 실패", "warn"); return; }
    const a = el("a", { href: URL.createObjectURL(blob), download: filename });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("이미지로 저장했어요 ✓");
  }, "image/png");
}

export function downloadArtPng(text, mode, filename) {
  if (!text) { toast("먼저 변환하세요", "warn"); return; }
  downloadCanvas(textToCanvas(text, mode), filename || "geulkkumi-art.png");
}

// 닉네임 카드 — 브랜드 그라데이션 정사각(1080) 카드에 꾸민 글씨를 크게.
// 인스타 스토리/프로필 공유용(워터마크 = 바이럴 훅).
export function nickCardCanvas(text) {
  const S = 1080, PAD = 110;
  const cnv = el("canvas"); cnv.width = S; cnv.height = S;
  const ctx = cnv.getContext("2d");
  // 배경: 앱 아이콘과 같은 3스톱 대각 그라데이션 + 상단 하이라이트
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, "#ff8fc4"); g.addColorStop(0.55, "#b39bff"); g.addColorStop(1, "#7fd8ec");
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  const hi = ctx.createRadialGradient(S / 2, S * 0.16, 60, S / 2, S * 0.16, S * 0.85);
  hi.addColorStop(0, "rgba(255,255,255,.32)"); hi.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hi; ctx.fillRect(0, 0, S, S);
  // 장식 별
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.font = "64px system-ui, 'Apple Color Emoji','Segoe UI Emoji'";
  ctx.fillText("✦", 92, 170); ctx.fillText("⋆", S - 150, 210);
  ctx.font = "40px system-ui"; ctx.fillText("⊹", 150, S - 150); ctx.fillText("✧", S - 130, S - 190);
  // 본문: 줄 단위, 폭에 맞게 폰트 자동 축소(64~150px)
  const lines = String(text || "").split("\n").slice(0, 4);
  const family = "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  let px = 150;
  const fits = (p) => { ctx.font = `700 ${p}px ${family}`; return lines.every((ln) => ctx.measureText(ln).width <= S - PAD * 2); };
  while (px > 64 && !fits(px)) px -= 6;
  ctx.font = `700 ${px}px ${family}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(122,42,100,.35)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#ffffff";
  const lineH = px * 1.22, y0 = S / 2 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, S / 2, y0 + i * lineH));
  // 워터마크(출처 — 공유될수록 유입)
  ctx.shadowColor = "transparent";
  ctx.font = `600 30px ${family}`;
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.fillText("✦ 글꾸미 · ddukkit.com/geulkkumi", S / 2, S - 74);
  return cnv;
}

export function downloadNickCard(text) {
  if (!text || !String(text).trim()) { toast("먼저 글자를 입력하세요", "warn"); return; }
  downloadCanvas(nickCardCanvas(text), "geulkkumi-card.png");
}
