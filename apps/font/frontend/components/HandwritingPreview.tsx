"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "@webapp/ui";
import type { Dictionary } from "../lib/i18n";
import styles from "./HandwritingPreview.module.css";

interface Props {
  /** 엔진이 준 폰트(base64, woff). 없으면 빈 상태. */
  fontBase64?: string | null;
  fontFamily?: string;
  /** 그린(=폰트가 커버하는) 문자 집합 */
  drawnChars: string[];
  /** 엔진이 자동 채운 글자(정직성 표기용). 없으면 [] */
  filledChars?: string[];
  /** 자동 채우기 토글 상태(엔진 미지원 graceful 안내용) */
  autofill?: boolean;
  /** 생성 중 표시 */
  loading?: boolean;
  /** 엔진 응답의 출처 라벨(정직성). 보통 "handwriting" */
  generatedBy?: string;
  t: Dictionary["studio"]["hwPreview"];
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// 예문 후보 — 그린 글자로만 채워 렌더(안 그린 글자는 흐리게 표시).
const SAMPLE_WORDS = ["hello", "type", "my own", "good", "today", "font"];

/**
 * 받은 손글씨 폰트(base64)를 FontFace로 등록하고,
 * **내가 그린 글자들로만** 예문을 렌더한다. 안 그린 글자는 흐리게(폴백 오해 방지).
 */
export default function HandwritingPreview({
  fontBase64,
  fontFamily,
  drawnChars,
  filledChars = [],
  autofill = false,
  loading,
  generatedBy = "handwriting",
  t,
}: Props) {
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!fontBase64) {
      setActiveFamily(null);
      return;
    }
    const family = `${fontFamily || "MyHandwriting"}-${++seqRef.current}`;
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
  }, [fontBase64, fontFamily]);

  const drawnSet = new Set(drawnChars);
  // 대소문자 구분 — 'A'(자동채움)와 'a'(직접 그림)를 정확히 구별해 표시한다.
  const filledSet = new Set(filledChars);
  // 폰트가 실제로 커버하는 글자(내가 그린 것 + 엔진이 자동 채운 것).
  const coveredSet = new Set<string>([...drawnSet, ...filledSet]);
  const hasFilled = filledSet.size > 0;
  const fontStyle = activeFamily
    ? { fontFamily: `"${activeFamily}", system-ui, sans-serif` }
    : undefined;

  // 폰트가 커버하는 글자만 포함하는 예문만 보여 준다(폴백 글자 노출 방지).
  const renderableWords = SAMPLE_WORDS.filter((w) =>
    [...w].every((ch) => ch === " " || coveredSet.has(ch.toLowerCase()))
  );

  // a–z / A–Z 중 무엇이 채워졌는지 한눈에. 안 그린 글자는 흐리게.
  const lowerAlphabet = "abcdefghijklmnopqrstuvwxyz".split("");
  const upperAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const charSpan = (ch: string) => {
    const isDrawn = drawnSet.has(ch);
    const isFilled = !isDrawn && filledSet.has(ch);
    return (
      <span
        key={ch}
        className={isDrawn ? styles.inkChar : isFilled ? styles.filledChar : styles.dimChar}
        style={isDrawn || isFilled ? fontStyle : undefined}
        title={isFilled ? t.filledTitle : undefined}
      >
        {ch}
      </span>
    );
  };

  return (
    <div className={styles.preview} aria-label={t.ariaLabel}>
      <div className={styles.tab}>
        <span className={styles.tabName}>{t.tabName}</span>
        <span className={`${styles.dot} ${activeFamily ? styles.live : ""}`}>
          {loading ? t.baking : activeFamily ? t.live : t.idle}
        </span>
      </div>

      {activeFamily ? (
        <div className={styles.sheet} style={fontStyle}>
          {/* 그린 알파벳 견본 — 그린 글자는 진하게, 자동 채운 글자는 점선 강조, 안 그린 글자는 흐리게 */}
          <p className={styles.alphabet}>{lowerAlphabet.map(charSpan)}</p>
          {/* 대문자 A–Z — 접기/펼치기(기본 접힘) */}
          <details className={styles.upperFold}>
            <summary className={styles.upperSummary}>{t.upperToggle}</summary>
            <p className={styles.alphabet}>{upperAlphabet.map(charSpan)}</p>
          </details>
          {hasFilled && <p className={styles.fillNote}>{t.fillNote}</p>}

          {/* 그린 글자만으로 만들 수 있는 예문 */}
          {renderableWords.length > 0 ? (
            <div className={styles.words}>
              {renderableWords.slice(0, 3).map((w) => (
                <p key={w} className={styles.word}>
                  {w}
                </p>
              ))}
            </div>
          ) : (
            <p className={styles.fewNote}>{t.fewNote}</p>
          )}
        </div>
      ) : (
        <div className={styles.empty}>
          <Mascot mood={loading ? "focused" : "sleepy"} size={88} />
          <p className={styles.emptyText}>
            {loading ? t.emptyLoading : t.emptyIdle}
          </p>
        </div>
      )}

      <p className={styles.honesty}>
        <Mascot mood="happy" size={20} still label="" />
        {hasFilled
          ? t.honestyFilled
          : autofill
            ? t.honestyAutofill
            : generatedBy === "handwriting"
              ? t.honestyHand
              : t.honestyStrokes}
      </p>
    </div>
  );
}
