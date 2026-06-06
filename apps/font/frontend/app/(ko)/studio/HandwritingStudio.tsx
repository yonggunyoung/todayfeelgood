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
import { getDictionary, type Locale } from "../../../lib/i18n";
import GlyphCell from "../../../components/GlyphCell";
import RefinePanel from "../../../components/RefinePanel";
import HandwritingPreview from "../../../components/HandwritingPreview";
import HandwritingImagePanel from "../../../components/HandwritingImagePanel";
import LetterPanel from "../../../components/LetterPanel";
import HangulPreview from "../../../components/HangulPreview";
import HangulImagePanel from "../../../components/HangulImagePanel";
import HangulLetterPanel from "../../../components/HangulLetterPanel";
import FontStudio from "./FontStudio";
import styles from "./HandwritingStudio.module.css";

// 그리기/다듬기 변경 후 폰트 호출까지 디바운스(ms). 그리기는 자주 바뀌므로 넉넉히.
const DEBOUNCE_MS = 700;

// 타깃: 라틴 소문자 a–z + 대문자 A–Z + 공통 특수문자 (원하는 만큼만, 빈칸은 기본 글꼴).
// 엔진은 대문자(A.uc)·특수문자(uniXXXX)·cap height 정렬·자동채움을 모두 지원한다.
// 대문자/특수문자는 그리드·미리보기에서 접기/펼치기로 분리(소문자 우선, 칸 압박 완화).
const ALPHABET_LOWER = "abcdefghijklmnopqrstuvwxyz".split("");
const ALPHABET_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
// 공통 특수문자 — 자동채움 대상(autofill.LATIN_FILL_CHARS)과 동일 집합으로 맞춘다.
const SPECIAL_CHARS = [".", ",", "!", "?", ":", ";", "'", '"', "-", "(", ")", "&", "@", "#"];
const ALPHABET = [...ALPHABET_LOWER, ...ALPHABET_UPPER, ...SPECIAL_CHARS];

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

// 진입 "만드는 방법". mode/autofill의 상위 입구(UI). 선택 시 둘을 함께 세팅한다.
// 'full'(다 직접 그리기)은 'quick'(직접 그리기)에 통합 — 다 그리면 채울 게 없어 동일하므로
// 진입에서 노출하지 않는다(타입/사전엔 보류로 남김). 그리기 모드는 항상 빈칸=기본 글꼴.
type Method = "quick" | "full" | "sample";

const METHOD_ORDER: Method[] = ["quick", "sample"];

/**
 * 손글씨 공방 메인(클라이언트).
 * 메인 = "직접 그리기 → 내 손글씨 폰트". 빠른 시작 샘플(슬라이더 스튜디오)은 보조 탭으로 강등.
 *
 * 흐름: 글자 그리드(셀 정규화 0..1 폴리라인 캡처) + 다듬기 → 디바운스
 *      → /api/handwriting → fontBase64 → @font-face 등록 → 내가 그린 글자로 예문 렌더 → 다운로드.
 */
