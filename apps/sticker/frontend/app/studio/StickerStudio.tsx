"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Chip, Mascot, Segmented } from "@webapp/ui";
import SketchCanvas, { type SketchCanvasHandle } from "../../components/SketchCanvas";
import {
  COLOR_PALETTES,
  MAX_STICKER_SET_SIZE,
  MEME_TEMPLATES,
  SHARE_PRESETS,
} from "../../lib/presets";
import {
  DEFAULT_CONFIG,
  generateSetFromLayers,
  type GenerateConfig,
  type GeneratedItem,
} from "../../lib/generate";
import type { CharLayers } from "../../lib/render";
import { downloadBlob, downloadDataUrl, makeZip } from "../../lib/zip";
import styles from "./StickerStudio.module.css";

const SRC = 360;
type Layers = { base: HTMLCanvasElement | null; eyes: HTMLCanvasElement | null; mouth: HTMLCanvasElement | null };
type StepKey = "base" | "eyes" | "mouth";
const STEPS: { key: StepKey; n: string; title: string; hint: string }[] = [
  { key: "base", n: "①", title: "얼굴·몸 그리기", hint: "캐릭터 윤곽을 그려요. (눈·입은 다음 단계에)" },
  { key: "eyes", n: "②", title: "눈 그리기", hint: "눈을 그려요 — 표정에 따라 이 부위가 움직여요." },
  { key: "mouth", n: "③", title: "입 그리기", hint: "입을 그려요 — 웃고·놀라고·삐죽… 표정마다 변형돼요." },
];

function snapshot(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  c.getContext("2d")!.drawImage(src, 0, 0);
  return c;
}

