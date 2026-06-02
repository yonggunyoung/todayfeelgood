"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "@webapp/ui";
import styles from "./HandwritingPreview.module.css";

interface Props {
  /** 엔진이 준 폰트(base64, woff). 없으면 빈 상태. */
  fontBase64?: string | null;
  fontFamily?: string;
  /** 그린(=폰트가 커버하는) 문자 집합 */
  drawnChars: string[];
  /** 생성 중 표시 */
  loading?: boolean;
  /** 엔진 응답의 출처 라벨(정직성). 보통 "handwriting" */
  generatedBy?: string;
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
  loading,
  generatedBy = "handwriting",
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
  const fontStyle = activeFamily
    ? { fontFamily: `"${activeFamily}", system-ui, sans-serif` }
    : undefined;

  // 그린 글자만 포함하는 예문만 보여 준다(폴백 글자 노출 방지).
  const renderableWords = SAMPLE_WORDS.filter((w) =>
    [...w].every((ch) => ch === " " || drawnSet.has(ch.toLowerCase()))
  );

  // a–z 중 무엇이 채워졌는지 한눈에. 안 그린 글자는 흐리게.
  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");

  return (
    <div className={styles.preview} aria-label="내 손글씨 견본">
      <div className={styles.tab}>
        <span className={styles.tabName}>내 손글씨 견본</span>
        <span className={`${styles.dot} ${activeFamily ? styles.live : ""}`}>
          {loading ? "굽는 중" : activeFamily ? "라이브" : "대기"}
        </span>
      </div>

      {activeFamily ? (
        <div className={styles.sheet} style={fontStyle}>
          {/* 그린 알파벳 견본 — 안 그린 글자는 흐리게(시스템 폰트 폴백) */}
          <p className={styles.alphabet}>
            {alphabet.map((ch) => (
              <span
                key={ch}
                className={drawnSet.has(ch) ? styles.inkChar : styles.dimChar}
                style={drawnSet.has(ch) ? fontStyle : undefined}
              >
                {ch}
              </span>
            ))}
          </p>

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
            <p className={styles.fewNote}>
              조금 더 그리면 내 글씨로 단어가 만들어져요. (예: h·e·l·l·o)
            </p>
          )}
        </div>
      ) : (
        <div className={styles.empty}>
          <Mascot mood={loading ? "focused" : "sleepy"} size={88} />
          <p className={styles.emptyText}>
            {loading ? "네 글씨를 굽는 중… 너굴." : "왼쪽 칸에 글자를 그려 봐 너굴."}
          </p>
        </div>
      )}

      <p className={styles.honesty}>
        <Mascot mood="happy" size={20} still label="" />
        {generatedBy === "handwriting"
          ? "진짜 내가 그린 글씨로 만든 폰트예요."
          : "내가 그린 획에서 만든 폰트예요."}
      </p>
    </div>
  );
}
