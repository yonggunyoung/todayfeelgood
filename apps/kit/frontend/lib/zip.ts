/**
 * 최소 ZIP(STORE, 무압축) 라이터 — 외부 의존성 0. 스티커앱(apps/sticker/lib/zip.ts)의
 * 자체 구현을 참고했으나, 키트는 PNG(dataURL)뿐 아니라 텍스트(CSS/README/LICENSE)와
 * 폰트 바이너리(base64)도 함께 담아야 하므로 "바이트 엔트리" 단위로 일반화했다.
 *
 * 압축하지 않으므로 코드가 작고(서버 0), PNG·폰트는 이미 압축돼 있어 손해가 적다.
 * 텍스트는 STORE라 약간 커질 수 있으나 키트 텍스트 파일은 수 KB 수준이라 무시 가능.
 * CRC32만 직접 계산한다.
 */

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

interface Entry {
  name: string;
  data: Uint8Array;
}

/** dataURL(또는 순수 base64) → Uint8Array */
export function base64ToBytes(input: string): Uint8Array {
  const base64 = input.includes(",") ? input.split(",")[1] ?? "" : input;
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** UTF-8 문자열 → Uint8Array (CSS/README/LICENSE 텍스트 파일용) */
export function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** 키트 ZIP에 담는 한 파일. text(우선) 또는 base64/dataUrl 중 하나를 준다. */
export interface ZipFile {
  name: string;
  text?: string;
  /** dataURL 또는 순수 base64 (PNG·폰트 바이너리) */
  base64?: string;
}

/** 파일 목록을 STORE 방식 ZIP Blob으로 만든다. */
export function makeZip(files: ZipFile[]): Blob {
  const entries: Entry[] = files.map((f) => ({
    name: f.name,
    data:
      f.text !== undefined
        ? textToBytes(f.text)
        : base64ToBytes(f.base64 ?? ""),
  }));

  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBytes = encoder.encode(e.name);
    const crc = crc32(e.data);
    const size = e.data.length;

    // Local file header
    const lh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // version
    lv.setUint16(6, 0, true); // flags
    lv.setUint16(8, 0, true); // method STORE
    lv.setUint16(10, 0, true); // time
    lv.setUint16(12, 0, true); // date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    lh.set(nameBytes, 30);
    localParts.push(lh, e.data);

    // Central directory header
    const ch = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true); // file name length
    cv.setUint16(30, 0, true); // extra field length
    cv.setUint16(32, 0, true); // comment length
    cv.setUint16(34, 0, true); // disk number start
    cv.setUint16(36, 0, true); // internal attrs
    cv.setUint32(38, 0, true); // external attrs
    cv.setUint32(42, offset, true); // local header offset
    ch.set(nameBytes, 46);
    centralParts.push(ch);

    offset += lh.length + e.data.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const centralOffset = offset;

  // End of central directory
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralOffset, true);

  // 모든 조각을 하나의 ArrayBuffer 백킹 Uint8Array로 합쳐 Blob 타입 호환 문제를 피한다.
  const all = [...localParts, ...centralParts, eocd];
  const total = all.reduce((s, p) => s + p.length, 0);
  const buffer = new ArrayBuffer(total);
  const merged = new Uint8Array(buffer);
  let pos = 0;
  for (const part of all) {
    merged.set(part, pos);
    pos += part.length;
  }
  return new Blob([buffer], { type: "application/zip" });
}

/** Blob 다운로드 트리거 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
