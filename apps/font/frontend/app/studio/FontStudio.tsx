"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampParams,
  DEFAULT_PARAMS,
  FONT_FORMATS,
  type FontFormat,
  type FontParams,
  type GenerateRequest,
  type GenerateResponse,
} from "@webapp/core";
import { Button } from "@webapp/ui";
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
  const s = `${p.weight}-${p.slant}-${p.curvature}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36).slice(0, 6);
}

/**
 * 공방 메인(클라이언트).
 * 흐름: 슬라이더 → 디바운스 → /api/generate(format:"woff", imagePng 미전송) → fontBase64 → 프리뷰.
 * 다운로드: 선택한 포맷으로 1회 요청 → fontBase64 디코드 → 브라우저 저장(앱 내 완결).
 */
export default function FontStudio() {
  const [params, setParams] = useState<FontParams>(DEFAULT_PARAMS);
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

  // 프리뷰 생성: 항상 woff, imagePng는 보내지 않는다(엔진 미사용 + 페이로드 절약)
  const generatePreview = useCallback(async (next: FontParams) => {
    const myId = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    const payload: GenerateRequest = {
      params: clampParams(next),
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
  }, []);

  // params 변경 시 디바운스 후 프리뷰 호출
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void generatePreview(params);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [params, generatePreview]);

  const onChangeParams = useCallback((next: FontParams) => {
    setParams(clampParams(next));
  }, []);

  // 다운로드: 선택 포맷으로 별도 요청 → 브라우저 저장
  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setError(null);
    try {
      const payload: GenerateRequest = {
        params: clampParams(params),
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
      a.download = `hwoek-${shortHash(params)}.${meta.ext}`;
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
  }, [params, format]);

  return (
    <main className={`container ${styles.studio}`}>
      <header className={styles.header}>
        <p className={`sans ${styles.kicker}`}>작업대</p>
        <h1 className={styles.title}>글씨체를 빚는 자리</h1>
        <p className={styles.lead}>
          세 축을 움직이면 오른쪽 견본이 곧바로 표정을 바꿉니다. 마음에 드는
          순간을 골라 그대로 받아 가세요.
        </p>
      </header>

      <div className={styles.grid}>
        {/* 작업 도구: 캔버스 + 슬라이더 + 출력 */}
        <section className={`sans ${styles.tools}`}>
          <div className={styles.toolBlock}>
            <h2 className={styles.blockHead}>밑그림 (선택)</h2>
            <DrawingCanvas ref={canvasRef} />
          </div>

          <div className={styles.toolBlock}>
            <h2 className={styles.blockHead}>세 개의 축</h2>
            <ParameterPanel
              value={params}
              onChange={onChangeParams}
              disabled={loading}
            />
          </div>

          <div className={styles.toolBlock}>
            <h2 className={styles.blockHead}>받아 가기</h2>
            <div className={styles.formatRow} role="radiogroup" aria-label="파일 형식">
              {(["woff", "ttf"] as FontFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={format === f}
                  className={`${styles.formatBtn} ${
                    format === f ? styles.formatActive : ""
                  }`}
                  onClick={() => setFormat(f)}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <Button
              onClick={handleDownload}
              disabled={downloading || loading}
              className={styles.downloadBtn}
            >
              {downloading ? "내려받는 중…" : `${format.toUpperCase()}로 내려받기`}
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
          <FontPreview fontBase64={previewFont} fontFamily={fontFamily} />
        </section>
      </div>
    </main>
  );
}
