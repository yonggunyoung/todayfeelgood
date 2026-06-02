/**
 * 스티커 생성기 — 데이터 정의(프리셋/팔레트/템플릿).
 *
 * 해자(다양성·의외성) 원칙: 표정·색·데코·템플릿을 전부 "데이터 배열"로 둔다.
 * 새 감정/팔레트/밈 템플릿은 이 파일에 항목만 추가하면 즉시 변주에 합류한다(코드 수정 불요).
 * 모든 생성은 절차적(비AI). 정직성 라벨은 항상 "자동 합성(procedural)".
 */

/** 눈 모양 키 — render.ts의 drawEyes가 해석 */
export type EyeStyle =
  | "open" // 또렷한 눈
  | "wink" // 윙크(한쪽 감음)
  | "happy" // 웃는 호(^ ^)
  | "heart" // 하트눈
  | "star" // 반짝 별눈
  | "sad" // 처진 눈 + 눈물
  | "angry" // 치켜뜬 눈
  | "surprised" // 큰 눈
  | "sleepy" // 감은 눈(졸림)
  | "dizzy"; // @ @ 어지러움

/** 입 모양 키 — render.ts의 drawMouth가 해석 */
export type MouthStyle =
  | "smile"
  | "grin" // 활짝(이 보임)
  | "open" // 동그란 입(놀람/외침)
  | "frown" // 시무룩
  | "cat" // ω 고양이 입
  | "tongue" // 혀 빼꼼
  | "flat" // 무표정 직선
  | "kiss"; // 쪽

/** 데코 키 — 얼굴 주변 장식 */
export type DecoStyle =
  | "blush" // 볼터치
  | "sparkle" // 반짝이
  | "tear" // 눈물 한 방울
  | "anger" // 화남 핏줄(+)
  | "hearts" // 둥둥 하트
  | "sweat" // 땀
  | "note"; // 음표(흥얼)

/** 모션 프리셋(비AI 변환 기반). 현재 MVP는 정지 PNG가 기본이고, kind는 의외성 라벨로 표시. */
export type MotionKind = "none" | "bounce" | "shake" | "blink" | "pulse";

export interface EmotionPreset {
  id: string;
  label: string; // UI 표시(한국어)
  emoji: string; // 칩 아이콘 대용
  eyes: EyeStyle;
  mouth: MouthStyle;
  deco: DecoStyle[];
  caption?: string; // 밈 감성 기본 캡션(템플릿이 캡션 칸 쓸 때)
  motion?: MotionKind;
}

/**
 * 감정 프리셋 — 기본 12종(기쁨/슬픔/사랑/분노/놀람/윙크/졸림/OK/화이팅/뽀뽀/멍/신남).
 * 데이터만 추가하면 변주 세트가 늘어난다.
 */
export const EMOTION_PRESETS: EmotionPreset[] = [
  { id: "joy", label: "기쁨", emoji: "😄", eyes: "happy", mouth: "grin", deco: ["blush"], caption: "좋아!", motion: "bounce" },
  { id: "love", label: "사랑", emoji: "😍", eyes: "heart", mouth: "smile", deco: ["hearts", "blush"], caption: "♥", motion: "pulse" },
  { id: "wink", label: "윙크", emoji: "😉", eyes: "wink", mouth: "smile", deco: ["sparkle"], caption: "찡긋", motion: "blink" },
  { id: "sad", label: "슬픔", emoji: "😢", eyes: "sad", mouth: "frown", deco: ["tear"], caption: "흑흑", motion: "none" },
  { id: "angry", label: "화남", emoji: "😠", eyes: "angry", mouth: "flat", deco: ["anger"], caption: "흥!", motion: "shake" },
  { id: "surprise", label: "놀람", emoji: "😮", eyes: "surprised", mouth: "open", deco: ["sweat"], caption: "헉", motion: "shake" },
  { id: "star", label: "신남", emoji: "🤩", eyes: "star", mouth: "grin", deco: ["sparkle", "note"], caption: "최고!", motion: "bounce" },
  { id: "sleepy", label: "졸림", emoji: "😴", eyes: "sleepy", mouth: "flat", deco: ["sweat"], caption: "쿨…", motion: "none" },
  { id: "ok", label: "오케이", emoji: "👌", eyes: "happy", mouth: "smile", deco: [], caption: "ㅇㅋ", motion: "none" },
  { id: "fighting", label: "화이팅", emoji: "💪", eyes: "open", mouth: "grin", deco: ["sparkle"], caption: "화이팅!", motion: "bounce" },
  { id: "kiss", label: "뽀뽀", emoji: "😘", eyes: "wink", mouth: "kiss", deco: ["hearts"], caption: "쪽", motion: "pulse" },
  { id: "blank", label: "멍", emoji: "😐", eyes: "dizzy", mouth: "cat", deco: [], caption: "...", motion: "none" },
];

