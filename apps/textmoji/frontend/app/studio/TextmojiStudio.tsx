"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chip } from "@webapp/ui";
import { EMOTIONS, EMOTION_BY_ID } from "../../lib/emotions";
import {
  DEFAULT_STYLE,
  generateSet,
  type TextmojiItem,
  type TextmojiStyle,
} from "../../lib/generate";
import { CURATED } from "../../lib/curated";
import { estimateTier, TIER_META, type SafetyTier } from "../../lib/safety";
import { copyText } from "../../lib/clipboard";
import {
  loadFavorites,
  saveFavorites,
  toggleFavorite,
} from "../../lib/favorites";
import styles from "./TextmojiStudio.module.css";

type Tab = "all" | "fav";
const GRID = 12;

/** 큐레이션 시드 → 표시 항목(등급은 런타임 재산정 = 정직성) */
function curatedItems(emotionId: string): TextmojiItem[] {
  return CURATED.filter((c) => c.emotion === emotionId).map((c) => ({
    text: c.text,
    tier: estimateTier(c.text),
    emotion: c.emotion,
    source: "curated" as const,
  }));
}

export default function TextmojiStudio() {
  const [emotion, setEmotion] = useState<string>(EMOTIONS[0]!.id);
  const [style, setStyle] = useState<TextmojiStyle>(DEFAULT_STYLE);
  const [seed, setSeed] = useState(1);
  const [showGenerated, setShowGenerated] = useState(false);
  const [safeOnly, setSafeOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [favs, setFavs] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 즐겨찾기 로드(localStorage, 클라 전용)
  useEffect(() => {
    setFavs(loadFavorites());
  }, []);

  const maxTier: SafetyTier | undefined = safeOnly ? "safe" : undefined;

  // 절차 생성 세트 — 같은 (감정·스타일·시드)면 항상 같은 결과(재현)
  const generated = useMemo(
    () =>
      showGenerated
        ? generateSet(emotion, style, seed, GRID, maxTier)
        : [],
    [showGenerated, emotion, style, seed, maxTier]
  );

  // 첫인상 = 큐레이션, "더 만들기" 누르면 생성물 추가
  const baseItems = useMemo<TextmojiItem[]>(() => {
    const curated = curatedItems(emotion);
    return showGenerated ? [...generated, ...curated] : curated;
  }, [emotion, showGenerated, generated]);

  // 탭/검색/안전필터 적용 + 안전 우선 정렬
  const items = useMemo<TextmojiItem[]>(() => {
    let list: TextmojiItem[];
    if (tab === "fav") {
      list = favs.map((text) => ({
        text,
        tier: estimateTier(text),
        source: "curated" as const,
      }));
    } else {
      list = baseItems;
    }
    if (maxTier) list = list.filter((it) => it.tier === "safe");
    const q = query.trim().toLowerCase();
    if (q) {
      // 키워드: 감정 라벨/키워드 또는 텍스트 자체 부분일치
      const matchEmotions = EMOTIONS.filter(
        (e) =>
          e.label.includes(q) ||
          e.keywords.some((k) => k.toLowerCase().includes(q))
      ).map((e) => e.id);
      list = list.filter(
        (it) =>
          it.text.toLowerCase().includes(q) ||
          (it.emotion ? matchEmotions.includes(it.emotion) : false)
      );
    }
    // 안전 우선 정렬(같은 등급은 원래 순서 유지)
    return [...list].sort(
      (a, b) => TIER_META[a.tier].rank - TIER_META[b.tier].rank
    );
  }, [tab, favs, baseItems, maxTier, query]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }, []);

  const onCopy = useCallback(
    async (it: TextmojiItem) => {
      const ok = await copyText(it.text);
      if (!ok) {
        showToast("복사 실패했다 너굴… 길게 눌러 직접 복사해 줘.");
        return;
      }
      if (it.tier === "fancy") {
        showToast("받았다 너굴! 근데 상대 기기에선 □로 깨질 수 있어 너굴.");
      } else if (it.tier === "ok") {
        showToast("복사했다 너굴! 구형 기기에선 살짝 깨질 수도 있어 너굴.");
      } else {
        showToast("복사했다 너굴!");
      }
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

  return (
    <div className={styles.app}>
      {/* ── 상단 고정: 검색 + 감정칩 ── */}
      <div className={styles.sticky}>
        <div className={styles.searchRow}>
          <input
            type="search"
            className={styles.search}
            placeholder="감정·키워드 검색 (곰, 우는, 하트…)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="텍스트 이모티콘 검색"
          />
          <button
            type="button"
            className={styles.dice}
            onClick={reroll}
            aria-label="더 만들기 — 새 조합 생성"
            title="🎲 더 만들기"
          >
            🎲
          </button>
        </div>

        <div className={styles.chips} role="tablist" aria-label="감정 카테고리">
          {EMOTIONS.slice()
            .sort((a, b) => Number(Boolean(b.trend)) - Number(Boolean(a.trend)))
            .map((e) => (
              <Chip
                key={e.id}
                selected={e.id === emotion && tab === "all"}
                onClick={() => {
                  setEmotion(e.id);
                  setTab("all");
                  setShowGenerated(false);
                }}
                className={styles.chip}
              >
                <span aria-hidden>{e.emoji}</span> {e.label}
                {e.trend ? <span className={styles.trendDot} aria-label="트렌드"> ·HOT</span> : null}
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
          <Chip
            selected={safeOnly}
            onClick={() => setSafeOnly((v) => !v)}
            className={styles.styleChip}
            title="🟢 안전등급만 보기"
          >
            🟢 안전만
          </Chip>
        </div>
      </div>

      {/* ── 큰 이모티콘 그리드 ── */}
      <div className={styles.gridScroll}>
        {items.length === 0 ? (
          <p className={styles.empty}>
            {tab === "fav"
              ? "아직 즐겨찾기가 없어 너굴. 마음에 드는 카드의 ★를 눌러 봐."
              : "조건에 맞는 게 없어 너굴. 🎲 더 만들기로 새로 뽑아 봐."}
          </p>
        ) : (
          <div className={styles.grid}>
            {items.map((it, i) => {
              const m = TIER_META[it.tier];
              const isFav = favs.includes(it.text);
              return (
                <div key={`${it.text}-${i}`} className={styles.card}>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => onCopy(it)}
                    aria-label={`${it.text} 복사 (${m.label}: ${m.short})`}
                    title="탭하면 복사"
                  >
                    <span className={styles.moji}>{it.text}</span>
                  </button>
                  <div className={styles.cardMeta}>
                    <span
                      className={styles.badge}
                      data-tier={it.tier}
                      title={`${m.label} — ${m.short} (추정치)`}
                    >
                      {m.dot} {m.label}
                    </span>
                    {it.source === "generated" ? (
                      <span className={styles.src} title="절차적으로 방금 생성됨">
                        생성
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className={`${styles.star} ${isFav ? styles.starOn : ""}`}
                      onClick={() => onToggleFav(it.text)}
                      aria-pressed={isFav}
                      aria-label={isFav ? "즐겨찾기 해제" : "즐겨찾기"}
                    >
                      {isFav ? "★" : "☆"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "all" ? (
          <button type="button" className={styles.moreBtn} onClick={reroll}>
            🎲 {curEmotion?.label ?? ""} 더 만들기
          </button>
        ) : null}

        <p className={styles.honest}>
          등급은 <b>추정치</b>예요. 같은 글자도 카톡·인스타·디스코드·구형폰에서
          □로 깨질 수 있어요. 🟢 안전부터 쓰는 걸 권해요.
        </p>
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

      {/* 복사 알림(aria-live) */}
      <div className={styles.toastWrap} aria-live="polite" aria-atomic="true">
        {toast ? <div className={styles.toast}>{toast}</div> : null}
      </div>
    </div>
  );
}
