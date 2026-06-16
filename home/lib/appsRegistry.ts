// 자동 생성 파일 — 직접 수정 금지. 원본: /apps.json · 생성: infra/scripts/sync-apps.mjs
export interface AppEntry {
  id: string;
  path: string;
  type: "next" | "static" | "external";
  status: "live" | "soon";
  featured: boolean;
  emoji?: string;
  color?: string;
  nameKo: string;
  nameEn: string;
  descKo: string;
  descEn: string;
  keywords: string[];
  port?: number;
}

export const APPS: AppEntry[] = [
  {
    "id": "font",
    "path": "/font",
    "type": "next",
    "port": 3001,
    "status": "live",
    "featured": true,
    "emoji": "✍️",
    "color": "var(--candy-coral)",
    "nameKo": "폰트공방",
    "nameEn": "Font Workshop",
    "descKo": "내 손글씨가 진짜 폰트로 · 무료",
    "descEn": "Turn your handwriting into a real font · Free",
    "keywords": [
      "폰트",
      "글씨",
      "손글씨",
      "글씨체",
      "ttf",
      "woff",
      "font",
      "handwriting",
      "type"
    ]
  },
  {
    "id": "textmoji",
    "path": "/textmoji",
    "type": "next",
    "port": 3005,
    "status": "live",
    "featured": true,
    "emoji": "ʕ•ᴥ•ʔ",
    "color": "var(--candy-plum)",
    "nameKo": "이모티콘공방",
    "nameEn": "Emoticon Workshop",
    "descKo": "카오모지·특수문자·인싸폰트 원탭 복사",
    "descEn": "Kaomoji, symbols & fancy fonts, one-tap copy",
    "keywords": [
      "이모티콘",
      "이모지",
      "카오모지",
      "텍스트",
      "emoji",
      "emoticon",
      "kaomoji"
    ]
  },
  {
    "id": "gwangclick",
    "path": "/gwangclick",
    "type": "static",
    "status": "live",
    "featured": false,
    "emoji": "⚡",
    "color": "#0a0b0d",
    "nameKo": "광클대전",
    "nameEn": "Click Battle",
    "descKo": "민초 vs 반민초? 오늘의 떡밥에 60초 광클!",
    "descEn": "Pick your side and speed-click for 60 seconds!",
    "keywords": [
      "광클",
      "클릭",
      "게임",
      "광클대전",
      "민초",
      "game",
      "click",
      "speed",
      "tap"
    ]
  },
  {
    "id": "naengbiseo",
    "path": "https://yonggunyoung.github.io/todayfeelgood/",
    "type": "external",
    "status": "live",
    "featured": false,
    "emoji": "🧊",
    "color": "#2f9e6e",
    "nameKo": "냉비서",
    "nameEn": "Fridge Butler",
    "descKo": "영수증으로 냉장고 등록 · 오늘의 레시피 추천",
    "descEn": "Snap a receipt to stock your fridge · daily recipes",
    "keywords": [
      "냉장고",
      "레시피",
      "영수증",
      "요리",
      "장보기",
      "fridge",
      "recipe",
      "receipt"
    ]
  }
];
