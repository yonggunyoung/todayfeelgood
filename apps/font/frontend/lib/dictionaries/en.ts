/**
 * 폰트 앱 랜딩 영어 카피 — 해외 유입용 마케팅 영어(기계번역 아님).
 * 글로벌 피치: "Turn your own handwriting into a real font — free, no AI."
 * 한글 강점은 "Korean & Latin supported". "~너굴" 말장난은 영어에서 생략(담백하게).
 */
import type { ko } from "./ko";

export const en: typeof ko = {
  seo: {
    title: "Hoek — Turn your handwriting into a real font",
    description:
      "Not an AI imitation of someone else's hand — a real font from the letters you draw yourself. Korean & Latin supported. Use it as images anywhere, or download WOFF & TTF font files (free, no AI).",
    keywords: [
      "handwriting font generator",
      "draw your own font",
      "free handwriting to font",
      "make your own handwriting font",
      "convert handwriting to font",
    ],
  },
  jsonLd: {
    name: "Hoek Font Workshop",
    description:
      "A web font workshop: shape a typeface with weight, slant and curvature sliders and download it as WOFF & TTF.",
  },
  langToggle: { ko: "한국어", en: "English", label: "Choose language" },
  header: {
    cta: "Open the workshop",
    subtitle: "Font Workshop",
    homeLabel: "Hoek — back home",
  },
  footer: {
    colophon:
      "Hoek Font Workshop — a small tool that gives your letters character. Everything you make is yours.",
    fineprint: "Download your font right here. We never send it anywhere.",
  },
  hero: {
    eyebrow: "Draw your own handwriting font",
    headlinePre: "Not an AI imitation — really ",
    headlineBrush: "your handwriting",
    lede: "Draw each letter by hand and we bake a font from your real strokes. Korean works too — draw the jamo and keep your hand. Draw only the letters you want, that's fine.",
    primary: "Start drawing",
    secondary: "How does it work?",
  },
  specimen: {
    stageAria: "Latin letters demo with adjustable weight and slant (system-font preview)",
    weight: "Weight",
    slant: "Slant",
  },
  band: {
    aria: "Letter specimen",
    sticker: "Full set",
    weightLabel: "From light to bold",
    numberLabel: "Numbers in the set too",
  },
  why: {
    aria: "What makes this workshop different",
    title: "Why make it here",
    items: [
      {
        name: "Truly your handwriting",
        body: "Not an AI's version of someone else's hand, but the strokes you draw yourself. Your character becomes the font — not an imitation, the real you.",
      },
      {
        name: "Korean works too",
        body: "Draw the jamo and build your own handwritten Korean. Unlike generators that only do Latin, Korean isn't an afterthought here.",
      },
      {
        name: "Actually use the result",
        body: "Use it as images anywhere (zero install) + reuse it as WOFF & TTF font files + remix via share links. Not just a single image and done.",
      },
      {
        name: "Free, no AI, honest",
        body: "No cost to make. We clearly separate 'truly your handwriting' from a 'quick-start sample' built by varying an open font — no pretending.",
      },
    ],
  },
  how: {
    id: "how",
    title: "It's simple to make",
    body: "Draw your letters in the a–z cells, smooth out just the hand jitter with refine, then download as WOFF & TTF. No AI — a font built from strokes you really drew. Want a quick look first? There's a 'quick-start sample' (slider variations on a ready-made font) too.",
    cta: "Open the drawing board →",
  },
};
