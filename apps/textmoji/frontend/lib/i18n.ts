/**
 * 텍스트모지 앱 번역 사전 — UI 문자열(ko/en) + 데이터 라벨 영어 오버레이.
 *
 * 방침: 데이터 파일(emotions/symbols/decorate/fonts)은 그대로 두고, 여기서 id 기준
 *       영어 라벨/검색어를 덧씌운다(데이터 churn·충돌 0). 서버가 locale 로 사전을 골라
 *       클라이언트(스튜디오)엔 prop 으로 내려준다.
 */
import type { Locale } from "@webapp/i18n";

export type { Locale };

export interface TextmojiDict {
  meta: {
    rootTitle: string;
    rootTemplate: string;
    rootDescription: string;
    appName: string;
    landingTitle: string;
    landingDescription: string;
    landingKeywords: string[];
    studioTitle: string;
    studioDescription: string;
    jsonLdDescription: string;
  };
  chrome: {
    brandSub: string;
    brandAria: string;
    exitLabel: string;
    exitMessage: string;
    footerColophon: string;
    footerFineprint: string;
  };
  landing: {
    headerCta: string;
    eyebrow: string;
    headline: string;
    lede: string;
    primaryCta: string;
    secondaryCta: string;
    previewAria: string;
    previewTape: string;
    previewNote: string;
    bandAria: string;
    bandSticker: string;
    step1Num: string;
    step1Title: string;
    step1Body: string;
    step2Num: string;
    step2Title: string;
    step2Body: string;
    step3Num: string;
    step3Title: string;
    step3Body: string;
    howTitle: string;
    howBody: string;
    howCta: string;
  };
  studio: {
    modes: Record<string, string>;
    contentKindsAria: string;
    searchKaomojiPh: string;
    searchSymbolPh: string;
    searchAria: string;
    diceMakeMore: string;
    diceMakeMoreTitle: string;
    diceOtherCombo: string;
    diceOtherComboTitle: string;
    emotionCatsAria: string;
    styleAria: string;
    styleAnimal: string;
    styleAction: string;
    styleSymmetric: string;
    styleDeco: string;
    hot: string;
    symbolCatsAria: string;
    fontInputPh: string;
    fontInputAria: string;
    decorateInputPh: string;
    decorateInputAria: string;
    decorateThemesAria: string;
    decorateOptionsAria: string;
    kaomojiOn: string;
    kaomojiOff: string;
    decoHint: string;
    decoMoreBtn: string;
    fontHonest: string;
    emptyFav: string;
    emptyNone: string;
    copyTitle: string;
    copySuffix: string;
    starAdd: string;
    starRemove: string;
    moreBtnSuffix: string; // "<emotion> 더 만들기"
    moreBtnPrefix: string;
    viewSwitchAria: string;
    tabAll: string;
    tabFav: string;
    toastCopied: string;
    toastCopyFail: string;
  };
}

