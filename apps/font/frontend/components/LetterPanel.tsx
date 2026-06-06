"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Mascot, Segmented, sanitizeColor } from "@webapp/ui";
import type { Dictionary } from "../lib/i18n";
import {
  PAPERS,
  SIZES,
  TEXT_SCALES,
  findPaper,
  findSize,
  findScale,
  drawLetter,
  type PaperId,
  type SizeId,
  type TextScaleId,
} from "../lib/letterPaper";
import PreviewZoom from "./PreviewZoom";
import styles from "./LetterPanel.module.css";

interface Props {
  /** 엔진이 준 손글씨 폰트(base64, woff). 없으면 비활성. */
  fontBase64?: string | null;
  /** 폰트가 커버하는 글자(내가 그린 것 + 자동 채운 것). 미커버 글자는 빠진다. */
  coveredChars: string[];
  /** 자동 채우기 켜짐 — 켜져 있으면 모든 글자가 채워졌다고 보고 그대로 렌더. */
  autofill?: boolean;
  t: Dictionary["studio"]["letter"];
  /** 확대 모달 라벨(스튜디오 공유). */
  zoom: Dictionary["studio"]["previewZoom"];
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/**
 * "내 폰트로 편지쓰기" — 편지지(색지/줄/여백) 위에 긴 글을 내 손글씨로 렌더 → PNG.
 * 편지지·크기·글자크기·렌더는 lib/letterPaper(한글 편지와 공유). 확대로 디테일 확인.
 * 폰트가 커버하지 못하는 글자는 자연스럽게 빠진다 — 자동 채우기 켜면 모두 렌더.
 */
export default function LetterPanel({ fontBase64, coveredChars, autofill = false, t, zoom }: Props) {
  const [text, setText] = useState(t.defaultText);
  const [paperId, setPaperId] = useState<PaperId>("cream");
  const [sizeId, setSizeId] = useState<SizeId>(SIZES[0]!.id);
  const [scaleId, setScaleId] = useState<TextScaleId>("m");
  const [inkInput, setInkInput] = useState("#3a3550");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [fontReady, setFontReady] = useState(false);
  const seqRef = useRef(0);

  const paper = findPaper(paperId);
  const size = findSize(sizeId);
  const scale = findScale(scaleId);
  const safeInk = sanitizeColor(inkInput, "#3a3550");

  const coveredSet = useMemo(
    () => new Set(coveredChars.map((c) => c.toLowerCase())),
    [coveredChars],
  );

  // 폰트가 커버하는 글자만 남긴다(공백/줄바꿈 통과). 자동 채우기면 a–z 모두 통과.
  const renderText = useMemo(() => {
    return [...text]
      .map((ch) => {
        if (ch === " " || ch === "\n") return ch;
        const low = ch.toLowerCase();
        if (!/[a-z]/.test(low)) return ""; // 라틴 a–z 타깃
        if (autofill) return ch;
        return coveredSet.has(low) ? ch : "";
      })
      .join("");
  }, [text, coveredSet, autofill]);

  // 폰트 등록
  useEffect(() => {
    setFontReady(false);
    if (!fontBase64) {
      setActiveFamily(null);
      return;
    }
    const family = `HwLetter-${++seqRef.current}`;
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
          setFontReady(true);
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

  // 캔버스 렌더(결정적) — 편지지 + 줄 + 손글씨 본문(공용 drawLetter).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeFamily || !fontReady) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = size.w;
    canvas.height = size.h;
    drawLetter(ctx, {
      W: size.w,
      H: size.h,
      paper,
      fontFamily: activeFamily,
      ink: safeInk,
      text: renderText,
      fontScale: scale.mul,
      wrapMode: "word",
    });
  }, [activeFamily, fontReady, size, paper, safeInk, renderText, scale]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-letter-${size.w}x${size.h}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const disabled = !activeFamily || !fontReady;

  return (
    <section className={styles.panel} aria-label={t.ariaLabel}>
      <header className={styles.head}>
        <h2 className={styles.title}>{t.title}</h2>
        <p className={styles.sub}>{t.sub}</p>
      </header>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="letter-text">
          {t.contentLabel}
        </label>
        <textarea
          id="letter-text"
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={t.placeholder}
          spellCheck={false}
        />
        {!autofill && (
          <p className={styles.note} aria-live="polite">
            <Mascot mood="focused" size={16} still label="" />
            <span>{t.note}</span>
          </p>
        )}
      </div>

      <div className={styles.stage}>
        {disabled ? (
          <div className={styles.stageEmpty}>
            <Mascot mood="sleepy" size={72} />
            <p>{t.stageEmpty}</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            role="img"
            aria-label={t.previewAria}
          />
        )}
      </div>

      {!disabled && (
        <div className={styles.zoomRow}>
          <PreviewZoom
            canvasRef={canvasRef}
            label={zoom.open}
            closeLabel={zoom.close}
            dialogLabel={zoom.dialogLabel}
            zoomInLabel={zoom.zoomIn}
            zoomOutLabel={zoom.zoomOut}
            resetLabel={zoom.reset}
          />
        </div>
      )}

      <div className={styles.options}>
        <div className={styles.optRow}>
          <span className={styles.optLabel}>{t.paper}</span>
          <div className={styles.chips} role="group" aria-label={t.paperAria}>
            {PAPERS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.chip}
                aria-pressed={paperId === p.id}
                data-on={paperId === p.id}
                onClick={() => setPaperId(p.id)}
              >
                {t.papers[p.id]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.optRow}>
          <span className={styles.optLabel}>{t.size}</span>
          <Segmented<SizeId>
            ariaLabel={t.sizeAria}
            value={sizeId}
            onChange={setSizeId}
            options={SIZES.map((s) => ({ value: s.id, label: t.sizes[s.id] }))}
          />
        </div>

        <div className={styles.optRow}>
          <span className={styles.optLabel}>{t.textScale}</span>
          <Segmented<TextScaleId>
            ariaLabel={t.textScaleAria}
            value={scaleId}
            onChange={setScaleId}
            options={TEXT_SCALES.map((s) => ({ value: s.id, label: t.scales[s.id] }))}
          />
        </div>

        <div className={styles.colorRow}>
          <label className={styles.colorField}>
            <span>{t.ink}</span>
            <input
              type="color"
              value={safeInk.length === 7 ? safeInk : "#3a3550"}
              onChange={(e) => setInkInput(e.target.value)}
              aria-label={t.ink}
            />
          </label>
        </div>
      </div>

      <Button
        variant="clay"
        onClick={handleDownload}
        disabled={disabled}
        className={styles.exportBtn}
      >
        {t.export}
      </Button>

      <p className={styles.honesty}>
        <Mascot mood="happy" size={18} still label="" />
        {t.honesty}
      </p>
    </section>
  );
}
