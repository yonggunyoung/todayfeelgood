"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Mascot, Segmented, sanitizeColor } from "@webapp/ui";
import {
  DEFAULT_REFINE,
  type DrawnGlyph,
  type HandwritingResponse,
  type HangulComposeRequest,
  type RefineParams,
} from "@webapp/core";
import { apiPath } from "../lib/paths";
import { isHangulChar, requiredJamo } from "../lib/hangul";
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
import type { Dictionary } from "../lib/i18n";
import styles from "./LetterPanel.module.css";

interface Props {
  /** 그린 자모(char ∈ BASIC_JAMO) — 음절 조합 요청 페이로드. */
  jamo: DrawnGlyph[];
  /** 그린 자모 char 집합(필요 자모 안내용). */
  drawnJamo: string[];
  /** 다듬기 파라미터(스튜디오와 공유). */
  refine?: RefineParams;
  /** 안 그린 자모를 내 스타일로 자동 채움(엔진 병행). */
  autofill?: boolean;
  t: Dictionary["studio"]["hangulLetter"];
  /** 확대 모달 라벨(스튜디오 공유). */
  zoom: Dictionary["studio"]["previewZoom"];
}

// 편지 내용이 바뀐 뒤 엔진 합성까지 디바운스(ms). 긴 글 타이핑이 잦으므로 넉넉히.
const DEBOUNCE_MS = 800;

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/**
 * "내 자모로 한글 편지 쓰기" — LetterPanel(편지지/줄/확대/PNG)과 HangulImagePanel(텍스트→조합
 * 폰트)을 합친 패널. 한글은 음절이 텍스트에 의존하므로, 편지 내용이 바뀌면 그린 자모 + text를
 * `/api/hangul-compose`에 보내 합성 폰트를 받아 @font-face로 편지지 위에 렌더한다.
 * 편지지·크기·글자크기·렌더는 lib/letterPaper(라틴 편지와 공유, 줄바꿈만 글자 단위).
 */
export default function HangulLetterPanel({
  jamo,
  drawnJamo,
  refine = DEFAULT_REFINE,
  autofill = false,
  t,
  zoom,
}: Props) {
  const [text, setText] = useState(t.defaultText);
  const [paperId, setPaperId] = useState<PaperId>("cream");
  const [sizeId, setSizeId] = useState<SizeId>(SIZES[0]!.id);
  const [scaleId, setScaleId] = useState<TextScaleId>("m");
  const [inkInput, setInkInput] = useState("#3a3550");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [fontReady, setFontReady] = useState(false);
  const [fontBase64, setFontBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);
  const reqIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const paper = findPaper(paperId);
  const size = findSize(sizeId);
  const scale = findScale(scaleId);
  const safeInk = sanitizeColor(inkInput, "#3a3550");

  const drawnSet = useMemo(() => new Set(drawnJamo), [drawnJamo]);

  // 편지 내용에 필요하지만 아직 안 그린 기본 자모(중복 제거, 등장 순서) — "더 그리면 완성" 안내.
  const missingJamo = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ch of text) {
      if (!isHangulChar(ch)) continue;
      for (const j of requiredJamo(ch)) {
        if (!drawnSet.has(j) && !seen.has(j)) {
          seen.add(j);
          out.push(j);
        }
      }
    }
    return out;
  }, [text, drawnSet]);

  // 렌더 가능한 한글 본문(공백/줄바꿈 통과). 미완 음절은 빠짐.
  // 자동 채우기가 켜져 있으면 엔진이 안 그린 자모를 채우므로 모든 한글 음절을 포함한다.
  const renderText = useMemo(() => {
    const out: string[] = [];
    for (const ch of text) {
      if (ch === " " || ch === "\n") {
        out.push(ch);
        continue;
      }
      if (!isHangulChar(ch)) continue; // 한글만 합성(라틴/기호는 빠짐)
      const needs = requiredJamo(ch);
      if (needs.length === 0) continue;
      if (autofill || needs.every((j) => drawnSet.has(j))) out.push(ch);
    }
    return out.join("");
  }, [text, drawnSet, autofill]);

  // 합성에 보낼 텍스트(앞뒤 공백 정리). 엔진은 음절만 글리프로 만든다(중복 자동 제거).
  const textToCompose = renderText.trim();

  // 편지 내용/자모/다듬기 변경 → 디바운스 후 엔진 합성.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (jamo.length === 0 || !textToCompose) {
      setFontBase64(null);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const myId = ++reqIdRef.current;
      // 이전 요청 취소 — 서버에 동시 요청이 쌓이지 않게(세마포어 포화 방지).
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      const payload: HangulComposeRequest = {
        jamo,
        text: textToCompose,
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
          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            throw new Error(data?.error || `요청 실패 (${res.status})`);
          }
          return (await res.json()) as HandwritingResponse;
        })
        .then((data) => {
          if (myId !== reqIdRef.current) return;
          setFontBase64(data.fontBase64);
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          if (myId !== reqIdRef.current) return;
          setError(err instanceof Error ? err.message : t.composeError);
        })
        .finally(() => {
          if (myId === reqIdRef.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [jamo, textToCompose, refine, autofill, t.composeError]);

  // 받은 폰트를 FontFace로 등록.
  useEffect(() => {
    setFontReady(false);
    if (!fontBase64) {
      setActiveFamily(null);
      return;
    }
    const family = `HangulLetter-${++seqRef.current}`;
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

  // 캔버스 렌더(결정적) — 편지지 + 줄 + 한글 본문(공용 drawLetter, 글자 단위 줄바꿈).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeFamily || !fontReady || !textToCompose) return;
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
      wrapMode: "char",
    });
  }, [activeFamily, fontReady, size, paper, safeInk, renderText, scale, textToCompose]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-hangul-letter-${size.w}x${size.h}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const ready = !!activeFamily && fontReady && !!textToCompose;

  return (
    <section className={styles.panel} aria-label={t.ariaLabel}>
      <header className={styles.head}>
        <h2 className={styles.title}>{t.title}</h2>
        <p className={styles.sub}>{t.sub}</p>
      </header>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="hangul-letter-text">
          {t.contentLabel}
        </label>
        <textarea
          id="hangul-letter-text"
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={t.placeholder}
          spellCheck={false}
        />
        {missingJamo.length > 0 ? (
          <p className={styles.note} aria-live="polite">
            <Mascot mood="focused" size={16} still label="" />
            <span>
              <strong>{missingJamo.join(" · ")}</strong> {t.missingPre}
            </span>
          </p>
        ) : (
          <p className={styles.note} aria-live="polite">
            <Mascot mood="love" size={16} still label="" />
            <span>{t.ok}</span>
          </p>
        )}
      </div>

      <div className={styles.stage}>
        {ready ? (
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            role="img"
            aria-label={t.previewAria}
          />
        ) : (
          <div className={styles.stageEmpty}>
            <Mascot mood={loading ? "focused" : "sleepy"} size={72} />
            <p>{loading ? t.composing : error ? error : t.stageEmpty}</p>
          </div>
        )}
      </div>

      {ready && (
        <div className={styles.zoomRow}>
          <PreviewZoom
            canvasRef={canvasRef}
            label={zoom.open}
            closeLabel={zoom.close}
            dialogLabel={zoom.dialogLabel}
            fitLabel={zoom.fit}
            actualLabel={zoom.actual}
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
        disabled={!ready}
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
