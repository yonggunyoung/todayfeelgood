"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chip } from "@webapp/ui";
import { EMOTIONS, EMOTION_BY_ID } from "../../lib/emotions";
import {
  DEFAULT_STYLE,
  generateSet,
  type TextmojiStyle,
} from "../../lib/generate";
import { CURATED } from "../../lib/curated";
import { SYMBOL_CATS } from "../../lib/symbols";
import { FONTS } from "../../lib/fonts";
import { copyText } from "../../lib/clipboard";
import {
  loadFavorites,
  saveFavorites,
  toggleFavorite,
} from "../../lib/favorites";
import styles from "./TextmojiStudio.module.css";

type Mode = "kaomoji" | "symbol" | "font";
type Tab = "all" | "fav";
const GRID = 12;
const FONT_SAMPLE = "Aa Bb 123";

const MODES: { id: Mode; label: string; emoji: string }[] = [
  { id: "kaomoji", label: "카오모지", emoji: "ʕ•ᴥ•ʔ" },
  { id: "symbol", label: "특수기호", emoji: "✦" },
  { id: "font", label: "인싸폰트", emoji: "𝓐𝒶" },
];

export default function TextmojiStudio() {
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
  const kaomojiItems = useMemo<string[]>(() => {
    const curated = CURATED.filter((c) => c.emotion === emotion).map((c) => c.text);
    const gen = generated.map((g) => g.text);
    const merged = showGenerated ? [...gen, ...curated] : curated;
    const q = query.trim().toLowerCase();
    if (!q) return Array.from(new Set(merged));
    const matchEmotions = EMOTIONS.filter(
      (e) => e.label.includes(q) || e.keywords.some((k) => k.toLowerCase().includes(q))
    ).map((e) => e.id);
    // 검색 시엔 전체 큐레이션에서 감정 키워드/텍스트로 매칭
    const pool = matchEmotions.length
      ? CURATED.filter((c) => matchEmotions.includes(c.emotion)).map((c) => c.text)
      : merged.filter((t) => t.toLowerCase().includes(q));
    return Array.from(new Set(pool));
  }, [emotion, showGenerated, generated, query]);

  // ── 특수기호 목록 ──
  const symbolItems = useMemo<string[]>(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      const hits: string[] = [];
      for (const cat of SYMBOL_CATS) {
        const catMatch =
          cat.label.includes(q) || cat.keywords.some((k) => k.toLowerCase().includes(q));
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
    return FONTS.map((f) => ({ id: f.id, label: f.label, text: f.transform(src) }));
  }, [fontInput]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1500);
  }, []);

  const onCopy = useCallback(
    async (text: string) => {
      const ok = await copyText(text);
      showToast(ok ? "복사했다 너굴! 붙여넣기 해 봐 ✨" : "복사 실패… 길게 눌러 직접 복사해 줘.");
    },
    [showToast]
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

  const showSearch = tab === "all" && mode !== "font";

  return (
    <div className={styles.app}>
      <div className={styles.sticky}>
        {/* ── 매크로 모드 바 ── */}
        {tab === "all" ? (
          <div className={styles.modeBar} role="tablist" aria-label="콘텐츠 종류">
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
                {m.label}
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
              placeholder={
                mode === "kaomoji" ? "감정·키워드 검색 (곰, 우는, 하트…)" : "기호 검색 (별, 화살표, 하트…)"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="검색"
            />
            {mode === "kaomoji" ? (
              <button
                type="button"
                className={styles.dice}
                onClick={reroll}
                aria-label="더 만들기 — 새 조합 생성"
                title="🎲 더 만들기"
              >
                🎲
              </button>
            ) : null}
          </div>
        ) : null}

        {/* ── 카오모지: 감정칩 + 스타일 ── */}
        {tab === "all" && mode === "kaomoji" ? (
          <>
            <div className={styles.chips} role="tablist" aria-label="감정 카테고리">
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
                    <span aria-hidden>{e.emoji}</span> {e.label}
                    {e.trend ? <span className={styles.trendDot}> ·HOT</span> : null}
                  </Chip>
                ))}
            </div>
            <div className={styles.styleRow} aria-label="생성 스타일">
              <Chip
                selected={style.animalFace}
                onClick={() => setStyle((s) => ({ ...s, animalFace: !s.animalFace }))}
                className={styles.styleChip}
              >
                동물상
              </Chip>
              <Chip
                selected={style.action}
                onClick={() => setStyle((s) => ({ ...s, action: !s.action }))}
                className={styles.styleChip}
              >
                액션형
              </Chip>
              <Chip
                selected={style.symmetric}
                onClick={() => setStyle((s) => ({ ...s, symmetric: !s.symmetric }))}
                className={styles.styleChip}
              >
                좌우대칭
              </Chip>
              <Chip
                selected={style.fancy >= 2}
                onClick={() =>
                  setStyle((s) => ({ ...s, fancy: s.fancy >= 2 ? 0 : s.fancy + 1 }))
                }
                className={styles.styleChip}
              >
                장식 {style.fancy}
              </Chip>
            </div>
          </>
        ) : null}

        {/* ── 특수기호: 카테고리칩 ── */}
        {tab === "all" && mode === "symbol" ? (
          <div className={styles.chips} role="tablist" aria-label="기호 카테고리">
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
                <span aria-hidden>{c.emoji}</span> {c.label}
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
              placeholder="여기에 영어·숫자를 입력하면 폰트로 변환돼요"
              value={fontInput}
              onChange={(e) => setFontInput(e.target.value)}
              aria-label="인싸폰트로 변환할 글자"
              maxLength={60}
            />
          </div>
        ) : null}
      </div>

      {/* ── 본문 ── */}
      <div className={styles.gridScroll}>
        {tab === "all" && mode === "font" ? (
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
                    aria-label={`${f.label} 복사: ${f.text}`}
                    title="탭하면 복사"
                  >
                    {f.text}
                  </button>
                  <button
                    type="button"
                    className={`${styles.star} ${isFav ? styles.starOn : ""}`}
                    onClick={() => onToggleFav(f.text)}
                    aria-pressed={isFav}
                    aria-label={isFav ? "즐겨찾기 해제" : "즐겨찾기"}
                  >
                    {isFav ? "★" : "☆"}
                  </button>
                </div>
              );
            })}
            <p className={styles.honest}>
              인싸폰트는 영어·숫자만 변환돼요. 일부 기기·앱에선 다르게 보일 수 있어요.
            </p>
          </div>
        ) : gridTexts.length === 0 ? (
          <p className={styles.empty}>
            {tab === "fav"
              ? "아직 즐겨찾기가 없어 너굴. 마음에 드는 카드의 ☆를 눌러 봐."
              : "조건에 맞는 게 없어 너굴. 다른 검색어나 카테고리를 골라 봐."}
          </p>
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
                    aria-label={`${text} 복사`}
                    title="탭하면 복사"
                  >
                    <span className={styles.moji}>{text}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.star} ${styles.starCorner} ${isFav ? styles.starOn : ""}`}
                    onClick={() => onToggleFav(text)}
                    aria-pressed={isFav}
                    aria-label={isFav ? "즐겨찾기 해제" : "즐겨찾기"}
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
            🎲 {curEmotion?.label ?? ""} 더 만들기
          </button>
        ) : null}
      </div>

      {/* ── 하단 탭바 ── */}
      <nav className={styles.tabbar} aria-label="보기 전환">
        <button
          type="button"
          className={`${styles.tab} ${tab === "all" ? styles.tabOn : ""}`}
          onClick={() => setTab("all")}
          aria-pressed={tab === "all"}
        >
          전체
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "fav" ? styles.tabOn : ""}`}
          onClick={() => setTab("fav")}
          aria-pressed={tab === "fav"}
        >
          ★ 즐겨찾기{favs.length ? ` (${favs.length})` : ""}
        </button>
      </nav>

      <div className={styles.toastWrap} aria-live="polite" aria-atomic="true">
        {toast ? <div className={styles.toast}>{toast}</div> : null}
      </div>
    </div>
  );
}
