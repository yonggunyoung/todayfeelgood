"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BASIC_JAMO,
  DEFAULT_REFINE,
  FONT_FORMATS,
  FREE_FORMATS,
  FULL_FORMATS,
  type DrawnGlyph,
  type FontFormat,
  type FontScript,
  type GlyphStroke,
  type HandwritingRequest,
  type HandwritingResponse,
  type RefineParams,
} from "@webapp/core";
import { BrushUnderline, Button, HelpTip, Mascot, Segmented } from "@webapp/ui";
import { apiPath } from "../../../lib/paths";
import { JAMO_NAMES } from "../../../lib/hangul";
import GlyphCell from "../../../components/GlyphCell";
import RefinePanel from "../../../components/RefinePanel";
import HandwritingPreview from "../../../components/HandwritingPreview";
import HandwritingImagePanel from "../../../components/HandwritingImagePanel";
import LetterPanel from "../../../components/LetterPanel";
import HangulPreview from "../../../components/HangulPreview";
import HangulImagePanel from "../../../components/HangulImagePanel";
import FontStudio from "./FontStudio";
import styles from "./HandwritingStudio.module.css";

// 그리기/다듬기 변경 후 폰트 호출까지 디바운스(ms). 그리기는 자주 바뀌므로 넉넉히.
const DEBOUNCE_MS = 700;

// 타깃: 라틴 소문자 a–z (원하는 만큼만 그려도 됨)
const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

const FORMAT_OPTIONS: { value: FontFormat; label: string; full: boolean }[] =
  FULL_FORMATS.map((f) => ({
    value: f,
    label: f.toUpperCase(),
    full: !FREE_FORMATS.includes(f),
  }));

