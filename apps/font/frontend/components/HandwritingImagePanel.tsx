"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Mascot, Segmented, sanitizeColor } from "@webapp/ui";
import { DEFAULT_REFINE, type DrawnGlyph, type RefineParams } from "@webapp/core";
import {
  BG_OPTIONS,
  MEME_TEMPLATES,
  SIZE_PRESETS,
  type Align,
  type BgKind,
} from "../lib/imageTemplates";
import type { SharePayload } from "../lib/shareCodec";
import ShareButton from "./ShareButton";
import PreviewZoom from "./PreviewZoom";
import type { Dictionary } from "../lib/i18n";
import styles from "./HandwritingImagePanel.module.css";

interface Props {
  /** 엔진이 준 손글씨 폰트(base64, woff). 없으면 비활성. */
  fontBase64?: string | null;
  fontFamily?: string;
  /** 내가 그린(=폰트가 커버하는) 문자 집합(소문자 기준) */
  drawnChars: string[];
  /** 그린 글자의 획(공유 링크 인코딩용). 없으면 공유 버튼 비활성. */
  glyphs?: DrawnGlyph[];
  /** 다듬기 파라미터(공유 링크 인코딩용). */
  refine?: RefineParams;
  /** 자동 채우기 켜짐 — 정직성 표기용(채운 글자는 내 글씨 아님). */
  autofill?: boolean;
  /** 스튜디오 사전(이미지 패널/옵션/공유/템플릿 라벨에 사용). */
  t: Dictionary["studio"];
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** 문구를 폰트가 커버하는 글자만 남기고 정리. 공백/줄바꿈은 통과. */
function renderableText(text: string, drawn: Set<string>): string {
  return [...text]
    .map((ch) => {
      if (ch === " " || ch === "\n") return ch;
      return drawn.has(ch.toLowerCase()) ? ch : "";
    })
    .join("");
}

/** 색지결 — 은은한 노이즈/사선(이미지 전용 효과, 폰트 파일엔 안 들어감). */
function paintPaper(ctx: CanvasRenderingContext2D, W: number, H: number, base: string) {
  ctx.save();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  // 결정적 점묘(시드 없는 Math.random 금지 — 좌표 기반 의사난수로 재현성 확보)
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
 * "내 손글씨로 이미지/짤 만들기" 패널.
 * 1) 문구 입력 + 안 그린 필요 글자 안내(노동↓: 적은 글자로도 결과)
 * 2) 생성된 손글씨 폰트(@font-face)로 Canvas 렌더 → PNG
 * 3) 짤/스티커 템플릿(말풍선/테두리/밑줄) — 데이터 배열로 확장
 * 4) 투명/단색 PNG 다운로드(주력). 폰트 파일은 별도 "고급" 경로 유지.
 *
 * 결과물 = 바로 쓰는 이미지. 무거운 라이브러리 없이 Canvas 직접, 색은 sanitizeColor로 살균.
 */
