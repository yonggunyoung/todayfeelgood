"use client";

import { useState } from "react";
import { type GlyphStroke } from "@webapp/core";
import GlyphCanvas from "./GlyphCanvas";
import GlyphZoomModal from "./GlyphZoomModal";
import type { Dictionary } from "../lib/i18n";
import styles from "./GlyphCell.module.css";

interface Props {
  /** 이 셀이 담당하는 문자 (예: "a", "ㄱ") */
  char: string;
  /** 셀 정규화 좌표(0..1) 폴리라인 획들 */
  strokes: GlyphStroke[];
  /** 그리기/지우기 후 새 획 배열을 위로 올린다 */
  onChange: (char: string, strokes: GlyphStroke[]) => void;
  disabled?: boolean;
  size?: number;
  /**
   * 가이드라인 프리셋. latin=어센더/x높이/베이스라인(소문자 기준),
   * hangul=정사각 칸 중앙 십자선(자모는 위/아래·좌/우 균형이 중요).
   */
  script?: "latin" | "hangul";
  /** 라벨 접근성 표현(예: "기역", "아"). 없으면 char 그대로. */
  labelName?: string;
  /** 셀/확대 모달 사전. */
  t: Dictionary["studio"]["cell"];
  zoomT: Dictionary["studio"]["zoom"];
}

/**
 * 한 글자(셀)의 그리기 표면 + 확대(모달) 진입점.
 * - 그리기 로직은 GlyphCanvas 공용 컴포넌트에 위임(셀/확대 모달 동일 코드).
 * - "확대" 버튼/칸 탭으로 큰 모달 캔버스를 열어 세밀하게 그릴 수 있다.
 * - 셀별 되돌리기/지우기는 여기서. 좌표계는 엔진 계약(GlyphStroke)과 동일.
 */
export default function GlyphCell({
  char,
  strokes,
  onChange,
  disabled,
  script = "latin",
  labelName,
  t,
  zoomT,
}: Props) {
  const [zoom, setZoom] = useState(false);
  const filled = strokes.length > 0;
  const name = labelName || char;

  return (
    <div
      className={`${styles.cell} ${filled ? styles.filled : ""}`}
      data-script={script}
    >
      <span className={styles.glyphLabel} aria-hidden>
        {char}
      </span>
      <button
        type="button"
        className={styles.zoomBtn}
        disabled={disabled}
        onClick={() => setZoom(true)}
        aria-label={t.zoomLabel.replace("{name}", name)}
        title={t.zoomTitle}
      >
        ⤢
      </button>
      <GlyphCanvas
        char={char}
        strokes={strokes}
        onChange={(s) => onChange(char, s)}
        disabled={disabled}
        script={script}
        labelName={labelName}
        className={styles.canvas}
        ariaFilled={t.drawAriaFilled}
        ariaEmpty={t.drawAriaEmpty}
      />
      <div className={styles.cellActions}>
        <button
          type="button"
          className={styles.cellBtn}
          disabled={disabled || strokes.length === 0}
          onClick={() => onChange(char, strokes.slice(0, -1))}
          aria-label={t.undoLabel.replace("{name}", name)}
        >
          {t.undo}
        </button>
        <button
          type="button"
          className={styles.cellBtn}
          disabled={disabled || strokes.length === 0}
          onClick={() => onChange(char, [])}
          aria-label={t.clearLabel.replace("{name}", name)}
        >
          {t.clear}
        </button>
      </div>

      {zoom && (
        <GlyphZoomModal
          char={char}
          labelName={labelName}
          script={script}
          strokes={strokes}
          onChange={(s) => onChange(char, s)}
          onClose={() => setZoom(false)}
          t={zoomT}
          cellT={t}
        />
      )}
    </div>
  );
}
