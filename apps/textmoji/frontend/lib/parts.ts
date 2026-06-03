/**
 * 부품 라이브러리 — 전부 "데이터 배열". (idea-textmoji §3.1)
 *
 * 텍스트 이모티콘 = 슬롯(눈/입/볼·괄호/팔/소품/장식)에 문자를 끼워 조립한 것.
 * 새 트렌드 부품은 이 배열에 항목만 추가하면 즉시 생성에 합류한다(코드 수정 0).
 *
 * mirror: 좌우 대칭 생성 시 반대편에 쓸 글자(예 ">"→"<", "╯"→"╰", "ʕ"→"ʔ").
 *         mirror가 없으면 좌우 동일(대칭) 글자로 간주한다.
 * tier  : 그 부품 자체의 호환성 등급(safety.ts 휴리스틱과 정합하도록 손으로 보수적 지정).
 *         완성 문자열의 최종 등급은 estimateTier(전체)로 다시 산정하므로 이건 가중·필터용 힌트.
 */
import type { SafetyTier } from "./safety";

export type PartSlot =
  | "face" // 볼·윤곽 괄호 (ʕ ʔ ( ) （ ）)
  | "eye" // 눈 (좌우 공통 풀, 미러 적용)
  | "mouth" // 입·코
  | "arm" // 팔
  | "item" // 손·소품·액션
  | "deco"; // 장식(분위기)

export interface TextPart {
  id: string;
  slot: PartSlot;
  glyph: string;
  mirror?: string;
  tier: SafetyTier;
  tags?: string[];
}