export default function HandwritingImagePanel({
  fontBase64,
  fontFamily,
  drawnChars,
  glyphs = [],
  refine = DEFAULT_REFINE,
  autofill = false,
  t,
}: Props) {
  const o = t.imgOptions;
  const tplLabel = (id: string) => (t.templates as Record<string, string>)[id] ?? id;
  const sizeLabel = (id: string) => (t.sizes as Record<string, string>)[id] ?? id;
  const bgLabel = (id: string) => (t.bgKinds as Record<string, string>)[id] ?? id;
  const [phrase, setPhrase] = useState("hello");
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
  const seqRef = useRef(0);

  const drawnSet = useMemo(
    () => new Set(drawnChars.map((c) => c.toLowerCase())),
    [drawnChars],
  );

  // 문구에 필요하지만 아직 안 그린 글자(중복 제거, 순서 유지) — "더 그리면 완성" 안내.
  const missingChars = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of phrase) {
      if (raw === " " || raw === "\n") continue;
      const ch = raw.toLowerCase();
      if (!/[a-z]/.test(ch)) continue; // 라틴 a–z 타깃
      if (!drawnSet.has(ch) && !seen.has(ch)) {
        seen.add(ch);
        out.push(ch);
      }
    }
    return out;
  }, [phrase, drawnSet]);

  const safeInk = sanitizeColor(inkInput, "#2b2a33");
  const safeBg = sanitizeColor(bgInput, "#fef3e2");
  const safeAccent = sanitizeColor(accentInput, "#ffd66b");

  const size = SIZE_PRESETS.find((s) => s.id === sizeId) ?? SIZE_PRESETS[0]!;
  const template =
    MEME_TEMPLATES.find((t) => t.id === templateId) ?? MEME_TEMPLATES[0]!;

  // 받은 폰트를 FontFace로 등록(미리보기 sheet의 등록과 별개 family로 충돌 회피).
  useEffect(() => {
    setFontReady(false);
    if (!fontBase64) {
      setActiveFamily(null);
      return;
    }
    const family = `HwImage-${++seqRef.current}`;
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

  const textToDraw = renderableText(phrase, drawnSet).trim() || "abc";

  // 캔버스 렌더(결정적) — 옵션 바뀔 때마다 다시 그린다.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeFamily || !fontReady) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = size.width;
    const H = size.height;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    // 1) 배경
    if (bg === "solid") {
      ctx.fillStyle = safeBg;
      ctx.fillRect(0, 0, W, H);
    } else if (bg === "paper") {
      paintPaper(ctx, W, H, safeBg);
    } // transparent: 칠하지 않음(알파 유지)

    // 글자 영역(템플릿 inset 적용)
    const inset = template.inset;
    const box = {
      x: W * inset,
      y: H * inset,
      w: W * (1 - inset * 2),
      h: H * (1 - inset * 2),
    };

    // 2) 템플릿 장식(글자 뒤)
    template.decorate?.(ctx, {
      phase: "back",
      W,
      H,
      box,
      ink: safeInk,
      accent: safeAccent,
    });

    // 3) 손글씨 텍스트 — box 안에 맞게 줄바꿈 + 폰트크기 자동 축소
    const lines = textToDraw.split("\n");
    ctx.textBaseline = "middle";
    ctx.textAlign = align === "left" ? "left" : align === "right" ? "right" : "center";
    ctx.fillStyle = safeInk;

    // box.h를 줄 수로 나눠 줄당 높이, 거기서 폰트 크기 산정 후 가로 넘치면 축소.
    let fontPx = Math.min(box.h / Math.max(1, lines.length) * 0.78, box.h * 0.9);
    const fitWidth = () => {
      ctx.font = `${fontPx}px "${activeFamily}", system-ui, sans-serif`;
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 1);
      if (widest > box.w) fontPx *= box.w / widest;
    };
    fitWidth();
    fitWidth(); // 2패스로 더 정확히
    ctx.font = `${fontPx}px "${activeFamily}", system-ui, sans-serif`;

    const lineH = fontPx * 1.18;
    const totalH = lineH * lines.length;
    const startY = box.y + box.h / 2 - totalH / 2 + lineH / 2;
    const tx =
      align === "left" ? box.x : align === "right" ? box.x + box.w : box.x + box.w / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, tx, startY + i * lineH);
    });

    // 4) 템플릿 장식(글자 위)
    template.decorate?.(ctx, {
      phase: "front",
      W,
      H,
      box,
      ink: safeInk,
      accent: safeAccent,
    });
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

  const handleDownloadPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const slug =
      textToDraw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24) || "handwriting";
    const filename = `${slug}-${size.width}x${size.height}.png`;
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));

    // 모바일·인앱 브라우저(카톡 등)는 a.download를 막는 경우가 많다 → Web Share(공유 시트) 우선.
    if (blob) {
      const file = new File([blob], filename, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await (navigator as Navigator & { share: (d: { files: File[] }) => Promise<void> }).share({ files: [file] });
          return;
        } catch {
          /* 사용자가 취소했거나 미지원 → 아래 다운로드 폴백 */
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }

    // 최후 폴백: dataURL 다운로드
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const disabled = !activeFamily || !fontReady;

  // 공유 페이로드: 문구에 실제로 쓰이는 글자의 획만 담아 URL을 가볍게.
  const buildSharePayload = useCallback((): SharePayload | null => {
    const usedChars = new Set(
      [...textToDraw].map((c) => c.toLowerCase()).filter((c) => /[a-z]/.test(c)),
    );
    const usedGlyphs = glyphs.filter((g) => usedChars.has(g.char.toLowerCase()));
    if (usedGlyphs.length === 0) return null;
    return {
      script: "latin",
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
      glyphs: usedGlyphs,
    };
  }, [textToDraw, glyphs, refine, bg, template.id, size.id, align, safeInk, safeBg, safeAccent]);

  return (
    <section className={styles.panel} aria-label={t.hwImage.ariaLabel}>
      <header className={styles.head}>
        <h2 className={styles.title}>{t.hwImage.title}</h2>
        <p className={styles.sub}>{t.hwImage.sub}</p>
      </header>

      {/* 문구 입력 + 필요 글자 안내 */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="hw-phrase">
          {t.hwImage.phraseLabel}
        </label>
        <textarea
          id="hw-phrase"
          className={styles.textarea}
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          rows={2}
          placeholder={t.hwImage.phrasePlaceholder}
          spellCheck={false}
        />
        {missingChars.length > 0 ? (
          <p className={styles.missing} aria-live="polite">
            <Mascot mood="focused" size={18} still label="" />
            <span>
              <strong>{missingChars.join(" · ")}</strong> {t.hwImage.missingPre}
            </span>
          </p>
        ) : (
          <p className={styles.ok} aria-live="polite">
            <Mascot mood="love" size={18} still label="" />
            <span>{t.hwImage.ok}</span>
          </p>
        )}
      </div>

      {/* 미리보기 캔버스 */}
      <div className={`${styles.stage} ${bg === "transparent" ? styles.checker : ""}`}>
        {disabled ? (
          <div className={styles.stageEmpty}>
            <Mascot mood="sleepy" size={72} />
            <p>{t.hwImage.stageEmpty}</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            role="img"
            aria-label={t.hwImage.previewAria.replace("{text}", textToDraw)}
          />
        )}
      </div>

      {!disabled && (
        <div className={styles.zoomRow}>
          <PreviewZoom
            canvasRef={canvasRef}
            label={t.previewZoom.open}
            closeLabel={t.previewZoom.close}
            dialogLabel={t.previewZoom.dialogLabel}
            fitLabel={t.previewZoom.fit}
            actualLabel={t.previewZoom.actual}
          />
        </div>
      )}

      {/* 옵션들 */}
      <div className={styles.options}>
        <div className={styles.optRow}>
          <span className={styles.optLabel}>{o.size}</span>
          <div className={styles.chips} role="group" aria-label={o.sizeAria}>
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
                {sizeLabel(s.id)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.optRow}>
          <span className={styles.optLabel}>{o.template}</span>
          <div className={styles.chips} role="group" aria-label={o.templateAria}>
            {MEME_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className={styles.chip}
                aria-pressed={templateId === tpl.id}
                data-on={templateId === tpl.id}
                title={tpl.hint}
                onClick={() => setTemplateId(tpl.id)}
              >
                {tplLabel(tpl.id)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.optRow}>
          <span className={styles.optLabel}>{o.bg}</span>
          <Segmented<BgKind>
            ariaLabel={o.bgAria}
            value={bg}
            onChange={setBg}
            options={BG_OPTIONS.map((b) => ({ value: b.id, label: bgLabel(b.id) }))}
          />
        </div>

        <div className={styles.optRow}>
          <span className={styles.optLabel}>{o.align}</span>
          <Segmented<Align>
            ariaLabel={o.alignAria}
            value={align}
            onChange={setAlign}
            options={[
              { value: "left", label: o.alignLeft },
              { value: "center", label: o.alignCenter },
              { value: "right", label: o.alignRight },
            ]}
          />
        </div>

        <div className={styles.colorRow}>
          <label className={styles.colorField}>
            <span>{o.ink}</span>
            <input
              type="color"
              value={safeInk.length === 7 ? safeInk : "#2b2a33"}
              onChange={(e) => setInkInput(e.target.value)}
              aria-label={o.ink}
            />
          </label>
          {bg !== "transparent" && (
            <label className={styles.colorField}>
              <span>{o.bgColor}</span>
              <input
                type="color"
                value={safeBg.length === 7 ? safeBg : "#fef3e2"}
                onChange={(e) => setBgInput(e.target.value)}
                aria-label={o.bgColor}
              />
            </label>
          )}
          {template.id !== "plain" && (
            <label className={styles.colorField}>
              <span>{o.accent}</span>
              <input
                type="color"
                value={safeAccent.length === 7 ? safeAccent : "#ffd66b"}
                onChange={(e) => setAccentInput(e.target.value)}
                aria-label={o.accent}
              />
            </label>
          )}
        </div>
      </div>

      <Button
        variant="clay"
        onClick={handleDownloadPng}
        disabled={disabled}
        className={styles.exportBtn}
      >
        {o.exportPng}{bg === "transparent" ? o.exportTransparent : ""}
      </Button>

      <ShareButton buildPayload={buildSharePayload} disabled={disabled} t={t.share} />

      <p className={styles.honesty}>
        <Mascot mood="happy" size={18} still label="" />
        {autofill ? t.hwImage.honestyAutofill : t.hwImage.honestyHand}
      </p>
    </section>
  );
}
