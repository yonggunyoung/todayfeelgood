"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type FontParams,
  type FontScript,
  type GenerateRequest,
  type GenerateResponse,
} from "@webapp/core";
import { Button, Chip, Mascot, Segmented, Slider } from "@webapp/ui";
import { apiPath } from "../../lib/paths";
import {
  clampSign,
  defaultSignParams,
  SIGN_PRESETS,
  type SignParams,
} from "../../lib/signParams";
import { buildSignSvg, svgDataUrl, svgToPng } from "../../lib/render";
import styles from "./SignStudio.module.css";

const DEBOUNCE_MS = 400;
const GALLERY_SEEDS = 9; // N종 변주 개수

/** WOFF base64를 FontFace로 등록(중복 등록 방지 위해 family 이름에 해시 포함). */
async function loadFontFace(family: string, woffBase64: string): Promise<void> {
  if (typeof window === "undefined" || !("FontFace" in window)) return;
  const src = `url(data:font/woff;base64,${woffBase64}) format('woff')`;
  const face = new FontFace(family, src);
  await face.load();
  (document as Document & { fonts: FontFaceSet }).fonts.add(face);
}

/** params로 짧은 family 해시(같은 변형은 같은 family 재사용). */
function familyFor(params: FontParams, script: FontScript): string {
  const s = (Object.keys(params) as (keyof FontParams)[])
    .sort()
    .map((k) => `${k}:${params[k]}`)
    .join("|");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `Sign_${script}_${(h >>> 0).toString(36)}`;
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function SignStudio() {
  const [params, setParams] = useState<SignParams>(() => defaultSignParams());
  const [presetId, setPresetId] = useState<string>(SIGN_PRESETS[0]!.id);
  const [galleryBaseSeed, setGalleryBaseSeed] = useState(7);
  const [selectedSeed, setSelectedSeed] = useState<number>(7);
  // 현재 선택된 본체 폰트(WOFF base64) + family — 프리뷰/내보내기 공유
  const [fontFamily, setFontFamily] = useState<string>("");
  const [fontBase64, setFontBase64] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyExport, setBusyExport] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  const name = params.text.trim();
  const hasName = name.length > 0;

  // 갤러리 변주: 같은 무드·이름으로 seed만 바꾼 N종.
  const gallerySeeds = useMemo(
    () => Array.from({ length: GALLERY_SEEDS }, (_, i) => (galleryBaseSeed + i * 1373) >>> 0),
    [galleryBaseSeed]
  );

  /** 선택 seed의 본체 폰트를 엔진에서 받아 FontFace 등록. */
  const fetchFont = useCallback(
    async (sp: SignParams) => {
      const myId = ++reqIdRef.current;
      setLoading(true);
      setError(null);
      const fam = familyFor(sp.body, sp.script);

      try {
        const payload: GenerateRequest = {
          params: sp.body,
          script: sp.script,
          format: "woff",
        };
        const res = await fetch(apiPath("/api/generate"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || `요청 실패 (${res.status})`);
        }
        const data = (await res.json()) as GenerateResponse;
        if (myId !== reqIdRef.current) return;
        await loadFontFace(fam, data.fontBase64);
        if (myId !== reqIdRef.current) return;
        setFontBase64(data.fontBase64);
        setFontFamily(fam);
      } catch (err) {
        if (myId !== reqIdRef.current) return;
        setError(err instanceof Error ? err.message : "서명 글자 생성 중 오류가 발생했습니다.");
      } finally {
        if (myId === reqIdRef.current) setLoading(false);
      }
    },
    []
  );

  // 선택 seed 반영한 현재 파라미터
  const activeParams = useMemo<SignParams>(
    () => clampSign({ ...params, body: { ...params.body, seed: selectedSeed } }),
    [params, selectedSeed]
  );

  // body 변형(무드/슬라이더/seed/script) 변경 시 디바운스 후 폰트 재요청
  const bodyKey = useMemo(() => familyFor(activeParams.body, activeParams.script), [activeParams]);
  useEffect(() => {
    if (!hasName) return; // 이름 없으면 굳이 엔진 호출 안 함
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchFont(activeParams);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // bodyKey가 변형 본체를 대표(텍스트는 폰트에 영향 없음)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyKey, hasName]);

  // 무드 프리셋 적용 — 이름은 보존
  const applyPreset = useCallback((id: string) => {
    const preset = SIGN_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setParams((prev) => {
      const next = preset.apply();
      next.text = prev.text;
      return clampSign(next);
    });
  }, []);

  const onName = (v: string) => setParams((p) => ({ ...p, text: v.slice(0, 32) }));
  const onScript = (s: FontScript) =>
    setParams((p) => clampSign({ ...p, script: s }));

  const reroll = () => {
    const next = (Math.floor(Math.random() * 1_000_000) + 1) >>> 0;
    setGalleryBaseSeed(next);
  };

  // 슬라이더 미세조정
  const setBody = (k: keyof FontParams, v: number) =>
    setParams((p) => clampSign({ ...p, body: { ...p.body, [k]: v } }));
  const setFlourish = (v: number) =>
    setParams((p) =>
      clampSign({ ...p, flourish: { ...p.flourish, intensity: v, enabled: v > 0.02 } })
    );
  const toggleUnderline = () =>
    setParams((p) =>
      clampSign({ ...p, underline: { ...p.underline, enabled: !p.underline.enabled } })
    );

  // 현재 선택 서명의 SVG(자기완결, 워터마크 없음 — SVG는 유료 의도지만 MVP는 다운로드 허용)
  const previewSvg = useMemo(
    () => buildSignSvg(activeParams, fontBase64, fontFamily || "Sign", { watermark: false }),
    [activeParams, fontBase64, fontFamily]
  );

  const fileBase = useMemo(
    () => `sign-${(name || "name").replace(/\s+/g, "-").slice(0, 16)}-s${selectedSeed}`,
    [name, selectedSeed]
  );

  const exportSvg = useCallback(() => {
    const svg = buildSignSvg(activeParams, fontBase64, fontFamily || "Sign", { watermark: false });
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${fileBase}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2600);
  }, [activeParams, fontBase64, fontFamily, fileBase]);

  const exportPng = useCallback(
    async (scale: number) => {
      setBusyExport(true);
      setError(null);
      try {
        // 폰트가 문서에 등록돼 있어야 canvas 렌더가 정확. 등록 보장.
        if (fontBase64 && fontFamily) await loadFontFace(fontFamily, fontBase64).catch(() => {});
        const svg = buildSignSvg(activeParams, fontBase64, fontFamily || "Sign", {
          watermark: false,
        });
        const png = await svgToPng(svg, scale);
        triggerDownload(png, `${fileBase}@${scale}x.png`);
        setJustSaved(true);
        window.setTimeout(() => setJustSaved(false), 2600);
      } catch (err) {
        setError(err instanceof Error ? err.message : "PNG 내보내기에 실패했습니다.");
      } finally {
        setBusyExport(false);
      }
    },
    [activeParams, fontBase64, fontFamily, fileBase]
  );

  const ready = hasName && !!fontBase64 && !loading;

  return (
    <div className={`container ${styles.studio}`}>
      <header className={styles.head}>
        <h1 className={`display ${styles.title}`}>서명 작업대</h1>
        <p className={styles.lead}>
          이름을 적고 무드를 고르면 흘림체 서명이 떠요. 마음에 드는 변주를 골라
          PNG·SVG로 받아 가세요.
        </p>
      </header>

      <div className={styles.grid}>
        {/* ── 왼쪽: 입력 + 무드 + 갤러리 + 미세조정 ── */}
        <section className={styles.tools} aria-label="서명 설정">
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>① 이름과 문자체계</h2>
            <Segmented<FontScript>
              ariaLabel="문자체계 선택"
              value={params.script}
              onChange={onScript}
              options={[
                { value: "latin", label: "라틴 Aa" },
                { value: "hangul", label: "한글 가" },
              ]}
            />
            <input
              className={styles.nameInput}
              type="text"
              value={params.text}
              maxLength={32}
              placeholder={params.script === "hangul" ? "예: 용군" : "예: Yong Gun"}
              aria-label="서명할 이름"
              onChange={(e) => onName(e.target.value)}
            />
          </div>

          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>② 무드</h2>
            <div className={styles.chips}>
              {SIGN_PRESETS.map((p) => (
                <Chip
                  key={p.id}
                  selected={presetId === p.id}
                  onClick={() => applyPreset(p.id)}
                  title={p.hint}
                >
                  {p.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeadRow}>
              <h2 className={styles.panelTitle}>③ 변주 갤러리</h2>
              <button type="button" className={styles.dice} onClick={reroll} title="다른 변주로">
                🎲 다른 변주
              </button>
            </div>
            {!hasName ? (
              <p className={styles.hint}>위에 이름을 먼저 적어 주세요.</p>
            ) : (
              <div className={styles.gallery} role="listbox" aria-label="서명 변주">
                {gallerySeeds.map((s) => {
                  const sp = clampSign({ ...params, body: { ...params.body, seed: s } });
                  const svg = buildSignSvg(sp, fontBase64, fontFamily || "Sign", {
                    watermark: false,
                  });
                  const sel = s === selectedSeed;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="option"
                      aria-selected={sel}
                      className={`${styles.cell} ${sel ? styles.cellOn : ""}`}
                      onClick={() => setSelectedSeed(s)}
                    >
                      <span className={styles.cellImgWrap}>
                        {/* 투명 배경 체커 위 SVG 미리보기 */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className={styles.cellImg} src={svgDataUrl(svg)} alt={`변주 #${s}`} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <details className={styles.panel}>
            <summary className={styles.accSummary}>④ 미세조정 (선택)</summary>
            <div className={styles.accBody}>
              <Slider
                label="굵기"
                display={String(params.body.weight)}
                min={100}
                max={900}
                step={10}
                value={params.body.weight}
                onValueChange={(v) => setBody("weight", v)}
              />
              <Slider
                label="기울기"
                display={`${params.body.slant}°`}
                min={-15}
                max={0}
                step={1}
                value={params.body.slant}
                onValueChange={(v) => setBody("slant", v)}
              />
              <Slider
                label="손맛(괴상함)"
                display={String(params.body.weirdness)}
                min={0}
                max={100}
                step={1}
                value={params.body.weirdness}
                onValueChange={(v) => setBody("weirdness", v)}
              />
              <Slider
                label="플러리시 강도"
                display={`${Math.round(params.flourish.intensity * 100)}%`}
                min={0}
                max={1}
                step={0.05}
                value={params.flourish.intensity}
                onValueChange={setFlourish}
              />
              <label className={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={params.underline.enabled}
                  onChange={toggleUnderline}
                />
                <span>밑줄 스트로크</span>
              </label>
            </div>
          </details>

          <div className={styles.statusRow} aria-live="polite">
            {loading && <span className={styles.status}>서명 글자 빚는 중…</span>}
            {error && (
              <span className={styles.error} role="alert">
                {error}
              </span>
            )}
          </div>
        </section>

        {/* ── 오른쪽: 큰 프리뷰 + 내보내기(sticky) ── */}
        <section className={styles.previewCol} aria-label="미리보기와 내보내기">
          <div className={styles.previewSticky}>
            <div className={styles.previewBox}>
              {!hasName ? (
                <div className={styles.empty}>
                  <Mascot mood="sleepy" size={88} label="너굴이가 기다려요" />
                  <p className={styles.emptyText}>이름 적어봐 너굴.</p>
                </div>
              ) : (
                <div className={styles.previewStage}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.previewImg} src={svgDataUrl(previewSvg)} alt="내 서명 미리보기" />
                </div>
              )}
            </div>

            <div className={styles.exportPanel}>
              <h2 className={styles.exportHead}>서명 받아 가기</h2>
              <div className={styles.exportRow}>
                <Button variant="clay" onClick={() => exportPng(2)} disabled={!ready || busyExport}>
                  {busyExport ? "내보내는 중…" : "투명 PNG (2x)"}
                </Button>
                <Button onClick={() => exportPng(4)} disabled={!ready || busyExport}>
                  고해상 4x
                </Button>
                <Button onClick={exportSvg} disabled={!ready || busyExport}>
                  SVG
                </Button>
              </div>
              <p className={styles.exportHint}>
                투명 배경 PNG는 문서·이메일 서명에, SVG는 무한 확대·인쇄에 좋아요.
              </p>
            </div>
          </div>
        </section>
      </div>

      {justSaved && (
        <div className={styles.toast} role="status" aria-live="polite">
          <Mascot mood="love" size={52} label="" />
          <span>받았다 너굴.</span>
        </div>
      )}

      <p className={styles.honesty}>
        <Mascot mood="happy" size={22} still label="" />
        공개 가변폰트 변형 + 절차적 장식 = 서명 스타일이에요. 밑줄·플러리시는
        수학적으로 합성한 근사라 진짜 한붓 자필은 아닙니다. AI 미사용 · 모든 작업은
        이 브라우저 안에서 끝나요.
      </p>
    </div>
  );
}
