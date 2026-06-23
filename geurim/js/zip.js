// 그림공장 — 의존성 0 ZIP 작성기 (store 방식, 무압축).
// PNG/JPEG는 이미 압축돼 있어 store만으로 충분하다. CRC32 + 로컬헤더 + 중앙디렉터리만 구현.
// 순수 함수(Uint8Array 입출력) → node 테스트 가능. (TextEncoder는 브라우저·node 공통)

// CRC32 (IEEE 802.3) 테이블 — 1회 생성 후 재사용
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const u16 = (n) => [n & 0xff, (n >>> 8) & 0xff];
const u32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

/**
 * 파일 목록 → ZIP 바이트(Uint8Array).
 * @param {{name:string, bytes:Uint8Array}[]} files
 * @returns {Uint8Array}
 */
export function makeZip(files) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = f.bytes;
    const crc = crc32(data);
    const size = data.length;

    // 로컬 파일 헤더 (시그니처 0x04034b50)
    const local = [
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), // ver, flags, method(0=store)
      ...u16(0), ...u16(0),                                  // mtime, mdate (0)
      ...u32(crc), ...u32(size), ...u32(size),               // crc, comp size, uncomp size
      ...u16(nameBytes.length), ...u16(0),                   // name len, extra len
    ];
    chunks.push(new Uint8Array(local), nameBytes, data);

    // 중앙 디렉터리 항목 (시그니처 0x02014b50)
    central.push([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0),
      ...u32(crc), ...u32(size), ...u32(size),
      ...u16(nameBytes.length), ...u16(0), ...u16(0),        // name, extra, comment len
      ...u16(0), ...u16(0), ...u32(0),                       // disk#, int attr, ext attr
      ...u32(offset),                                        // 로컬헤더 오프셋
    ]);
    central.push(nameBytes);

    offset += local.length + nameBytes.length + size;
  }

  // 중앙 디렉터리 직렬화
  const centralChunks = [];
  let centralSize = 0;
  for (const c of central) {
    const arr = c instanceof Uint8Array ? c : new Uint8Array(c);
    centralChunks.push(arr);
    centralSize += arr.length;
  }

  // EOCD (시그니처 0x06054b50)
  const eocd = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0),
    ...u16(files.length), ...u16(files.length),
    ...u32(centralSize), ...u32(offset), ...u16(0),
  ]);

  // 합치기
  const total = offset + centralSize + eocd.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  for (const c of centralChunks) { out.set(c, p); p += c.length; }
  out.set(eocd, p);
  return out;
}

// base64(data URL의 base64 부분) → Uint8Array
export function b64ToBytes(b64) {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  // 브라우저: atob / node: Buffer
  if (typeof atob === 'function') {
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(clean, 'base64'));
}