const ko: TextmojiDict = {
  meta: {
    rootTitle: "텍스트 이모티콘공방 — 방금 만든 나만의 조합",
    rootTemplate: "%s · 텍스트 이모티콘공방",
    rootDescription:
      "검색해도 안 나오는, 방금 만든 나만의 텍스트 이모티콘. 감정·스타일을 고르면 절차적으로 무한 조합하고 호환성 안전등급으로 걸러 원탭 복사. 서버 없이 브라우저에서 바로.",
    appName: "텍스트 이모티콘공방",
    landingTitle: "텍스트 이모티콘공방 — 방금 만든 나만의 조합 · 카오모지 만들기",
    landingDescription:
      "검색해도 안 나오는, 방금 만든 나만의 텍스트 이모티콘. 감정·스타일을 고르면 절차적으로 무한 조합하고 호환성 안전등급(🟢🟡🔴)으로 걸러 원탭 복사. 카톡·인스타·디스코드에 바로(비AI, 서버 없음).",
    landingKeywords: [
      "텍스트 이모티콘",
      "감정 이모티콘",
      "카오모지 만들기",
      "이모티콘 조합",
      "특수문자 이모티콘",
    ],
    studioTitle: "텍스트 이모티콘·특수문자·인싸폰트 — 원탭 복사",
    studioDescription:
      "카오모지(감정별)·특수문자/꾸밈 기호·인싸폰트 변환을 한 곳에서. 입력한 글자를 𝓯𝓪𝓷𝓬𝔂·Ⓒⓘⓡⓒⓛⓔ로 즉시 변환하고, 별·하트·화살표·구분선까지 탭 한 번에 복사. 즐겨찾기·검색 지원.",
    jsonLdDescription:
      "감정·스타일을 시드로 절차 생성하고 호환성 안전등급으로 걸러 원탭 복사하는 텍스트 이모티콘 생성기(비AI, 브라우저 완결).",
  },
  chrome: {
    brandSub: "텍스트 이모티콘공방",
    brandAria: "획 — 도구공방으로",
    exitLabel: "나가기",
    exitMessage: "뚝딱 홈으로 나갑니다. 도구공방에서 완전히 나가요. 계속할까요?",
    footerColophon: "획 텍스트 이모티콘공방 — 검색해도 안 나오는, 방금 만든 나만의 조합.",
    footerFineprint:
      "안전등급은 추정치예요. 상대 기기·앱에선 □로 깨질 수 있어요. 만든 조합은 이 브라우저 밖으로 안 나가요.",
  },
  landing: {
    headerCta: "만들러 가기",
    eyebrow: "검색으로 못 찾는, 방금 만든 나만의 조합",
    headline: "나만의 텍스트 이모티콘, 조합으로 만들어",
    lede: "복붙 리스트엔 없는 걸 만들어. 감정·스타일을 고르면 눈·입·팔·괄호를 절차적으로 조합해 무한히 뽑고, 깨질 확률은 안전등급(🟢🟡🔴)으로 미리 알려줘. 탭 한 번에 복사해 카톡에 써 너굴.",
    primaryCta: "조합 만들러 가기",
    secondaryCta: "어떻게 만드나요?",
    previewAria: "텍스트 이모티콘 조합 미리보기",
    previewTape: "조합 미리보기",
    previewNote: "부품을 조합해 매번 새로운 표정",
    bandAria: "만드는 흐름",
    bandSticker: "비AI · 무료",
    step1Num: "고르기",
    step1Title: "① 감정·스타일",
    step1Body: "기쁨·화남·곰·시크… 감정 칩과 동물상·액션형·대칭 스타일을 톡톡.",
    step2Num: "조합",
    step2Title: "② 절차 생성",
    step2Body: "부품을 시드로 조합해 그리드 한가득. 🎲 더 만들기로 매번 새 조합.",
    step3Num: "복사",
    step3Title: "③ 안전등급 + 원탭",
    step3Body: "🟢🟡🔴로 깨짐을 미리 알려주고, 탭 한 번에 복사. 즐겨찾기는 ★.",
    howTitle: "안전등급은 참고용 추정치예요",
    howBody:
      "부품을 규칙으로 조합해 만들어요. 안전등급은 유니코드 휴리스틱으로 추정한 값이라, 같은 글자도 상대 기기·앱·폰트에 따라 □로 깨질 수 있어요. 그래서 🟢 안전부터 권하고, 만든 조합은 이 브라우저 밖으로 안 나가요. 같은 시드면 같은 조합이 다시 나와요.",
    howCta: "만들러 가기 →",
  },
  studio: {
    modes: {
      decorate: "꾸미기",
      kaomoji: "카오모지",
      symbol: "특수기호",
      font: "인싸폰트",
    },
    contentKindsAria: "콘텐츠 종류",
    searchKaomojiPh: "감정·키워드 검색 (곰, 우는, 하트…)",
    searchSymbolPh: "기호 검색 (별, 화살표, 하트…)",
    searchAria: "검색",
    diceMakeMore: "더 만들기 — 새 조합 생성",
    diceMakeMoreTitle: "🎲 더 만들기",
    diceOtherCombo: "다른 조합으로",
    diceOtherComboTitle: "🎲 다른 조합",
    emotionCatsAria: "감정 카테고리",
    styleAria: "생성 스타일",
    styleAnimal: "동물상",
    styleAction: "액션형",
    styleSymmetric: "좌우대칭",
    styleDeco: "장식",
    hot: "·HOT",
    symbolCatsAria: "기호 카테고리",
    fontInputPh: "여기에 영어·숫자를 입력하면 폰트로 변환돼요",
    fontInputAria: "인싸폰트로 변환할 글자",
    decorateInputPh: "이름·한줄소개를 넣으면 꾸며 줘요 (한글 OK)",
    decorateInputAria: "꾸밀 글자",
    decorateThemesAria: "꾸미기 테마",
    decorateOptionsAria: "꾸미기 옵션",
    kaomojiOn: "카오모지 ✓",
    kaomojiOff: "카오모지",
    decoHint: "마음에 드는 줄을 탭하면 복사돼요. 🎲로 다른 조합도 뽑아 봐요.",
    decoMoreBtn: "🎲 다른 조합 더 보기",
    fontHonest: "인싸폰트는 영어·숫자만 변환돼요. 일부 기기·앱에선 다르게 보일 수 있어요.",
    emptyFav: "아직 즐겨찾기가 없어 너굴. 마음에 드는 카드의 ☆를 눌러 봐.",
    emptyNone: "조건에 맞는 게 없어 너굴. 다른 검색어나 카테고리를 골라 봐.",
    copyTitle: "탭하면 복사",
    copySuffix: "복사",
    starAdd: "즐겨찾기",
    starRemove: "즐겨찾기 해제",
    moreBtnPrefix: "🎲 ",
    moreBtnSuffix: " 더 만들기",
    viewSwitchAria: "보기 전환",
    tabAll: "전체",
    tabFav: "★ 즐겨찾기",
    toastCopied: "복사했다 너굴! 붙여넣기 해 봐 ✨",
    toastCopyFail: "복사 실패… 길게 눌러 직접 복사해 줘.",
  },
};

