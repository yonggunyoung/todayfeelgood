# Threads 자동화용 자료팩 + 명령어 (해외/영어)

> 이 파일 **전체를 Claude에게 그대로** 주면, Threads 한 건치 게시 패키지
> (캡션 + 이미지 지시 + 첫 댓글 링크)를 JSON으로 만들어 줍니다.
> 기존 자동화(밈/영상 + 링크 댓글) 파이프라인에 그대로 끼워 넣을 수 있게 설계.

---

## ▶ COMMAND (Claude에게 주는 명령어)

```
You are the English social copywriter for "Hoek" (https://ddukkit.com/font),
a FREE web tool that turns a person's OWN handwriting into a real, downloadable font.

Read PRODUCT, RULES, and BANKS below. Then output ONE Threads post package as
strict JSON (no markdown, no extra text):

{
  "caption": "",        // English. ≤ 480 chars. 1 hook line + 1 value line + 1 soft CTA. 0–2 emoji. NO links, NO hashtags inside.
  "hashtags": "",       // 4–6 tags, space-separated, chosen+rotated from HASHTAG SETS.
  "image_brief": "",    // 1–3 sentences telling the image/meme/video editor exactly what to show. Must visually prove "your handwriting → a font".
  "first_comment": ""   // The link goes HERE (not in caption). Use COMMENT TEMPLATE. Insert {{AMAZON_AFFILIATE_LINK}} only if provided.
}

Hard rules:
- Do NOT reuse or lightly reword any caption in RECENT_CAPTIONS (below). Pick a different hook each time.
- Sound like a real person sharing a cool tool, not an ad. No hype words ("revolutionary", "game-changer").
- The differentiators to rotate through: (1) it's your REAL handwriting, not AI; (2) Korean + Latin both work; (3) free, no sign-up, runs in the browser; (4) download WOFF/TTF or export images.
- Keep one idea per post. English only.
- If {{AMAZON_AFFILIATE_LINK}} is provided, add it as a 2nd line in first_comment with an honest "#ad / affiliate" note.

Inputs for this run:
- RECENT_CAPTIONS: {{LAST_10_CAPTIONS}}
- AMAZON_AFFILIATE_LINK: {{AMAZON_AFFILIATE_LINK_OR_EMPTY}}
- ANGLE (optional, else pick freely): {{ANGLE_OR_AUTO}}

Output the JSON only.
```

> `{{LAST_10_CAPTIONS}}`, `{{AMAZON_AFFILIATE_LINK_OR_EMPTY}}`, `{{ANGLE_OR_AUTO}}` 는
> 자동화에서 실제 값으로 치환해서 넣으세요. 없으면 빈 문자열/`auto`.

---

## PRODUCT (사실 — 절대 왜곡 금지)

- **Name**: Hoek (Korean: 획). **URL**: https://ddukkit.com/font  · Guide: https://ddukkit.com/font/guide
- **What**: A free web app that turns *your own handwriting* into a real font.
- **How**: Draw each letter (Latin a–z, A–Z, digits, and Korean jamo) → tweak weight / slant / curvature with sliders → live preview → download **WOFF & TTF**, or export as images.
- **Why it's different**: It keeps YOUR real strokes — it is **not** an AI imitation of someone else's handwriting.
- **Korean support**: Draw the 24 basic jamo → it composes syllables. (Most rivals are Latin-only — this is a wedge for the JP/KR/global-Asian audience.)
- **No-draw option**: Don't feel like drawing? Tweak a public font with sliders for a quick start.
- **Free & private**: No sign-up, no payment, runs in the browser, nothing uploaded/sent away.

## RULES (ToS-안전 + 밴 방지)

- 1 idea per post; rotate hooks & hashtags (never the same set twice in a row).
- Link in the **first comment**, not the caption (better reach + less spammy).
- No fake claims, no "AI magic" wording (the whole point is it's *not* AI).
- If using an affiliate link, disclose ("#ad" or "affiliate link"). Honest disclosure also protects the account.
- Don't @-spam strangers. Engage by replying to comments, not mass tagging.
- Keep a human tone; vary sentence shape; 0–2 emoji max.

## HOOK BANK (캡션 첫 줄 — 돌려쓰기)

1. I turned my actual handwriting into a font in 2 minutes.
2. Your handwriting deserves to be a font. (Not an AI version — the real one.)
3. Most "handwriting fonts" are AI fakes. This keeps *your* real strokes.
4. POV: your messy notes are now a downloadable typeface.
5. Yes, you can make a **Korean** handwriting font too.
6. I stopped paying for font tools. This one's free and runs in the browser.
7. Draw 26 letters → get a real .ttf. That's the whole thing.
8. Your handwriting, but installable.
9. Made a font from my grandma's handwriting. Hit me right in the feels.
10. No sign-up, no AI, no upload. Just your hand → a font.
11. Designers: a 2-minute "draw your own typeface" toy you'll actually use.
12. Turn a love note's handwriting into a font you can keep forever.

## CAPTION BANK (필요시 변형해서 사용 — 캡션 안엔 링크/해시태그 X)

- "I turned my actual handwriting into a font in 2 minutes. Not an AI imitation — it keeps my real strokes. Free, no sign-up. Drew the letters, downloaded a .ttf, done."
- "Most handwriting-font generators fake it with AI. This one keeps the strokes *you* actually draw — Latin and Korean. Free, in the browser."
- "Your messy notes → a real downloadable typeface. Draw the letters, tweak weight & slant, grab the WOFF/TTF. No account needed."
- "Made a font from my own handwriting and now every doc feels like me. Wild that it's free and nothing gets uploaded."
- "Underrated: you can make a *Korean* handwriting font here, not just Latin. Draw the jamo, it builds the syllables."

## CTA BANK (캡션 마지막 줄 — soft)

- Link in the comments 👇
- Try it (link below) ✍️
- Free — link's in the first comment.
- Make your own, link below.

## COMMENT TEMPLATE (링크는 여기에)

```
✍️ Make your own (free, no sign-up): https://ddukkit.com/font
```
옵션(어필리에이트 동봉 시 — 손글씨/그리기와 자연스럽게 연결되는 상품만):
```
✍️ Make your own (free, no sign-up): https://ddukkit.com/font
Drawing on a tablet makes it smoother — the stylus I use (affiliate / #ad): {{AMAZON_AFFILIATE_LINK}}
```

## HASHTAG SETS (세트 단위로 번갈아 — 한 번에 4~6개)

- SET A: #fonts #typography #handwriting #design #freetools
- SET B: #lettering #fontdesign #typedesign #indiehackers #buildinpublic
- SET C: #handwritten #calligraphy #creativetools #webapp #design
- SET D (KR/JP wedge): #korean #한글 #fonts #typography #handwriting

## IMAGE / VIDEO CONCEPTS (image_brief 가 노릴 비주얼)

- Split screen: messy handwritten line ↔ same sentence rendered in the finished font.
- 10–15s screen-capture: drawing a few letters → slider tweak → live preview updates → download click.
- "Handwriting → keyboard": hand writes a word, then the same word "types out" in that font.
- Meme format (your existing style): top = "AI handwriting fonts", bottom = "an actual font from MY hand" with the before/after.
- Korean angle: drawing jamo, then a Korean sentence appears in the handmade font.

## RECENT_CAPTIONS (자동화가 매 실행 시 갱신해서 주입 — 중복 방지)

(여기에 최근 올린 캡션 10개를 자동으로 채워 넣어 같은 글 반복을 막으세요.)
