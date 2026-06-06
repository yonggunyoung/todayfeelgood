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
  // Neutral hub home (root `/`) — landing that gathers the web apps.
  hub: {
    brand: "ddukkit",
    seo: {
      title: "ddukkit — Handy web apps in one place",
      description:
        "Small web tools to create, make and use — all in one place. Starting with Neoguri's little tool workshop for handwriting fonts, emoji and stickers.",
      keywords: ["web apps", "web tools", "free web tools", "handwriting font"],
    },
    jsonLd: {
      name: "ddukkit",
      description: "A hub of handy web apps, all in one place.",
    },
    nav: { apps: "Apps", partner: "Partner", partnerCta: "Partner with us" },
    theme: { toLight: "Switch to light", toDark: "Switch to dark" },
    hero: {
      kick: "Web App Studio",
      titleA: "Every web app you need,",
      titleB: "in one place.",
      lede: "Useful web tools, all in one place. No installs — right in your browser.",
      searchPlaceholder: "Search what you want to make — fonts, emoji …",
    },
    search: {
      feature: "Tools",
      web: "Web",
      webGo: "Search on Google…",
      tools: [
        { name: "Font Workshop", href: "/font", keywords: ["font", "handwriting", "type", "ttf", "woff", "폰트"] },
        { name: "Emoticon Workshop", href: "/textmoji", keywords: ["emoji", "emoticon", "kaomoji", "text", "이모티콘"] },
      ],
    },
    rank: { head: "Trending", comingSoon: "Soon" },
    apps: {
      sectionTitle: "Browse web apps",
      sectionSub: "Drag or use the arrows",
      prev: "Previous",
      next: "Next",
      live: "LIVE",
      soonBadge: "Soon",
      neogul: {
        eyebrow: "A letter in your own handwriting?",
        name: "Neoguri's Tool Workshop",
        desc: "Fonts · Emoji · Free",
        sampleWord: "hello, my hand",
        chips: ["My font", "Emoji"],
      },
      soon: [
        { hook: "Crafting the\nnext app", name: "App 2", note: "Coming soon" },
        { hook: "Ideas\nwelcome", name: "App 3", note: "Coming soon" },
        { hook: "The hub\nkeeps growing", name: "App 4", note: "Coming soon" },
        { hook: "Your\napp?", name: "App 5", note: "Partner welcome" },
      ],
    },
    partner: {
      title: "Bring your web app here",
      body: "Built a web tool or have a partnership idea? Send a proposal — we review and feature it.",
      cta: "Submit a proposal",
      email: "contact@ddukkit.com",
    },
    footer: {
      copyright: "© 2026 ddukkit · Small web apps, hand-crafted.",
      privacy: "Privacy",
      terms: "Terms",
      partner: "Partner",
    },
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
      desc: "Draw each letter; we bake a font from your real strokes. Korean & Latin, free WOFF·TTF.",
      cta: "Go draw your own →",
    },
    textmoji: {
      tag: "Text emoticons",
      name: "Emoticon Workshop",
      desc: "Mix eyes, mouths and arms into text emoticons you won't find anywhere. One-tap copy, breakage-safe.",
      cta: "Enter the workshop →",
    },
    sticker: {
      tag: "Stickers",
      name: "Sticker Workshop",
      desc: "Draw one character, get a whole sheet of expressions. Transparent PNGs, ready to use.",
      cta: "Enter the workshop →",
    },
    kit: {
      tag: "Brand kit",
      name: "Kit Workshop",
      desc: "Pick a name, mood and color — get a font + palette + sheet as one ZIP kit.",
      cta: "Enter the workshop →",
    },
    otherSummary: "More workshops",
    sign: {
      tag: "Signature",
      name: "Signature Workshop",
      desc: "Type your name for a flowing signature style. PNG·SVG for docs and email.",
      cta: "Enter the workshop →",
    },
  },
  // About, how-to and FAQ — body content for SEO and AdSense approval.
  guide: {
    linkLabel: "Guide & FAQ",
    seoTitle: "Guide & About — Turn your handwriting into a font",
    seoDescription:
      "ddukkit (Hoek) is a free web tool that turns your own handwriting into a real font (WOFF & TTF). No sign-up, Korean and Latin supported. Here's how to use it and answers to common questions.",
    title: "How it works & About",
    intro:
      "ddukkit (Hoek) is a free web tool that turns the letters you draw into a real font file. No install, no sign-up — right in your browser, for both Korean and Latin. New here? Follow the steps below and you'll have your own handwriting font in about five minutes.",
    sections: [
      {
        heading: "What is ddukkit?",
        body: [
          "It reads the strokes you draw in each cell and bakes them into a font. No AI imitating someone else's hand — the lines you actually draw become the letters.",
          "Download your font as a WOFF or TTF file and use it in documents, design, or your blog. Everything you make is yours, and nothing is stored on our servers.",
        ],
      },
      {
        heading: "How to make one (3 steps)",
        body: [
          "1) Draw the letters you like in the cells, with a mouse or your finger. You don't have to draw them all — empty cells are filled with a default font.",
          "2) Use the refine sliders to smooth out hand jitter and set weight and slant to taste.",
          "3) Check the preview, then download as WOFF or TTF. You can also make an image for KakaoTalk or Instagram, where you can't install fonts.",
        ],
      },
      {
        heading: "Does it support Korean?",
        body: [
          "Yes. Draw the basic jamo (14 consonants + 10 vowels) and we compose Korean syllables from them. Unlike Latin-only tools, Korean is a first-class citizen here.",
          "For Latin you can draw both lowercase a–z and uppercase A–Z, and digits are filled in too.",
        ],
      },
      {
        heading: "Don't feel like drawing?",
        body: [
          "The 'quick-start sample' lets you vary an open font with sliders (weight, slant, and more) without drawing. It's not your real hand, but it's the fastest way to look around.",
        ],
      },
    ],
    faqTitle: "Frequently asked questions",
    faqs: [
      {
        q: "Is it really free?",
        a: "Yes — making and downloading fonts is free, with no sign-up or login required.",
      },
      {
        q: "Can I use the font commercially?",
        a: "What you make from your own strokes is yours to use freely. The 'default font' that fills empty cells is based on open-license fonts (such as OFL), so for commercial use we recommend drawing the letters yourself.",
      },
      {
        q: "Are my drawings or images stored on a server?",
        a: "No. Fonts are generated and handed to your browser on the spot and not stored. See the Privacy Policy for details.",
      },
      {
        q: "Is this made by AI?",
        a: "No. Font generation currently uses no AI — only the strokes you really drew plus traditional font processing. Cells you don't draw are honestly labeled as a default font, not 'your hand'.",
      },
      {
        q: "Does it work on a phone?",
        a: "Yes. You can draw with your finger, so it works well on mobile. You can also export an image for use in KakaoTalk or Instagram.",
      },
    ],
  },
  footer: "Hoek — small tools made by hand. Everything you make is yours.",
  legal: {
    navAria: "Legal & policies",
    backToHome: "← Back to home",
    updatedLabel: "Effective date",
    privacy: {
      linkLabel: "Privacy Policy",
      seoTitle: "Privacy Policy",
      seoDescription:
        "Hoek (ddukkit.com) Privacy Policy — what we collect, cookies, third-party tools such as Google AdSense and Analytics, your choices, and how to contact us.",
      title: "Privacy Policy",
      updated: "June 3, 2026",
      intro:
        "Hoek (the “Service”) respects your privacy and complies with applicable laws. The Service has no sign-up or login, and everything you make — fonts, stickers, signatures, text emoticons — is generated in your browser and is not stored on our servers. This policy explains what information the Service handles and how.",
      sections: [
        {
          heading: "1. What we collect and how",
          body: [
            "The Service does not ask for or store direct personal information such as your name, contact details, or account. The letters and drawings you make on the canvas, and any text you enter, are processed only momentarily to generate fonts and images, and are not retained on our servers after the result is returned to you.",
            "As part of normal web server operation, access logs (IP address, browser type, time of access, and requested path) may be recorded automatically. These are standard server records used to keep the Service stable and to prevent abuse.",
            "For advertising and analytics, the third-party tools described below may collect some information via cookies (see sections 2 and 3).",
          ],
        },
        {
          heading: "2. Cookies and third-party advertising (Google AdSense)",
          body: [
            "The Service may display ads served by third-party vendors, including Google. These vendors use cookies to serve ads based on your prior visits.",
            "Google’s use of the DART cookie enables it to serve ads based on your visit to this and other sites. You can opt out of personalized advertising at Google Ads Settings (https://www.google.com/settings/ads), and opt out of third-party advertising cookies at https://www.aboutads.info.",
            "You can refuse or delete cookies in your browser settings. Blocking cookies does not affect the core features of the Service (drawing, generating, and downloading).",
          ],
        },
        {
          heading: "3. Analytics (Google Analytics)",
          body: [
            "To improve the Service, we may use analytics tools such as Google Analytics. These tools use cookies to collect aggregate statistics — such as pages visited, time on page, and approximate region — anonymously, without identifying you personally.",
            "You can opt out of analytics by installing the Google Analytics Opt-out Browser Add-on (https://tools.google.com/dlpage/gaoptout).",
          ],
        },
        {
          heading: "4. Retention",
          body: [
            "Content you submit for generation is discarded immediately after processing and is not retained. Server access logs are kept only as long as needed for operational and security purposes, then deleted.",
            "Information collected by third-party tools (Google) is retained and used according to those vendors’ own policies.",
          ],
        },
        {
          heading: "5. Sharing and processors",
          body: [
            "We do not sell or arbitrarily share your personal information with third parties. Advertising and analytics cookie collection is carried out through the Google services above, and each vendor’s privacy policy (https://policies.google.com/privacy) also applies.",
          ],
        },
        {
          heading: "6. Your choices",
          body: [
            "Because the Service does not store identifiable personal information, there is no separate stored data to access, correct, or delete. For advertising and analytics cookies, you remain in control through the opt-out methods in sections 2 and 3 and your browser’s cookie settings.",
            "For any privacy-related questions or requests, please use the contact below.",
          ],
        },
        {
          heading: "7. Children’s privacy",
          body: [
            "The Service does not knowingly collect personal information from children under 14. We encourage guardians to ensure children do not provide identifying information.",
          ],
        },
        {
          heading: "8. Changes to this policy",
          body: [
            "This Privacy Policy may be revised as laws or the Service change. When it changes, we will post the updated effective date on this page.",
          ],
        },
        {
          heading: "9. Contact",
          body: [
            "For questions, complaints, or requests regarding the handling of personal information, please contact: contact@ddukkit.com",
          ],
        },
      ],
    },
    terms: {
      linkLabel: "Terms of Service",
      seoTitle: "Terms of Service",
      seoDescription:
        "Hoek (ddukkit.com) Terms of Service — what the Service provides, your rights to what you create, prohibited uses, disclaimers, and governing law.",
      title: "Terms of Service",
      updated: "June 3, 2026",
      intro:
        "These Terms govern the conditions for using Hoek (the “Service”) and the rights and obligations of users and the Service. By using the Service, you agree to these Terms.",
      sections: [
        {
          heading: "1. Purpose",
          body: [
            "These Terms set out the conditions for a web tool service that lets you make fonts, stickers, signatures, text emoticons, and more — for free, without any sign-up.",
          ],
        },
        {
          heading: "2. What the Service provides",
          body: [
            "The Service offers tools that generate font files (WOFF, TTF), images (PNG, SVG), text emoticons, and similar, based on the letters and drawings you make and the values you enter.",
            "All core features work in a traditional (non-AI) way and are provided free of charge. If AI features are added in the future, their output will carry an “AI-generated” label and be disclosed separately.",
          ],
        },
        {
          heading: "3. Your rights to what you create",
          body: [
            "The rights to whatever you create with the Service (fonts, images, emoticons, etc.) belong entirely to you. You are free to use them for personal and commercial purposes.",
            "The Service claims no ownership over your creations and does not arbitrarily retain or reuse them for its operation.",
          ],
        },
        {
          heading: "4. Bundled assets and licenses",
          body: [
            "Some base typefaces used as a foundation for font generation are free-license assets such as those under the SIL Open Font License (OFL). There are no special restrictions on using your generated results, but the Service’s own intellectual property — its logo, design, and source code — belongs to the operator.",
          ],
        },
        {
          heading: "5. User obligations and prohibited conduct",
          body: [
            "You must not: submit input that infringes others’ rights (copyright, likeness, etc.); create content that violates the law or public order and morals; place excessive load on the Service by automated means; or otherwise interfere with the normal operation of the Service.",
            "You are responsible for the legality of the content you input and the results you create.",
          ],
        },
        {
          heading: "6. Advertising",
          body: [
            "To support operation, the Service may display third-party ads such as Google AdSense. Collection and use of data for advertising follow the Privacy Policy.",
          ],
        },
        {
          heading: "7. Disclaimer and limitation of liability",
          body: [
            "The Service is provided “as-is,” without warranty of fitness for a particular purpose or of uninterrupted, error-free operation.",
            "To the extent permitted by applicable law, the Service is not liable for any damages arising from your use of the Service or its results. The same applies to interruptions caused by force majeure such as natural disasters or server failures.",
          ],
        },
        {
          heading: "8. Changes and suspension of the Service",
          body: [
            "The Service may add or change features, or modify or suspend all or part of the Service as needed for operational or technical reasons. We will endeavor to give notice of material changes in advance.",
          ],
        },
        {
          heading: "9. Changes to these Terms",
          body: [
            "These Terms may be revised as laws or the Service change. When they change, we will post the updated effective date on this page. Continuing to use the Service after a change constitutes acceptance of the revised Terms.",
          ],
        },
        {
          heading: "10. Governing law and contact",
          body: [
            "These Terms are interpreted under the laws of the Republic of Korea, and disputes related to the Service follow the procedures set by applicable law.",
            "Questions about these Terms: contact@ddukkit.com",
          ],
        },
      ],
    },
  },
};