const en: TextmojiDict = {
  meta: {
    rootTitle: "Textmoji Studio — your own combo, just made",
    rootTemplate: "%s · Textmoji Studio",
    rootDescription:
      "Text emoticons you won't find in any list — made fresh, just now. Pick a mood and style, get endless procedural combos filtered by a compatibility safety grade, and copy in one tap. No server, right in your browser.",
    appName: "Textmoji Studio",
    landingTitle: "Textmoji Studio — make your own kaomoji & text emoticons",
    landingDescription:
      "Text emoticons you won't find by searching — made fresh, just now. Pick a mood and style for endless procedural combos, filtered by a compatibility safety grade (🟢🟡🔴), copied in one tap. Straight into chat, Instagram, Discord (no AI, no server).",
    landingKeywords: [
      "text emoticons",
      "kaomoji maker",
      "make kaomoji",
      "emoticon generator",
      "fancy text symbols",
    ],
    studioTitle: "Text emoticons, symbols & fancy fonts — one-tap copy",
    studioDescription:
      "Kaomoji (by mood), special characters & decorations, and fancy-font conversion in one place. Turn your text into 𝓯𝓪𝓷𝓬𝔂·Ⓒⓘⓡⓒⓛⓔ instantly, and copy stars, hearts, arrows and dividers in one tap. Favorites & search included.",
    jsonLdDescription:
      "A text-emoticon generator that procedurally builds combos from a seed, filters them by a compatibility safety grade, and copies in one tap (no AI, fully in-browser).",
  },
  chrome: {
    brandSub: "Textmoji Studio",
    brandAria: "Hoek — back to the toolshop",
    exitLabel: "Exit",
    exitMessage: "Leaving for the Ddukkik home. You'll exit the toolshop completely. Continue?",
    footerColophon: "Hoek Textmoji Studio — your own combo you won't find by searching, made just now.",
    footerFineprint:
      "Safety grades are estimates. They may render as □ on the recipient's device or app. Combos you make never leave this browser.",
  },
  landing: {
    headerCta: "Start making",
    eyebrow: "Your own combo — the kind you can't find by searching",
    headline: "Make your own text emoticons, by combination",
    lede: "Make what no copy-paste list has. Pick a mood and style, and eyes, mouths, arms and brackets are combined procedurally into endless results — with a safety grade (🟢🟡🔴) telling you up front how likely it is to break. Copy in one tap and use it anywhere.",
    primaryCta: "Start making combos",
    secondaryCta: "How does it work?",
    previewAria: "Text emoticon combo preview",
    previewTape: "Combo preview",
    previewNote: "New expressions every time, from combined parts",
    bandAria: "How it works",
    bandSticker: "No AI · Free",
    step1Num: "Pick",
    step1Title: "① Mood & style",
    step1Body: "Joy, anger, bear, chic… tap a mood chip plus animal / action / symmetric styles.",
    step2Num: "Combine",
    step2Title: "② Procedural generation",
    step2Body: "Parts combine from a seed to fill the grid. 🎲 Make more for a fresh combo every time.",
    step3Num: "Copy",
    step3Title: "③ Safety grade + one tap",
    step3Body: "🟢🟡🔴 warn you about breakage up front, then copy in one tap. Favorite with ★.",
    howTitle: "Safety grades are estimates, for reference",
    howBody:
      "We build combos from parts by rules. The safety grade is estimated with Unicode heuristics, so the same glyph can still render as □ depending on the other device, app or font. That's why we suggest 🟢 safe ones first — and combos you make never leave this browser. Same seed, same combo, every time.",
    howCta: "Start making →",
  },
  studio: {
    modes: {
      decorate: "Decorate",
      kaomoji: "Kaomoji",
      symbol: "Symbols",
      font: "Fancy font",
    },
    contentKindsAria: "Content type",
    searchKaomojiPh: "Search moods & keywords (bear, crying, heart…)",
    searchSymbolPh: "Search symbols (star, arrow, heart…)",
    searchAria: "Search",
    diceMakeMore: "Make more — generate a new combo",
    diceMakeMoreTitle: "🎲 Make more",
    diceOtherCombo: "Another combo",
    diceOtherComboTitle: "🎲 Another combo",
    emotionCatsAria: "Mood categories",
    styleAria: "Generation style",
    styleAnimal: "Animal",
    styleAction: "Action",
    styleSymmetric: "Symmetric",
    styleDeco: "Deco",
    hot: "·HOT",
    symbolCatsAria: "Symbol categories",
    fontInputPh: "Type letters or numbers here to convert them into fancy fonts",
    fontInputAria: "Text to convert to fancy fonts",
    decorateInputPh: "Enter a name or one-line bio and we'll decorate it",
    decorateInputAria: "Text to decorate",
    decorateThemesAria: "Decoration themes",
    decorateOptionsAria: "Decoration options",
    kaomojiOn: "Kaomoji ✓",
    kaomojiOff: "Kaomoji",
    decoHint: "Tap a line you like to copy it. Hit 🎲 for other combos.",
    decoMoreBtn: "🎲 More combos",
    fontHonest: "Fancy fonts only convert letters and numbers. Some devices or apps may show them differently.",
    emptyFav: "No favorites yet. Tap the ☆ on a card you like.",
    emptyNone: "Nothing matches. Try a different keyword or category.",
    copyTitle: "Tap to copy",
    copySuffix: "copy",
    starAdd: "Favorite",
    starRemove: "Remove favorite",
    moreBtnPrefix: "🎲 More ",
    moreBtnSuffix: "",
    viewSwitchAria: "Switch view",
    tabAll: "All",
    tabFav: "★ Favorites",
    toastCopied: "Copied! Paste it anywhere ✨",
    toastCopyFail: "Copy failed… press and hold to copy manually.",
  },
};

