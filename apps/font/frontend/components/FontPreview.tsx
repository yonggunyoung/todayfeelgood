"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./FontPreview.module.css";

interface Props {
  /** 엔진이 준 폰트(base64, woff). 없으면 시스템 폰트로 폴백. */
  fontBase64?: string | null;
  fontFamily?: string;
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
export default function FontPreview({ fontBase64, fontFamily }: Props) {
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
    ? { fontFamily: `"${activeFamily}", Georgia, serif` }
    : undefined;

  return (
    <div className={styles.preview} aria-label="글자 견본">
      <div className={`sans ${styles.tab}`}>
        <span>견본 시트</span>
        <span className={styles.dim}>
          {activeFamily ? "라이브" : "대기"}
        </span>
      </div>

      <div className={styles.sheet} style={fontStyle}>
        <p className={styles.display}>Aa</p>
        <p className={styles.headline}>활자가 깨어나는 새벽</p>
        <p className={styles.body}>
          Typography is the craft of endowing human language with a durable
          visual form.
        </p>
        <p className={styles.row}>ABCDEFGHIJKLM</p>
        <p className={styles.row}>NOPQRSTUVWXYZ</p>
        <p className={styles.rowDim}>a b c d e f g h i j k l m n o p q r s t u v w x y z</p>
        <p className={styles.nums}>0123456789 · &amp; @ # ? !</p>
      </div>

      {!activeFamily && (
        <p className={`sans ${styles.note}`}>
          왼쪽 세 축을 움직이면 이 자리의 견본이 방금 빚은 글자체로 바뀝니다.
        </p>
      )}
    </div>
  );
}
