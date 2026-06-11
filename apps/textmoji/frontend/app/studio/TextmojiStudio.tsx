"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chip } from "@webapp/ui";
import { EMOTIONS, EMOTION_BY_ID, type EmotionCat } from "../../lib/emotions";
import {
  DEFAULT_STYLE,
  generateSet,
  type TextmojiStyle,
} from "../../lib/generate";
import { CURATED } from "../../lib/curated";
import { LIBRARY } from "../../lib/kaomojiLibrary";
import { SYMBOL_CATS, type SymbolCat } from "../../lib/symbols";
import { FONTS } from "../../lib/fonts";
import { decorate, THEMES } from "../../lib/decorate";
import { copyText } from "../../lib/clipboard";
import {
  loadFavorites,
  saveFavorites,
  toggleFavorite,
} from "../../lib/favorites";
import {
  EMOTION_EN,
  SYMBOL_EN,
  THEME_EN,
  FONT_EN,
  type Locale,
  type TextmojiDict,
} from "../../lib/i18n";
import styles from "./TextmojiStudio.module.css";

type Mode = "kaomoji" | "symbol" | "font" | "decorate";
type Tab = "all" | "fav";
const GRID = 12;
const FONT_SAMPLE = "Aa Bb 123";

const MODES: { id: Mode; emoji: string }[] = [
  { id: "decorate", emoji: "꒰♡꒱" },
  { id: "kaomoji", emoji: "ʕ•ᴥ•ʔ" },
  { id: "symbol", emoji: "✦" },
  { id: "font", emoji: "𝓐𝒶" },
];