export const DICT: Record<Locale, TextmojiDict> = { ko, en };

export function getDict(locale: Locale): TextmojiDict {
  return DICT[locale] ?? ko;
}

// ── 데이터 라벨 영어 오버레이(id 기준) — 데이터 파일은 그대로 두고 여기서 덧씌운다 ──

/** 감정 카테고리: 영어 라벨 + 영어 검색어. */
export const EMOTION_EN: Record<string, { label: string; keywords: string[] }> = {
  joy: { label: "Joy", keywords: ["joy", "happy", "glad", "smile", "excited"] },
  love: { label: "Love", keywords: ["love", "heart", "crush", "flutter", "kiss"] },
  sad: { label: "Sad", keywords: ["sad", "cry", "tears", "down", "gloomy"] },
  angry: { label: "Angry", keywords: ["angry", "rage", "mad", "furious", "flip"] },
  surprise: { label: "Surprise", keywords: ["surprise", "shock", "whoa", "startled", "wow"] },
  cute: { label: "Cute", keywords: ["cute", "bear", "animal", "adorable", "aegyo"] },
  chic: { label: "Chic", keywords: ["chic", "cool", "aloof", "calm", "nonchalant"] },
  embarrassed: { label: "Awkward", keywords: ["awkward", "embarrassed", "sweat", "hehe", "cringe"] },
  blank: { label: "Blank", keywords: ["blank", "neutral", "meh", "empty", "dazed"] },
  play: { label: "Playful", keywords: ["playful", "tease", "wink", "silly", "lol"] },
  hi: { label: "Hi", keywords: ["hi", "hello", "hey", "bye", "wave"] },
  proud: { label: "Proud", keywords: ["proud", "confident", "fighting", "yay", "strong"] },
  sleepy: { label: "Sleepy", keywords: ["sleepy", "sleep", "tired", "drowsy", "nap"] },
  flutter: { label: "Smitten", keywords: ["smitten", "flutter", "heart", "crush", "love"] },
  lol: { label: "LOL", keywords: ["lol", "laugh", "funny", "haha", "rofl"] },
  shy: { label: "Shy", keywords: ["shy", "bashful", "blush", "timid", "hehe"] },
  shrug: { label: "Shrug", keywords: ["shrug", "dunno", "whatever", "meh", "unsure"] },
  cry: { label: "Sobbing", keywords: ["sobbing", "bawling", "cry", "tears", "weeping"] },
};

