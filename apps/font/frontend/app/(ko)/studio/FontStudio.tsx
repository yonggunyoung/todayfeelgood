"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clampParams,
  DEFAULT_PARAMS,
  DEFAULT_PREVIEW_STYLE,
  FONT_FORMATS,
  FREE_FORMATS,
  FULL_FORMATS,
  PARAM_RANGES,
  STYLE_PRESETS,
  type FontFormat,
  type FontParams,
  type FontScript,
  type GenerateRequest,
  type GenerateResponse,
  type PreviewStyle,
} from "@webapp/core";
import { BrushUnderline, Button, Chip, Mascot, Segmented } from "@webapp/ui";
import { apiPath } from "../../../lib/paths";
import { TREND_PRESETS } from "../../../lib/trendPresets";
import DrawingCanvas, {
  type DrawingCanvasHandle,
} from "../../../components/DrawingCanvas";
import ParameterPanel from "../../../components/ParameterPanel";
import FontPreview from "../../../components/FontPreview";
import VariationGallery from "../../../components/VariationGallery";
import PreviewStylePanel from "../../../components/PreviewStylePanel";
import type { Dictionary } from "../../../lib/i18n";
import styles from "./FontStudio.module.css";

// 슬라이더 조작 후 프리뷰 호출까지의 디바운스(ms)
const DEBOUNCE_MS = 350;

/** base64 → Blob (다운로드 트리거용) */
function base64ToBlob(b64: string, mime: string): Blob {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * 파라미터 전체로 짧은 파일명 해시를 만든다(앞부분만).
 * v4 신규 축(waviness/waveFreq/contrast/roundness/mono/cursive/letterSpacing)까지
 * 반영해, 값이 다르면 파일명도 달라지도록(다운로드 폴더 덮어쓰기 혼동 방지).
 */
function shortHash(p: FontParams): string {
  const s = (Object.keys(p) as (keyof FontParams)[])
    .sort()
    .map((k) => `${k}:${p[k]}`)
    .join("|");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36).slice(0, 6);
}

/** 다운로드 포맷 셀렉터 옵션. FREE는 즉시, 추가 풀포맷(woff2/otf)은 "풀포맷" 라벨. */
const FORMAT_OPTIONS: { value: FontFormat; label: string; full: boolean }[] =
  FULL_FORMATS.map((f) => ({
    value: f,
    label: f.toUpperCase(),
    full: !FREE_FORMATS.includes(f),
  }));

/** params가 어떤 부분 프리셋과 정확히 일치하는지(겹친 키만 비교) 찾는 공통 매처. */
function matchPreset(
  p: FontParams,
  presets: ReadonlyArray<{ id: string; params: Partial<FontParams> }>
): string | null {
  for (const preset of presets) {
    const keys = Object.keys(preset.params) as (keyof FontParams)[];
    if (keys.every((k) => p[k] === preset.params[k])) return preset.id;
  }
  return null;
}

/**
 * 공방 보조 모드(클라이언트) — "빠른 시작 샘플".
 * 기성 가변폰트를 슬라이더로 변형하는 보조 모드. 메인은 직접 그리기(HandwritingStudio).
 * embedded=true면 손글씨 스튜디오 탭 안에 본문만 임베드(자체 <main>/헤드라인 생략).
 *
 * 흐름: script/슬라이더 → 디바운스 → /api/generate(format:"woff", imagePng 미전송) → fontBase64 → 프리뷰.
 * 다운로드: 선택 포맷으로 1회 요청 → fontBase64 디코드 → 브라우저 저장(앱 내 완결).
 */