/** 슬롯별 부품 풀. id로 감정 프리셋이 참조한다. */
export const PARTS: TextPart[] = [
  // ── 눈(eye) — 좌우 미러 가능. 감정의 핵심 ──
  { id: "eye-dot", slot: "eye", glyph: "•", tier: "safe", tags: ["기본", "또렷"] },
  { id: "eye-caret", slot: "eye", glyph: "^", tier: "safe", tags: ["웃는", "기쁨"] },
  { id: "eye-gt", slot: "eye", glyph: ">", mirror: "<", tier: "safe", tags: ["질끈", "당황"] },
  { id: "eye-T", slot: "eye", glyph: "T", tier: "safe", tags: ["우는", "슬픔"] },
  { id: "eye-at", slot: "eye", glyph: "@", tier: "safe", tags: ["어지러운", "멍"] },
  { id: "eye-o", slot: "eye", glyph: "o", mirror: "o", tier: "safe", tags: ["놀란", "동그란"] },
  { id: "eye-O", slot: "eye", glyph: "O", tier: "safe", tags: ["놀란", "큰"] },
  { id: "eye-dash", slot: "eye", glyph: "-", tier: "safe", tags: ["무표정", "시크"] },
  { id: "eye-x", slot: "eye", glyph: "x", tier: "safe", tags: ["기절", "장난"] },
  { id: "eye-bullseye", slot: "eye", glyph: "◕", tier: "ok", tags: ["또렷", "귀여운"] },
  { id: "eye-circ", slot: "eye", glyph: "⊙", tier: "ok", tags: ["멍", "놀란"] },
  { id: "eye-arc", slot: "eye", glyph: "ᵔ", tier: "ok", tags: ["웃는", "흐뭇"] },
  { id: "eye-deg", slot: "eye", glyph: "°", tier: "ok", tags: ["멍", "놀란"] },
  { id: "eye-macron", slot: "eye", glyph: "￣", tier: "ok", tags: ["시크", "무표정"] },
  { id: "eye-up", slot: "eye", glyph: "＾", tier: "ok", tags: ["웃는"] },
  { id: "eye-cry", slot: "eye", glyph: "╥", mirror: "╥", tier: "ok", tags: ["우는", "슬픔"] },
  { id: "eye-curl", slot: "eye", glyph: "≧", mirror: "≦", tier: "ok", tags: ["질끈", "감격"] },
  { id: "eye-tick", slot: "eye", glyph: "╹", tier: "ok", tags: ["또렷", "당당"] },
  { id: "eye-dotS", slot: "eye", glyph: "๑", tier: "fancy", tags: ["귀여운", "화려"] },

  // ── 입·코(mouth) ──
  { id: "mouth-bear", slot: "mouth", glyph: "ᴥ", tier: "ok", tags: ["곰", "동물상"] },
  { id: "mouth-omega", slot: "mouth", glyph: "ω", tier: "ok", tags: ["고양이", "동물상"] },
  { id: "mouth-cat", slot: "mouth", glyph: "ᗢ", tier: "fancy", tags: ["고양이", "화려"] },
  { id: "mouth-smile", slot: "mouth", glyph: "‿", tier: "ok", tags: ["사람상", "웃는"] },
  { id: "mouth-under", slot: "mouth", glyph: "_", tier: "safe", tags: ["무표정", "기본"] },
  { id: "mouth-dot", slot: "mouth", glyph: ".", tier: "safe", tags: ["작은", "시크"] },
  { id: "mouth-3", slot: "mouth", glyph: "3", tier: "safe", tags: ["뽀뽀", "장난"] },
  { id: "mouth-D", slot: "mouth", glyph: "D", tier: "safe", tags: ["활짝", "기쁨"] },
  { id: "mouth-O", slot: "mouth", glyph: "O", tier: "safe", tags: ["놀란", "외침"] },
  { id: "mouth-v", slot: "mouth", glyph: "▽", tier: "ok", tags: ["활짝", "기쁨"] },
  { id: "mouth-flat2", slot: "mouth", glyph: "﹏", tier: "fancy", tags: ["시무룩", "물결"] },
  { id: "mouth-DD", slot: "mouth", glyph: "Д", tier: "ok", tags: ["충격", "외침"] },
  { id: "mouth-eps", slot: "mouth", glyph: "ε", tier: "ok", tags: ["뽀뽀", "장난"] },
  { id: "mouth-sq", slot: "mouth", glyph: "□", tier: "ok", tags: ["충격", "놀란"] },

  // ── 볼·윤곽 괄호(face) — 미러 쌍 ──
  { id: "face-paren", slot: "face", glyph: "(", mirror: ")", tier: "safe", tags: ["기본"] },
  { id: "face-fw", slot: "face", glyph: "（", mirror: "）", tier: "ok", tags: ["전각", "또렷"] },
  { id: "face-bear", slot: "face", glyph: "ʕ", mirror: "ʔ", tier: "ok", tags: ["곰", "동물상"] },
  { id: "face-tort", slot: "face", glyph: "〔", mirror: "〕", tier: "ok", tags: ["각진"] },
  { id: "face-jp", slot: "face", glyph: "｡", mirror: "｡", tier: "ok", tags: ["볼터치", "귀여운"] },
  { id: "face-curveL", slot: "face", glyph: "╰", mirror: "╯", tier: "ok", tags: ["둥근"] },

  // ── 팔(arm) — 액션형. 미러로 좌우 균형 ──
  { id: "arm-throwL", slot: "arm", glyph: "╯", mirror: "╰", tier: "ok", tags: ["던지기", "화남"] },
  { id: "arm-hugL", slot: "arm", glyph: "つ", mirror: "づ", tier: "ok", tags: ["안기", "사랑"] },
  { id: "arm-waveL", slot: "arm", glyph: "ノ", mirror: "ヽ", tier: "ok", tags: ["인사", "흔들"] },
  { id: "arm-slashL", slot: "arm", glyph: "/", mirror: "\\", tier: "safe", tags: ["만세", "기쁨"] },
  { id: "arm-handL", slot: "arm", glyph: "o", mirror: "o", tier: "safe", tags: ["손", "기본"] },
  { id: "arm-flexL", slot: "arm", glyph: "୧", mirror: "୨", tier: "fancy", tags: ["만세", "화이팅"] },

  // ── 손·소품·액션(item) — 슬롯 바깥에 붙는 효과 ──
  { id: "item-flip", slot: "item", glyph: "︵ ┻━┻", tier: "fancy", tags: ["책상뒤집기", "화남"] },
  { id: "item-heart", slot: "item", glyph: "♡", tier: "ok", tags: ["하트", "사랑"] },
  { id: "item-star", slot: "item", glyph: "☆", tier: "ok", tags: ["별", "신남"] },
  { id: "item-flower", slot: "item", glyph: "✿", tier: "fancy", tags: ["꽃", "장식"] },
  { id: "item-sun", slot: "item", glyph: "☞", mirror: "☜", tier: "ok", tags: ["손가락", "지목"] },

  // ── 장식(deco) — 분위기 강화 ──
  { id: "deco-spark", slot: "deco", glyph: "✧", tier: "fancy", tags: ["반짝", "화려"] },
  { id: "deco-heart", slot: "deco", glyph: "♡", tier: "ok", tags: ["하트", "사랑"] },
  { id: "deco-heartF", slot: "deco", glyph: "♥", tier: "safe", tags: ["하트", "사랑"] },
  { id: "deco-star", slot: "deco", glyph: "★", tier: "ok", tags: ["별", "신남"] },
  { id: "deco-tilde", slot: "deco", glyph: "~", tier: "safe", tags: ["흐뭇", "여유"] },
  { id: "deco-dots", slot: "deco", glyph: "…", tier: "safe", tags: ["침묵", "시크"] },
  { id: "deco-bang", slot: "deco", glyph: "!!", tier: "safe", tags: ["강조", "놀람"] },
  { id: "deco-note", slot: "deco", glyph: "♪", tier: "safe", tags: ["흥얼", "신남"] },
  { id: "deco-sweat", slot: "deco", glyph: ";;", tier: "safe", tags: ["땀", "당황"] },
];

/** id → 부품 (빠른 조회) */
export const PART_BY_ID: Record<string, TextPart> = Object.fromEntries(
  PARTS.map((p) => [p.id, p])
);

/** 미러 글자를 돌려준다(없으면 원본 = 대칭 글자) */
export function mirrorGlyph(part: TextPart): string {
  return part.mirror ?? part.glyph;
}
