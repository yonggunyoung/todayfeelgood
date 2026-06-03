"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  BG_OPTIONS,
  MEME_TEMPLATES,
  SIZE_PRESETS,
  type Align,
  type BgKind,
} from "../lib/imageTemplates";
import type { SharePayload } from "../lib/shareCodec";
import ShareButton from "./ShareButton";
import styles from "./HandwritingImagePanel.module.css";

interface Props {
  /** 그린 자모(char ∈ BASIC_JAMO) — 이미지 합성 요청 페이로드. */
  jamo: DrawnGlyph[];
  /** 그린 자모 char 집합(필요 자모 안내용). */
  drawnJamo: string[];
  /** 다듬기 파라미터(스튜디오와 공유). */
  refine?: RefineParams;
  /** 안 그린 자모를 내 스타일로 자동 채움(엔진 병행 — 미지원이면 무시). */
  autofill?: boolean;
}

// 문구가 바뀐 뒤 엔진 합성까지 디바운스(ms). 문구 타이핑이 잦으므로 넉넉히.
const DEBOUNCE_MS = 800;

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** 색지결 — 은은한 노이즈(이미지 전용 효과, 폰트 파일엔 안 들어감). */
function paintPaper(ctx: CanvasRenderingContext2D, W: number, H: number, base: string) {
  ctx.save();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,0.025)";
  const step = Math.max(6, Math.round(Math.min(W, H) / 90));
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const n = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      if (n > 0.6) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();
}

/**
 * "내 자모로 한글 문구 이미지 만들기" 패널 (HandwritingImagePanel의 한글판).
 *
 * 라틴판과 다른 점: 폰트가 **문구의 음절**에 의존하므로(조합 합성), 문구가 바뀌면
 * 엔진 `/api/hangul-compose`에 그린 자모 + text를 보내 합성 폰트를 받아 렌더한다.
 * 안 그린 필요 자모를 안내해 "적은 입력 → 결과"를 유도한다. 색은 sanitizeColor로 살균.
 */