export default function FontStudio({
  embedded = false,
  t,
}: {
  embedded?: boolean;
  t: Dictionary["studio"];
}) {
  const s = t.sample;
  const [params, setParams] = useState<FontParams>(DEFAULT_PARAMS);
  const [script, setScript] = useState<FontScript>("latin");
  const [previewFont, setPreviewFont] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<string>("GeneratedFont");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<FontFormat>("woff");
  // 다운로드 성공 순간 — 너굴이(love) 축하 토스트를 잠깐 띄운다.
  const [justDownloaded, setJustDownloaded] = useState(false);
  // [PREVIEW] 이미지 전용 스타일 — 엔진에 보내지 않음(프리뷰/PNG 전용)
  const [previewStyle, setPreviewStyle] = useState<PreviewStyle>(DEFAULT_PREVIEW_STYLE);

  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 응답 경합(race) 방지: 마지막 요청만 반영
  const reqIdRef = useRef(0);

  const activePreset = useMemo(() => matchPreset(params, STYLE_PRESETS), [params]);
  const activeTrend = useMemo(() => matchPreset(params, TREND_PRESETS), [params]);

  // 프리뷰 생성: 항상 woff, imagePng는 보내지 않는다(엔진 미사용 + 페이로드 절약)
  const generatePreview = useCallback(
    async (next: FontParams, scr: FontScript) => {
      const myId = ++reqIdRef.current;
      setLoading(true);
      setError(null);

      const payload: GenerateRequest = {
        params: clampParams(next),
        script: scr,
        format: "woff",
      };

      try {
        const res = await fetch(apiPath("/api/generate"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(data?.error || `${t.status.reqFail} (${res.status})`);
        }

        const data = (await res.json()) as GenerateResponse;
        if (myId !== reqIdRef.current) return; // 더 최신 요청이 있으면 폐기
        setPreviewFont(data.fontBase64);
        setFontFamily(data.fontFamily || "GeneratedFont");
      } catch (err) {
        if (myId !== reqIdRef.current) return;
        setError(
          err instanceof Error ? err.message : t.status.genError
        );
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    },
    [t.status.reqFail, t.status.genError]
  );

  // params/script 변경 시 디바운스 후 프리뷰 호출
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void generatePreview(params, script);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [params, script, generatePreview]);

  const onChangeParams = useCallback((next: FontParams) => {
    setParams(clampParams(next));
  }, []);

  // 무드 프리셋 적용 — 기존 값 위에 프리셋 부분 params를 덮는다
  const applyPreset = useCallback((presetParams: Partial<FontParams>) => {
    setParams((prev) => clampParams({ ...prev, ...presetParams }));
  }, []);

  // 주사위 — weirdness 재현용 시드를 무작위 정수로 교체
  const randomizeSeed = useCallback(() => {
    const { min, max } = PARAM_RANGES.seed;
    const seed = Math.floor(min + Math.random() * (max - min));
    setParams((prev) => clampParams({ ...prev, seed }));
  }, []);

  // 다운로드: 선택 포맷으로 별도 요청 → 브라우저 저장
  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setError(null);
    try {
      const payload: GenerateRequest = {
        params: clampParams(params),
        script,
        format,
      };
      const res = await fetch(apiPath("/api/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || `${t.status.reqFail} (${res.status})`);
      }
      const data = (await res.json()) as GenerateResponse;
      const meta = FONT_FORMATS[data.format] ?? FONT_FORMATS[format];
      const blob = base64ToBlob(data.fontBase64, meta.mime);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hwoek-${script}-${shortHash(params)}.${meta.ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      // 성공 축하 — 너굴이 love 토스트(잠시 후 사라짐)
      setJustDownloaded(true);
      window.setTimeout(() => setJustDownloaded(false), 3200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.status.dlError
      );
    } finally {
      setDownloading(false);
    }
  }, [params, script, format, t.status.reqFail, t.status.dlError]);

  // 다운로드 파일명에 쓰는 짧은 식별 태그(PNG에도 동일하게 전달).
  const fileTag = useMemo(() => shortHash(params), [params]);

  // 포맷 선택 + 받기 — 데스크톱 sticky 프리뷰 컬럼과 모바일 하단 고정 바에서 공유.
  // variant로 라벨/배치만 살짝 달리한다(동작/핸들러 동일 = 두 폼팩터 동등 도달).
  const renderActions = (variant: "panel" | "bar") => (
    <div
      className={
        variant === "bar" ? styles.actionBarInner : styles.actionsPanel
      }
    >
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
        disabled={downloading || loading}
        className={styles.downloadBtn}
      >
        {downloading ? t.actions.downloading : t.actions.download.replace("{fmt}", format.toUpperCase())}
      </Button>
    </div>
  );

  const Root = embedded ? "div" : "main";

  return (
    <Root className={embedded ? styles.studioEmbedded : `container ${styles.studio}`}>
      {embedded ? (
        <p className={styles.embeddedLead}>{s.embeddedLead}</p>
      ) : (
        <header className={styles.header}>
          <h1 className={`display ${styles.title}`}>
            <span className={styles.titleWord}>
              {s.headTitle}
              <BrushUnderline className={styles.titleUnderline} />
            </span>
          </h1>
          <p className={styles.lead}>{s.headLead}</p>
        </header>
      )}

      <div className={styles.grid}>
        {/* 작업 도구: 3단계 위계 — ① 빠른 시작 ② 세부 조절 ③ 고급/실험 + 받아 가기 */}
        <section className={styles.tools}>
          {/* ── ① 빠른 시작 — 누르면 끝(프리셋·변주·문자체계). 강조 표면. ── */}
          <div className={`${styles.group} ${styles.quickStart}`}>
            <div className={styles.stageHead}>
              <span className={styles.stageBadge}>{s.quickStartBadge}</span>
              <span className={styles.stageHint}>{s.quickStartHint}</span>
            </div>

            <div className={styles.subGroup}>
              <h3 className={styles.groupHead}>{s.scriptHead}</h3>
              <Segmented<FontScript>
                ariaLabel={s.scriptAria}
                value={script}
                onChange={setScript}
                options={[
                  { value: "latin", label: s.scriptLatin },
                  { value: "hangul", label: s.scriptHangul },
                ]}
              />
            </div>

            <div className={styles.subGroup}>
              <h3 className={styles.groupHead}>{s.moodHead}</h3>
              <div className={styles.chips}>
                {STYLE_PRESETS.map((preset) => (
                  <Chip
                    key={preset.id}
                    selected={activePreset === preset.id}
                    disabled={loading || downloading}
                    onClick={() => applyPreset(preset.params)}
                  >
                    {preset.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div className={styles.subGroup}>
              <h3 className={styles.groupHead}>
                {s.trendHead} <span className={styles.trendTag}>{s.trendTag}</span>
              </h3>
              <div className={styles.chips}>
                {TREND_PRESETS.map((preset) => (
                  <Chip
                    key={preset.id}
                    selected={activeTrend === preset.id}
                    disabled={loading || downloading}
                    onClick={() => applyPreset(preset.params)}
                    title={preset.hint}
                  >
                    {preset.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div className={styles.subGroup}>
              <h3 className={styles.groupHead}>{s.varyHead}</h3>
              <VariationGallery
                base={params}
                script={script}
                onPick={onChangeParams}
                disabled={downloading}
                t={t.variation}
              />
            </div>
          </div>

          {/* ── ② 세부 조절 — 슬라이더(기본 펼침). ── */}
          <details className={styles.group} open>
            <summary className={styles.accSummary}>
              <span className={styles.accTitle}>{s.detailSummary}</span>
              <span className={styles.accSub}>{s.detailSub}</span>
            </summary>
            <div className={styles.accBody}>
              <ParameterPanel
                value={params}
                onChange={onChangeParams}
                script={script}
                onRandomizeSeed={randomizeSeed}
                disabled={loading || downloading}
                t={t.params}
              />
            </div>
          </details>

          {/* ── ③ 고급/실험 — 스케치(준비 중)·PNG 효과는 접어 둔다. ── */}
          <details className={styles.group}>
            <summary className={styles.accSummary}>
              <span className={styles.accTitle}>{s.imgEffectSummary}</span>
              <span className={styles.accSub}>{s.imgEffectSub}</span>
            </summary>
            <div className={styles.accBody}>
              <PreviewStylePanel
                value={previewStyle}
                onChange={setPreviewStyle}
                disabled={downloading}
                t={t.previewStyle}
              />
            </div>
          </details>

          <details className={styles.group}>
            <summary className={styles.accSummary}>
              <span className={styles.accTitle}>{s.sketchSummary}</span>
              <span className={styles.accSub}>{s.sketchSub}</span>
            </summary>
            <div className={styles.accBody}>
              <DrawingCanvas ref={canvasRef} t={t.sketch} />
            </div>
          </details>

          {/* 상태 줄 — 받기 액션은 sticky 컬럼/하단 바로 이동. 여기엔 갱신/오류만. */}
          <div className={styles.statusRow} aria-live="polite">
            {loading && <span className={styles.status}>{s.statusUpdating}</span>}
            {error && (
              <span className={styles.error} role="alert">
                {error}
              </span>
            )}
          </div>
        </section>

        {/* 견본 + 받기 — 데스크톱: 우측 sticky 컬럼(스크롤해도 프리뷰·받기 항상 보임). */}
        <section className={styles.preview}>
          <FontPreview
            fontBase64={previewFont}
            fontFamily={fontFamily}
            script={script}
            loading={loading}
            previewStyle={previewStyle}
            fileTag={fileTag}
            t={t.fontPreview}
          />
          {/* 데스크톱 전용: 프리뷰 바로 아래 받기 패널(sticky 안에 포함). */}
          <div className={styles.desktopActions}>
            <h2 className={styles.actionsHead}>{s.actionsHead}</h2>
            {renderActions("panel")}
          </div>
        </section>
      </div>

      {/* 모바일 전용: 하단 고정 액션 바 — 받기·포맷이 한 손에 항상 도달. */}
      <div className={styles.mobileActionBar} role="region" aria-label={t.actions.barAria}>
        {renderActions("bar")}
      </div>

      {/* 다운로드 성공 축하 — 너굴이(love) 토스트. 잠시 떴다 사라짐. */}
      {justDownloaded && (
        <div className={styles.toast} role="status" aria-live="polite">
          <Mascot mood="love" size={56} label="" />
          <span>{t.toast}</span>
        </div>
      )}

      {/* 정직성 라벨 — 무엇이 진짜 내 글씨인지 고지 */}
      <p className={styles.honesty}>
        <Mascot mood="happy" size={22} still label="" />
        {s.honesty}
      </p>
    </Root>
  );
}
