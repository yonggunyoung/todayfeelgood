/* 글꾸미 — OG 이미지(og.png 1200×630) 생성기.
 * 래스터 도구(rsvg/convert/headless)가 없는 환경에서 순수 Node(zlib)로 PNG를 직접 인코딩.
 * 파스텔 그라데이션 배경 + 핑크→바이올렛 라운드 마크 + 흰 4점 스파클(텍스트 없음).
 * 사용: node tools/make-og.mjs   → og.png 갱신.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const W = 1200, H = 630;

// CRC32
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

const BG_A = [0xff, 0xe3, 0xf3], BG_B = [0xec, 0xe8, 0xff];
const MK_A = [0xff, 0x5f, 0xa2], MK_B = [0x8b, 0x7b, 0xff];

// 라운드 사각형 내부 판정
function inRoundRect(x, y, rx, ry, rw, rh, rr) {
  if (x < rx || x > rx + rw || y < ry || y > ry + rh) return false;
  const ix = x < rx + rr ? rx + rr : x > rx + rw - rr ? rx + rw - rr : x;
  const iy = y < ry + rr ? ry + rr : y > ry + rh - rr ? ry + rh - rr : y;
  const dx = x - ix, dy = y - iy;
  return dx * dx + dy * dy <= rr * rr;
}
// 4점 스파클(아스트로이드) 내부 판정
function inSparkle(dx, dy, R) {
  const u = Math.abs(dx) / R, v = Math.abs(dy) / R;
  return Math.sqrt(u) + Math.sqrt(v) <= 1;
}

const MX = 130, MY = 235, MS = 160, MR = 42;       // 마크 위치/크기/라운드
const CX = MX + MS / 2, CY = MY + MS / 2, SPK = 64; // 스파클 중심/반경
const dots = [[300, 150, 9], [1080, 470, 12], [980, 120, 7], [200, 520, 6]]; // 장식 점

function px(x, y) {
  // 배경 대각 그라데이션
  let col = mix(BG_A, BG_B, (x / W + y / H) / 2);
  // 장식 점(연한 흰빛)
  for (const [dx, dy, dr] of dots) {
    if ((x - dx) ** 2 + (y - dy) ** 2 <= dr * dr) col = mix(col, [255, 255, 255], 0.6);
  }
  // 마크(라운드 사각, 핑크→바이올렛)
  if (inRoundRect(x, y, MX, MY, MS, MS, MR)) {
    col = mix(MK_A, MK_B, ((x - MX) + (y - MY)) / (MS * 2));
    if (inSparkle(x - CX, y - CY, SPK)) col = [255, 255, 255]; // 흰 스파클
  }
  return col;
}

// 픽셀 → 필터(0) 스캔라인 → zlib
const raw = Buffer.alloc((W * 3 + 1) * H);
let p = 0;
for (let y = 0; y < H; y++) {
  raw[p++] = 0;
  for (let x = 0; x < W; x++) { const c = px(x, y); raw[p++] = c[0]; raw[p++] = c[1]; raw[p++] = c[2]; }
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
]);

const out = new URL("../og.png", import.meta.url);
writeFileSync(out, png);
console.log(`og.png written: ${png.length} bytes (${W}×${H})`);
