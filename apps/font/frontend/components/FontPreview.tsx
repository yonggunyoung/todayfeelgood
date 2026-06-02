"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "@webapp/ui";
import type { FontScript } from "@webapp/core";
import styles from "./FontPreview.module.css";

interface Props {
  /** 엔진이 준 폰트(base64, woff). 없으면 시스템 폰트로 폴백. */
  fontBase64?: string | null;
  fontFamily?: string;
  /** 견본 문자체계 — 한글이면 한글 견본, 라틴이면 라틴 견본 */
  script?: FontScript;
  /** 생성 중 표시 */
  loading?: boolean;
}

// base64 → ArrayBuffer (FontFace에 넘기기 위함)
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/**
 * 받은 폰트(base64)를 FontFace API로 등록하고, 스페시먼을 그 폰트로 렌더.
 * family 키는 단조 증가 카운터로 만들어 캐시 충돌을 결정적으로 피한다.
 */
export default function FontPreview({
  fontBase64,
  fontFamily,
  script = "latin",
  loading,
}: Props) {
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!fontBase64) {
      setActiveFamily(null);
      return;
    }
    const family = `${fontFamily || "GeneratedFont"}-${++seqRef.current}`;
    let cancelled = false;
    let registered: FontFace | null = null;

    try {
      const buf = base64ToArrayBuffer(fontBase64);
      const face = new FontFace(family, buf);
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

  const fontStyle = activeFamily
    ? { fontFamily: `"${activeFamily}", system-ui, sans-serif` }
    : undefined;

  const hangul = script === "hangul";

  return (
    <div className={styles.preview} aria-label="글자 견본">
      <div className={styles.tab}>
        <span className={styles.tabName}>견본 시트</span>
        <span className={`${styles.dot} ${activeFamily ? styles.live : ""}`}>
          {loading ? "갱신 중" : activeFamily ? "라이브" : "대기"}
        </span>
      </div>

      {activeFamily ? (
        // 견본은 생성 폰트가 실제로 커버하는 글자만 보여 준다(폴백 오해 방지).
        <div className={styles.sheet} style={fontStyle}>
          {hangul ? (
            <>
              <p className={styles.display}>가나다</p>
              <p className={styles.headline}>다람쥐 헌 쳇바퀴에 타고파</p>
              <p className={styles.body}>
                글자는 말의 옷이다. 같은 말도 어떤 글씨로 입느냐에 따라 표정이
                달라진다.
              </p>
              <p className={styles.row}>가 나 다 라 마 바 사 아 자 차 카 타 파 하</p>
              <p className={styles.nums}>0 1 2 3 4 5 6 7 8 9 . , ! ?</p>
            </>
          ) : (
            <>
              <p className={styles.display}>Aa</p>
              <p className={styles.headline}>Hamburgefonstiv</p>
              <p className={styles.body}>
                Typography is the craft of endowing human language with a
                durable visual form.
              </p>
              <p className={styles.row}>ABCDEFGHIJKLM</p>
              <p className={styles.row}>NOPQRSTUVWXYZ</p>
              <p className={styles.rowDim}>
                a b c d e f g h i j k l m n o p q r s t u v w x y z
              </p>
              <p className={styles.nums}>0123456789 . , ; : ! ? ( )</p>
            </>
          )}
        </div>
      ) : (
        // 빈 상태 — 마스코트가 안내
        <div className={styles.empty}>
          <Mascot mood={loading ? "surprised" : "sleepy"} size={88} />
          <p className={styles.emptyText}>
            {loading
              ? "글자를 깨우는 중이에요…"
              : "왼쪽 슬라이더를 움직이면 여기 견본이 나타나요."}
          </p>
        </div>
      )}

      <p className={styles.note}>
        {hangul
          ? "한글 견본입니다. 공개 한글 가변폰트를 변형한 결과예요."
          : "라틴 A–Z·a–z·0–9 견본입니다. 한글은 위 문자체계에서 전환하세요."}
      </p>
    </div>
  );
}
