"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_REFINE,
  FONT_FORMATS,
  FREE_FORMATS,
  FULL_FORMATS,
  type DrawnGlyph,
  type FontFormat,
  type GlyphStroke,
  type HandwritingRequest,
  type HandwritingResponse,
  type RefineParams,
} from "@webapp/core";
import { BrushUnderline, Button, Mascot, Segmented } from "@webapp/ui";
import { apiPath } from "../../lib/paths";
import GlyphCell from "../../components/GlyphCell";
import RefinePanel from "../../components/RefinePanel";
import HandwritingPreview from "../../components/HandwritingPreview";
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

/**
 * 손글씨 공방 메인(클라이언트).
 * 메인 = "직접 그리기 → 내 손글씨 폰트". 빠른 시작 샘플(슬라이더 스튜디오)은 보조 탭으로 강등.
 *
 * 흐름: 글자 그리드(셀 정규화 0..1 폴리라인 캡처) + 다듬기 → 디바운스
 *      → /api/handwriting → fontBase64 → @font-face 등록 → 내가 그린 글자로 예문 렌더 → 다운로드.
 */
export default function HandwritingStudio() {
  const [mode, setMode] = useState<Mode>("draw");
  // char → strokes 맵(그린 것만 보관)
  const [glyphMap, setGlyphMap] = useState<Record<string, GlyphStroke[]>>({});
  const [refine, setRefine] = useState<RefineParams>(DEFAULT_REFINE);
  const [previewFont, setPreviewFont] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState("MyHandwriting");
  const [generatedBy, setGeneratedBy] = useState<string>("handwriting");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<FontFormat>("woff");
  const [justDownloaded, setJustDownloaded] = useState(false);

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

  const onCellChange = useCallback((char: string, strokes: GlyphStroke[]) => {
    setGlyphMap((prev) => {
      const next = { ...prev };
      if (strokes.length === 0) delete next[char];
      else next[char] = strokes;
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setGlyphMap({}), []);

  // 손글씨 폰트 생성(프리뷰). 항상 woff로 가볍게.
  const generate = useCallback(
    async (gs: DrawnGlyph[], rf: RefineParams) => {
      if (gs.length === 0) {
        setPreviewFont(null);
        return;
      }
      const myId = ++reqIdRef.current;
      setLoading(true);
      setError(null);
      const payload: HandwritingRequest = { glyphs: gs, refine: rf, format: "woff" };
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
        const data = (await res.json()) as HandwritingResponse;
        if (myId !== reqIdRef.current) return;
        setPreviewFont(data.fontBase64);
        setFontFamily(data.fontFamily || "MyHandwriting");
        setGeneratedBy(data.generatedBy || "handwriting");
      } catch (err) {
        if (myId !== reqIdRef.current) return;
        setError(err instanceof Error ? err.message : "폰트 생성 중 오류가 발생했습니다.");
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    },
    []
  );

  // 그리드/다듬기 변경 시 디바운스 후 생성(그리기 모드일 때만).
  useEffect(() => {
    if (mode !== "draw") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void generate(glyphs, refine);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [glyphs, refine, mode, generate]);

  const handleDownload = useCallback(async () => {
    if (glyphs.length === 0) return;
    setDownloading(true);
    setError(null);
    try {
      const payload: HandwritingRequest = { glyphs, refine, format };
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
  }, [glyphs, refine, format, drawnChars.length]);

  const progress = drawnChars.length;

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
        <div className={styles.modeTabs}>
          <Segmented<Mode>
            ariaLabel="만드는 방식"
            value={mode}
            onChange={setMode}
            options={[
              { value: "draw", label: "직접 그리기" },
              { value: "sample", label: "빠른 시작 샘플" },
            ]}
          />
          <span className={styles.modeHint}>
            {mode === "draw"
              ? "진짜 내 글씨로 만드는 메인 모드예요."
              : "기성 폰트를 슬라이더로 변형한 샘플 — 진짜는 직접 그리기."}
          </span>
        </div>
      </header>

      {mode === "sample" ? (
        // 빠른 시작 샘플 — 기존 슬라이더 스튜디오를 보조로 그대로 임베드(헤더 없이 본문만).
        <div className={styles.sampleWrap}>
          <FontStudio embedded />
        </div>
      ) : (
        <div className={styles.grid}>
          <section className={styles.tools}>
            {/* ── 글자 그리드 ── */}
            <div className={styles.group}>
              <div className={styles.groupHead}>
                <h2 className={styles.groupTitle}>글자 그리기</h2>
                <span className={styles.progress} aria-live="polite">
                  {progress} / 26
                </span>
              </div>
              <p className={styles.groupSub}>
                칸마다 마우스·손가락으로 글자를 그려요. 가이드선(어센더·x높이·베이스라인)에
                맞춰 그리면 더 고르게 나와요. 한 글자에 여러 획 가능.
              </p>
              <div className={styles.gridCells} role="group" aria-label="a부터 z까지 글자 그리기 칸">
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
              <div className={styles.gridActions}>
                <button
                  type="button"
                  className={styles.clearAllBtn}
                  onClick={clearAll}
                  disabled={progress === 0 || downloading}
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
              {loading && <span className={styles.status}>네 글씨 굽는 중…</span>}
              {error && (
                <span className={styles.error} role="alert">
                  {error}
                </span>
              )}
            </div>
          </section>

          {/* ── 견본 + 받기 ── */}
          <section className={styles.preview}>
            <HandwritingPreview
              fontBase64={previewFont}
              fontFamily={fontFamily}
              drawnChars={drawnChars}
              loading={loading}
              generatedBy={generatedBy}
            />
            <div className={styles.desktopActions}>
              <h2 className={styles.actionsHead}>폰트 받아 가기</h2>
              {renderActions("panel")}
              {FORMAT_OPTIONS.some((o) => o.full) && (
                <p className={styles.formatNote}>WOFF2·OTF 풀포맷은 곧 제공돼요.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {mode === "draw" && (
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