export default function TextmojiStudio({
  locale,
  dict,
}: {
  locale: Locale;
  dict: TextmojiDict;
}) {
  const t = dict.studio;
  const en = locale === "en";

  // ── 로케일별 라벨/검색어 헬퍼(데이터는 그대로, 영어는 오버레이) ──
  const emoLabel = useCallback(
    (e: EmotionCat | undefined) =>
      e ? (en ? EMOTION_EN[e.id]?.label ?? e.label : e.label) : "",
    [en]
  );
  const symLabel = useCallback(
    (c: SymbolCat) => (en ? SYMBOL_EN[c.id]?.label ?? c.label : c.label),
    [en]
  );

  const [mode, setMode] = useState<Mode>("kaomoji");
  const [tab, setTab] = useState<Tab>("all");

  // 카오모지
  const [emotion, setEmotion] = useState<string>(EMOTIONS[0]!.id);
  const [style, setStyle] = useState<TextmojiStyle>(DEFAULT_STYLE);
  const [seed, setSeed] = useState(1);
  const [showGenerated, setShowGenerated] = useState(false);

  // 특수기호
  const [symbolCat, setSymbolCat] = useState<string>(SYMBOL_CATS[0]!.id);

  // 인싸폰트
  const [fontInput, setFontInput] = useState("");

  // 한 줄 꾸미기
  const decorateSample = en ? "myname" : "내이름";
  const [decorateInput, setDecorateInput] = useState("");
  const [decorateSeed, setDecorateSeed] = useState(0);
  const [decorateTheme, setDecorateTheme] = useState<string>(THEMES[0]!.id);
  const [decorateKao, setDecorateKao] = useState(true);

  // 공통
  const [query, setQuery] = useState("");
  const [favs, setFavs] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFavs(loadFavorites());
  }, []);

  // ── 카오모지 목록 ──
  const generated = useMemo(
    () => (showGenerated ? generateSet(emotion, style, seed, GRID) : []),
    [showGenerated, emotion, style, seed]
  );
  // 큐레이션(엄선) + 외부 라이브러리(다양성)를 하나의 풀로. 큐레이션이 앞이라 첫인상이 좋다.
  const allKao = useMemo(
    () => [
      ...CURATED.map((c) => ({ text: c.text, emotion: c.emotion, keywords: c.tags ?? [] })),
      ...LIBRARY,
    ],
    []
  );
  const kaomojiItems = useMemo<string[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const base = allKao.filter((k) => k.emotion === emotion).map((k) => k.text);
      const gen = generated.map((g) => g.text);
      return Array.from(new Set(showGenerated ? [...gen, ...base] : base));
    }
    // 검색: 텍스트·키워드 + 감정 라벨/키워드(한·영 모두) 매칭
    const matchEmotions = EMOTIONS.filter((e) => {
      const labels = [e.label, EMOTION_EN[e.id]?.label ?? ""];
      const kws = [...e.keywords, ...(EMOTION_EN[e.id]?.keywords ?? [])];
      return (
        labels.some((l) => l.toLowerCase().includes(q)) ||
        kws.some((k) => k.toLowerCase().includes(q))
      );
    }).map((e) => e.id);
    const hits = allKao
      .filter(
        (k) =>
          k.text.toLowerCase().includes(q) ||
          k.keywords.some((kw) => kw.toLowerCase().includes(q)) ||
          matchEmotions.includes(k.emotion)
      )
      .map((k) => k.text);
    return Array.from(new Set(hits));
  }, [allKao, emotion, showGenerated, generated, query]);

  // ── 특수기호 목록 ──
  const symbolItems = useMemo<string[]>(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      const hits: string[] = [];
      for (const cat of SYMBOL_CATS) {
        const labels = [cat.label, SYMBOL_EN[cat.id]?.label ?? ""];
        const kws = [...cat.keywords, ...(SYMBOL_EN[cat.id]?.keywords ?? [])];
        const catMatch =
          labels.some((l) => l.toLowerCase().includes(q)) ||
          kws.some((k) => k.toLowerCase().includes(q));
        for (const it of cat.items) {
          if (catMatch || it.toLowerCase().includes(q)) hits.push(it);
        }
      }
      return Array.from(new Set(hits));
    }
    return SYMBOL_CATS.find((c) => c.id === symbolCat)?.items ?? [];
  }, [symbolCat, query]);

  // ── 인싸폰트 결과 ──
  const fontOutputs = useMemo(() => {
    const src = fontInput.trim() || FONT_SAMPLE;
    return FONTS.map((f) => ({
      id: f.id,
      label: en ? FONT_EN[f.id] ?? f.label : f.label,
      text: f.transform(src),
    }));
  }, [fontInput, en]);

  // ── 한 줄 꾸미기 결과 ──
  const decorateOutputs = useMemo(
    () =>
      decorate(decorateInput.trim() || decorateSample, {
        theme: decorateTheme,
        seed: decorateSeed,
        withKaomoji: decorateKao,
      }),
    [decorateInput, decorateSeed, decorateTheme, decorateKao, decorateSample]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1500);
  }, []);

  const onCopy = useCallback(
    async (text: string) => {
      const ok = await copyText(text);
      showToast(ok ? t.toastCopied : t.toastCopyFail);
    },
    [showToast, t.toastCopied, t.toastCopyFail]
  );

  const onToggleFav = useCallback((text: string) => {
    setFavs((prev) => {
      const next = toggleFavorite(prev, text);
      saveFavorites(next);
      return next;
    });
  }, []);

  const reroll = useCallback(() => {
    setShowGenerated(true);
    setSeed((s) => (s * 1103515245 + 12345) >>> 0 || 1);
  }, []);

  const curEmotion = EMOTION_BY_ID[emotion];

  // 그리드에 그릴 텍스트 목록(탭/모드에 따라)
  const gridTexts =
    tab === "fav" ? favs : mode === "kaomoji" ? kaomojiItems : symbolItems;

  const showSearch = tab === "all" && (mode === "kaomoji" || mode === "symbol");

  return (
    <div className={styles.app}>
      <div className={styles.sticky}>
        {/* ── 매크로 모드 바 ── */}
        {tab === "all" ? (
          <div className={styles.modeBar} role="tablist" aria-label={t.contentKindsAria}>
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mode === m.id}
                className={`${styles.modeBtn} ${mode === m.id ? styles.modeOn : ""}`}
                onClick={() => {
                  setMode(m.id);
                  setQuery("");
                }}
              >
                <span className={styles.modeEmoji} aria-hidden>
                  {m.emoji}
                </span>
                {t.modes[m.id]}
              </button>
            ))}
          </div>
        ) : null}

        {/* ── 검색(+카오모지 주사위) ── */}
        {showSearch ? (
          <div className={styles.searchRow}>
            <input
              type="search"
              className={styles.search}
              placeholder={mode === "kaomoji" ? t.searchKaomojiPh : t.searchSymbolPh}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t.searchAria}
            />
            {mode === "kaomoji" ? (
              <button
                type="button"
                className={styles.dice}
                onClick={reroll}
                aria-label={t.diceMakeMore}
                title={t.diceMakeMoreTitle}
              >
                🎲
              </button>
            ) : null}
          </div>
        ) : null}

        {/* ── 카오모지: 감정칩 + 스타일 ── */}
        {tab === "all" && mode === "kaomoji" ? (
          <>
            <div className={styles.chips} role="tablist" aria-label={t.emotionCatsAria}>
              {EMOTIONS.slice()
                .sort((a, b) => Number(Boolean(b.trend)) - Number(Boolean(a.trend)))
                .map((e) => (
                  <Chip
                    key={e.id}
                    selected={e.id === emotion}
                    onClick={() => {
                      setEmotion(e.id);
                      setShowGenerated(false);
                      setQuery("");
                    }}
                    className={styles.chip}
                  >
                    <span aria-hidden>{e.emoji}</span> {emoLabel(e)}
                    {e.trend ? <span className={styles.trendDot}> {t.hot}</span> : null}
                  </Chip>
                ))}
            </div>
            <div className={styles.styleRow} aria-label={t.styleAria}>
              <Chip
                selected={style.animalFace}
                onClick={() => setStyle((s) => ({ ...s, animalFace: !s.animalFace }))}
                className={styles.styleChip}
              >
                {t.styleAnimal}
              </Chip>
              <Chip
                selected={style.action}
                onClick={() => setStyle((s) => ({ ...s, action: !s.action }))}
                className={styles.styleChip}
              >
                {t.styleAction}
              </Chip>
              <Chip
                selected={style.symmetric}
                onClick={() => setStyle((s) => ({ ...s, symmetric: !s.symmetric }))}
                className={styles.styleChip}
              >
                {t.styleSymmetric}
              </Chip>
              <Chip
                selected={style.fancy >= 2}
                onClick={() =>
                  setStyle((s) => ({ ...s, fancy: s.fancy >= 2 ? 0 : s.fancy + 1 }))
                }
                className={styles.styleChip}
              >
                {t.styleDeco} {style.fancy}
              </Chip>
            </div>
          </>
        ) : null}

        {/* ── 특수기호: 카테고리칩 ── */}
        {tab === "all" && mode === "symbol" ? (
          <div className={styles.chips} role="tablist" aria-label={t.symbolCatsAria}>
            {SYMBOL_CATS.map((c) => (
              <Chip
                key={c.id}
                selected={c.id === symbolCat && !query.trim()}
                onClick={() => {
                  setSymbolCat(c.id);
                  setQuery("");
                }}
                className={styles.chip}
              >
                <span aria-hidden>{c.emoji}</span> {symLabel(c)}
              </Chip>
            ))}
          </div>
        ) : null}

        {/* ── 인싸폰트: 입력 ── */}
        {tab === "all" && mode === "font" ? (
          <div className={styles.fontInputWrap}>
            <input
              type="text"
              className={styles.search}
              placeholder={t.fontInputPh}
              value={fontInput}
              onChange={(e) => setFontInput(e.target.value)}
              aria-label={t.fontInputAria}
              maxLength={60}
            />
          </div>
        ) : null}

        {/* ── 한 줄 꾸미기: 입력 + 테마 + 카오모지 토글 ── */}
        {tab === "all" && mode === "decorate" ? (
          <>
            <div className={styles.searchRow}>
              <input
                type="text"
                className={styles.search}
                placeholder={t.decorateInputPh}
                value={decorateInput}
                onChange={(e) => setDecorateInput(e.target.value)}
                aria-label={t.decorateInputAria}
                maxLength={40}
              />
              <button
                type="button"
                className={styles.dice}
                onClick={() => setDecorateSeed((s) => s + 1)}
                aria-label={t.diceOtherCombo}
                title={t.diceOtherComboTitle}
              >
                🎲
              </button>
            </div>
            <div className={styles.chips} role="tablist" aria-label={t.decorateThemesAria}>
              {THEMES.map((th) => (
                <Chip
                  key={th.id}
                  selected={th.id === decorateTheme}
                  onClick={() => setDecorateTheme(th.id)}
                  className={styles.chip}
                >
                  <span aria-hidden>{th.emoji}</span>{" "}
                  {en ? THEME_EN[th.id] ?? th.label : th.label}
                </Chip>
              ))}
            </div>
            <div className={styles.styleRow} aria-label={t.decorateOptionsAria}>
              <Chip
                selected={decorateKao}
                onClick={() => setDecorateKao((v) => !v)}
                className={styles.styleChip}
              >
                {decorateKao ? t.kaomojiOn : t.kaomojiOff}
              </Chip>
            </div>
          </>
        ) : null}
      </div>

      {/* ── 본문 ── */}
      <div className={styles.gridScroll}>
        {tab === "all" && mode === "decorate" ? (
          <div className={styles.fontList}>
            <p className={styles.decoHint}>{t.decoHint}</p>
            {decorateOutputs.map((text, i) => {
              const isFav = favs.includes(text);
              return (
                <div key={`${text}-${i}`} className={styles.fontCard}>
                  <button
                    type="button"
                    className={styles.fontPreview}
                    onClick={() => onCopy(text)}
                    aria-label={`${text} ${t.copySuffix}`}
                    title={t.copyTitle}
                  >
                    {text}
                  </button>
                  <button
                    type="button"
                    className={`${styles.star} ${isFav ? styles.starOn : ""}`}
                    onClick={() => onToggleFav(text)}
                    aria-pressed={isFav}
                    aria-label={isFav ? t.starRemove : t.starAdd}
                  >
                    {isFav ? "★" : "☆"}
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              className={styles.moreBtn}
              onClick={() => setDecorateSeed((s) => s + 1)}
            >
              {t.decoMoreBtn}
            </button>
          </div>
        ) : tab === "all" && mode === "font" ? (
          <div className={styles.fontList}>
            {fontOutputs.map((f) => {
              const isFav = favs.includes(f.text);
              return (
                <div key={f.id} className={styles.fontCard}>
                  <span className={styles.fontLabel}>{f.label}</span>
                  <button
                    type="button"
                    className={styles.fontPreview}
                    onClick={() => onCopy(f.text)}
                    aria-label={`${f.label} ${t.copySuffix}: ${f.text}`}
                    title={t.copyTitle}
                  >
                    {f.text}
                  </button>
                  <button
                    type="button"
                    className={`${styles.star} ${isFav ? styles.starOn : ""}`}
                    onClick={() => onToggleFav(f.text)}
                    aria-pressed={isFav}
                    aria-label={isFav ? t.starRemove : t.starAdd}
                  >
                    {isFav ? "★" : "☆"}
                  </button>
                </div>
              );
            })}
            <p className={styles.honest}>{t.fontHonest}</p>
          </div>
        ) : gridTexts.length === 0 ? (
          <p className={styles.empty}>{tab === "fav" ? t.emptyFav : t.emptyNone}</p>
        ) : (
          <div className={styles.grid}>
            {gridTexts.map((text, i) => {
              const isFav = favs.includes(text);
              return (
                <div key={`${text}-${i}`} className={styles.card}>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => onCopy(text)}
                    aria-label={`${text} ${t.copySuffix}`}
                    title={t.copyTitle}
                  >
                    <span className={styles.moji}>{text}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.star} ${styles.starCorner} ${isFav ? styles.starOn : ""}`}
                    onClick={() => onToggleFav(text)}
                    aria-pressed={isFav}
                    aria-label={isFav ? t.starRemove : t.starAdd}
                  >
                    {isFav ? "★" : "☆"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "all" && mode === "kaomoji" && !query.trim() ? (
          <button type="button" className={styles.moreBtn} onClick={reroll}>
            {t.moreBtnPrefix}
            {emoLabel(curEmotion)}
            {t.moreBtnSuffix}
          </button>
        ) : null}
      </div>

      {/* ── 하단 탭바 ── */}
      <nav className={styles.tabbar} aria-label={t.viewSwitchAria}>
        <button
          type="button"
          className={`${styles.tab} ${tab === "all" ? styles.tabOn : ""}`}
          onClick={() => setTab("all")}
          aria-pressed={tab === "all"}
        >
          {t.tabAll}
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "fav" ? styles.tabOn : ""}`}
          onClick={() => setTab("fav")}
          aria-pressed={tab === "fav"}
        >
          {t.tabFav}
          {favs.length ? ` (${favs.length})` : ""}
        </button>
      </nav>

      <div className={styles.toastWrap} aria-live="polite" aria-atomic="true">
        {toast ? <div className={styles.toast}>{toast}</div> : null}
      </div>
    </div>
  );
}
