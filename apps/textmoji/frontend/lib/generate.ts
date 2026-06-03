/**
 * 조합 생성 엔진 — 가치 게이트를 통과하는 "유일한 코어". (idea-textmoji §3.2, 우선순위 1)
 *
 * "검색으로 못 찾는, 방금 만든 나만의 조합"을 시드로 절차적으로 만든다.
 * 부품(데이터) × 감정 × 스타일 + mulberry32 시드 → 좌우대칭/액션형 텍스트 이모티콘.
 * 서버 0·비용 0·외부 호출 0. 전부 클라에서 문자열 조립.
 *
 * 정직성: 모든 결과는 source="generated" + 안전등급(estimateTier 재산정)을 항상 포함한다.
 * 하드 필터: 괄호 불균형·선두 결합문자(깨짐)면 폐기 후 다른 시드로 재시도.
 */
import { makeRng, pick } from "./rng";
import {
  PART_BY_ID,
  PARTS,
  mirrorGlyph,
  type PartSlot,
  type TextPart,
} from "./parts";
import { EMOTION_BY_ID } from "./emotions";
import { estimateTier, isWellFormed, worseTier, type SafetyTier } from "./safety";

/** 생성 스타일 축(칩 토글) */
export interface TextmojiStyle {
  animalFace: boolean; // 동물상(곰 괄호/ᴥ) 선호
  fancy: number; // deco 개수 0~2 (심플~화려)
  action: boolean; // 팔/소품 액션형
  symmetric: boolean; // 좌우 대칭(미러)
}

export const DEFAULT_STYLE: TextmojiStyle = {
  animalFace: false,
  fancy: 1,
  action: false,
  symmetric: true,
};

/** 생성/큐레이션 공통 결과 항목 */
export interface TextmojiItem {
  text: string;
  tier: SafetyTier;
  seed?: number;
  emotion?: string;
  source: "curated" | "generated";
  parts?: string[];
}

/** 감정 풀에서 슬롯 후보를 가져오되, 비면 전체 부품에서 슬롯으로 보충 */
function slotPool(emotionId: string, slot: PartSlot): TextPart[] {
  const emo = EMOTION_BY_ID[emotionId];
  const ids = emo?.prefer[slot] ?? [];
  const fromPrefer = ids
    .map((id) => PART_BY_ID[id])
    .filter((p): p is TextPart => Boolean(p));
  if (fromPrefer.length) return fromPrefer;
  return PARTS.filter((p) => p.slot === slot);
}

/** maxTier 필터: 후보를 허용 등급 이하로 거른다(없으면 원본 유지해 빈손 방지) */
function withinTier(parts: TextPart[], maxTier?: SafetyTier): TextPart[] {
  if (!maxTier) return parts;
  const ok = parts.filter((p) => worseTier(p.tier, maxTier) === maxTier);
  return ok.length ? ok : parts;
}

export interface GenOptions {
  emotion: string;
  style: TextmojiStyle;
  seed: number;
  maxTier?: SafetyTier;
}

