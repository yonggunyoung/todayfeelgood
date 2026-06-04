/**
 * 감정 카테고리 — 데이터 배열(트렌드 감정도 항목 추가만으로). (idea-textmoji §3.2)
 *
 * 각 감정은 슬롯별 "선호 부품 id 풀"을 가진다. 생성기는 이 풀에서 시드로 골라 조립한다.
 * 풀에 없는 슬롯은 생성 시 채우지 않는다(예: 무표정은 deco를 비워 담백하게).
 * trend=true 면 칩을 좌측 우선 노출(시의성으로 재방문 유도).
 */
import type { PartSlot } from "./parts";

export interface EmotionCat {
  id: string;
  label: string;
  emoji: string; // 칩 아이콘 대용
  trend?: boolean;
  keywords: string[]; // 검색 매칭(한국어 우선)
  prefer: Partial<Record<PartSlot, string[]>>;
}

export const EMOTIONS: EmotionCat[] = [
  {
    id: "joy",
    label: "기쁨",
    emoji: "😄",
    keywords: ["기쁨", "좋아", "행복", "웃는", "신남"],
    prefer: {
      eye: ["eye-caret", "eye-up", "eye-arc", "eye-bullseye"],
      mouth: ["mouth-smile", "mouth-v", "mouth-D"],
      face: ["face-paren", "face-fw"],
      deco: ["deco-spark", "deco-star", "deco-note"],
    },
  },
  {
    id: "love",
    label: "사랑",
    emoji: "🥰",
    keywords: ["사랑", "하트", "좋아해", "설렘", "뽀뽀"],
    prefer: {
      eye: ["eye-arc", "eye-bullseye", "eye-curl"],
      mouth: ["mouth-smile", "mouth-3", "mouth-eps"],
      face: ["face-paren", "face-jp"],
      item: ["item-heart"],
      deco: ["deco-heart", "deco-heartF", "deco-spark"],
    },
  },
  {
    id: "sad",
    label: "슬픔",
    emoji: "😢",
    keywords: ["슬픔", "우는", "눈물", "흑흑", "우울"],
    prefer: {
      eye: ["eye-T", "eye-cry", "eye-gt"],
      mouth: ["mouth-under", "mouth-flat2", "mouth-dot"],
      face: ["face-paren", "face-fw"],
      deco: ["deco-dots", "deco-sweat"],
    },
  },
  {
    id: "angry",
    label: "화남",
    emoji: "😠",
    trend: true,
    keywords: ["화남", "분노", "킹받음", "빡침", "책상뒤집기"],
    prefer: {
      eye: ["eye-gt", "eye-tick", "eye-dash"],
      mouth: ["mouth-DD", "mouth-under", "mouth-sq"],
      face: ["face-fw", "face-tort"],
      arm: ["arm-throwL"],
      item: ["item-flip"],
      deco: ["deco-bang"],
    },
  },
  {
    id: "surprise",
    label: "놀람",
    emoji: "😮",
    keywords: ["놀람", "헉", "충격", "당황", "깜짝"],
    prefer: {
      eye: ["eye-O", "eye-circ", "eye-deg", "eye-o"],
      mouth: ["mouth-O", "mouth-sq", "mouth-DD"],
      face: ["face-paren", "face-fw"],
      deco: ["deco-bang", "deco-sweat"],
    },
  },
  {
    id: "cute",
    label: "귀여움",
    emoji: "🐻",
    keywords: ["귀여움", "곰", "동물", "깜찍", "애교"],
    prefer: {
      eye: ["eye-bullseye", "eye-dot", "eye-arc"],
      mouth: ["mouth-bear", "mouth-omega", "mouth-cat"],
      face: ["face-bear", "face-jp"],
      deco: ["deco-spark", "deco-heart"],
    },
  },
  {
    id: "chic",
    label: "시크",
    emoji: "😎",
    keywords: ["시크", "무심", "쿨", "도도", "여유"],
    prefer: {
      eye: ["eye-dash", "eye-macron", "eye-tick"],
      mouth: ["mouth-under", "mouth-dot", "mouth-flat2"],
      face: ["face-paren", "face-tort"],
      deco: ["deco-dots", "deco-tilde"],
    },
  },
  {
    id: "embarrassed",
    label: "민망",
    emoji: "😅",
    keywords: ["민망", "당황", "어색", "식은땀", "헤헤"],
    prefer: {
      eye: ["eye-gt", "eye-caret", "eye-x"],
      mouth: ["mouth-under", "mouth-smile", "mouth-dot"],
      face: ["face-paren", "face-jp"],
      deco: ["deco-sweat", "deco-dots"],
    },
  },
  {
    id: "blank",
    label: "무표정",
    emoji: "😐",
    keywords: ["무표정", "멍", "노잼", "현타", "공허"],
    prefer: {
      eye: ["eye-dot", "eye-dash", "eye-deg"],
      mouth: ["mouth-under", "mouth-dot"],
      face: ["face-paren", "face-fw"],
    },
  },
  {
    id: "play",
    label: "장난",
    emoji: "😜",
    keywords: ["장난", "메롱", "익살", "윙크", "ㅋㅋ"],
    prefer: {
      eye: ["eye-caret", "eye-x", "eye-gt"],
      mouth: ["mouth-3", "mouth-eps", "mouth-D"],
      face: ["face-paren", "face-fw"],
      item: ["item-sun"],
      deco: ["deco-note", "deco-spark"],
    },
  },
  {
    id: "hi",
    label: "인사",
    emoji: "👋",
    keywords: ["인사", "안녕", "하이", "바이", "손흔들"],
    prefer: {
      eye: ["eye-caret", "eye-dot", "eye-up"],
      mouth: ["mouth-smile", "mouth-D"],
      face: ["face-paren", "face-fw"],
      arm: ["arm-waveL", "arm-slashL"],
      deco: ["deco-tilde", "deco-spark"],
    },
  },
  {
    id: "proud",
    label: "뿌듯",
    emoji: "😤",
    keywords: ["뿌듯", "당당", "화이팅", "자신감", "만세"],
    prefer: {
      eye: ["eye-tick", "eye-caret", "eye-bullseye"],
      mouth: ["mouth-v", "mouth-D", "mouth-smile"],
      face: ["face-paren", "face-fw"],
      arm: ["arm-flexL", "arm-slashL"],
      deco: ["deco-star", "deco-bang"],
    },
  },
  {
    id: "sleepy",
    label: "졸림",
    emoji: "😴",
    keywords: ["졸림", "잠", "피곤", "노곤", "꾸벅"],
    prefer: {
      eye: ["eye-eq", "eye-semi", "eye-dash"],
      mouth: ["mouth-under", "mouth-dot", "mouth-wave"],
      face: ["face-paren", "face-cloud"],
      deco: ["deco-zzz", "deco-dots"],
    },
  },
  {
    id: "flutter",
    label: "심쿵",
    emoji: "💗",
    trend: true,
    keywords: ["심쿵", "설렘", "두근", "반함", "좋아"],
    prefer: {
      eye: ["eye-heart", "eye-sparkle", "eye-arc"],
      mouth: ["mouth-heart", "mouth-3", "mouth-smile"],
      face: ["face-paren", "face-jp"],
      item: ["item-heart"],
      deco: ["deco-heart", "deco-flutter", "deco-spark"],
    },
  },
  {
    id: "lol",
    label: "빵터짐",
    emoji: "🤣",
    trend: true,
    keywords: ["빵터짐", "현웃", "ㅋㅋ", "웃겨", "박장대소"],
    prefer: {
      eye: ["eye-curl", "eye-x", "eye-gt"],
      mouth: ["mouth-D", "mouth-w", "mouth-v"],
      face: ["face-fw", "face-bracket"],
      arm: ["arm-raiseL"],
      deco: ["deco-kkk", "deco-bang"],
    },
  },
  {
    id: "shy",
    label: "부끄",
    emoji: "☺️",
    keywords: ["부끄", "수줍", "볼빨", "쑥스", "헤헤"],
    prefer: {
      eye: ["eye-gt", "eye-semi", "eye-arc"],
      mouth: ["mouth-smile", "mouth-dot", "mouth-under"],
      face: ["face-jp", "face-paren"],
      deco: ["deco-heart", "deco-tilde"],
    },
  },
  {
    id: "shrug",
    label: "글쎄",
    emoji: "🤷",
    keywords: ["글쎄", "으쓱", "몰라", "애매", "갸웃"],
    prefer: {
      eye: ["eye-dash", "eye-dot", "eye-tilde"],
      mouth: ["mouth-under", "mouth-dot"],
      face: ["face-paren", "face-fw"],
      arm: ["arm-shrugL"],
      deco: ["deco-dots", "deco-q"],
    },
  },
  {
    id: "cry",
    label: "오열",
    emoji: "😭",
    trend: true,
    keywords: ["오열", "대성통곡", "펑펑", "눈물", "흑흑"],
    prefer: {
      eye: ["eye-cry", "eye-T", "eye-curl"],
      mouth: ["mouth-tri", "mouth-DD", "mouth-O"],
      face: ["face-fw", "face-paren"],
      deco: ["deco-heug", "deco-sweat"],
    },
  },
];

/** id → 감정 */
export const EMOTION_BY_ID: Record<string, EmotionCat> = Object.fromEntries(
  EMOTIONS.map((e) => [e.id, e])
);
