// ZIP/CRC32 단위 테스트 — node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32, makeZip, b64ToBytes } from '../js/zip.js';
import { planChunks } from '../js/batch.js';

test('crc32: 표준 검증 벡터 "123456789" = 0xCBF43926', () => {
  const bytes = new TextEncoder().encode('123456789');
  assert.equal(crc32(bytes) >>> 0, 0xcbf43926);
});

test('makeZip: 로컬헤더/EOCD 시그니처와 항목 수', () => {
  const enc = new TextEncoder();
  const zip = makeZip([
    { name: 'a.txt', bytes: enc.encode('hello') },
    { name: 'b.txt', bytes: enc.encode('world!') },
  ]);
  assert.ok(zip instanceof Uint8Array && zip.length > 0);
  // 로컬 파일 헤더 시그니처 PK\x03\x04
  assert.deepEqual([...zip.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  // EOCD 시그니처 PK\x05\x06 가 끝부분에 존재 + 항목 수 2
  const eocdStart = zip.length - 22;
  assert.deepEqual([...zip.slice(eocdStart, eocdStart + 4)], [0x50, 0x4b, 0x05, 0x06]);
  const totalEntries = zip[eocdStart + 10] | (zip[eocdStart + 11] << 8);
  assert.equal(totalEntries, 2);
});

test('b64ToBytes: base64 → 바이트', () => {
  const bytes = b64ToBytes('aGk='); // "hi"
  assert.deepEqual([...bytes], [104, 105]);
  // data URL 접두어도 처리
  assert.deepEqual([...b64ToBytes('data:image/png;base64,aGk=')], [104, 105]);
});

test('planChunks: 호출당 장수에 맞춰 청크 분해', () => {
  // dall-e-3 (perCall=1) 4장 → 4청크
  assert.equal(planChunks('dall-e-3', 4, 'p', false).length, 4);
  // imagen (perCall=4) 10장 → 4+4+2 = 3청크
  const c = planChunks('imagen-4.0-generate-001', 10, 'p', false);
  assert.equal(c.length, 3);
  assert.deepEqual(c.map((x) => x.n), [4, 4, 2]);
  // gpt-image-1 (perCall=10) 4장 → 1청크
  assert.equal(planChunks('gpt-image-1', 4, 'p', false).length, 1);
});
