/**
 * 트렌드/밈 프리셋 — 프론트 전용 데이터(STYLE_PRESETS(core)는 건드리지 않는다).
 *
 * 기획서 §3.5 "밈·트렌드 내장": 트렌드는 빨리 바뀌므로 코드 수정 없이
 * **이 배열에 한 줄 추가**하는 것만으로 새 무드를 늘릴 수 있게 둔다.
 * params는 FontParams의 부분집합 — 적용 시 기존 값 위에 덮어쓴다(clampParams가 가드).
 *
 * 주의: 밈 IP/저작권·토스 정책 회피를 위해 특정 브랜드/캐릭터명을 쓰지 않고
 * "감성/무드"로만 표현한다(라벨도 일반 명사).
 */
import type { FontParams } from "@webapp/core";

export interface TrendPreset {
  id: string;
  /** 칩에 보일 짧은 라벨(이모지 1개까지 허용 — 트렌드 감성 전달용) */
  label: string;
  /** 무엇을 노린 무드인지 한 줄(접근성 title/aria로도 활용) */
  hint: string;
  params: Partial<FontParams>;
}

export const TREND_PRESETS: TrendPreset[] = [
  {
    id: "y2k",
    label: "Y2K 버블",
    hint: "둥글둥글 통통한 2000년대 감성",
    params: {
      weight: 760,
      slant: 0,
      curvature: 0.9,
      roundness: 0.9,
      waviness: 0.2,
      letterSpacing: 0.02,
      weirdness: 8,
    },
  },
  {
    id: "vaporwave",
    label: "바이브 늘어짐",
    hint: "느슨하게 늘어진 자간의 레트로 무드",
    params: {
      weight: 360,
      slant: -3,
      curvature: 0.2,
      contrast: 0.2,
      letterSpacing: 0.45,
      weirdness: 4,
    },
  },
  {
    id: "doodle",
    label: "낙서 짤",
    hint: "삐뚤빼뚤 손맛 가득한 밈 낙서체",
    params: {
      weight: 540,
      slant: -5,
      curvature: 0.7,
      waviness: 0.4,
      waveFreq: 3,
      weirdness: 78,
    },
  },
  {
    id: "chunky",
    label: "두툼 임팩트",
    hint: "꽉 찬 두께로 한 방 먹이는 헤드라인",
    params: {
      weight: 880,
      slant: 0,
      curvature: 0,
      contrast: 0.15,
      roundness: 0.2,
      letterSpacing: -0.03,
      weirdness: 0,
    },
  },
  {
    id: "glitch",
    label: "글리치 깨짐",
    hint: "흔들리고 어긋난 디지털 노이즈 감성",
    params: {
      weight: 620,
      slant: -2,
      curvature: 0.1,
      waviness: 0.65,
      waveFreq: 5.5,
      weirdness: 92,
      letterSpacing: 0.08,
    },
  },
  {
    id: "soft",
    label: "말랑 다이어리",
    hint: "포근한 손글씨 다이어리 무드",
    params: {
      weight: 380,
      slant: -7,
      curvature: 0.55,
      cursive: 0.6,
      waviness: 0.2,
      roundness: 0.5,
      contrast: 0.2,
    },
  },
];