export default function HandwritingStudio({ locale = "ko" }: { locale?: Locale }) {
  const t = getDictionary(locale).studio;
  const entry = getDictionary(locale).studioEntry;
  const [mode, setMode] = useState<Mode>("draw");
  // 기본 추천 = "몇 자만 그리기"(하이브리드) → autofill ON으로 시작.
  // 스크립트 전환(라틴 a–z ↔ 한글 기본 자모). 각각 독립 그리드 맵을 둔다.
  // 인터페이스 언어 기준 기본값: 한국어=한글 먼저, 영어=영문 먼저.
  const [script, setScript] = useState<FontScript>(locale === "ko" ? "hangul" : "latin");
  // char → strokes 맵(그린 것만 보관)
  const [glyphMap, setGlyphMap] = useState<Record<string, GlyphStroke[]>>({});
  // 한글 자모 char → strokes 맵
  const [jamoMap, setJamoMap] = useState<Record<string, GlyphStroke[]>>({});
  const [refine, setRefine] = useState<RefineParams>(DEFAULT_REFINE);
  // 자동 채우기: 안 그린 글자를 내 스타일로 베이스 폰트가 채움(엔진 병행 — 미지원이면 무시).
  // 기본 추천(몇 자만 그리기/하이브리드) = autofill ON으로 시작.
  const [autofill, setAutofill] = useState(true);
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
  // 한글 결과물 형태: 이미지/짤 ↔ 편지
  const [hangulResult, setHangulResult] = useState<"image" | "letter">("image");

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
          throw new Error(data?.error || `${t.status.reqFail} (${res.status})`);
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
        setError(err instanceof Error ? err.message : t.status.genError);
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    },
    [t.status.reqFail, t.status.genError]
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
        throw new Error(data?.error || `${t.status.reqFail} (${res.status})`);
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
      setError(err instanceof Error ? err.message : t.status.dlError);
    } finally {
      setDownloading(false);
    }
  }, [glyphs, refine, format, autofill, drawnChars.length, t.status.reqFail, t.status.dlError]);

  const progress = drawnChars.length;
  const jamoProgress = drawnJamoChars.length;
  // 대문자 그린 개수(접기 라벨 표시용).
  const upperDrawnCount = useMemo(
    () => drawnChars.filter((c) => c >= "A" && c <= "Z").length,
    [drawnChars]
  );
  // 특수문자 그린 개수(접기 라벨 표시용).
  const specialDrawnCount = useMemo(
    () => drawnChars.filter((c) => SPECIAL_CHARS.includes(c)).length,
    [drawnChars]
  );

  const renderActions = (variant: "panel" | "bar") => (
    <div className={variant === "bar" ? styles.actionBarInner : styles.actionsPanel}>
      <Segmented<FontFormat>
        ariaLabel={t.actions.formatAria}
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
        {downloading ? t.actions.downloading : t.actions.download.replace("{fmt}", format.toUpperCase())}
      </Button>
    </div>
  );

  return (
    <main className={`container ${styles.studio}`}>
      <header className={styles.header}>
        <h1 className={`display ${styles.title}`}>
          <span className={styles.titleWord}>
            {t.head.title}
            <BrushUnderline className={styles.titleUnderline} />
          </span>
        </h1>
        <p className={styles.lead}>{t.head.lead}</p>
        {/* ── 만드는 방법 3갈래(진입 1스텝) — 언제든 바꿀 수 있게 상단 고정 ── */}
        <fieldset className={styles.entry}>
          <legend className={styles.entryLegend}>{entry.legend}</legend>
          <div className={styles.entryCards} role="radiogroup" aria-label={entry.legend}>
            {METHOD_ORDER.map((m) => {
              const meta = entry[m];
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
          <p className={styles.entryHint}>{entry.hint}</p>
          {method === "quick" && (
            <p className={styles.entryHonesty}>{entry.quick.honesty}</p>
          )}
        </fieldset>

        {mode === "draw" && (
          <div className={styles.modeTabs}>
            <Segmented<FontScript>
              ariaLabel={t.scriptTabs.ariaLabel}
              value={script}
              onChange={setScript}
              options={[
                { value: "latin", label: t.scriptTabs.latin },
                { value: "hangul", label: t.scriptTabs.hangul },
              ]}
            />
            <span className={styles.modeHint}>
              {script === "hangul" ? t.scriptTabs.hintHangul : t.scriptTabs.hintLatin}
            </span>
          </div>
        )}
      </header>

      {mode === "sample" ? (
        // 빠른 시작 샘플 — 기존 슬라이더 스튜디오를 보조로 그대로 임베드(헤더 없이 본문만).
        <div className={styles.sampleWrap}>
          <FontStudio embedded t={t} />
        </div>
      ) : (
        <div className={styles.grid}>
          <section className={styles.tools}>
            {/* ── 글자/자모 그리드 ── */}
            <div className={styles.group}>
              <div className={styles.groupHead}>
                <h2 className={styles.groupTitle}>
                  {script === "hangul" ? t.grid.titleHangul : t.grid.titleLatin}
                  <HelpTip label={t.grid.helpLabel} align="start">
                    {t.grid.helpBody}
                  </HelpTip>
                </h2>
                <span className={styles.progress} aria-live="polite">
                  {script === "hangul" ? `${jamoProgress} / 24` : `${progress} / ${ALPHABET.length}`}
                </span>
              </div>
              <p className={styles.groupSub}>
                {script === "hangul" ? t.grid.subHangul : t.grid.subLatin}
              </p>
              {script === "hangul" ? (
                <div
                  className={styles.gridCells}
                  role="group"
                  aria-label={t.grid.cellsAriaHangul}
                >
                  {BASIC_JAMO.map((j) => (
                    <GlyphCell
                      key={j}
                      char={j}
                      labelName={JAMO_NAMES[j] ?? j}
                      script="hangul"
                      strokes={jamoMap[j] ?? []}
                      onChange={onJamoChange}
                      t={t.cell}
                      zoomT={t.zoom}
                    />
                  ))}
                </div>
              ) : (
                <>
                  {/* 소문자 a–z — 항상 표시 */}
                  <div
                    className={styles.gridCells}
                    role="group"
                    aria-label={t.grid.cellsAriaLatin}
                  >
                    {ALPHABET_LOWER.map((ch) => (
                      <GlyphCell
                        key={ch}
                        char={ch}
                        strokes={glyphMap[ch] ?? []}
                        onChange={onCellChange}
                        disabled={downloading}
                        t={t.cell}
                        zoomT={t.zoom}
                      />
                    ))}
                  </div>
                  {/* 대문자 A–Z — 접기/펼치기(기본 접힘). 비우면 기본 글꼴로 채워짐. */}
                  <details className={styles.upperFold}>
                    <summary className={styles.upperSummary}>
                      <span>{t.grid.upperToggle}</span>
                      <span className={styles.upperCount}>{upperDrawnCount} / 26</span>
                    </summary>
                    <div
                      className={styles.gridCells}
                      role="group"
                      aria-label={t.grid.cellsAriaUpper}
                    >
                      {ALPHABET_UPPER.map((ch) => (
                        <GlyphCell
                          key={ch}
                          char={ch}
                          strokes={glyphMap[ch] ?? []}
                          onChange={onCellChange}
                          disabled={downloading}
                          t={t.cell}
                          zoomT={t.zoom}
                        />
                      ))}
                    </div>
                  </details>
                  {/* 공통 특수문자 — 접기/펼치기(기본 접힘). 비우면 기본 글꼴로 채워짐. */}
                  <details className={styles.upperFold}>
                    <summary className={styles.upperSummary}>
                      <span>{t.grid.specialToggle}</span>
                      <span className={styles.upperCount}>
                        {specialDrawnCount} / {SPECIAL_CHARS.length}
                      </span>
                    </summary>
                    <div
                      className={styles.gridCells}
                      role="group"
                      aria-label={t.grid.cellsAriaSpecial}
                    >
                      {SPECIAL_CHARS.map((ch) => (
                        <GlyphCell
                          key={ch}
                          char={ch}
                          strokes={glyphMap[ch] ?? []}
                          onChange={onCellChange}
                          disabled={downloading}
                          t={t.cell}
                          zoomT={t.zoom}
                        />
                      ))}
                    </div>
                  </details>
                </>
              )}
              <div className={styles.gridActions}>
                {method === "quick" && (
                  <span className={styles.autofillTag}>{t.grid.autofillTag}</span>
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
                  {t.grid.clearAll}
                </button>
              </div>
            </div>

            {/* ── 다듬기 ── */}
            <details className={styles.group} open>
              <summary className={styles.accSummary}>
                <span className={styles.accTitle}>{t.refineAcc.title}</span>
                <span className={styles.accSub}>{t.refineAcc.sub}</span>
              </summary>
              <div className={styles.accBody}>
                <RefinePanel value={refine} onChange={setRefine} disabled={downloading} t={t.refine} />
              </div>
            </details>

            <div className={styles.statusRow} aria-live="polite">
              {script === "latin" && loading && (
                <span className={styles.status}>{t.status.baking}</span>
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
                  t={t.hangulPreview}
                />
                {/* 결과물 형태 선택: 이미지/짤 ↔ 편지 (라틴과 동일 라벨 재사용) */}
                <div className={styles.resultTabs}>
                  <Segmented<"image" | "letter">
                    ariaLabel={t.resultTabs.ariaLabel}
                    value={hangulResult}
                    onChange={setHangulResult}
                    options={[
                      { value: "image", label: t.resultTabs.image },
                      { value: "letter", label: t.resultTabs.letter },
                    ]}
                  />
                </div>

                {hangulResult === "image" ? (
                  // 한글 결과물 = 그린 자모로 음절을 조합한 문구 이미지
                  <HangulImagePanel
                    jamo={jamoGlyphs}
                    drawnJamo={drawnJamoChars}
                    refine={refine}
                    autofill={autofill}
                    t={t}
                  />
                ) : (
                  // 한글 편지쓰기 — 편지지에 긴 글 → 음절 조합 → PNG.
                  <HangulLetterPanel
                    jamo={jamoGlyphs}
                    drawnJamo={drawnJamoChars}
                    refine={refine}
                    autofill={autofill}
                    t={t.hangulLetter}
                    zoom={t.previewZoom}
                  />
                )}
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
                  t={t.hwPreview}
                />

                {/* 결과물 형태 선택: 이미지/짤 ↔ 편지 */}
                <div className={styles.resultTabs}>
                  <Segmented<"image" | "letter">
                    ariaLabel={t.resultTabs.ariaLabel}
                    value={latinResult}
                    onChange={setLatinResult}
                    options={[
                      { value: "image", label: t.resultTabs.image },
                      { value: "letter", label: t.resultTabs.letter },
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
                    t={t}
                  />
                ) : (
                  // 내 폰트로 편지쓰기 — 편지지에 긴 글 → PNG.
                  <LetterPanel
                    fontBase64={previewFont}
                    coveredChars={coveredChars}
                    autofill={autofill}
                    t={t.letter}
                    zoom={t.previewZoom}
                  />
                )}

                {/* 폰트 파일 받기는 "고급/무한 재사용" 경로로 강등 (라틴 전용) */}
                <details className={styles.desktopActions}>
                  <summary className={styles.actionsHead}>{t.advanced.summary}</summary>
                  <p className={styles.formatNote}>{t.advanced.note}</p>
                  {renderActions("panel")}
                  {FORMAT_OPTIONS.some((o) => o.full) && (
                    <p className={styles.formatNote}>{t.advanced.fullFormatNote}</p>
                  )}
                </details>
              </>
            )}
          </section>
        </div>
      )}

      {mode === "draw" && script === "latin" && (
        <div className={styles.mobileActionBar} role="region" aria-label={t.actions.barAria}>
          {renderActions("bar")}
        </div>
      )}

      {justDownloaded && (
        <div className={styles.toast} role="status" aria-live="polite">
          <Mascot mood="love" size={56} label="" />
          <span>{t.toast}</span>
        </div>
      )}
    </main>
  );
}
