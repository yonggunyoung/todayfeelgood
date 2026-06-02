"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampParams,
  DEFAULT_PARAMS,
  type FontParams,
  type GenerateRequest,
  type GenerateResponse,
} from "@webapp/core";
import DrawingCanvas, {
  type DrawingCanvasHandle,
} from "../../components/DrawingCanvas";
import ParameterPanel from "../../components/ParameterPanel";
import FontPreview from "../../components/FontPreview";
import styles from "./FontStudio.module.css";

// 슬라이더 조작 후 엔진 호출까지의 디바운스(ms)
const DEBOUNCE_MS = 350;

/**
 * 메인 폰트 생성 앱(클라이언트).
 * 데이터 흐름: 슬라이더 → 상태 업데이트 → 디바운스 → /api/generate POST
 *           → fontWoffBase64 수신 → FontPreview 반영.
 */
export default function FontStudio() {
  const [params, setParams] = useState<FontParams>(DEFAULT_PARAMS);
  const [woff, setWoff] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<string>("GeneratedFont");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 응답 경합(race) 방지: 마지막 요청만 반영
  const reqIdRef = useRef(0);

  const generate = useCallback(async (next: FontParams) => {
    const myId = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    // 그린 글씨가 있으면 선택적으로 함께 전송
    const imagePng = canvasRef.current?.toPng() ?? null;
    const payload: GenerateRequest = {
      params: clampParams(next),
      imagePng,
    };

    try {
      const res = await fetch("/api/generate", {
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
      // 더 최신 요청이 이미 진행/완료됐다면 이 응답은 버린다
      if (myId !== reqIdRef.current) return;
      setWoff(data.fontWoffBase64);
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

  // params 변경 시 디바운스 후 생성 호출
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void generate(params);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [params, generate]);

  const onChangeParams = useCallback((next: FontParams) => {
    // 입력 단계에서도 방어적으로 범위 강제
    setParams(clampParams(next));
  }, []);

  return (
    <main className="container">
      <header className={styles.header}>
        <h1 className={styles.title}>폰트 만들기 스튜디오</h1>
        <p className={styles.lead}>
          글씨를 그리고 굵기·기울기·곡률 슬라이더를 움직이면 손글씨 폰트가
          자동으로 만들어집니다.
        </p>
      </header>

      <div className={styles.grid}>
        <section className={styles.left}>
          <DrawingCanvas ref={canvasRef} />
          <ParameterPanel
            value={params}
            onChange={onChangeParams}
            disabled={loading}
          />

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.download}
              disabled
              title="다운로드 기능은 준비 중입니다"
            >
              폰트 다운로드 (준비 중)
            </button>
            {loading && <span className={styles.status}>생성 중…</span>}
            {error && (
              <span className={styles.error} role="alert">
                {error}
              </span>
            )}
          </div>
        </section>

        <section className={styles.right}>
          <FontPreview fontWoffBase64={woff} fontFamily={fontFamily} />
        </section>
      </div>
    </main>
  );
}
