"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Mascot, Segmented, sanitizeColor } from "@webapp/ui";
import styles from "./LetterPanel.module.css";

interface Props {
  /** 엔진이 준 손글씨 폰트(base64, woff). 없으면 비활성. */
  fontBase64?: string | null;
  /** 폰트가 커버하는 글자(내가 그린 것 + 자동 채운 것). 미커버 글자는 빠진다. */
  coveredChars: string[];
  /** 자동 채우기 켜짐 — 켜져 있으면 모든 글자가 채워졌다고 보고 그대로 렌더. */
  autofill?: boolean;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// 편지지 종류 — 색지/줄/여백.
type PaperId = "cream" | "white" | "mint" | "pink" | "grid";
const PAPERS: { id: PaperId; label: string; bg: string; line: string; ruled: "line" | "grid" | "none" }[] = [
  { id: "cream", label: "크림", bg: "#fdf6e8", line: "#e6d9bd", ruled: "line" },
  { id: "white", label: "흰 종이", bg: "#ffffff", line: "#e6e3ef", ruled: "line" },
  { id: "mint", label: "민트", bg: "#eaf6f0", line: "#cfe6da", ruled: "line" },
  { id: "pink", label: "핑크", bg: "#fdeef0", line: "#f1d4da", ruled: "line" },
  { id: "grid", label: "모눈", bg: "#fbfbfd", line: "#e4e7ef", ruled: "grid" },
];

const SIZES: { id: string; label: string; w: number; h: number }[] = [
  { id: "a4", label: "세로(A4)", w: 1240, h: 1754 },
  { id: "square", label: "정사각", w: 1240, h: 1240 },
  { id: "card", label: "엽서(가로)", w: 1748, h: 1240 },
];

/**
 * "내 폰트로 편지쓰기" — 편지지(색지/줄/여백) 위에 긴 글을 내 손글씨로 렌더 → PNG.
 * 기존 이미지 렌더 파이프라인과 동일한 Canvas + FontFace 방식(무거운 라이브러리 없음).
 * 폰트가 커버하지 못하는 글자는 자연스럽게 빠진다(폴백 오해 방지) — 자동 채우기 켜면 모두 렌더.
 */
export default function LetterPanel({ fontBase64, coveredChars, autofill = false }: Props) {
  const [text, setText] = useState("dear friend,\nthank you for being\nthere for me.\n\nlove always");
  const [paperId, setPaperId] = useState<PaperId>("cream");
  const [sizeId, setSizeId] = useState(SIZES[0]!.id);
  const [inkInput, setInkInput] = useState("#3a3550");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [fontReady, setFontReady] = useState(false);
  const seqRef = useRef(0);

  const paper = PAPERS.find((p) => p.id === paperId) ?? PAPERS[0]!;
  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[0]!;
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

  // 캔버스 렌더(결정적) — 편지지 + 줄 + 손글씨 본문(자동 줄바꿈).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeFamily || !fontReady) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = size.w;
    const H = size.h;
    canvas.width = W;
    canvas.height = H;

    // 1) 색지
    ctx.fillStyle = paper.bg;
    ctx.fillRect(0, 0, W, H);

    // 여백(편지지 마진)
    const margin = Math.round(W * 0.1);
    const box = { x: margin, y: margin, w: W - margin * 2, h: H - margin * 2 };

    // 본문 폰트 크기 — 종이 폭 기준 적당히.
    const fontPx = Math.round(W * 0.05);
    const lineH = Math.round(fontPx * 1.7);

    // 2) 줄/모눈
    ctx.strokeStyle = paper.line;
    ctx.lineWidth = 1.4;
    if (paper.ruled === "line") {
      for (let y = box.y + lineH; y <= box.y + box.h; y += lineH) {
        ctx.beginPath();
        ctx.moveTo(box.x, y);
        ctx.lineTo(box.x + box.w, y);
        ctx.stroke();
      }
    } else if (paper.ruled === "grid") {
      for (let y = box.y; y <= box.y + box.h; y += lineH) {
        ctx.beginPath();
        ctx.moveTo(box.x, y);
        ctx.lineTo(box.x + box.w, y);
        ctx.stroke();
      }
      for (let x = box.x; x <= box.x + box.w; x += lineH) {
        ctx.beginPath();
        ctx.moveTo(x, box.y);
        ctx.lineTo(x, box.y + box.h);
        ctx.stroke();
      }
    }

    // 3) 손글씨 본문 — box 폭에 맞춰 단어 단위 자동 줄바꿈 + 명시적 줄바꿈 존중.
    ctx.font = `${fontPx}px "${activeFamily}", system-ui, sans-serif`;
    ctx.fillStyle = safeInk;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    const wrap = (line: string): string[] => {
      if (line === "") return [""];
      const words = line.split(" ");
      const out: string[] = [];
      let cur = "";
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(test).width > box.w && cur) {
          out.push(cur);
          cur = w;
        } else {
          cur = test;
        }
      }
      out.push(cur);
      return out;
    };

    const wrapped: string[] = [];
    for (const raw of renderText.split("\n")) wrapped.push(...wrap(raw));

    // 첫 줄 베이스라인을 첫 줄선 살짝 위로.
    let y = box.y + lineH * 0.82;
    for (const line of wrapped) {
      if (y > box.y + box.h) break; // 종이 넘치면 멈춤
      ctx.fillText(line, box.x, y);
      y += lineH;
    }
  }, [activeFamily, fontReady, size, paper, safeInk, renderText]);

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
    <section className={styles.panel} aria-label="내 손글씨로 편지 쓰기">
      <header className={styles.head}>
        <h2 className={styles.title}>내 폰트로 편지 쓰기</h2>
        <p className={styles.sub}>
          편지지에 긴 글을 적으면 내 손글씨로 써 줘요. 이미지(PNG)로 받아 보내거나
          인쇄할 수 있어요.
        </p>
      </header>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="letter-text">
          편지 내용
        </label>
        <textarea
          id="letter-text"
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="전하고 싶은 말을 길게 적어요."
          spellCheck={false}
        />
        {!autofill && (
          <p className={styles.note} aria-live="polite">
            <Mascot mood="focused" size={16} still label="" />
            <span>안 그린 글자는 편지에서 빠져요. 자동 채우기를 켜면 다 채워져요.</span>
          </p>
        )}
      </div>

      <div className={styles.stage}>
        {disabled ? (
          <div className={styles.stageEmpty}>
            <Mascot mood="sleepy" size={72} />
            <p>왼쪽에서 글자를 먼저 그리면, 여기서 편지를 쓸 수 있어요.</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            role="img"
            aria-label="손글씨 편지 미리보기"
          />
        )}
      </div>

      <div className={styles.options}>
        <div className={styles.optRow}>
          <span className={styles.optLabel}>편지지</span>
          <div className={styles.chips} role="group" aria-label="편지지 종류">
            {PAPERS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.chip}
                aria-pressed={paperId === p.id}
                data-on={paperId === p.id}
                onClick={() => setPaperId(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.optRow}>
          <span className={styles.optLabel}>크기</span>
          <Segmented<string>
            ariaLabel="편지지 크기"
            value={sizeId}
            onChange={setSizeId}
            options={SIZES.map((s) => ({ value: s.id, label: s.label }))}
          />
        </div>

        <div className={styles.colorRow}>
          <label className={styles.colorField}>
            <span>글자색</span>
            <input
              type="color"
              value={safeInk.length === 7 ? safeInk : "#3a3550"}
              onChange={(e) => setInkInput(e.target.value)}
              aria-label="글자색"
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
        편지 PNG로 받기
      </Button>

      <p className={styles.honesty}>
        <Mascot mood="happy" size={18} still label="" />
        진짜 내가 그린 글씨로 쓴 편지예요. 편지지 무늬는 이미지 전용 효과예요.
      </p>
    </section>
  );
}
