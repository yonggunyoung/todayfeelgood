/**
 * 홈(허브) 영어 카피 — 해외 유입용 마케팅 영어(기계번역 아님).
 * 글로벌 피치: 진짜 손글씨로 만드는 폰트, 무료, AI 아님. 한글 강점은 "Korean & Latin".
 * 마스코트(너굴이)는 유지하되 "~너굴" 말장난은 영어에서 생략(담백하게).
 */
import type { ko } from "./ko";

export const en: typeof ko = {
  seo: {
    title: "Hoek — Turn your handwriting into a real font",
    description:
      "Draw your own letters and turn them into a real font you actually own. Use it as images anywhere or download real font files. Korean & Latin supported — free, no AI.",
    keywords: [
      "handwriting font generator",
      "make your own font",
      "draw your own font",
      "free handwriting to font",
    ],
  },
  jsonLd: {
    name: "Hoek",
    description:
      "A small workshop of web tools — from turning your handwriting into a font to text emoticons and stickers.",
  },
  langToggle: { ko: "한국어", en: "English", label: "Choose language" },
  hero: {
    eyebrow: "A little tool workshop, with Neoguri",
    title: "Your own handwriting, turned into a real font",
    lede: "Draw each letter by hand and we bake a font from your real strokes. Use it as images anywhere, or download an actual font file. Korean & Latin supported.",
    cta: "Start drawing in the Font Workshop →",
    sampleAria: "Preview of your handwriting font",
    sampleTape: "Your sample",
    sampleNote: "Your strokes, exactly as your typeface",
  },
  meet: {
    aria: "Meet the mascot",
    mascotLabel: "Neoguri mascot",
    title: "This is Neoguri",
    body: "A raccoon with a brush. Lending a hand is my job.",
  },
  tools: {
    aria: "Available tools",
    title: "Tools you can use right now",
    font: {
      tag: "Flagship · Handwriting font",
      name: "Font Workshop",
      desc: "Draw a letter in each cell and we bake a font from your real strokes — not an AI imitation of someone else's hand, but truly yours. Korean works too: draw the jamo and keep your hand. Use it as images anywhere, or download WOFF & TTF font files (free, no AI).",
      cta: "Go draw your own →",
    },
    textmoji: {
      tag: "Text emoticons",
      name: "Emoticon Workshop",
      desc: "Combine eyes, mouths, arms and brackets procedurally to build endless text emoticons you won't find anywhere. A compatibility safety rating (green/yellow/red) catches breakage before you copy with one tap. Paste straight into chat, Instagram or Discord (no AI, no server).",
      cta: "Enter the workshop →",
    },
    sticker: {
      tag: "Stickers",
      name: "Sticker Workshop",
      desc: "Draw one character and get 12 automatic expression and color variations. Download a transparent PNG pack and use it in chat, Instagram or Discord (no AI).",
      cta: "Enter the workshop →",
    },
    kit: {
      tag: "Brand kit",
      name: "Kit Workshop",
      desc: "Pick a brand name, mood and color, and get a typeface + matching palette + preview sheet bundled into one kit. Font, CSS and license, all in a single ZIP (no AI).",
      cta: "Enter the workshop →",
    },
    otherSummary: "More workshops",
    sign: {
      tag: "Signature",
      name: "Signature Workshop",
      desc: "Type your name and we build a signature style with cursive variation and procedural flourishes. For documents and email signatures. Download as transparent PNG or SVG (no AI).",
      cta: "Enter the workshop →",
    },
  },
  footer: "Hoek — small tools made by hand. Everything you make is yours.",
};
