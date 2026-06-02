"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mascot } from "@webapp/ui";
import {
  DEFAULT_PREVIEW_STYLE,
  type FontScript,
  type PreviewStyle,
} from "@webapp/core";
import styles from "./FontPreview.module.css";

interface Props {
  /** 엔진이 준 폰트(base64, woff). 없으면 시스템 폰트로 폴백. */
  fontBase64?: string | null;
  fontFamily?: string;
  /** 견본 문자체계 — 한글이면 한글 견본, 라틴이면 라틴 견본 */
  script?: FontScript;
  /** 생성 중 표시 */
  loading?: boolean;
  /** [PREVIEW] 이미지 전용 스타일(질감/무늬/색). 엔진 미전송. */
  previewStyle?: PreviewStyle;
}

// base64 → ArrayBuffer (FontFace에 넘기기 위함)
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** CSS background-image 무늬(이미지 전용) — 글자색 톤으로 자연스럽게. */
function patternBackground(pattern: PreviewStyle["pattern"], ink: string): string | undefined {
  switch (pattern) {
    case "stripe":
      return `repeating-linear-gradient(45deg, ${ink}1f 0 6px, transparent 6px 14px)`;
    case "dots":
      return `radial-gradient(${ink}26 1.6px, transparent 1.8px)`;
    case "grid":
      return `linear-gradient(${ink}1a 1px, transparent 1px), linear-gradient(90deg, ${ink}1a 1px, transparent 1px)`;
    default:
      return undefined;
  }
}

function patternSize(pattern: PreviewStyle["pattern"]): string | undefined {
  if (pattern === "dots") return "14px 14px";
  if (pattern === "grid") return "22px 22px";
  return undefined;
}

/**
 * 받은 폰트(base64)를 FontFace API로 등록하고, 스페시먼을 그 폰트로 렌더.
 * [PREVIEW] 스타일(질감/무늬/색)은 화면 견본과 PNG 내보내기에만 적용(폰트 파일엔 미반영).
 */
export default function FontPreview({
  fontBase64,
  fontFamily,
  script = "latin",
  loading,
  previewStyle = DEFAULT_PREVIEW_STYLE,
}: Props) {
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const seqRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

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

  const hangul = script === "hangul";
  const ink = previewStyle.inkColor || "#2b2a33";
  const bg = previewStyle.bgColor || "transparent";
  const fontStyle = activeFamily
    ? { fontFamily: `"${activeFamily}", system-ui, sans-serif` }
    : undefined;

  // 이미지 전용 표면 효과(질감 filter + 무늬 background)를 적용한 견본 표면 스타일
  const surfaceStyle = {
    ...fontStyle,
    color: ink,
    backgroundColor: bg === "transparent" ? undefined : bg,
    backgroundImage: patternBackground(previewStyle.pattern, ink),
    backgroundSize: patternSize(previewStyle.pattern),
  } as const;

  const textureClass =
    previewStyle.texture === "grain"
      ? styles.texGrain
      : previewStyle.texture === "paper"
        ? styles.texPaper
        : previewStyle.texture === "rough"
          ? styles.texRough
          : "";

  /**
   * PNG 내보내기 — 견본을 캔버스에 그려 스타일(글자색/배경/무늬/질감) 적용 후 저장.
   * 폰트 파일과 분리된 "이미지로 저장" 경로(정직성). 등록된 폰트로 캔버스에 직접 렌더.
   */
  const exportPng = useCallback(async () => {
    if (!activeFamily) return;
    setExporting(true);
    try {
      const W = 1200;
      const H = 675;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 배경(투명이면 칠하지 않음 → 투명 PNG)
      if (bg !== "transparent") {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
      }

      // 무늬(이미지 전용)
      ctx.save();
      if (previewStyle.pattern === "stripe") {
        ctx.strokeStyle = ink;
        ctx.globalAlpha = 0.12;
        ctx.lineWidth = 6;
        for (let x = -H; x < W; x += 28) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + H, H);
          ctx.stroke();
        }
      } else if (previewStyle.pattern === "dots") {
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.16;
        for (let y = 20; y < H; y += 32) {
          for (let x = 20; x < W; x += 32) {
            ctx.beginPath();
            ctx.arc(x, y, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (previewStyle.pattern === "grid") {
        ctx.strokeStyle = ink;
        ctx.globalAlpha = 0.1;
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 44) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
        for (let y = 0; y < H; y += 44) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 글자(등록된 생성 폰트로)
      await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      ctx.fillStyle = ink;
      ctx.textBaseline = "alphabetic";
      const fam = `"${activeFamily}", system-ui, sans-serif`;
      ctx.font = `700 220px ${fam}`;
      ctx.fillText(hangul ? "가나다" : "Aa", 64, 280);
      ctx.font = `600 84px ${fam}`;
      ctx.fillText(hangul ? "다람쥐 헌 쳇바퀴" : "Hamburgefonstiv", 66, 420);
      ctx.font = `500 52px ${fam}`;
      ctx.fillText(hangul ? "0 1 2 3 4 5 6 7 8 9" : "0123456789 . , ! ?", 66, 520);

      // 질감(그레인/거친 잉크) — 미세 노이즈 점을 살짝 얹는다
      if (previewStyle.texture !== "none") {
        const density = previewStyle.texture === "rough" ? 26000 : 14000;
        ctx.save();
        ctx.fillStyle = previewStyle.texture === "paper" ? "#000" : ink;
        for (let i = 0; i < density; i++) {
          ctx.globalAlpha = Math.random() * (previewStyle.texture === "rough" ? 0.1 : 0.05);
          ctx.fillRect(Math.random() * W, Math.random() * H, 1.3, 1.3);
        }
        ctx.restore();
      }

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `hwoek-specimen-${script}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setExporting(false);
    }
  }, [activeFamily, bg, ink, hangul, script, previewStyle]);

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
        <div ref={sheetRef} className={`${styles.sheet} ${textureClass}`} style={surfaceStyle}>
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

      {/* 이미지로 저장 — 폰트 다운로드와 분리된 별도 경로(스타일 적용 PNG) */}
      {activeFamily && (
        <div className={styles.exportRow}>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={exportPng}
            disabled={exporting}
          >
            {exporting ? "이미지 만드는 중…" : "이미지로 저장 (PNG)"}
          </button>
          <span className={styles.exportNote}>스타일 적용 · 폰트 파일과 별도</span>
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