/** 특수기호 카테고리: 영어 라벨 + 영어 검색어. */
export const SYMBOL_EN: Record<string, { label: string; keywords: string[] }> = {
  deco: { label: "Deco · dividers", keywords: ["deco", "divider", "line", "instagram", "profile", "border"] },
  heart: { label: "Hearts", keywords: ["heart", "love", "hearts"] },
  star: { label: "Stars · sparkle", keywords: ["star", "sparkle", "shine", "twinkle"] },
  arrow: { label: "Arrows", keywords: ["arrow", "direction", "pointer"] },
  bracket: { label: "Brackets", keywords: ["bracket", "quote", "emphasis"] },
  shape: { label: "Shapes", keywords: ["shape", "square", "circle", "triangle"] },
  dot: { label: "Dots · lines", keywords: ["dot", "line", "point", "divider"] },
  circleNum: { label: "Circled · numbers", keywords: ["number", "circled", "digit", "numeral"] },
  math: { label: "Math · units", keywords: ["math", "unit", "symbol", "percent"] },
  currency: { label: "Currency · marks", keywords: ["currency", "money", "copyright", "trademark"] },
  music: { label: "Music · weather", keywords: ["music", "note", "weather", "moon", "sun", "cloud"] },
  jamo: { label: "Hangul jamo", keywords: ["hangul", "jamo", "consonant", "vowel", "kkk"] },
};

/** 꾸미기 테마: 영어 라벨. */
export const THEME_EN: Record<string, string> = {
  cute: "Cutie",
  emotional: "Soft",
  y2k: "Y2K",
  gothic: "Gothic",
  minimal: "Minimal",
};

/** 인싸폰트 스타일: 영어 라벨. */
export const FONT_EN: Record<string, string> = {
  bold: "Bold",
  italic: "Italic",
  bolditalic: "Bold italic",
  script: "Script",
  fraktur: "Fraktur",
  double: "Double-struck",
  sans: "Sans",
  sansbold: "Sans bold",
  mono: "Monospace",
  fullwidth: "Wide",
  circle: "Circled",
  smallcaps: "Small caps",
  super: "Superscript",
  strike: "Strikethrough",
  under: "Underline",
  flip: "Upside down",
  space: "Spaced",
};
