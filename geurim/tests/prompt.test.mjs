// 프롬프트 빌더 단위 테스트 — node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, variantPrompt, clampPrompt } from '../js/prompt.js';

test('buildPrompt: 주제 + 선택을 순서대로 조립', () => {
  const p = buildPrompt({ subject: 'a cat', styleKind: 'photo', mood: 'soft', shot: 'portrait', palette: 'vivid', boosters: ['highres'] });
  assert.ok(p.startsWith('a cat,'), '주제가 맨 앞');
  assert.match(p, /photorealistic photograph/);
  assert.match(p, /portrait shot/);
  assert.match(p, /soft natural lighting/);
  assert.match(p, /vivid saturated colors/);
  assert.match(p, /high resolution/);
});

test('buildPrompt: 빈 선택은 빈 문자열', () => {
  assert.equal(buildPrompt({}), '');
  assert.equal(buildPrompt({ subject: '   ' }), '');
});

test('buildPrompt: 중복 조각 제거', () => {
  const p = buildPrompt({ subject: 'sunset', extra: 'sunset' });
  assert.equal(p, 'sunset'); // extra가 subject와 같으면 한 번만
});

test('buildPrompt: 알 수 없는 id는 무시', () => {
  const p = buildPrompt({ subject: 'x', styleKind: 'NOPE', mood: 'soft' });
  assert.equal(p, 'x, soft natural lighting');
});

test('variantPrompt: index 0 또는 vary=false면 원본', () => {
  assert.equal(variantPrompt('p', 0, true), 'p');
  assert.equal(variantPrompt('p', 3, false), 'p');
  const v = variantPrompt('p', 1, true);
  assert.notEqual(v, 'p');
  assert.ok(v.startsWith('p, '));
});

test('clampPrompt: 최대 길이 초과 시 마지막 콤마 단위로 자름', () => {
  const long = Array.from({ length: 500 }, (_, i) => `tag${i}`).join(', ');
  const c = clampPrompt(long, 100);
  assert.ok(c.length <= 100);
  assert.ok(!c.endsWith(','));
});
