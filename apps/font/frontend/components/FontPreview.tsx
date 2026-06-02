"use client";

import { useEffect, useState } from "react";
import styles from "./FontPreview.module.css";

interface Props {
  /** 엔진이 준 WOFF 폰트(base64). 없으면 시스템 폰트로 폴백. */
  fontWoffBase64?: string | null;
  fontFamily?: string;
}

// base64 → ArrayBuffer (FontFace에 넘기기 위함)
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  // data URL 접두사가 붙어있으면 제거
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/**
 * 받은 WOFF(base64)를 FontFace API로 등록하고,
 * 예시 문장을 그 폰트로 렌더한다.
 */
export default function FontPreview({ fontWoffBase64, fontFamily }: Props) {
  const [activeFamily, setActiveFamily] = useState<string | null>(null);

  useEffect(() => {
    if (!fontWoffBase64) {
      setActiveFamily(null);
      return;
    }
    // 동일 base64여도 family 이름을 유니크하게 만들어 캐시 충돌을 피한다
    const family = `${fontFamily || "GeneratedFont"}-${Date.now()}`;
    let cancelled = false;
    let registered: FontFace | null = null;

    try {
      const buf = base64ToArrayBuffer(fontWoffBase64);
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
  }, [fontWoffBase64, fontFamily]);

  const fontStyle = activeFamily
    ? { fontFamily: `"${activeFamily}", system-ui, sans-serif` }
    : undefined;

  return (
    <div className={styles.preview}>
      <h2 className={styles.heading}>미리보기</h2>
      <div className={styles.sheet} style={fontStyle}>
        <p className={styles.lineLg}>The quick brown fox jumps over the lazy dog</p>
        <p className={styles.lineMd}>Handwriting 1234567890</p>
        <p className={styles.lineSm}>
          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz
        </p>
      </div>
      {!activeFamily && (
        <p className={styles.note}>
          아직 생성된 폰트가 없습니다. 슬라이더를 움직이면 폰트가 만들어집니다.
        </p>
      )}
    </div>
  );
}
