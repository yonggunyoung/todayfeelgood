"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clampParams,
  DEFAULT_PARAMS,
  FONT_FORMATS,
  PARAM_RANGES,
  STYLE_PRESETS,
  type FontFormat,
  type FontParams,
  type FontScript,
  type GenerateRequest,
  type GenerateResponse,
} from "@webapp/core";
import { Button, Chip, Mascot, Segmented } from "@webapp/ui";
import { apiPath } from "../../lib/paths";
import DrawingCanvas, {
  type DrawingCanvasHandle,
} from "../../components/DrawingCanvas";
import ParameterPanel from "../../components/ParameterPanel";
import FontPreview from "../../components/FontPreview";
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

/** 파라미터로 짧은 파일명 해시를 만든다(앞부분만). */
function shortHash(p: FontParams): string {
  const s = `${p.weight}-${p.slant}-${p.curvature}-${p.weirdness}-${p.seed}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36).slice(0, 6);
}

/** 현재 params가 어떤 프리셋과 정확히 일치하는지(겹친 키만 비교) 찾는다. */
function matchedPreset(p: FontParams): string | null {
  for (const preset of STYLE_PRESETS) {
    const keys = Object.keys(preset.params) as (keyof FontParams)[];
    if (keys.every((k) => p[k] === preset.params[k])) return preset.id;
  }
  return null;
}

/**
 * 공방 메인(클라이언트).
 * 흐름: script/슬라이더 → 디바운스 → /api/generate(format:"woff", imagePng 미전송) → fontBase64 → 프리뷰.
 * 다운로드: 선택 포맷으로 1회 요청 → fontBase64 디코드 → 브라우저 저장(앱 내 완결).
 */
export default function FontStudio() {
  const [params, setParams] = useState<FontParams>(DEFAULT_PARAMS);
  const [script, setScript] = useState<FontScript>("latin");
  const [previewFont, setPreviewFont] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<string>("GeneratedFont");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<FontFormat>("woff");

  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 응답 경합(race) 방지: 마지막 요청만 반영
  const reqIdRef = useRef(0);

  const activePreset = useMemo(() => matchedPreset(params), [params]);

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
          throw new Error(data?.error || `요청 실패 (${res.status})`);
        }

        const data = (await res.json()) as GenerateResponse;
        if (myId !== reqIdRef.current) return; // 더 최신 요청이 있으면 폐기
        setPreviewFont(data.fontBase64);
        setFontFamily(data.fontFamily || "GeneratedFont");
      } catch (err) {
        if (myId !== reqIdRef.current) return;
        setError(
          err instanceof Error ? err.message : "폰트 생성 중 오류가 발생했습니다."
        );
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    },
    []
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
        throw new Error(data?.error || `요청 실패 (${res.status})`);
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "다운로드 중 오류가 발생했습니다."
      );
    } finally {
      setDownloading(false);
    }
  }, [params, script, format]);

  return (
    <main className={`container ${styles.studio}`}>
      <header className={styles.header}>
        <h1 className={`display ${styles.title}`}>글씨체를 빚는 작업대</h1>
        <p className={styles.lead}>
          슬라이더를 움직이면 오른쪽 견본이 바로 표정을 바꿔요. 마음에 드는
          순간을 골라 그대로 받아 가세요.
        </p>
      </header>

      <div className={styles.grid}>
        {/* 작업 도구: 문자체계 + 프리셋 + 슬라이더 + 출력 */}
        <section className={styles.tools}>
          {/* 문자체계 세그먼티드 */}
          <div className={styles.group}>
            <h2 className={styles.groupHead}>문자체계</h2>
            <Segmented<FontScript>
              ariaLabel="문자체계 선택"
              value={script}
              onChange={setScript}
              options={[
                { value: "latin", label: "라틴 Aa" },
                { value: "hangul", label: "한글 가" },
              ]}
            />
          </div>

          {/* 무드 프리셋 칩 */}
          <div className={styles.group}>
            <h2 className={styles.groupHead}>무드 프리셋</h2>
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

          {/* 슬라이더 */}
          <div className={styles.group}>
            <h2 className={styles.groupHead}>세부 조절</h2>
            <ParameterPanel
              value={params}
              onChange={onChangeParams}
              script={script}
              onRandomizeSeed={randomizeSeed}
              disabled={loading || downloading}
            />
          </div>

          {/* 스케치(준비 중) */}
          <div className={styles.group}>
            <h2 className={styles.groupHead}>스케치 (미반영 · 준비 중)</h2>
            <DrawingCanvas ref={canvasRef} />
          </div>

          {/* 받아 가기 */}
          <div className={styles.group}>
            <h2 className={styles.groupHead}>받아 가기</h2>
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
              disabled={downloading || loading}
              className={styles.downloadBtn}
            >
              {downloading
                ? "내려받는 중…"
                : `${format.toUpperCase()}로 내려받기`}
            </Button>

            <div className={styles.statusRow} aria-live="polite">
              {loading && <span className={styles.status}>견본 갱신 중…</span>}
              {error && (
                <span className={styles.error} role="alert">
                  {error}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* 견본 */}
        <section className={styles.preview}>
          <FontPreview
            fontBase64={previewFont}
            fontFamily={fontFamily}
            script={script}
            loading={loading}
          />
        </section>
      </div>

      {/* 정직성 라벨 — 무엇이 진짜 내 글씨인지 고지 */}
      <p className={styles.honesty}>
        <Mascot mood="happy" size={22} still label="" />
        공개 폰트 변형 — 내가 그린 글씨가 아닙니다. 공개 가변폰트를 슬라이더로
        다듬어 만든 결과예요.
      </p>
    </main>
  );
}
