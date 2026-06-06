"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "@webapp/ui";
import {
  BASIC_JAMO,
  DEFAULT_REFINE,
  type DrawnGlyph,
  type HandwritingResponse,
  type HangulComposeRequest,
  type RefineParams,
} from "@webapp/core";
import { apiPath } from "../lib/paths";
import { requiredJamo } from "../lib/hangul";
import type { Dictionary } from "../lib/i18n";
import styles from "./HandwritingPreview.module.css";

interface Props {
  /** 그린 자모(char ∈ BASIC_JAMO). */
  jamo: DrawnGlyph[];
  /** 그린 자모 char 집합. */
  drawnJamo: string[];
  /** 다듬기 파라미터. */
  refine?: RefineParams;
  /** 안 그린 자모를 내 스타일로 자동 채움(엔진 병행 — 미지원이면 무시). */
  autofill?: boolean;
  t: Dictionary["studio"]["hangulPreview"];
}

const DEBOUNCE_MS = 800;

// 견본 후보 — 그린 자모로 완성 가능한 음절만 골라 보여 준다.
const SAMPLE_WORDS = ["안녕", "사랑", "오늘", "감사", "가나다", "하루", "좋아"];

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/**
 * 한글 자모 견본(HandwritingPreview의 한글판).
 * 그린 자모로 완성 가능한 한글 견본 단어만 골라, 엔진에서 조합 합성한 폰트로 렌더한다.
 * 24 자모 칸 표시: 그린 자모는 진하게, 안 그린 자모는 흐리게(시스템 폰트 폴백).
 */
export default function HangulPreview({ jamo, drawnJamo, refine = DEFAULT_REFINE, autofill = false, t }: Props) {
  const drawnSet = new Set(drawnJamo);

  // 그린 자모로 완성 가능한 견본 단어만(폴백 글자 노출 방지).
  const words = SAMPLE_WORDS.filter((w) =>
    [...w].every((ch) => requiredJamo(ch).every((j) => drawnSet.has(j)))
  ).slice(0, 3);
  const sampleText = words.join(" ");

  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fontBase64, setFontBase64] = useState<string | null>(null);
  const seqRef = useRef(0);
  const reqIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 견본 단어/자모 변경 → 디바운스 후 엔진 합성.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (jamo.length === 0 || !sampleText) {
      setFontBase64(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const myId = ++reqIdRef.current;
      // ★ 이전 요청 취소: 진행 중 요청을 끊어 서버에 동시 요청이 쌓이지 않게 한다
      //   (세마포어 포화 → 503 → BFF 502 깜빡임 방지). 항상 최신 1건만 비행 중.
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      const payload: HangulComposeRequest = {
        jamo,
        text: sampleText,
        refine,
        format: "woff",
        autofill,
      };
      fetch(apiPath("/api/hangul-compose"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`요청 실패 (${res.status})`);
          return (await res.json()) as HandwritingResponse;
        })
        .then((data) => {
          if (myId !== reqIdRef.current) return;
          setFontBase64(data.fontBase64);
        })
        .catch((err) => {
          // 취소(abort)·일시적 서버 오류(503/502)는 직전 미리보기를 그대로 유지
          //   → 그릴 때마다 미리보기가 사라졌다 떴다 하지 않는다.
          if (err instanceof Error && err.name === "AbortError") return;
          // 직전 결과 유지(setFontBase64 호출 안 함). 로딩만 해제.
        })
        .finally(() => {
          if (myId === reqIdRef.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [jamo, sampleText, refine, autofill]);

  useEffect(() => {
    if (!fontBase64) {
      setActiveFamily(null);
      return;
    }
    const family = `HangulPreview-${++seqRef.current}`;
    let cancelled = false;
    let registered: FontFace | null = null;
    try {
      const face = new FontFace(family, base64ToArrayBuffer(fontBase64));
      face
        .load()
        .then((loaded) => {
          if (cancelled) return;
          (document.fonts as FontFaceSet).add(loaded);
          registered = loaded;
          setActiveFamily(family);
        })
        .catch(() => {
          if (!cancelled) setActiveFamily(null);
        });
    } catch {
      setActiveFamily(null);
    }
    return () => {
      cancelled = true;
      if (registered) {
        try {
          (document.fonts as FontFaceSet).delete(registered);
        } catch {
          /* noop */
        }
      }
    };
  }, [fontBase64]);

  const fontStyle = activeFamily
    ? { fontFamily: `"${activeFamily}", system-ui, sans-serif` }
    : undefined;
  const hasDrawn = drawnJamo.length > 0;

  return (
    <div className={styles.preview} aria-label={t.ariaLabel}>
      <div className={styles.tab}>
        <span className={styles.tabName}>{t.tabName}</span>
        <span className={`${styles.dot} ${activeFamily ? styles.live : ""}`}>
          {loading ? t.composing : activeFamily ? t.live : t.idle}
        </span>
      </div>

      {hasDrawn ? (
        <div className={styles.sheet}>
          {/* 기본 자모 24 — 그린 자모는 합성 폰트로, 안 그린 자모는 흐리게 */}
          <p className={styles.alphabet}>
            {BASIC_JAMO.map((j) => (
              <span
                key={j}
                className={drawnSet.has(j) ? styles.inkChar : styles.dimChar}
              >
                {j}
              </span>
            ))}
          </p>

          {activeFamily && words.length > 0 ? (
            <div className={styles.words} style={fontStyle}>
              {words.map((w) => (
                <p key={w} className={styles.word}>
                  {w}
                </p>
              ))}
            </div>
          ) : (
            <p className={styles.fewNote}>
              {loading ? t.composingNote : t.fewNote}
            </p>
          )}
        </div>
      ) : (
        <div className={styles.empty}>
          <Mascot mood="sleepy" size={88} />
          <p className={styles.emptyText}>{t.emptyIdle}</p>
        </div>
      )}

      <p className={styles.honesty}>
        <Mascot mood="happy" size={20} still label="" />
        {t.honesty}
      </p>
    </div>
  );
}