function base64ToBlob(b64: string, mime: string): Blob {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

type Mode = "draw" | "sample";

// 진입 "만드는 방법" 3갈래. mode/autofill의 상위 입구(UI). 선택 시 둘을 함께 세팅한다.
type Method = "quick" | "full" | "sample";

// 카피 — 스튜디오는 i18n 비대상(KO 고정)이라 ko 사전 값을 그대로 인라인. (ko/en 사전엔 동일 키 보유)
const ENTRY = {
  legend: "어떻게 만들까요?",
  hint: "고르면 바로 시작해요. 위에서 언제든 바꿀 수 있어요 너굴.",
  quick: {
    emoji: "🪄",
    badge: "추천 · 쉬움",
    title: "몇 자만 그리기",
    desc: "개성 글자 몇 개만 그리면 나머지는 내 스타일로 자동 채움.",
    help: "내가 좋아하는 글자 몇 개만 그려요. 안 그린 글자는 내 획 느낌(굵기·기울기)에 맞춰 자동으로 채워 줘요. 자동 채운 글자는 내 글씨가 아니라 정직하게 표시해요 너굴.",
    honesty: "안 그린 글자는 자동으로 채워요(내 글씨 아님). 견본에 정직하게 표시돼요.",
  },
  full: {
    emoji: "✍️",
    badge: "정성파",
    title: "다 직접 그리기",
    desc: "전부 내 손으로. 자동 채움 없이 진짜 내 글씨만.",
    help: "글자를 전부 직접 그려요. 자동 채움은 꺼져요 — 화면에 보이는 건 100% 내가 그린 획이에요.",
  },
  sample: {
    emoji: "🎚️",
    badge: "그리기 싫을 때",
    title: "안 그리고 빠르게",
    desc: "그리지 않고 슬라이더로 기성 폰트를 변형해 빠르게 둘러봐요.",
    help: "그리지 않고 공개 폰트를 슬라이더(굵기·기울기 등)로 변형해요. 진짜 내 글씨는 아니지만 가장 빨라요.",
  },
} as const;

const METHOD_ORDER: Method[] = ["quick", "full", "sample"];

/**
 * 손글씨 공방 메인(클라이언트).
 * 메인 = "직접 그리기 → 내 손글씨 폰트". 빠른 시작 샘플(슬라이더 스튜디오)은 보조 탭으로 강등.
 *
 * 흐름: 글자 그리드(셀 정규화 0..1 폴리라인 캡처) + 다듬기 → 디바운스
 *      → /api/handwriting → fontBase64 → @font-face 등록 → 내가 그린 글자로 예문 렌더 → 다운로드.
 */
export default function HandwritingStudio() {
  const [mode, setMode] = useState<Mode>("draw");
  // 스크립트 전환(라틴 a–z ↔ 한글 기본 자모). 각각 독립 그리드 맵을 둔다.
  const [script, setScript] = useState<FontScript>("latin");
  // char → strokes 맵(그린 것만 보관)
  const [glyphMap, setGlyphMap] = useState<Record<string, GlyphStroke[]>>({});
  // 한글 자모 char → strokes 맵
  const [jamoMap, setJamoMap] = useState<Record<string, GlyphStroke[]>>({});
  const [refine, setRefine] = useState<RefineParams>(DEFAULT_REFINE);
  // 자동 채우기: 안 그린 글자를 내 스타일로 베이스 폰트가 채움(엔진 병행 — 미지원이면 무시).
  const [autofill, setAutofill] = useState(false);
  const [previewFont, setPreviewFont] = useState<string | null>(null);
  // 엔진이 자동 채운 글자 목록(정직성 라벨용). 응답에 필드 없으면 빈 배열.
  const [filledChars, setFilledChars] = useState<string[]>([]);
  const [fontFamily, setFontFamily] = useState("MyHandwriting");
  const [generatedBy, setGeneratedBy] = useState<string>("handwriting");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<FontFormat>("woff");
  const [justDownloaded, setJustDownloaded] = useState(false);
  // 라틴 결과물 형태: 이미지/짤 ↔ 편지
  const [latinResult, setLatinResult] = useState<"image" | "letter">("image");

  // 진입 입구 선택 → mode/autofill 동시 세팅. (mode/autofill이 여전히 단일 출처, method는 그 위 UI)
  const method: Method = mode === "sample" ? "sample" : autofill ? "quick" : "full";
  const chooseMethod = useCallback((m: Method) => {
    if (m === "sample") {
      setMode("sample");
      return;
    }
    setMode("draw");
    setAutofill(m === "quick");
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  // 그린(획이 있는) 글자만 추린 목록. 진행률/페이로드/프리뷰에 공통 사용.
  const drawnChars = useMemo(
    () => ALPHABET.filter((ch) => (glyphMap[ch]?.length ?? 0) > 0),
    [glyphMap]
  );

  const glyphs: DrawnGlyph[] = useMemo(
    () => drawnChars.map((ch) => ({ char: ch, strokes: glyphMap[ch]! })),
    [drawnChars, glyphMap]
  );

  // 폰트가 실제로 커버하는 글자(내가 그린 것 + 엔진이 자동 채운 것). 편지/이미지 렌더 가드용.
  const coveredChars = useMemo(
    () => Array.from(new Set([...drawnChars, ...filledChars.map((c) => c.toLowerCase())])),
    [drawnChars, filledChars]
  );

  const onCellChange = useCallback((char: string, strokes: GlyphStroke[]) => {
    setGlyphMap((prev) => {
      const next = { ...prev };
      if (strokes.length === 0) delete next[char];
      else next[char] = strokes;
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setGlyphMap({}), []);

  // ── 한글 자모 ──
  const drawnJamoChars = useMemo(
    () => BASIC_JAMO.filter((j) => (jamoMap[j]?.length ?? 0) > 0),
    [jamoMap]
  );
  const jamoGlyphs: DrawnGlyph[] = useMemo(
    () => drawnJamoChars.map((j) => ({ char: j, strokes: jamoMap[j]! })),
    [drawnJamoChars, jamoMap]
  );
  const onJamoChange = useCallback((char: string, strokes: GlyphStroke[]) => {
    setJamoMap((prev) => {
      const next = { ...prev };
      if (strokes.length === 0) delete next[char];
      else next[char] = strokes;
      return next;
    });
  }, []);
  const clearAllJamo = useCallback(() => setJamoMap({}), []);

  // 손글씨 폰트 생성(프리뷰). 항상 woff로 가볍게.
  const generate = useCallback(
    async (gs: DrawnGlyph[], rf: RefineParams, fill: boolean) => {
      if (gs.length === 0) {
        setPreviewFont(null);
        setFilledChars([]);
        return;
      }
      const myId = ++reqIdRef.current;
      setLoading(true);
      setError(null);
      const payload: HandwritingRequest = { glyphs: gs, refine: rf, format: "woff", autofill: fill };
      try {
        const res = await fetch(apiPath("/api/handwriting"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || `요청 실패 (${res.status})`);
        }
        const data = (await res.json()) as HandwritingResponse & { filledChars?: string[] };
        if (myId !== reqIdRef.current) return;
        setPreviewFont(data.fontBase64);
        setFontFamily(data.fontFamily || "MyHandwriting");
        setGeneratedBy(data.generatedBy || "handwriting");
        // 엔진이 자동 채움 목록을 주면 정직 표기, 아니면 빈 배열(graceful).
        setFilledChars(Array.isArray(data.filledChars) ? data.filledChars : []);
      } catch (err) {
        if (myId !== reqIdRef.current) return;
        setError(err instanceof Error ? err.message : "폰트 생성 중 오류가 발생했습니다.");
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    },
    []
  );

  // 그리드/다듬기 변경 시 디바운스 후 생성(그리기 모드 + 라틴 스크립트일 때만).
  // 한글은 문구 의존 합성이라 각 한글 컴포넌트가 자체 호출한다.
  useEffect(() => {
    if (mode !== "draw" || script !== "latin") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void generate(glyphs, refine, autofill);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [glyphs, refine, autofill, mode, script, generate]);

  const handleDownload = useCallback(async () => {
    if (glyphs.length === 0) return;
    setDownloading(true);
    setError(null);
    try {
      const payload: HandwritingRequest = { glyphs, refine, format, autofill };
      const res = await fetch(apiPath("/api/handwriting"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || `요청 실패 (${res.status})`);
      }
      const data = (await res.json()) as HandwritingResponse;
      const meta = FONT_FORMATS[data.format] ?? FONT_FORMATS[format];
      const blob = base64ToBlob(data.fontBase64, meta.mime);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-handwriting-${drawnChars.length}glyphs.${meta.ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setJustDownloaded(true);
      window.setTimeout(() => setJustDownloaded(false), 3200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloading(false);
    }
  }, [glyphs, refine, format, autofill, drawnChars.length]);

  const progress = drawnChars.length;
  const jamoProgress = drawnJamoChars.length;

  const renderActions = (variant: "panel" | "bar") => (
    <div className={variant === "bar" ? styles.actionBarInner : styles.actionsPanel}>
      <Segmented<FontFormat>
        ariaLabel="파일 형식"
        value={format}
        onChange={setFormat}
        options={[
          { value: "woff", label: "WOFF" },
          { value: "ttf", label: "TTF" },
        ]}
        className={styles.formatSeg}
      />
      <Button
        variant="clay"
        onClick={handleDownload}
        disabled={downloading || loading || progress === 0}
        className={styles.downloadBtn}
      >
        {downloading ? "내려받는 중…" : `${format.toUpperCase()}로 받기`}
      </Button>
    </div>
  );

  return (
    <main className={`container ${styles.studio}`}>
      <header className={styles.header}>
        <h1 className={`display ${styles.title}`}>
          <span className={styles.titleWord}>
            직접 그려 만드는 내 손글씨 폰트
            <BrushUnderline className={styles.titleUnderline} />
          </span>
        </h1>
        <p className={styles.lead}>
          칸마다 글자를 그리면, 진짜 내가 그린 획으로 폰트를 구워 드려요. 원하는
          글자만 그려도 됩니다. 다듬기로 손맛을 살린 채 단정하게.
        </p>
        {/* ── 만드는 방법 3갈래(진입 1스텝) — 언제든 바꿀 수 있게 상단 고정 ── */}
        <fieldset className={styles.entry}>
          <legend className={styles.entryLegend}>{ENTRY.legend}</legend>
          <div className={styles.entryCards} role="radiogroup" aria-label={ENTRY.legend}>
            {METHOD_ORDER.map((m) => {
              const meta = ENTRY[m];
              const selected = method === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`${styles.entryCard} ${selected ? styles.entryCardOn : ""} ${
                    m === "quick" ? styles.entryCardHero : ""
                  }`}
                  onClick={() => chooseMethod(m)}
                >
                  {m === "quick" && (
                    <span className={styles.entryBadge}>{meta.badge}</span>
                  )}
                  <span className={styles.entryEmoji} aria-hidden>
                    {meta.emoji}
                  </span>
                  <span className={styles.entryCardBody}>
                    <span className={styles.entryTitle}>
                      {meta.title}
                      {m !== "quick" && (
                        <span className={styles.entryBadgeInline}>{meta.badge}</span>
                      )}
                    </span>
                    <span className={styles.entryDesc}>{meta.desc}</span>
                  </span>
                  <HelpTip
                    label={meta.title}
                    align={m === "sample" ? "end" : "center"}
                    className={styles.entryHelp}
                  >
                    {meta.help}
                  </HelpTip>
                </button>
              );
            })}
          </div>
          <p className={styles.entryHint}>{ENTRY.hint}</p>
          {method === "quick" && (
            <p className={styles.entryHonesty}>{ENTRY.quick.honesty}</p>
          )}
        </fieldset>

        {mode === "draw" && (
          <div className={styles.modeTabs}>
            <Segmented<FontScript>
              ariaLabel="문자 종류"
              value={script}
              onChange={setScript}
              options={[
                { value: "latin", label: "영문 a–z" },
                { value: "hangul", label: "한글 자모" },
              ]}
            />
            <span className={styles.modeHint}>
              {script === "hangul"
                ? "기본 자모 24자를 그려 음절을 조합해요(조합 티가 있을 수 있어요)."
                : "소문자 a–z를 직접 그려요."}
            </span>
          </div>
        )}
      </header>

      {mode === "sample" ? (
        // 빠른 시작 샘플 — 기존 슬라이더 스튜디오를 보조로 그대로 임베드(헤더 없이 본문만).
        <div className={styles.sampleWrap}>
          <FontStudio embedded />
        </div>
      ) : (
        <div className={styles.grid}>
          <section className={styles.tools}>
            {/* ── 글자/자모 그리드 ── */}
            <div className={styles.group}>
              <div className={styles.groupHead}>
                <h2 className={styles.groupTitle}>
                  {script === "hangul" ? "기본 자모 그리기" : "글자 그리기"}
                  <HelpTip label="글자 그리기" align="start">
                    칸마다 마우스·손가락으로 글자를 그려요. 칸 오른쪽 위 <strong>⤢</strong>를
                    누르면 <strong>크게</strong> 펼쳐 세밀하게 그릴 수 있어요. 원하는 글자만
                    그려도 돼요 너굴.
                  </HelpTip>
                </h2>
                <span className={styles.progress} aria-live="polite">
                  {script === "hangul" ? `${jamoProgress} / 24` : `${progress} / 26`}
                </span>
              </div>
              <p className={styles.groupSub}>
                {script === "hangul"
                  ? "자음 14 + 모음 10, 기본 자모 24자를 칸마다 그려요. 중앙 십자선에 맞춰 균형 있게. 한 자모에 여러 획 가능."
                  : "칸마다 마우스·손가락으로 글자를 그려요. 가이드선(어센더·x높이·베이스라인)에 맞춰 그리면 더 고르게 나와요. 한 글자에 여러 획 가능."}
              </p>
              {script === "hangul" ? (
                <div
                  className={styles.gridCells}
                  role="group"
                  aria-label="기본 자모 24자 그리기 칸"
                >
                  {BASIC_JAMO.map((j) => (
                    <GlyphCell
                      key={j}
                      char={j}
                      labelName={JAMO_NAMES[j] ?? j}
                      script="hangul"
                      strokes={jamoMap[j] ?? []}
                      onChange={onJamoChange}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className={styles.gridCells}
                  role="group"
                  aria-label="a부터 z까지 글자 그리기 칸"
                >
                  {ALPHABET.map((ch) => (
                    <GlyphCell
                      key={ch}
                      char={ch}
                      strokes={glyphMap[ch] ?? []}
                      onChange={onCellChange}
                      disabled={downloading}
                    />
                  ))}
                </div>
              )}
              <div className={styles.gridActions}>
                {method === "quick" && (
                  <span className={styles.autofillTag}>🪄 자동 채움 켜짐</span>
                )}
                <button
                  type="button"
                  className={styles.clearAllBtn}
                  onClick={script === "hangul" ? clearAllJamo : clearAll}
                  disabled={
                    script === "hangul"
                      ? jamoProgress === 0
                      : progress === 0 || downloading
                  }
                >
                  전체 지우기
                </button>
              </div>
            </div>

            {/* ── 다듬기 ── */}
            <details className={styles.group} open>
              <summary className={styles.accSummary}>
                <span className={styles.accTitle}>다듬기</span>
                <span className={styles.accSub}>개성은 살리고, 글씨체로</span>
              </summary>
              <div className={styles.accBody}>
                <RefinePanel value={refine} onChange={setRefine} disabled={downloading} />
              </div>
            </details>

            <div className={styles.statusRow} aria-live="polite">
              {script === "latin" && loading && (
                <span className={styles.status}>네 글씨 굽는 중…</span>
              )}
              {script === "latin" && error && (
                <span className={styles.error} role="alert">
                  {error}
                </span>
              )}
            </div>
          </section>

          {/* ── 견본 + 결과물 ── */}
          <section className={styles.preview}>
            {script === "hangul" ? (
              <>
                <HangulPreview
                  jamo={jamoGlyphs}
                  drawnJamo={drawnJamoChars}
                  refine={refine}
                  autofill={autofill}
                />
                {/* 한글 결과물 = 그린 자모로 음절을 조합한 문구 이미지 */}
                <HangulImagePanel
                  jamo={jamoGlyphs}
                  drawnJamo={drawnJamoChars}
                  refine={refine}
                  autofill={autofill}
                />
              </>
            ) : (
              <>
                <HandwritingPreview
                  fontBase64={previewFont}
                  fontFamily={fontFamily}
                  drawnChars={drawnChars}
                  filledChars={filledChars}
                  autofill={autofill}
                  loading={loading}
                  generatedBy={generatedBy}
                />

                {/* 결과물 형태 선택: 이미지/짤 ↔ 편지 */}
                <div className={styles.resultTabs}>
                  <Segmented<"image" | "letter">
                    ariaLabel="결과물 형태"
                    value={latinResult}
                    onChange={setLatinResult}
                    options={[
                      { value: "image", label: "이미지·짤" },
                      { value: "letter", label: "편지 쓰기" },
                    ]}
                  />
                </div>

                {latinResult === "image" ? (
                  // 주력 결과물 = 바로 쓰는 이미지(카톡/인스타). 폰트는 엔진.
                  <HandwritingImagePanel
                    fontBase64={previewFont}
                    fontFamily={fontFamily}
                    drawnChars={coveredChars}
                    glyphs={glyphs}
                    refine={refine}
                    autofill={autofill}
                  />
                ) : (
                  // 내 폰트로 편지쓰기 — 편지지에 긴 글 → PNG.
                  <LetterPanel
                    fontBase64={previewFont}
                    coveredChars={coveredChars}
                    autofill={autofill}
                  />
                )}

                {/* 폰트 파일 받기는 "고급/무한 재사용" 경로로 강등 (라틴 전용) */}
                <details className={styles.desktopActions}>
                  <summary className={styles.actionsHead}>
                    고급: 폰트 파일로 받기 (무한 재사용)
                  </summary>
                  <p className={styles.formatNote}>
                    이미지는 어디든 바로, 폰트는 한 번 깔면 무한 재사용. 블로그·영상 편집·문서에.
                  </p>
                  {renderActions("panel")}
                  {FORMAT_OPTIONS.some((o) => o.full) && (
                    <p className={styles.formatNote}>WOFF2·OTF 풀포맷은 곧 제공돼요.</p>
                  )}
                </details>
              </>
            )}
          </section>
        </div>
      )}

      {mode === "draw" && script === "latin" && (
        <div className={styles.mobileActionBar} role="region" aria-label="폰트 받기">
          {renderActions("bar")}
        </div>
      )}

      {justDownloaded && (
        <div className={styles.toast} role="status" aria-live="polite">
          <Mascot mood="love" size={56} label="" />
          <span>받았다 너굴.</span>
        </div>
      )}
    </main>
  );
}
