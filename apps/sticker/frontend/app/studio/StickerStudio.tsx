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
  generateSet,
  type GenerateConfig,
  type GeneratedItem,
} from "../../lib/generate";
import { downloadBlob, downloadDataUrl, makeZip } from "../../lib/zip";
import { cropToContent, DEFAULT_ANCHOR, type FaceAnchor } from "../../lib/render";
import FaceMarker from "../../components/FaceMarker";
import styles from "./StickerStudio.module.css";

export default function StickerStudio() {
  const canvasRef = useRef<SketchCanvasHandle>(null);
  const [items, setItems] = useState<GeneratedItem[]>([]);
  const [seed, setSeed] = useState(1);
  const [presetId, setPresetId] = useState(SHARE_PRESETS[0]!.id);
  const [varyColor, setVaryColor] = useState(true);
  const [fixedPaletteId, setFixedPaletteId] = useState(COLOR_PALETTES[0]!.id);
  const [varyTemplate, setVaryTemplate] = useState(true);
  const [fixedTemplateId, setFixedTemplateId] = useState("chip");
  const [tintStrength, setTintStrength] = useState(0.55);
  const [outlineScale, setOutlineScale] = useState(1);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 가이드형 표정: 눈·입 위치 마커(본체 정규화 0~1)
  const [anchor, setAnchor] = useState<FaceAnchor>(DEFAULT_ANCHOR);
  const [markSrc, setMarkSrc] = useState<string | null>(null);
  const [markAspect, setMarkAspect] = useState(1);

  const size = useMemo(
    () => SHARE_PRESETS.find((p) => p.id === presetId)?.size ?? 512,
    [presetId]
  );

  const run = useCallback(
    (useSeed: number) => {
      const cv = canvasRef.current?.getCanvas();
      if (!cv || !canvasRef.current?.isDirty()) {
        setError("먼저 캐릭터를 그려 주세요. 동그라미 하나여도 충분해요!");
        setItems([]);
        return;
      }
      setError(null);
      setBusy(true);
      // 무거운 합성은 다음 틱으로 미뤄 UI가 멈추지 않게
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
          anchor,
        };
        const { items: out, isEmpty } = generateSet(cv, cfg);
        if (isEmpty) {
          setError("그린 내용이 없어요. 캐릭터를 그려 주세요.");
          setItems([]);
        } else {
          setItems(out);
        }
        setBusy(false);
      }, 16);
    },
    [size, tintStrength, outlineScale, varyColor, fixedPaletteId, varyTemplate, fixedTemplateId, caption, anchor]
  );

  // 내 그림을 잘라 마커 스테이지로 불러온다(눈·입 위치 지정용).
  const openMarker = useCallback(() => {
    const cv = canvasRef.current?.getCanvas();
    if (!cv || !canvasRef.current?.isDirty()) {
      setError("먼저 캐릭터를 그려 주세요. 그다음 눈·입 위치를 잡아요!");
      return;
    }
    const { canvas: crop, isEmpty, box } = cropToContent(cv, true);
    if (isEmpty) {
      setError("그린 내용이 없어요. 캐릭터를 먼저 그려 주세요.");
      return;
    }
    setError(null);
    setMarkSrc(crop.toDataURL("image/png"));
    setMarkAspect(box.w / box.h);
  }, []);

  const onGenerate = () => run(seed);

  const onReroll = () => {
    const next = (Math.floor(Math.random() * 1_000_000) + 1) >>> 0;
    setSeed(next);
    run(next);
  };

  const downloadOne = (item: GeneratedItem) => {
    downloadDataUrl(item.dataUrl, `sticker-${item.emotionId}.png`);
  };

  const downloadAll = () => {
    if (!items.length) return;
    const zip = makeZip(
      items.map((it, i) => ({
        name: `sticker-${String(i + 1).padStart(2, "0")}-${it.emotionId}.png`,
        dataUrl: it.dataUrl,
      }))
    );
    downloadBlob(zip, `sticker-pack-seed${seed}.zip`);
  };

  // 액션 버튼(만들기·주사위·ZIP) — 데스크톱 컬럼과 모바일 하단 고정 바에서 공유.
  // 동일 핸들러로 두 폼팩터의 받기 도달성을 동등하게 보장(폰트앱 패턴).
  const renderActions = () => (
    <>
      <button type="button" className={styles.primary} onClick={onGenerate} disabled={busy}>
        {busy ? "만드는 중…" : `표정 ${MAX_STICKER_SET_SIZE}종 만들기`}
      </button>
      <button
        type="button"
        className={styles.dice}
        onClick={onReroll}
        disabled={busy}
        aria-label="주사위 — 다른 색/템플릿 조합으로 다시"
        title="다른 조합으로 다시 (시드 바꿈)"
      >
        🎲 다른 조합
      </button>
      {items.length > 0 && (
        <button type="button" className={styles.secondary} onClick={downloadAll}>
          전체 ZIP 챙기기
        </button>
      )}
    </>
  );

  return (
    <>
    <div className={`container ${styles.layout}`}>
      {/* ── 왼쪽: 그리기 + 컨트롤 ── */}
      <section className={styles.left} aria-label="그리기와 변주 설정">
        <div className={styles.panel}>
          <h2 className={`display ${styles.panelTitle}`}>① 캐릭터를 그려요</h2>
          <SketchCanvas ref={canvasRef} size={360} />
        </div>

        <div className={styles.panel}>
          <h2 className={`display ${styles.panelTitle}`}>② 눈·입 위치를 잡아요</h2>
          <p className={styles.hint}>
            그린 그림에서 눈·입이 어디인지 점으로 알려주면, 표정이 <strong>그 자리에 딱</strong> 그려져요.
          </p>
          <button type="button" className={styles.secondary} onClick={openMarker}>
            {markSrc ? "🔄 내 그림 다시 불러오기" : "🎯 내 그림 불러와 위치 잡기"}
          </button>
          {markSrc && (
            <FaceMarker src={markSrc} aspect={markAspect} anchor={anchor} onChange={setAnchor} />
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={`display ${styles.panelTitle}`}>③ 변주를 골라요</h2>

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
                  <Chip
                    key={t.id}
                    selected={fixedTemplateId === t.id}
                    onClick={() => setFixedTemplateId(t.id)}
                    title={t.desc}
                  >
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
            <span className={styles.hint}>비우면 표정별 기본 글귀가 들어가요.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="tint">
              색 입히기 {Math.round(tintStrength * 100)}%
            </label>
            <input
              id="tint"
              type="range"
              min={0}
              max={100}
              value={Math.round(tintStrength * 100)}
              onChange={(e) => setTintStrength(Number(e.target.value) / 100)}
              className={styles.range}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="outline">
              테두리 굵기 {outlineScale.toFixed(1)}×
            </label>
            <input
              id="outline"
              type="range"
              min={0}
              max={20}
              value={Math.round(outlineScale * 10)}
              onChange={(e) => setOutlineScale(Number(e.target.value) / 10)}
              className={styles.range}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>내보내기 크기</span>
            <div className={styles.chips} role="group" aria-label="내보내기 크기">
              {SHARE_PRESETS.map((p) => (
                <Chip
                  key={p.id}
                  selected={presetId === p.id}
                  onClick={() => setPresetId(p.id)}
                  title={p.note}
                >
                  {p.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 오른쪽: 액션 + 변주 갤러리 ── */}
      <section className={styles.right} aria-label="변주 결과">
        {/* 데스크톱: 컬럼 안 액션 행. 모바일: 숨김(하단 고정 바가 대체). */}
        <div className={styles.actions}>{renderActions()}</div>

        {error && (
          <p className={styles.error} role="alert">
            <Mascot mood="worried" size={28} still label="" /> {error}
          </p>
        )}

        {items.length === 0 && !error ? (
          <div className={styles.empty}>
            <Mascot mood="sleepy" size={96} label="너굴이가 기다려요" />
            <p className={styles.emptyText}>
              그려봐 너굴. 동그라미 하나면 <strong>표정 {MAX_STICKER_SET_SIZE}종</strong>이
              한 세트로 떨어진다 너굴.
            </p>
            <p className={styles.honesty}>
              그림은 이 브라우저 안에서만 처리돼요 · 서버로 안 보내요.
            </p>
          </div>
        ) : (
          items.length > 0 && (
            <>
              <div className={styles.gallery} role="list" aria-label="스티커 변주 세트">
                {items.map((it) => (
                  <figure key={it.id} className={styles.cell} role="listitem">
                    {/* 투명 PNG 확인용 체커보드 위에 표시 */}
                    <div className={styles.cellImgWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className={styles.cellImg} src={it.dataUrl} alt={`${it.label} 스티커`} />
                    </div>
                    <figcaption className={styles.cellCap}>{it.label}</figcaption>
                    <button
                      type="button"
                      className={styles.cellDl}
                      onClick={() => downloadOne(it)}
                    >
                      PNG 받기
                    </button>
                  </figure>
                ))}
              </div>
              <p className={styles.honesty}>
                {MAX_STICKER_SET_SIZE}종 떴다구리. 전부 투명 PNG예요. 같은
                시드(현재 #{seed})면 같은 세트가 다시 나와요.
              </p>
            </>
          )
        )}
      </section>
    </div>

    {/* 모바일 전용: 하단 고정 액션 바 — 만들기·ZIP이 한 손에 항상 도달. */}
    <div className={styles.mobileActionBar} role="region" aria-label="스티커 만들기·받기">
      <div className={styles.actionBarInner}>{renderActions()}</div>
    </div>
    </>
  );
}