/** 한 개 생성(필터 통과 못 하면 null) */
function buildOne(opts: GenOptions): TextmojiItem | null {
  const { emotion, style, seed, maxTier } = opts;
  const rng = makeRng(seed);

  // 동물상 선호 시 face/mouth 풀을 동물 부품 우선으로 좁힌다
  const animalIds = new Set(["face-bear", "mouth-bear", "mouth-omega", "mouth-cat"]);

  const facePool0 = withinTier(slotPool(emotion, "face"), maxTier);
  const facePool = style.animalFace
    ? facePool0.filter((p) => animalIds.has(p.id) || facePool0.length === 1) || facePool0
    : facePool0;
  const face = pick(rng, facePool.length ? facePool : facePool0);

  const eyePool = withinTier(slotPool(emotion, "eye"), maxTier);
  const mouthPool0 = withinTier(slotPool(emotion, "mouth"), maxTier);
  const mouthPool = style.animalFace
    ? mouthPool0.filter((p) => animalIds.has(p.id))
    : mouthPool0;
  const mouth = pick(rng, mouthPool.length ? mouthPool : mouthPool0);

  // 눈: 비대칭이면 좌우 다른 부품, 대칭이면 한 부품 미러
  const eyeL = pick(rng, eyePool);
  const eyeR = style.symmetric ? eyeL : (pick(rng, eyePool) ?? eyeL);
  if (!face || !mouth || !eyeL || !eyeR) return null;

  const usedParts: string[] = [face.id, eyeL.id, mouth.id, eyeR.id];

  // 얼굴 안쪽 조립: [왼눈][입][오른눈], 대칭이면 미러된 오른눈
  const leftEyeGlyph = eyeL.glyph;
  const rightEyeGlyph = style.symmetric ? mirrorGlyph(eyeL) : eyeR.glyph;
  const inner = `${leftEyeGlyph}${mouth.glyph}${rightEyeGlyph}`;

  // 괄호로 감싸기
  let core = `${face.glyph}${inner}${mirrorGlyph(face)}`;

  // 팔(액션형) — 미러로 좌우 균형
  if (style.action) {
    const armPool = withinTier(slotPool(emotion, "arm"), maxTier);
    const arm = pick(rng, armPool.length ? armPool : PARTS.filter((p) => p.slot === "arm"));
    if (arm) {
      core = `${mirrorGlyph(arm)}${core}${arm.glyph}`;
      usedParts.push(arm.id);
    }
    // 가끔 손/소품(item)을 한쪽에
    const itemPool = withinTier(slotPool(emotion, "item"), maxTier);
    if (itemPool.length && rng() < 0.5) {
      const item = pick(rng, itemPool);
      if (item) {
        core = `${core}${item.glyph}`;
        usedParts.push(item.id);
      }
    }
  }

  // 장식(fancy 개수만큼)
  const decoPool = withinTier(slotPool(emotion, "deco"), maxTier);
  const decoCount = Math.max(0, Math.min(2, style.fancy));
  let decoStr = "";
  for (let i = 0; i < decoCount && decoPool.length; i++) {
    const d = pick(rng, decoPool);
    if (d) {
      decoStr += d.glyph;
      usedParts.push(d.id);
    }
  }
  const text = decoStr ? `${core} ${decoStr}` : core;

  if (!isWellFormed(text)) return null;
  const tier = estimateTier(text);
  if (maxTier && worseTier(tier, maxTier) !== maxTier) return null;

  return { text, tier, seed, emotion, source: "generated", parts: usedParts };
}

/**
 * 한 시드 그리드용 세트 생성. 중복 텍스트는 건너뛰고, 필터에 막히면 시드를 증분해 재시도.
 * baseSeed 가 같으면 항상 같은 세트(재현·공유).
 */
export function generateSet(
  emotion: string,
  style: TextmojiStyle,
  baseSeed: number,
  count: number,
  maxTier?: SafetyTier
): TextmojiItem[] {
  const out: TextmojiItem[] = [];
  const seen = new Set<string>();
  // baseSeed에서 결정적으로 파생된 시드들을 순회(최대 count*8회 시도)
  let s = baseSeed >>> 0;
  for (let tries = 0; out.length < count && tries < count * 8; tries++) {
    s = (s * 1664525 + 1013904223) >>> 0; // LCG로 시드 파생(결정적)
    const item = buildOne({ emotion, style, seed: s, maxTier });
    if (!item || seen.has(item.text)) continue;
    seen.add(item.text);
    out.push(item);
  }
  return out;
}

/** 단일 결과 재현(공유 URL ?e&s&seed 등) */
export function generateOne(
  emotion: string,
  style: TextmojiStyle,
  seed: number,
  maxTier?: SafetyTier
): TextmojiItem | null {
  return buildOne({ emotion, style, seed, maxTier });
}