export default function HangulImagePanel({ jamo, drawnJamo, refine = DEFAULT_REFINE, autofill = false }: Props) {
  const [phrase, setPhrase] = useState("안녕");
  const [sizeId, setSizeId] = useState(SIZE_PRESETS[0]!.id);
  const [templateId, setTemplateId] = useState(MEME_TEMPLATES[0]!.id);
  const [bg, setBg] = useState<BgKind>("transparent");
  const [align, setAlign] = useState<Align>("center");
  const [inkInput, setInkInput] = useState("#2b2a33");
  const [bgInput, setBgInput] = useState("#fef3e2");
  const [accentInput, setAccentInput] = useState("#ffd66b");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [fontReady, setFontReady] = useState(false);
  const [fontBase64, setFontBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);
  const reqIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const drawnSet = useMemo(() => new Set(drawnJamo), [drawnJamo]);

  // 문구에 필요하지만 아직 안 그린 기본 자모(순서 유지) — "더 그리면 완성" 안내.
  const missingJamo = useMemo(() => {
    return requiredJamo(phrase).filter((j) => !drawnSet.has(j));
  }, [phrase, drawnSet]);

  // 그린 자모만으로 완성 가능한 음절만 남긴 문구(공백/줄바꿈 통과). 미완 음절은 빠짐.
  const renderableText = useMemo(() => {
    const out: string[] = [];
    for (const ch of phrase) {
      if (ch === " " || ch === "\n") {
        out.push(ch);
        continue;
      }
      if (!isHangulChar(ch)) continue; // 한글만 합성(라틴/기호는 빠짐)
      const needs = requiredJamo(ch);
      if (needs.length > 0 && needs.every((j) => drawnSet.has(j))) out.push(ch);
    }
    return out.join("");
  }, [phrase, drawnSet]);

  const safeInk = sanitizeColor(inkInput, "#2b2a33");
  const safeBg = sanitizeColor(bgInput, "#fef3e2");
  const safeAccent = sanitizeColor(accentInput, "#ffd66b");

  const size = SIZE_PRESETS.find((s) => s.id === sizeId) ?? SIZE_PRESETS[0]!;
  const template = MEME_TEMPLATES.find((t) => t.id === templateId) ?? MEME_TEMPLATES[0]!;

  // 합성 가능한 문구(=그린 자모로 완성되는 음절). 없으면 빈 문자열.
  const textToDraw = renderableText.trim();

  // 문구/자모/다듬기 변경 → 디바운스 후 엔진 합성 호출.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (jamo.length === 0 || !textToDraw) {
      setFontBase64(null);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const myId = ++reqIdRef.current;
      setLoading(true);
      setError(null);
      const payload: HangulComposeRequest = {
        jamo,
        text: textToDraw,
        refine,
        format: "woff",
        autofill,
      };
      fetch(apiPath("/api/hangul-compose"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          if (myId !== reqIdRef.current) return;
          setError(err instanceof Error ? err.message : "글씨 합성 중 오류가 발생했습니다.");
          setFontBase64(null);
        })
        .finally(() => {
          if (myId === reqIdRef.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [jamo, textToDraw, refine, autofill]);

  // 받은 폰트를 FontFace로 등록.
  useEffect(() => {
    setFontReady(false);
    if (!fontBase64) {
      setActiveFamily(null);
      return;
    }
    const family = `HangulImage-${++seqRef.current}`;
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

  // 캔버스 렌더(결정적) — 옵션/폰트 바뀔 때마다 다시 그린다.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeFamily || !fontReady || !textToDraw) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = size.width;
    const H = size.height;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    if (bg === "solid") {
      ctx.fillStyle = safeBg;
      ctx.fillRect(0, 0, W, H);
    } else if (bg === "paper") {
      paintPaper(ctx, W, H, safeBg);
    }

    const inset = template.inset;
    const box = {
      x: W * inset,
      y: H * inset,
      w: W * (1 - inset * 2),
      h: H * (1 - inset * 2),
    };

    template.decorate?.(ctx, { phase: "back", W, H, box, ink: safeInk, accent: safeAccent });

    const lines = textToDraw.split("\n");
    ctx.textBaseline = "middle";
    ctx.textAlign = align === "left" ? "left" : align === "right" ? "right" : "center";
    ctx.fillStyle = safeInk;

    let fontPx = Math.min((box.h / Math.max(1, lines.length)) * 0.78, box.h * 0.9);
    const fitWidth = () => {
      ctx.font = `${fontPx}px "${activeFamily}", system-ui, sans-serif`;
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 1);
      if (widest > box.w) fontPx *= box.w / widest;
    };
    fitWidth();
    fitWidth();
    ctx.font = `${fontPx}px "${activeFamily}", system-ui, sans-serif`;

    const lineH = fontPx * 1.18;
    const totalH = lineH * lines.length;
    const startY = box.y + box.h / 2 - totalH / 2 + lineH / 2;
    const tx = align === "left" ? box.x : align === "right" ? box.x + box.w : box.x + box.w / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, tx, startY + i * lineH);
    });

    template.decorate?.(ctx, { phase: "front", W, H, box, ink: safeInk, accent: safeAccent });
  }, [
    activeFamily,
    fontReady,
    size,
    bg,
    safeBg,
    safeInk,
    safeAccent,
    template,
    align,
    textToDraw,
  ]);

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `hangul-${size.width}x${size.height}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const ready = !!activeFamily && fontReady && !!textToDraw;

  // 공유 페이로드: 합성 문구에 실제 필요한 기본 자모의 획만 담아 URL을 가볍게.
  const buildSharePayload = useCallback((): SharePayload | null => {
    if (!textToDraw) return null;
    const needed = new Set(requiredJamo(textToDraw));
    const usedJamo = jamo.filter((g) => needed.has(g.char));
    if (usedJamo.length === 0) return null;
    return {
      script: "hangul",
      text: textToDraw,
      refine,
      style: {
        bg,
        template: template.id,
        size: size.id,
        align,
        ink: safeInk,
        bgColor: safeBg,
        accent: safeAccent,
      },
      glyphs: usedJamo,
    };
  }, [textToDraw, jamo, refine, bg, template.id, size.id, align, safeInk, safeBg, safeAccent]);

  return (
    <section className={styles.panel} aria-label="내 자모로 한글 문구 이미지 만들기">
      <header className={styles.head}>
        <h2 className={styles.title}>내 자모로 한글 문구 이미지 만들기</h2>
        <p className={styles.sub}>
          그린 기본 자모로 문구의 음절을 조합해 이미지를 만들어요. 카톡·인스타에 바로
          붙여 넣을 수 있어요. (조합이라 글자마다 티가 조금 날 수 있어요.)
        </p>
      </header>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="hangul-phrase">
          문구
        </label>
        <textarea
          id="hangul-phrase"
          className={styles.textarea}
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          rows={2}
          placeholder="쓰고 싶은 한글을 적어요 (예: 오늘도 좋은 하루)"
          spellCheck={false}
        />
        {missingJamo.length > 0 ? (
          <p className={styles.missing} aria-live="polite">
            <Mascot mood="focused" size={18} still label="" />
            <span>
              <strong>{missingJamo.join(" · ")}</strong> 자모를 더 그리면 완성돼요. 못
              만든 음절은 이미지에서 빠져요.
            </span>
          </p>
        ) : (
          <p className={styles.ok} aria-live="polite">
            <Mascot mood="love" size={18} still label="" />
            <span>필요한 자모가 다 준비됐어요. 기본 자모만으로 충분해요 너굴.</span>
          </p>
        )}
      </div>

      <div className={`${styles.stage} ${bg === "transparent" ? styles.checker : ""}`}>
        {ready ? (
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            role="img"
            aria-label={`한글 손글씨 이미지 미리보기: ${textToDraw}`}
          />
        ) : (
          <div className={styles.stageEmpty}>
            <Mascot mood={loading ? "focused" : "sleepy"} size={72} />
            <p>
              {loading
                ? "그린 자모로 음절을 조합하는 중… 너굴."
                : error
                  ? error
                  : "왼쪽에서 자모를 그리고 문구를 적으면, 여기서 이미지로 만들 수 있어요."}
            </p>
          </div>
        )}
      </div>

      <div className={styles.options}>
        <div className={styles.optRow}>
          <span className={styles.optLabel}>크기</span>
          <div className={styles.chips} role="group" aria-label="이미지 크기 프리셋">
            {SIZE_PRESETS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.chip}
                aria-pressed={sizeId === s.id}
                data-on={sizeId === s.id}
                title={s.hint}
                onClick={() => setSizeId(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.optRow}>
          <span className={styles.optLabel}>템플릿</span>
          <div className={styles.chips} role="group" aria-label="짤·스티커 템플릿">
            {MEME_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={styles.chip}
                aria-pressed={templateId === t.id}
                data-on={templateId === t.id}
                title={t.hint}
                onClick={() => setTemplateId(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.optRow}>
          <span className={styles.optLabel}>배경</span>
          <Segmented<BgKind>
            ariaLabel="배경 종류"
            value={bg}
            onChange={setBg}
            options={BG_OPTIONS.map((b) => ({ value: b.id, label: b.label }))}
          />
        </div>

        <div className={styles.optRow}>
          <span className={styles.optLabel}>정렬</span>
          <Segmented<Align>
            ariaLabel="문구 정렬"
            value={align}
            onChange={setAlign}
            options={[
              { value: "left", label: "왼쪽" },
              { value: "center", label: "가운데" },
              { value: "right", label: "오른쪽" },
            ]}
          />
        </div>

        <div className={styles.colorRow}>
          <label className={styles.colorField}>
            <span>글자색</span>
            <input
              type="color"
              value={safeInk.length === 7 ? safeInk : "#2b2a33"}
              onChange={(e) => setInkInput(e.target.value)}
              aria-label="글자색"
            />
          </label>
          {bg !== "transparent" && (
            <label className={styles.colorField}>
              <span>배경색</span>
              <input
                type="color"
                value={safeBg.length === 7 ? safeBg : "#fef3e2"}
                onChange={(e) => setBgInput(e.target.value)}
                aria-label="배경색"
              />
            </label>
          )}
          {template.id !== "plain" && (
            <label className={styles.colorField}>
              <span>장식색</span>
              <input
                type="color"
                value={safeAccent.length === 7 ? safeAccent : "#ffd66b"}
                onChange={(e) => setAccentInput(e.target.value)}
                aria-label="장식색"
              />
            </label>
          )}
        </div>
      </div>

      <Button
        variant="clay"
        onClick={handleDownloadPng}
        disabled={!ready}
        className={styles.exportBtn}
      >
        PNG로 내보내기{bg === "transparent" ? " (투명)" : ""}
      </Button>

      <ShareButton buildPayload={buildSharePayload} disabled={!ready} />

      <p className={styles.honesty}>
        <Mascot mood="happy" size={18} still label="" />
        기본 자모를 그려 음절을 조합한 글씨예요(조합 티가 있을 수 있어요). 색지결은
        이미지 전용 효과(폰트 파일엔 안 들어가요).
      </p>
    </section>
  );
}