/** 무료 세트 최대 크기(의외성 그리드 한 화면). */
export const MAX_STICKER_SET_SIZE = 12;

/**
 * 색 팔레트 — 같은 캐릭터를 다른 색감으로 변주(HSV 스왑 대용으로 본체/배경/외곽 묶음 제공).
 * 색지·캔디 톤에 맞춘 즐거운 조합.
 */
export interface ColorPalette {
  id: string;
  label: string;
  body: string; // 본체 채움
  bg: string; // 둥근 배경 칩
  outline: string; // 외곽선
}

export const COLOR_PALETTES: ColorPalette[] = [
  { id: "coral", label: "코랄", body: "#ef7a52", bg: "#ffe3d6", outline: "#ffffff" },
  { id: "mint", label: "민트", body: "#46b39a", bg: "#d6f3ec", outline: "#ffffff" },
  { id: "butter", label: "버터", body: "#f5c451", bg: "#fff3d4", outline: "#ffffff" },
  { id: "plum", label: "자두", body: "#b65a6e", bg: "#f4dde3", outline: "#ffffff" },
  { id: "sky", label: "하늘", body: "#5b9bd5", bg: "#dceafa", outline: "#ffffff" },
  { id: "ink", label: "먹", body: "#3a3742", bg: "#e9e6e0", outline: "#ffffff" },
];

/**
 * 밈·트렌드 템플릿 — 정사각 짤/이모티콘 감성. 전부 데이터로 정의해 쉽게 추가.
 * caption: 캡션 노출 여부 / captionPos: 위/아래 / outlineWidth: 스티커화 외곽선 두께.
 */
export interface MemeTemplate {
  id: string;
  label: string;
  desc: string;
  showBgChip: boolean; // 둥근 배경 칩
  outlineWidth: number; // 알파 외곽 흰 테두리(px, 360 기준)
  caption: boolean; // 캡션 텍스트 표시
  captionPos: "top" | "bottom";
  captionBold: boolean; // 굵은 밈 외곽선 캡션
}

export const MEME_TEMPLATES: MemeTemplate[] = [
  {
    id: "plain",
    label: "심플",
    desc: "캐릭터만 깔끔하게. 투명 PNG.",
    showBgChip: false,
    outlineWidth: 10,
    caption: false,
    captionPos: "bottom",
    captionBold: false,
  },
  {
    id: "chip",
    label: "둥근 칩",
    desc: "둥근 파스텔 배경 칩 위에. 이모티콘 느낌.",
    showBgChip: true,
    outlineWidth: 0,
    caption: false,
    captionPos: "bottom",
    captionBold: false,
  },
  {
    id: "meme",
    label: "짤 캡션",
    desc: "굵은 외곽선 캡션이 아래에. 밈/짤 감성.",
    showBgChip: false,
    outlineWidth: 12,
    caption: true,
    captionPos: "bottom",
    captionBold: true,
  },
  {
    id: "top-caption",
    label: "위 캡션",
    desc: "한 마디를 위에. 인사·맞장구 스티커.",
    showBgChip: true,
    outlineWidth: 0,
    caption: true,
    captionPos: "top",
    captionBold: false,
  },
];

/** 내보내기 크기 프리셋(공유 대상별). 수치는 배포 전 각 플랫폼 가이드 재확인 필요(가정 포함). */
export interface SharePreset {
  id: string;
  label: string;
  size: number; // 정사각 px
  note: string;
}

export const SHARE_PRESETS: SharePreset[] = [
  { id: "universal512", label: "범용 512", size: 512, note: "어디서나(인스타·텔레그램 등)" },
  { id: "kakao360", label: "카톡 360", size: 360, note: "카카오 이모티콘 향(가정)" },
  { id: "discord128", label: "디스코드 128", size: 128, note: "커스텀 이모지 작은 용량(가정)" },
];
