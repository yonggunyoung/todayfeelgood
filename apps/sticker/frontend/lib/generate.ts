/**
 * 변주 세트 생성기 — 입력 1장 + 시드 → N종 스티커.
 *
 * 해자: 감정(12) × 팔레트(6) × 템플릿(4) × 시드 흔들기 = 곱연산 다양성.
 * 시드 기반이라 재현·공유 가능하고, 주사위로 "또 다른 세트"를 발견한다(의외성).
 */
import {
  COLOR_PALETTES,
  EMOTION_PRESETS,
  MEME_TEMPLATES,
  type ColorPalette,
  type EmotionPreset,
  type MemeTemplate,
} from "./presets";
import {
  cropToContent,
  renderTile,
  renderTileFromLayers,
  type CharLayers,
  type FaceAnchor,
} from "./render";
import { makeRng, pick } from "./rng";

export interface GeneratedItem {
  id: string;
  emotionId: string;
  label: string;
  paletteId: string;
  templateId: string;
  dataUrl: string;
}

export interface GenerateConfig {
  size: number;
  seed: number;
  tintStrength: number;
  outlineScale: number;
  /** 색을 세트 전체에서 섞을지(다양). false면 한 팔레트로 통일 */
  varyColor: boolean;
  /** 고정 팔레트(varyColor=false일 때) */
  fixedPaletteId?: string;
  /** 밈 템플릿을 섞을지 */
  varyTemplate: boolean;
  fixedTemplateId?: string;
  /** 캡션 텍스트 사용자 입력(빈값이면 감정별 기본 캡션) */
  caption?: string;
  /** 생성할 감정 id 목록(없으면 전체 12종) */
  emotionIds?: string[];
  /** 눈·입 위치(본체 정규화 0~1). 없으면 기본 앵커(상단 중앙 가정). */
  anchor?: FaceAnchor;
}

export const DEFAULT_CONFIG: GenerateConfig = {
  size: 512,
  seed: 1,
  tintStrength: 0.55,
  outlineScale: 1,
  varyColor: true,
  varyTemplate: true,
  fixedTemplateId: "chip",
  caption: "",
};

function emotionsFor(cfg: GenerateConfig): EmotionPreset[] {
  if (cfg.emotionIds && cfg.emotionIds.length) {
    const map = new Map(EMOTION_PRESETS.map((e) => [e.id, e]));
    return cfg.emotionIds.map((id) => map.get(id)).filter(Boolean) as EmotionPreset[];
  }
  return EMOTION_PRESETS;
}

/** 그린 원본(흰배경) 캔버스를 받아 변주 세트를 만든다. 동기 처리(서버 0). */
export function generateSet(
  source: HTMLCanvasElement,
  cfg: GenerateConfig
): { items: GeneratedItem[]; isEmpty: boolean } {
  const { canvas: base, isEmpty } = cropToContent(source, true);
  if (isEmpty) return { items: [], isEmpty: true };

  const emotions = emotionsFor(cfg);
  const rng = makeRng(cfg.seed);
  const fixedPalette =
    COLOR_PALETTES.find((p) => p.id === cfg.fixedPaletteId) ?? COLOR_PALETTES[0]!;
  const fixedTemplate =
    MEME_TEMPLATES.find((t) => t.id === cfg.fixedTemplateId) ?? MEME_TEMPLATES[1]!;

  const items: GeneratedItem[] = [];
  emotions.forEach((emotion, i) => {
    const palette: ColorPalette = cfg.varyColor
      ? pick(rng, COLOR_PALETTES)
      : fixedPalette;
    const template: MemeTemplate = cfg.varyTemplate
      ? pick(rng, MEME_TEMPLATES)
      : fixedTemplate;
    // 타일마다 시드를 흔들어 데코 배치에 의외성을 준다(재현 유지).
    const tileSeed = (cfg.seed * 2654435761 + i * 40503) >>> 0;
    const dataUrl = renderTile({
      base,
      emotion,
      palette,
      template,
      size: cfg.size,
      seed: tileSeed,
      tintStrength: cfg.tintStrength,
      outlineScale: cfg.outlineScale,
      caption: cfg.caption,
      anchor: cfg.anchor,
    });
    items.push({
      id: `${emotion.id}-${i}`,
      emotionId: emotion.id,
      label: emotion.label,
      paletteId: palette.id,
      templateId: template.id,
      dataUrl,
    });
  });

  return { items, isEmpty: false };
}

/**
 * 부위별 레이어(윤곽·눈·입) → 표정 세트 생성.
 * 표정마다 눈·입 레이어를 변형해 합성한다(사용자가 그린 실제 부위 사용).
 */
export function generateSetFromLayers(
  layers: CharLayers,
  srcSize: number,
  cfg: GenerateConfig
): { items: GeneratedItem[] } {
  const emotions = emotionsFor(cfg);
  const rng = makeRng(cfg.seed);
  const fixedPalette =
    COLOR_PALETTES.find((p) => p.id === cfg.fixedPaletteId) ?? COLOR_PALETTES[0]!;
  const fixedTemplate =
    MEME_TEMPLATES.find((t) => t.id === cfg.fixedTemplateId) ?? MEME_TEMPLATES[1]!;
  const items: GeneratedItem[] = [];
  emotions.forEach((emotion, i) => {
    const palette = cfg.varyColor ? pick(rng, COLOR_PALETTES) : fixedPalette;
    const template = cfg.varyTemplate ? pick(rng, MEME_TEMPLATES) : fixedTemplate;
    const tileSeed = (cfg.seed * 2654435761 + i * 40503) >>> 0;
    const dataUrl = renderTileFromLayers({
      layers,
      srcSize,
      emotion,
      palette,
      template,
      size: cfg.size,
      seed: tileSeed,
      tintStrength: cfg.tintStrength,
      outlineScale: cfg.outlineScale,
      caption: cfg.caption,
    });
    items.push({
      id: `${emotion.id}-${i}`,
      emotionId: emotion.id,
      label: emotion.label,
      paletteId: palette.id,
      templateId: template.id,
      dataUrl,
    });
  });
  return { items };
}