export default function StickerStudio() {
  const canvasRef = useRef<SketchCanvasHandle>(null);
  const [step, setStep] = useState(0); // 0~2 그리기, 3 결과
  const [layers, setLayers] = useState<Layers>({ base: null, eyes: null, mouth: null });
  const [bg, setBg] = useState<string | null>(null);

  const [items, setItems] = useState<GeneratedItem[]>([]);
  const [seed, setSeed] = useState(1);
  const [presetId, setPresetId] = useState(SHARE_PRESETS[0]!.id);
  const [varyColor, setVaryColor] = useState(true);
  const [fixedPaletteId, setFixedPaletteId] = useState(COLOR_PALETTES[0]!.id);
  const [varyTemplate, setVaryTemplate] = useState(true);
  const [fixedTemplateId, setFixedTemplateId] = useState("chip");
  const [tintStrength, setTintStrength] = useState(0.35);
  const [outlineScale, setOutlineScale] = useState(1);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const size = useMemo(() => SHARE_PRESETS.find((p) => p.id === presetId)?.size ?? 512, [presetId]);

  const compositeBg = (list: (HTMLCanvasElement | null)[]) => {
    const c = document.createElement("canvas");
    c.width = SRC;
    c.height = SRC;
    const ctx = c.getContext("2d")!;
    list.forEach((l) => l && ctx.drawImage(l, 0, 0));
    return c.toDataURL("image/png");
  };

  const runGenerate = useCallback(
    (lay: Layers, useSeed: number) => {
      if (!lay.base || !lay.eyes || !lay.mouth) return;
      setBusy(true);
      setError(null);
      setTimeout(() => {
        const cfg: GenerateConfig = {
          ...DEFAULT_CONFIG,
          size,
          seed: useSeed,
          tintStrength,
          outlineScale,
          varyColor,
          fixedPaletteId,
          varyTemplate,
          fixedTemplateId,
          caption: caption.trim() || undefined,
        };
        const chars: CharLayers = { base: lay.base!, eyes: lay.eyes!, mouth: lay.mouth! };
        const { items: out } = generateSetFromLayers(chars, SRC, cfg);
        setItems(out);
        setBusy(false);
      }, 16);
    },
    [size, tintStrength, outlineScale, varyColor, fixedPaletteId, varyTemplate, fixedTemplateId, caption]
  );

  // "다음 / 표정 만들기" — 현재 단계 그림을 레이어로 캡처하고 진행.
  const advance = () => {
    const cv = canvasRef.current?.getCanvas();
    if (!cv || !canvasRef.current?.isDirty()) {
      setError(`${STEPS[step]!.title}를 먼저 그려주세요.`);
      return;
    }
    setError(null);
    const snap = snapshot(cv);
    const next: Layers = { ...layers, [STEPS[step]!.key]: snap };
    setLayers(next);
    if (step < 2) {
      const captured = [next.base, next.eyes, next.mouth].filter(Boolean) as HTMLCanvasElement[];
      setBg(compositeBg(captured));
      canvasRef.current?.clear();
      setStep(step + 1);
    } else {
      runGenerate(next, seed);
      setStep(3);
    }
  };

  const restart = () => {
    setLayers({ base: null, eyes: null, mouth: null });
    setBg(null);
    setItems([]);
    setError(null);
    setStep(0);
    canvasRef.current?.clear();
  };

  const onReroll = () => {
    const n = (Math.floor(Math.random() * 1_000_000) + 1) >>> 0;
    setSeed(n);
    runGenerate(layers, n);
  };
  const regen = () => runGenerate(layers, seed);

  const downloadOne = (it: GeneratedItem) => downloadDataUrl(it.dataUrl, `sticker-${it.emotionId}.png`);
  const downloadAll = () => {
    if (!items.length) return;
    const zip = makeZip(
      items.map((it, i) => ({ name: `sticker-${String(i + 1).padStart(2, "0")}-${it.emotionId}.png`, dataUrl: it.dataUrl }))
    );
    downloadBlob(zip, `sticker-pack-seed${seed}.zip`);
  };

  const cur = STEPS[Math.min(step, 2)]!;

  return (
    <>
      <div className={`container ${styles.layout}`}>
        {/* ── 왼쪽: 단계별 그리기 + 변주 설정 ── */}
        <section className={styles.left} aria-label="부위별 그리기와 변주 설정">
          <div className={styles.panel}>
            {step < 3 ? (
              <>
                <h2 className={`display ${styles.panelTitle}`}>
                  {cur.n} {cur.title} <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>· {step + 1}/3</span>
                </h2>
                <p className={styles.hint}>{cur.hint}</p>
                <SketchCanvas ref={canvasRef} size={SRC} background={bg} />
                <div className={styles.stepRow} style={{ marginTop: "var(--sp-4)" }}>
                  <button type="button" className={styles.primary} onClick={advance}>
                    {step < 2 ? "다음 →" : `✨ 표정 ${MAX_STICKER_SET_SIZE}종 만들기`}
                  </button>
                  <button type="button" className={styles.secondary} onClick={restart}>
                    처음부터
                  </button>
                </div>
                {error && (
                  <p className={styles.error} role="alert">
                    <Mascot mood="worried" size={24} still label="" /> {error}
                  </p>
                )}
              </>
            ) : (
              <>
                <h2 className={`display ${styles.panelTitle}`}>✅ 다 그렸어요</h2>
                <p className={styles.hint}>내가 그린 눈·입을 표정마다 변형했어요. 색·템플릿을 바꾸면 다시 만들 수 있어요.</p>
                {bg && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={compositeBg([layers.base, layers.eyes, layers.mouth])} alt="내 캐릭터" style={{ width: 160, height: 160, background: "#fff", borderRadius: 16, boxShadow: "var(--shadow-sm)" }} />
                )}
                <div className={styles.stepRow} style={{ marginTop: "var(--sp-4)" }}>
                  <button type="button" className={styles.secondary} onClick={restart}>
                    처음부터 다시
                  </button>
                </div>
              </>
            )}
          </div>

          <div className={styles.panel}>
            <h2 className={`display ${styles.panelTitle}`}>변주 설정</h2>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>색 변주</span>
              <Segmented<"mix" | "one">
                ariaLabel="색 변주 방식"
                value={varyColor ? "mix" : "one"}
                onChange={(v) => setVaryColor(v === "mix")}
                options={[
                  { value: "mix", label: "여러 색 섞기" },
                  { value: "one", label: "한 색 통일" },
                ]}
              />
              {!varyColor && (
                <div className={styles.swatches} role="group" aria-label="고정 색 팔레트">
                  {COLOR_PALETTES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`${styles.swatch} ${fixedPaletteId === p.id ? styles.swatchOn : ""}`}
                      style={{ background: p.body }}
                      aria-label={p.label}
                      aria-pressed={fixedPaletteId === p.id}
                      onClick={() => setFixedPaletteId(p.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>밈·템플릿</span>
              <Segmented<"mix" | "one">
                ariaLabel="템플릿 방식"
                value={varyTemplate ? "mix" : "one"}
                onChange={(v) => setVaryTemplate(v === "mix")}
                options={[
                  { value: "mix", label: "섞기" },
                  { value: "one", label: "하나로" },
                ]}
              />
              {!varyTemplate && (
                <div className={styles.chips} role="group" aria-label="고정 템플릿">
                  {MEME_TEMPLATES.map((t) => (
                    <Chip key={t.id} selected={fixedTemplateId === t.id} onClick={() => setFixedTemplateId(t.id)} title={t.desc}>
                      {t.label}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="caption">
                캡션(짤 글귀, 선택)
              </label>
              <input
                id="caption"
                type="text"
                className={styles.text}
                placeholder="예: ㅇㅋ / 화이팅 / 좋아!"
                value={caption}
                maxLength={14}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="tint">
                색 입히기 {Math.round(tintStrength * 100)}%
              </label>
              <input id="tint" type="range" min={0} max={100} value={Math.round(tintStrength * 100)} onChange={(e) => setTintStrength(Number(e.target.value) / 100)} className={styles.range} />
              <span className={styles.hint}>0%면 내가 그린 색 그대로.</span>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>내보내기 크기</span>
              <div className={styles.chips} role="group" aria-label="내보내기 크기">
                {SHARE_PRESETS.map((p) => (
                  <Chip key={p.id} selected={presetId === p.id} onClick={() => setPresetId(p.id)} title={p.note}>
                    {p.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 오른쪽: 결과 ── */}
        <section className={styles.right} aria-label="표정 결과">
          {step === 3 && (
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={regen} disabled={busy}>
                {busy ? "만드는 중…" : "이 설정으로 다시 만들기"}
              </button>
              <button type="button" className={styles.dice} onClick={onReroll} disabled={busy} title="다른 색/템플릿 조합">
                🎲 다른 조합
              </button>
              {items.length > 0 && (
                <button type="button" className={styles.secondary} onClick={downloadAll}>
                  전체 ZIP 챙기기
                </button>
              )}
            </div>
          )}

          {step < 3 ? (
            <div className={styles.empty}>
              <Mascot mood="happy" size={96} label="너굴이가 기다려요" />
              <p className={styles.emptyText}>
                부위별로 그리면(윤곽→눈→입) <strong>내가 그린 눈·입</strong>이 표정마다 변형돼 <strong>{MAX_STICKER_SET_SIZE}종</strong>으로 떨어져요.
              </p>
              <p className={styles.honesty}>그림은 이 브라우저 안에서만 처리돼요.</p>
            </div>
          ) : (
            <>
              <div className={styles.gallery} role="list" aria-label="표정 변주 세트">
                {items.map((it) => (
                  <figure key={it.id} className={styles.cell} role="listitem">
                    <div className={styles.cellImgWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className={styles.cellImg} src={it.dataUrl} alt={`${it.label} 스티커`} />
                    </div>
                    <figcaption className={styles.cellCap}>{it.label}</figcaption>
                    <button type="button" className={styles.cellDl} onClick={() => downloadOne(it)}>
                      PNG 받기
                    </button>
                  </figure>
                ))}
              </div>
              <p className={styles.honesty}>내가 그린 부위를 표정마다 변형해 만들었어요(같은 시드 #{seed}면 같은 세트).</p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
