"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chip, Mascot, Segmented } from "@webapp/ui";
import {
  FONT_FORMATS,
  FREE_FORMATS,
  FULL_FORMATS,
  type FontFormat,
  type FontScript,
  type GenerateResponse,
} from "@webapp/core";
import { apiPath } from "../../lib/paths";
import { buildHarmony, PRESET_ACCENTS, type HarmonyPalette } from "../../lib/palette";
import {
  KIT_TEMPLATES,
  MOOD_PRESETS,
  paramsForMood,
} from "../../lib/presets";
import { renderKitSheet } from "../../lib/sheet";
import {
  buildFontFaceCss,
  buildLicense,
  buildPaletteCss,
  buildReadme,
  fontFamilyName,
  slugify,
} from "../../lib/kitfiles";
import { downloadBlob, makeZip, type ZipFile } from "../../lib/zip";
import styles from "./KitStudio.module.css";

export default function KitStudio() {
  const [brand, setBrand] = useState("Mybrand");
  const [description, setDescription] = useState("");
  const [moodId, setMoodId] = useState(MOOD_PRESETS[0]!.id);
  const [script, setScript] = useState<FontScript>("latin");
  const [accent, setAccent] = useState(PRESET_ACCENTS[0]!.hex);
  const [commercial, setCommercial] = useState(false);

  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [previewFont, setPreviewFont] = useState<GenerateResponse | null>(null);
  const [busyPreview, setBusyPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 팔레트는 악센트에서 즉시(클라 계산) 파생 — 비용 0
  const palette: HarmonyPalette = useMemo(() => buildHarmony(accent), [accent]);

  // 프리셋 키트 템플릿 1탭 적용
  const applyTemplate = useCallback((id: string) => {
    const t = KIT_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setMoodId(t.moodId);
    setAccent(t.accent);
    setScript(t.script);
  }, []);

  // 폰트 미리보기 요청(엔진 재사용). 무드/스크립트가 바뀌면 woff 1개만 받아 시트에 쓴다.
  const fetchPreviewFont = useCallback(
    async (signal: AbortSignal): Promise<GenerateResponse | null> => {
      const res = await fetch(apiPath("/api/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          params: paramsForMood(moodId),
          script,
          format: "woff" as FontFormat,
        }),
        signal,
      });
      if (!res.ok) throw new Error("preview font failed");
      return (await res.json()) as GenerateResponse;
    },
    [moodId, script]
  );

  // 무드/스크립트 변경 → 프리뷰 폰트 갱신(디바운스)
  useEffect(() => {
    const ctrl = new AbortController();
    setBusyPreview(true);
    setError(null);
    const t = setTimeout(() => {
      fetchPreviewFont(ctrl.signal)
        .then((r) => {
          if (!ctrl.signal.aborted) setPreviewFont(r);
        })
        .catch((e) => {
          if (ctrl.signal.aborted) return;
          // 엔진 미가동 시에도 시트는 시스템 폰트로 폴백 렌더되게 두고, 안내만 남긴다.
          setPreviewFont(null);
          setError("폰트 엔진 미리보기를 못 받았어요. 시스템 글꼴로 미리봐요(받기 시 다시 시도).");
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setBusyPreview(false);
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [fetchPreviewFont]);

  // 시트(라이브 미리보기) 갱신 — 폰트/팔레트/브랜드 변경 시 재합성(워터마크 포함=무료 미리보기)
  useEffect(() => {
    let cancelled = false;
    renderKitSheet({
      brand: brand || "Mybrand",
      description: description.trim() || undefined,
      palette,
      script,
      fontBase64: previewFont?.fontBase64 ?? null,
      fontFamily: previewFont?.fontFamily ?? "preview",
      watermark: !commercial,
      highRes: false,
    }).then((url) => {
      if (!cancelled && url) setSheetUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [brand, description, palette, script, previewFont, commercial]);

  // 키트 ZIP 받기 — 받기 시점에 선택 포맷 폰트들을 엔진에서 받아 묶는다(앱 내 완결).
  const exportKit = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const formats = commercial ? FULL_FORMATS : FREE_FORMATS;
      const slug = slugify(brand);
      const family = fontFamilyName(brand);
      const fileBase = slug;

      // 1) 포맷별 폰트 파일 받기(엔진 재사용)
      const fontFiles: ZipFile[] = [];
      for (const fmt of formats) {
        const res = await fetch(apiPath("/api/generate"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            params: paramsForMood(moodId),
            script,
            format: fmt,
          }),
        });
        if (!res.ok) throw new Error(`font ${fmt} failed`);
        const data = (await res.json()) as GenerateResponse;
        fontFiles.push({
          name: `${slug}-kit/font/${fileBase}.${FONT_FORMATS[fmt].ext}`,
          base64: data.fontBase64,
        });
      }

      // 2) 고해상·워터마크 없는 시트 PNG(받기 전용 재렌더)
      const sheetForZip = await renderKitSheet({
        brand: brand || "Mybrand",
        description: description.trim() || undefined,
        palette,
        script,
        fontBase64: previewFont?.fontBase64 ?? null,
        fontFamily: previewFont?.fontFamily ?? "preview",
        watermark: !commercial,
        highRes: commercial,
      });

      // 3) 텍스트 자산
      const files: ZipFile[] = [
        ...fontFiles,
        { name: `${slug}-kit/preview.png`, base64: sheetForZip },
        {
          name: `${slug}-kit/palette.css`,
          text: buildPaletteCss(palette, brand || "Mybrand"),
        },
        {
          name: `${slug}-kit/font-face.css`,
          text: buildFontFaceCss(family, `font/${fileBase}`, formats),
        },
        {
          name: `${slug}-kit/README.txt`,
          text: buildReadme({
            brand: brand || "Mybrand",
            description: description.trim() || undefined,
            script,
            formats,
            commercial,
          }),
        },
        {
          name: `${slug}-kit/LICENSE.txt`,
          text: buildLicense({ brand: brand || "Mybrand", commercial }),
        },
      ];

      const zip = makeZip(files);
      downloadBlob(zip, `${slug}-kit${commercial ? "-commercial" : ""}.zip`);
    } catch {
      setError("키트 묶기에 실패했어요. 폰트 엔진이 켜져 있는지 확인하고 다시 시도해 주세요.");
    } finally {
      setExporting(false);
    }
  }, [brand, description, moodId, script, palette, previewFont, commercial]);

  const getButtonLabel = exporting
    ? "키트 묶는 중…"
    : commercial
      ? "상업용 키트 ZIP 받기"
      : "키트 ZIP 받기 (무료)";

  return (
    <>
    <div className={`container ${styles.layout}`}>
      {/* ── 좌: 컨트롤 ── */}
      <section className={styles.controls} aria-label="키트 설정">
        {/* 빠른 시작: 프리셋 키트 템플릿 */}
        <div className={styles.panel}>
          <h2 className={`display ${styles.panelTitle}`}>빠른 시작 — 프리셋 키트</h2>
          <div className={styles.chips} role="group" aria-label="프리셋 키트 템플릿">
            {KIT_TEMPLATES.map((t) => (
              <Chip key={t.id} onClick={() => applyTemplate(t.id)} title={t.desc}>
                {t.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <h2 className={`display ${styles.panelTitle}`}>① 브랜드</h2>
          <label className={styles.fieldLabel} htmlFor="brand">
            브랜드명
          </label>
          <input
            id="brand"
            type="text"
            className={styles.text}
            value={brand}
            maxLength={28}
            placeholder="예: Mybrand / 모카하우스"
            onChange={(e) => setBrand(e.target.value)}
          />
          <label className={styles.fieldLabel} htmlFor="desc">
            한 줄 설명(선택)
          </label>
          <input
            id="desc"
            type="text"
            className={styles.text}
            value={description}
            maxLength={48}
            placeholder="예: 따뜻한 동네 카페"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className={styles.panel}>
          <h2 className={`display ${styles.panelTitle}`}>② 글씨체</h2>
          <span className={styles.fieldLabel}>문자체계</span>
          <Segmented<FontScript>
            ariaLabel="문자체계"
            value={script}
            onChange={setScript}
            options={[
              { value: "latin", label: "라틴 A–Z" },
              { value: "hangul", label: "한글 가나다" },
            ]}
          />
          <span className={styles.fieldLabel}>무드 프리셋</span>
          <div className={styles.chips} role="group" aria-label="무드 프리셋">
            {MOOD_PRESETS.map((m) => (
              <Chip
                key={m.id}
                selected={moodId === m.id}
                onClick={() => setMoodId(m.id)}
              >
                {m.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <h2 className={`display ${styles.panelTitle}`}>③ 색</h2>
          <span className={styles.fieldLabel}>악센트 색 → 조화 팔레트 자동</span>
          <div className={styles.swatches} role="group" aria-label="프리셋 악센트 색">
            {PRESET_ACCENTS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.swatch} ${accent.toLowerCase() === p.hex.toLowerCase() ? styles.swatchOn : ""}`}
                style={{ background: p.hex }}
                aria-label={p.label}
                aria-pressed={accent.toLowerCase() === p.hex.toLowerCase()}
                onClick={() => setAccent(p.hex)}
              />
            ))}
            <label className={styles.pickerWrap} title="직접 고르기">
              <input
                type="color"
                className={styles.picker}
                value={accent.length === 7 ? accent : "#c0492b"}
                onChange={(e) => setAccent(e.target.value)}
                aria-label="악센트 색 직접 고르기"
              />
            </label>
          </div>
          {/* 생성된 조화 팔레트 칩 */}
          <div className={styles.paletteRow} aria-label="자동 생성 조화 팔레트">
            {palette.colors.map((c, i) => (
              <span key={i} className={styles.paletteChip} style={{ background: c }} title={c}>
                <span className={styles.paletteHex}>{c.toUpperCase()}</span>
              </span>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <h2 className={`display ${styles.panelTitle}`}>④ 받기 옵션</h2>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={commercial}
              onChange={(e) => setCommercial(e.target.checked)}
            />
            <span>
              상업용 키트 (풀포맷 {FULL_FORMATS.map((f) => f.toUpperCase()).join("/")} · 고해상 시트 ·
              워터마크 제거 · 상업 라이선스 고지)
            </span>
          </label>
          <p className={styles.hint}>
            무료는 {FREE_FORMATS.map((f) => f.toUpperCase()).join("/")} · 워터마크 시트 · 개인·비상업
            라이선스로 받아요.
          </p>
        </div>
      </section>

      {/* ── 우: sticky 미리보기 시트 + 받기 ── */}
      <section className={styles.previewCol} aria-label="키트 미리보기">
        <div className={styles.sticky}>
          <div className={styles.sheetWrap}>
            {sheetUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.sheetImg} src={sheetUrl} alt="키트 미리보기 시트" />
            ) : (
              <div className={styles.sheetEmpty}>
                <Mascot mood="sleepy" size={88} />
                <p>설정 만지면 시트가 뜬다 너굴.</p>
              </div>
            )}
            <span className={styles.liveDot}>{busyPreview ? "갱신 중" : "라이브"}</span>
          </div>

          {/* 데스크톱 받기 버튼(모바일에선 하단 고정 바가 대체). */}
          <button
            type="button"
            className={`${styles.getBtn} ${styles.desktopGet}`}
            onClick={exportKit}
            disabled={exporting}
          >
            {getButtonLabel}
          </button>

          {error && (
            <p className={styles.error} role="alert">
              <Mascot mood="worried" size={28} still label="" /> {error}
            </p>
          )}

          <p className={styles.honesty}>
            공개 가변폰트 변형 기반 키트예요 · 실제 자필/AI 아님 · 폰트 라이선스 고지(LICENSE.txt)를
            함께 담아 드려요. 합성·ZIP은 이 브라우저에서(서버 0).
          </p>
        </div>
      </section>
    </div>

    {/* 모바일 전용: 하단 고정 받기 바 — 받기 버튼이 스크롤 밖으로 사라지지 않게. */}
    <div className={styles.mobileActionBar} role="region" aria-label="키트 받기">
      <button
        type="button"
        className={`${styles.getBtn} ${styles.barGet}`}
        onClick={exportKit}
        disabled={exporting}
      >
        {getButtonLabel}
      </button>
    </div>
    </>
  );
}
